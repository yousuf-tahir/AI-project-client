import socketio
import datetime
from typing import Dict, Set

# Track active connections: {room_id: {sid: {user_id, user_name, user_type, joined_at}}}
active_rooms: Dict[str, Dict[str, dict]] = {}

def setup_socket_handlers(sio: socketio.AsyncServer, db_getter):
    """
    Setup Socket.IO event handlers for interview rooms.
    
    Args:
        sio: The Socket.IO server instance
        db_getter: Async function that returns the database instance
    """
    
    @sio.event
    async def connect(sid, environ):
        """Handle client connection"""
        print(f"[SOCKET] Client connected: {sid}")
        await sio.emit('connected', {'sid': sid}, room=sid)

    @sio.event
    async def disconnect(sid):
        """Handle client disconnection"""
        print(f"[SOCKET] Client disconnected: {sid}")
        
        # Find and remove from all rooms
        rooms_to_clean = []
        for room_id, participants in list(active_rooms.items()):
            if sid in participants:
                user_info = participants[sid]
                rooms_to_clean.append((room_id, user_info))
                del participants[sid]
        
        # Notify other participants
        for room_id, user_info in rooms_to_clean:
            await sio.emit('user_left', {
                'userId': user_info['user_id'],
                'userName': user_info['user_name'],
                'userType': user_info['user_type'],
                'timestamp': datetime.datetime.utcnow().isoformat()
            }, room=room_id)
            
            # Update database
            try:
                db = await db_getter()
                if db is not None:
                    interview_id = room_id.replace("interview_", "")
                    await db.interviews.update_one(
                        {"_id": interview_id},
                        {
                            "$pull": {
                                "participants": {"sid": sid}
                            },
                            "$set": {
                                "updated_at": datetime.datetime.utcnow()
                            }
                        }
                    )
            except Exception as e:
                print(f"[SOCKET ERROR] disconnect db update: {str(e)}")

    @sio.event
    async def join_room(sid, data):
        """
        Handle room join request.
        Expected data: {roomId, userId, userName, userType}
        """
        try:
            room_id = data.get('roomId')
            user_id = data.get('userId')
            user_name = data.get('userName')
            user_type = data.get('userType')  # 'hr' or 'candidate'
            
            if not all([room_id, user_id, user_name, user_type]):
                await sio.emit('error', {
                    'message': 'Missing required fields'
                }, room=sid)
                return
            
            # Validate interview exists and user is authorized
            db = await db_getter()
            if db is None:
                await sio.emit('error', {'message': 'Database unavailable'}, room=sid)
                return
            
            interview_id = room_id.replace("interview_", "")
            interview = await db.interviews.find_one({"_id": interview_id})
            
            if not interview:
                await sio.emit('error', {'message': 'Interview not found'}, room=sid)
                return
            
            if not interview.get('room_id'):
                await sio.emit('error', {'message': 'Room not created'}, room=sid)
                return
            
            # Verify authorization
            if user_type == 'hr' and interview.get('hr_id') != user_id:
                await sio.emit('error', {'message': 'Not authorized'}, room=sid)
                return
            elif user_type == 'candidate' and interview.get('candidate_id') != user_id:
                await sio.emit('error', {'message': 'Not authorized'}, room=sid)
                return
            
            # Join the Socket.IO room
            sio.enter_room(sid, room_id)
            
            # Track participant
            if room_id not in active_rooms:
                active_rooms[room_id] = {}
            
            user_info = {
                'user_id': user_id,
                'user_name': user_name,
                'user_type': user_type,
                'joined_at': datetime.datetime.utcnow().isoformat()
            }
            active_rooms[room_id][sid] = user_info
            
            # Update database
            await db.interviews.update_one(
                {"_id": interview_id},
                {
                    "$addToSet": {
                        "participants": {
                            "sid": sid,
                            "user_id": user_id,
                            "user_name": user_name,
                            "user_type": user_type,
                            "joined_at": datetime.datetime.utcnow()
                        }
                    },
                    "$set": {
                        "room_status": "active",
                        "updated_at": datetime.datetime.utcnow()
                    }
                }
            )
            
            # Get current participants list
            participants = [
                {
                    'userId': p['user_id'],
                    'userName': p['user_name'],
                    'userType': p['user_type'],
                    'joinedAt': p['joined_at']
                }
                for p in active_rooms[room_id].values()
            ]
            
            # Notify the joiner
            await sio.emit('room_joined', {
                'roomId': room_id,
                'participants': participants,
                'interviewInfo': {
                    'date': interview.get('date'),
                    'time': interview.get('time'),
                    'duration': interview.get('duration'),
                    'type': interview.get('type')
                }
            }, room=sid)
            
            # CRITICAL FIX: Notify EVERYONE in the room (including the joiner) about the new participant
            await sio.emit('user_joined', {
                'userId': user_id,
                'userName': user_name,
                'userType': user_type,
                'timestamp': datetime.datetime.utcnow().isoformat()
            }, room=room_id)
            
            # ALSO broadcast updated participants list to everyone
            await sio.emit('participants_list', {
                'participants': participants
            }, room=room_id)
            
            print(f"[SOCKET] {user_name} ({user_type}) joined room {room_id}")
            
        except Exception as e:
            print(f"[SOCKET ERROR] join_room: {str(e)}")
            await sio.emit('error', {'message': str(e)}, room=sid)

    @sio.event
    async def leave_room(sid, data):
        """
        Handle room leave request.
        Expected data: {roomId}
        """
        try:
            room_id = data.get('roomId')
            if not room_id:
                return
            
            # Remove from tracking
            user_info = None
            if room_id in active_rooms and sid in active_rooms[room_id]:
                user_info = active_rooms[room_id][sid]
                del active_rooms[room_id][sid]
            
            # Leave Socket.IO room
            sio.leave_room(sid, room_id)
            
            # Update database
            if user_info:
                try:
                    db = await db_getter()
                    if db:
                        interview_id = room_id.replace("interview_", "")
                        await db.interviews.update_one(
                            {"_id": interview_id},
                            {
                                "$pull": {
                                    "participants": {"sid": sid}
                                },
                                "$set": {
                                    "updated_at": datetime.datetime.utcnow()
                                }
                            }
                        )
                except Exception as e:
                    print(f"[SOCKET ERROR] leave_room db update: {str(e)}")
                
                # Notify others
                await sio.emit('user_left', {
                    'userId': user_info['user_id'],
                    'userName': user_info['user_name'],
                    'userType': user_info['user_type'],
                    'timestamp': datetime.datetime.utcnow().isoformat()
                }, room=room_id)
                
                print(f"[SOCKET] {user_info['user_name']} left room {room_id}")
            
        except Exception as e:
            print(f"[SOCKET ERROR] leave_room: {str(e)}")

    @sio.event
    async def get_participants(sid, data):
        """
        Get current participants in a room.
        Expected data: {roomId}
        """
        try:
            room_id = data.get('roomId')
            if not room_id or room_id not in active_rooms:
                await sio.emit('participants_list', {'participants': []}, room=sid)
                return
            
            participants = [
                {
                    'userId': p['user_id'],
                    'userName': p['user_name'],
                    'userType': p['user_type'],
                    'joinedAt': p['joined_at']
                }
                for p in active_rooms[room_id].values()
            ]
            
            await sio.emit('participants_list', {
                'participants': participants
            }, room=sid)
            
        except Exception as e:
            print(f"[SOCKET ERROR] get_participants: {str(e)}")
            await sio.emit('error', {'message': str(e)}, room=sid)

    @sio.event
    async def send_chat_message(sid, data):
        """
        Send chat message in interview room (optional for now).
        Expected data: {roomId, message}
        """
        try:
            room_id = data.get('roomId')
            message = data.get('message')
            
            if not room_id or not message:
                return
            
            # Get sender info
            if room_id not in active_rooms or sid not in active_rooms[room_id]:
                return
            
            sender = active_rooms[room_id][sid]
            
            # Broadcast to room
            await sio.emit('chat_message', {
                'userId': sender['user_id'],
                'userName': sender['user_name'],
                'userType': sender['user_type'],
                'message': message,
                'timestamp': datetime.datetime.utcnow().isoformat()
            }, room=room_id)
            
        except Exception as e:
            print(f"[SOCKET ERROR] send_chat_message: {str(e)}")

    # ====================================================
    # INTERVIEW CONTROL EVENTS
    # ====================================================
    
    @sio.event
    async def interview_started(sid, data):
        """
        Broadcast that interview has started to all participants in room.
        Only HR can trigger this.
        Expected data: {roomId}
        """
        try:
            room_id = data.get('roomId')
            if not room_id:
                return
            
            print(f"[SOCKET] Interview started in room {room_id}")
            
            # Update database status
            try:
                db = await db_getter()
                if db:
                    interview_id = room_id.replace("interview_", "")
                    await db.interviews.update_one(
                        {"_id": interview_id},
                        {
                            "$set": {
                                "status": "in_progress",
                                "started_at": datetime.datetime.utcnow(),
                                "updated_at": datetime.datetime.utcnow()
                            }
                        }
                    )
            except Exception as e:
                print(f"[SOCKET ERROR] interview_started db update: {str(e)}")
            
            # Broadcast to all participants in the room
            await sio.emit('interview_started', {
                'roomId': room_id,
                'timestamp': datetime.datetime.utcnow().isoformat()
            }, room=room_id)
            
        except Exception as e:
            print(f"[SOCKET ERROR] interview_started: {str(e)}")

    @sio.event
    async def next_question(sid, data):
        """
        Broadcast next question to all participants in room.
        Keeps everyone in sync.
        Expected data: {roomId, nextIndex, isComplete}
        """
        try:
            room_id = data.get('roomId')
            next_index = data.get('nextIndex')
            is_complete = data.get('isComplete', False)
            
            if room_id is None or next_index is None:
                return
            
            print(f"[SOCKET] Moving to question {next_index} in room {room_id} (Complete: {is_complete})")
            
            # Update database
            try:
                db = await db_getter()
                if db:
                    interview_id = room_id.replace("interview_", "")
                    update_data = {
                        "current_question_index": next_index,
                        "updated_at": datetime.datetime.utcnow()
                    }
                    
                    # If interview is complete, update status
                    if is_complete:
                        update_data["status"] = "completed"
                        update_data["completed_at"] = datetime.datetime.utcnow()
                    
                    await db.interviews.update_one(
                        {"_id": interview_id},
                        {"$set": update_data}
                    )
            except Exception as e:
                print(f"[SOCKET ERROR] next_question db update: {str(e)}")
            
            # Broadcast to all participants in the room
            await sio.emit('next_question', {
                'roomId': room_id,
                'nextIndex': next_index,
                'isComplete': is_complete,
                'timestamp': datetime.datetime.utcnow().isoformat()
            }, room=room_id)
            
        except Exception as e:
            print(f"[SOCKET ERROR] next_question: {str(e)}")

    print("[SOCKET] All event handlers registered (including interview controls)")
    
    # Return None since this is a setup function
    return None