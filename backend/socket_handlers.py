# socket_handlers.py - COMPLETELY UPDATED AND FIXED
import datetime
import traceback
import asyncio
from typing import Dict, Any
from bson import ObjectId
import socketio

# active_rooms: room_id -> { sid -> { user_id, user_name, user_type, joined_at } }
active_rooms: Dict[str, Dict[str, dict]] = {}
# Track connection attempts to prevent duplicates
user_connections: Dict[str, set] = {}  # user_id -> set of sids
# State sync locks to prevent race conditions
sync_locks: Dict[str, asyncio.Lock] = {}
# Heartbeat tasks for rooms
heartbeat_tasks: Dict[str, asyncio.Task] = {}


def setup_socket_handlers(sio: socketio.AsyncServer, db_getter):
    """
    Register Socket.IO event handlers.

    Args:
        sio: socketio.AsyncServer (async mode)
        db_getter: async callable that returns the DB connection: `db = await db_getter()`
    """

    # -------------------------
    # Helpers
    # -------------------------
    async def _get_db():
        try:
            db = await db_getter()
            return db
        except Exception as e:
            print("[SOCKET] ERROR getting DB:", e)
            return None

    def _get_sync_lock(room_id: str) -> asyncio.Lock:
        if room_id not in sync_locks:
            sync_locks[room_id] = asyncio.Lock()
        return sync_locks[room_id]

    async def _cleanup_duplicate_connections(user_id: str, new_sid: str):
        """Remove duplicate connections for the same user"""
        if user_id not in user_connections:
            user_connections[user_id] = set()
        
        # If user already has connections, disconnect the old ones
        existing_sids = user_connections[user_id].copy()
        for old_sid in existing_sids:
            if old_sid != new_sid:
                try:
                    print(f"[SOCKET] Cleaning up duplicate connection for user {user_id}: {old_sid}")
                    # Remove from active rooms first
                    for room_id, participants in list(active_rooms.items()):
                        if old_sid in participants:
                            del participants[old_sid]
                            if not participants:
                                del active_rooms[room_id]
                    
                    # Disconnect the socket
                    await sio.disconnect(old_sid)
                    user_connections[user_id].discard(old_sid)
                except Exception as e:
                    print(f"[SOCKET] Error cleaning up duplicate connection: {e}")
        
        user_connections[user_id].add(new_sid)

    async def _broadcast_participants_update(room_id: str):
        """Broadcast updated participants list to room"""
        if room_id not in active_rooms:
            return
        
        mem_participants = []
        seen_users = set()
        for sid, participant in active_rooms[room_id].items():
            user_id = participant["user_id"]
            if user_id not in seen_users:
                seen_users.add(user_id)
                mem_participants.append({
                    "userId": user_id,
                    "userName": participant["user_name"],
                    "userType": participant["user_type"],
                    "joinedAt": participant["joined_at"]
                })
        
        try:
            await sio.emit("participants_list", {"participants": mem_participants}, room=room_id)
            print(f"[SOCKET] ✅ Broadcasted participants update for room {room_id}: {len(mem_participants)} participants")
        except Exception as e:
            print(f"[SOCKET] Error broadcasting participants update: {e}")

    async def _send_heartbeat(room_id: str):
        """Send heartbeat to keep clients in sync"""
        try:
            if room_id not in active_rooms or not active_rooms[room_id]:
                return

            db = await _get_db()
            if db is None:
                return

            interview_id = room_id.replace("interview_", "")
            try:
                interview_oid = ObjectId(interview_id)
            except Exception:
                interview_oid = interview_id

            interview = await db.interviews.find_one({"_id": interview_oid})
            if not interview:
                return

            # Get current participants from memory
            mem_participants = []
            seen_users = set()
            for sid, participant in active_rooms[room_id].items():
                user_id = participant["user_id"]
                if user_id not in seen_users:
                    seen_users.add(user_id)
                    mem_participants.append({
                        "userId": user_id,
                        "userName": participant["user_name"],
                        "userType": participant["user_type"],
                        "joinedAt": participant["joined_at"]
                    })

            heartbeat_data = {
                "serverTime": datetime.datetime.utcnow().isoformat(),
                "status": interview.get("status", "scheduled"),
                "currentQuestionIndex": interview.get("current_question_index", 0),
                "activeParticipants": len(mem_participants),
                "interviewProgress": f"{interview.get('current_question_index', 0)}/{len(interview.get('questions', []))}"
            }

            await sio.emit("heartbeat", heartbeat_data, room=room_id)
            
        except Exception as e:
            print(f"[SOCKET] Error sending heartbeat: {e}")

    async def _start_room_heartbeat(room_id: str):
        """Start heartbeat for a room"""
        try:
            print(f"[HEARTBEAT] Starting heartbeat for room {room_id}")
            while room_id in active_rooms and active_rooms[room_id]:
                await _send_heartbeat(room_id)
                await asyncio.sleep(10)  # Send heartbeat every 10 seconds
        except Exception as e:
            print(f"[SOCKET] Heartbeat error for room {room_id}: {e}")
        finally:
            # Clean up heartbeat task
            if room_id in heartbeat_tasks:
                del heartbeat_tasks[room_id]
            print(f"[HEARTBEAT] Stopped heartbeat for room {room_id}")

    # -------------------------
    # Connection events
    # -------------------------
    @sio.event
    async def connect(sid, environ):
        print(f"[SOCKET] Client connected: {sid}")
        try:
            await sio.emit("connected", {"sid": sid, "message": "Connected to server"}, room=sid)
        except Exception as e:
            print("[SOCKET] Error emitting connected ack:", e)

    @sio.event
    async def disconnect(sid):
        """
        Clean up in-memory state and DB participant entries keyed by sid.
        """
        try:
            print(f"[SOCKET] Client disconnected: {sid}")

            rooms_to_clean = []
            # Collect rooms + user_info that need removal
            for room_id, participants in list(active_rooms.items()):
                if sid in participants:
                    user_info = participants[sid]
                    user_id = user_info.get("user_id")
                    
                    # Clean up user_connections tracking
                    if user_id in user_connections:
                        user_connections[user_id].discard(sid)
                        if not user_connections[user_id]:
                            del user_connections[user_id]
                    
                    rooms_to_clean.append((room_id, user_info, sid))
                    # remove from memory
                    del participants[sid]
                    # if room becomes empty, delete room entry and stop heartbeat
                    if not participants:
                        del active_rooms[room_id]
                        # Stop heartbeat for empty room
                        if room_id in heartbeat_tasks:
                            heartbeat_tasks[room_id].cancel()
                            del heartbeat_tasks[room_id]

            # Update DB and notify others
            if rooms_to_clean:
                db = await _get_db()
                for room_id, user_info, removed_sid in rooms_to_clean:
                    try:
                        # Broadcast user left event
                        await sio.emit("user_left", {
                            "userId": user_info.get("user_id"),
                            "userName": user_info.get("user_name"),
                            "userType": user_info.get("user_type"),
                            "timestamp": datetime.datetime.utcnow().isoformat()
                        }, room=room_id)
                        
                        # Update participants list
                        await _broadcast_participants_update(room_id)
                    except Exception as e:
                        print("[SOCKET] Error broadcasting user_left:", e)

                    # Update DB
                    try:
                        if db is not None:
                            interview_id = room_id.replace("interview_", "")
                            try:
                                interview_oid = ObjectId(interview_id)
                            except Exception:
                                interview_oid = interview_id
                            
                            result = await db.interviews.update_one(
                                {"_id": interview_oid},
                                {
                                    "$pull": {"participants": {"sid": removed_sid}},
                                    "$set": {"updated_at": datetime.datetime.utcnow()}
                                }
                            )
                            print(f"[SOCKET] Removed participant {removed_sid} from DB")
                    except Exception as e:
                        print("[SOCKET ERROR] disconnect db update:", str(e))

        except Exception as e:
            print("[SOCKET ERROR] disconnect overall:", e)
            traceback.print_exc()

    # -------------------------
    # Room lifecycle events
    # -------------------------
    @sio.event
    async def join_room(sid, data):
        """
        data expected:
          {
            "roomId": "interview_<id>",
            "userId": "<user id or email>",
            "userName": "<display name>",
            "userType": "hr" | "candidate",
            "interviewId": "<raw_interview_id_optional>"
          }
        """
        room_id = data.get("roomId")
        user_id = data.get("userId")
        user_name = data.get("userName")
        user_type = data.get("userType")
        
        print(f"[SOCKET] 🚀 join_room called: room={room_id}, user={user_name}({user_type}), sid={sid}")
        
        if not all([room_id, user_id, user_name, user_type]):
            error_msg = "Missing required fields for join_room"
            print(f"[SOCKET] ❌ {error_msg}")
            await sio.emit("error", {"message": error_msg}, room=sid)
            return

        async with _get_sync_lock(room_id):
            try:
                # Clean up duplicate connections for this user FIRST
                await _cleanup_duplicate_connections(user_id, sid)

                db = await _get_db()
                if db is None:
                    error_msg = "Database unavailable"
                    print(f"[SOCKET] ❌ {error_msg}")
                    await sio.emit("error", {"message": error_msg}, room=sid)
                    return

                # Determine interview_id
                interview_id = data.get("interviewId") or room_id.replace("interview_", "")
                print(f"[SOCKET] Looking up interview: {interview_id}")
                
                try:
                    interview_oid = ObjectId(interview_id)
                except Exception:
                    interview_oid = interview_id

                interview = await db.interviews.find_one({"_id": interview_oid})
                if not interview:
                    error_msg = f"Interview not found: {interview_id}"
                    print(f"[SOCKET] ❌ {error_msg}")
                    await sio.emit("error", {"message": error_msg}, room=sid)
                    return

                if not interview.get("room_id"):
                    error_msg = "Room not created for this interview"
                    print(f"[SOCKET] ❌ {error_msg}")
                    await sio.emit("error", {"message": error_msg}, room=sid)
                    return

                # Authorization check
                if user_type == "hr" and interview.get("hr_id") != user_id:
                    error_msg = "HR not authorized for this interview"
                    print(f"[SOCKET] ❌ {error_msg}")
                    await sio.emit("error", {"message": error_msg}, room=sid)
                    return
                if user_type == "candidate" and interview.get("candidate_id") != user_id:
                    error_msg = "Candidate not authorized for this interview"
                    print(f"[SOCKET] ❌ {error_msg}")
                    await sio.emit("error", {"message": error_msg}, room=sid)
                    return

                # Join socket room
                try:
                    await sio.enter_room(sid, room_id)
                    print(f"[SOCKET] ✅ Socket {sid} joined room {room_id}")
                except Exception as e:
                    error_msg = f"Failed to join socket room: {str(e)}"
                    print(f"[SOCKET] ❌ {error_msg}")
                    await sio.emit("error", {"message": error_msg}, room=sid)
                    return

                # Track in-memory
                join_time = datetime.datetime.utcnow()
                if room_id not in active_rooms:
                    active_rooms[room_id] = {}
                
                active_rooms[room_id][sid] = {
                    "user_id": user_id,
                    "user_name": user_name,
                    "user_type": user_type,
                    "joined_at": join_time.isoformat()
                }

                # Update DB - remove stale entries first
                try:
                    await db.interviews.update_one(
                        {"_id": interview_oid},
                        {"$pull": {"participants": {"$or": [{"user_id": user_id}, {"sid": sid}]}}}
                    )
                    
                    participant_doc = {
                        "sid": sid,
                        "user_id": user_id,
                        "user_name": user_name,
                        "user_type": user_type,
                        "joined_at": join_time
                    }
                    
                    await db.interviews.update_one(
                        {"_id": interview_oid},
                        {
                            "$push": {"participants": participant_doc},
                            "$set": {"room_status": "active", "updated_at": join_time}
                        }
                    )
                    print(f"[SOCKET] ✅ Updated DB for participant {user_name}")
                except Exception as e:
                    print(f"[SOCKET] Warning: failed to update DB participant: {e}")

                # Build participants list from memory
                mem_participants = []
                seen_users = set()
                for s, p in active_rooms.get(room_id, {}).items():
                    uid = p["user_id"]
                    if uid not in seen_users:
                        seen_users.add(uid)
                        mem_participants.append({
                            "userId": uid,
                            "userName": p["user_name"],
                            "userType": p["user_type"],
                            "joinedAt": p["joined_at"]
                        })

                print(f"[SOCKET] 📊 Room {room_id} has {len(mem_participants)} participants: {[p['userName'] for p in mem_participants]}")

                # Send room_joined with COMPLETE data
                room_joined_data = {
                    "roomId": room_id,
                    "participants": mem_participants,
                    "interviewInfo": {
                        "interviewId": str(interview_id),
                        "date": interview.get("date"),
                        "time": interview.get("time"),
                        "duration": interview.get("duration"),
                        "type": interview.get("type"),
                        "field": interview.get("field", "general"),
                        "status": interview.get("status", "scheduled"),
                        "currentQuestionIndex": interview.get("current_question_index", 0),
                        "startedAt": interview.get("started_at").isoformat() if interview.get("started_at") else None,
                        "questions": interview.get("questions", []),
                        "totalQuestions": len(interview.get("questions", []))
                    }
                }
                
                print(f"[SOCKET] 📨 Sending room_joined to {sid} with interview status: {interview.get('status')}")
                await sio.emit("room_joined", room_joined_data, room=sid)

                # Broadcast user_joined to others in room
                user_joined_data = {
                    "userId": user_id,
                    "userName": user_name,
                    "userType": user_type,
                    "timestamp": join_time.isoformat()
                }
                await sio.emit("user_joined", user_joined_data, room=room_id, skip_sid=sid)

                # Update participants list for everyone
                await _broadcast_participants_update(room_id)

                # If interview is in progress, send state sync
                if interview.get("status") == "in_progress":
                    print(f"[SOCKET] 🔄 Interview in progress, sending state sync to {sid}")
                    state_sync_data = {
                        "status": "in_progress",
                        "currentQuestionIndex": interview.get("current_question_index", 0),
                        "startedAt": interview.get("started_at").isoformat(),
                        "participants": mem_participants,
                        "serverTime": datetime.datetime.utcnow().isoformat(),
                        "currentPhase": "reading",
                        "timeRemaining": 8
                    }
                    await sio.emit("interview_state_sync", state_sync_data, room=sid)

                # Start heartbeat for room if not already running
                if room_id not in heartbeat_tasks and active_rooms[room_id]:
                    heartbeat_tasks[room_id] = asyncio.create_task(_start_room_heartbeat(room_id))
                    print(f"[SOCKET] ❤️  Started heartbeat for room {room_id}")

                print(f"[SOCKET] ✅ SUCCESS: {user_name} ({user_type}) fully joined room {room_id}")

            except Exception as e:
                print(f"[SOCKET ERROR] ❌ join_room failed: {str(e)}")
                traceback.print_exc()
                try:
                    await sio.emit("error", {"message": f"Join room failed: {str(e)}"}, room=sid)
                except Exception:
                    pass

    # -------------------------
    # Interview control events - FIXED
    # -------------------------
    @sio.event
    async def interview_started(sid, data):
        """HR starts interview. Data: { roomId }"""
        room_id = data.get("roomId")
        print(f"[SOCKET] 🎬 interview_started: room={room_id}, sender={sid}")
        
        if not room_id:
            await sio.emit("error", {"message": "Missing roomId"}, room=sid)
            return

        async with _get_sync_lock(room_id):
            try:
                # Validate sender
                if room_id not in active_rooms or sid not in active_rooms[room_id]:
                    await sio.emit("error", {"message": "Not in room"}, room=sid)
                    return

                sender = active_rooms[room_id][sid]
                if sender.get("user_type") != "hr":
                    await sio.emit("error", {"message": "Only HR can start"}, room=sid)
                    return

                # Check candidate presence
                candidate_present = any(
                    p.get("user_type") == "candidate" 
                    for p in active_rooms[room_id].values()
                )
                
                if not candidate_present:
                    await sio.emit("error", {"message": "Candidate must be present"}, room=sid)
                    return

                server_time = datetime.datetime.utcnow()

                # Update database
                db = await _get_db()
                if db is not None:
                    interview_id = room_id.replace("interview_", "")
                    try:
                        interview_oid = ObjectId(interview_id)
                    except Exception:
                        interview_oid = interview_id
                        
                    await db.interviews.update_one(
                        {"_id": interview_oid},
                        {"$set": {
                            "status": "in_progress",
                            "started_at": server_time,
                            "current_question_index": 0,
                            "updated_at": server_time
                        }}
                    )
                    print(f"[SOCKET] ✅ DB updated for interview start")

                # Broadcast to ALL
                broadcast_data = {
                    "roomId": room_id,
                    "timestamp": server_time.isoformat(),
                    "serverTime": server_time.isoformat(),
                    "currentQuestionIndex": 0,
                    "message": "Interview started!"
                }
                
                await sio.emit("interview_started", broadcast_data, room=room_id)
                print(f"[SOCKET] ✅ Broadcasted interview_started to room {room_id}")

            except Exception as e:
                print(f"[SOCKET ERROR] interview_started: {e}")
                traceback.print_exc()
                await sio.emit("error", {"message": str(e)}, room=sid)

    @sio.event
    async def request_sync(sid, data):
        """
        Client requests authoritative state for room.
        Data: { roomId }
        """
        room_id = data.get("roomId")
        print(f"[SOCKET] 🔄 request_sync from {sid} for room {room_id}")
        
        if not room_id:
            return

        async with _get_sync_lock(room_id):
            try:
                # Small debounce to prevent rapid sync requests
                await asyncio.sleep(0.1)

                db = await _get_db()
                if db is None:
                    await sio.emit("interview_state_sync", {
                        "status": "unknown",
                        "currentQuestionIndex": 0,
                        "startedAt": None,
                        "participants": [],
                        "serverTime": datetime.datetime.utcnow().isoformat()
                    }, room=sid)
                    return

                interview_id = room_id.replace("interview_", "")
                try:
                    interview_oid = ObjectId(interview_id)
                except Exception:
                    interview_oid = interview_id

                interview = await db.interviews.find_one({"_id": interview_oid})
                if not interview:
                    await sio.emit("interview_state_sync", {
                        "status": "not_found",
                        "currentQuestionIndex": 0,
                        "startedAt": None,
                        "participants": [],
                        "serverTime": datetime.datetime.utcnow().isoformat()
                    }, room=sid)
                    return

                # Participants from memory for realtime accuracy
                mem_participants = []
                if room_id in active_rooms:
                    seen = set()
                    for s, p in active_rooms[room_id].items():
                        if p["user_id"] not in seen:
                            seen.add(p["user_id"])
                            mem_participants.append({
                                "userId": p["user_id"],
                                "userName": p["user_name"],
                                "userType": p["user_type"],
                                "joinedAt": p["joined_at"]
                            })

                state_sync_data = {
                    "status": interview.get("status", "scheduled"),
                    "currentQuestionIndex": interview.get("current_question_index", 0),
                    "startedAt": interview.get("started_at").isoformat() if interview.get("started_at") else None,
                    "participants": mem_participants,
                    "serverTime": datetime.datetime.utcnow().isoformat(),
                    "questions": interview.get("questions", []),
                    "totalQuestions": len(interview.get("questions", []))
                }

                await sio.emit("interview_state_sync", state_sync_data, room=sid)
                print(f"[SOCKET] ✅ Sent state sync to {sid} for room {room_id}, status: {interview.get('status')}")

            except Exception as e:
                print(f"[SOCKET ERROR] request_sync: {e}")
                traceback.print_exc()

    # -------------------------
    # Additional event handlers
    # -------------------------
    @sio.event
    async def leave_room(sid, data):
        """Client-initiated leave room"""
        room_id = data.get("roomId")
        print(f"[SOCKET] leave_room: {sid} from {room_id}")
        
        if not room_id:
            return

        user_info = None
        if room_id in active_rooms and sid in active_rooms[room_id]:
            user_info = active_rooms[room_id].pop(sid)
            if not active_rooms[room_id]:
                del active_rooms[room_id]
                # Stop heartbeat for empty room
                if room_id in heartbeat_tasks:
                    heartbeat_tasks[room_id].cancel()
                    del heartbeat_tasks[room_id]

        # Leave socket.io room
        try:
            await sio.leave_room(sid, room_id)
        except Exception as e:
            print(f"[SOCKET] leave_room error: {e}")

        # Update DB and broadcast
        if user_info:
            db = await _get_db()
            try:
                if db is not None:
                    interview_id = room_id.replace("interview_", "")
                    try:
                        interview_oid = ObjectId(interview_id)
                    except Exception:
                        interview_oid = interview_id
                    await db.interviews.update_one(
                        {"_id": interview_oid},
                        {
                            "$pull": {"participants": {"sid": sid}},
                            "$set": {"updated_at": datetime.datetime.utcnow()}
                        }
                    )
            except Exception as e:
                print(f"[SOCKET ERROR] leave_room db update: {e}")

            # Broadcast user_left
            try:
                await sio.emit("user_left", {
                    "userId": user_info.get("user_id"),
                    "userName": user_info.get("user_name"),
                    "userType": user_info.get("user_type"),
                    "timestamp": datetime.datetime.utcnow().isoformat()
                }, room=room_id)
            except Exception as e:
                print(f"[SOCKET] leave_room broadcast error: {e}")

            await _broadcast_participants_update(room_id)
            print(f"[SOCKET] {user_info.get('user_name')} left room {room_id}")

    @sio.event
    async def get_participants(sid, data):
        """Emit participants_list to requesting sid"""
        room_id = data.get("roomId")
        if not room_id:
            await sio.emit("participants_list", {"participants": []}, room=sid)
            return

        mem_participants = []
        if room_id in active_rooms:
            seen = set()
            for s, p in active_rooms[room_id].items():
                if p["user_id"] not in seen:
                    seen.add(p["user_id"])
                    mem_participants.append({
                        "userId": p["user_id"],
                        "userName": p["user_name"],
                        "userType": p["user_type"],
                        "joinedAt": p["joined_at"]
                    })

        await sio.emit("participants_list", {"participants": mem_participants}, room=sid)

    @sio.event
    async def send_chat_message(sid, data):
        """Simple chat broadcasting"""
        room_id = data.get("roomId")
        message = data.get("message")
        if not room_id or not message:
            return

        if room_id not in active_rooms or sid not in active_rooms[room_id]:
            return

        sender = active_rooms[room_id][sid]
        await sio.emit("chat_message", {
            "userId": sender["user_id"],
            "userName": sender["user_name"],
            "userType": sender["user_type"],
            "message": message,
            "timestamp": datetime.datetime.utcnow().isoformat()
        }, room=room_id)

    @sio.event
    async def next_question(sid, data):
        """Move to next question - FIXED"""
        room_id = data.get("roomId")
        next_index = data.get("nextIndex")
        is_complete = data.get("isComplete", False)
        
        print(f"[SOCKET] ➡️ next_question: room={room_id}, nextIndex={next_index}, complete={is_complete}")
        
        if room_id is None or next_index is None:
            print(f"[SOCKET] ❌ Missing required fields")
            return

        async with _get_sync_lock(room_id):
            try:
                server_time = datetime.datetime.utcnow()
                
                # Update database
                db = await _get_db()
                if db is not None:
                    interview_id = room_id.replace("interview_", "")
                    try:
                        interview_oid = ObjectId(interview_id)
                    except Exception:
                        interview_oid = interview_id

                    update_data = {
                        "current_question_index": next_index, 
                        "updated_at": server_time
                    }
                    
                    if is_complete:
                        update_data["status"] = "completed"
                        update_data["completed_at"] = server_time

                    result = await db.interviews.update_one(
                        {"_id": interview_oid}, 
                        {"$set": update_data}
                    )
                    print(f"[SOCKET] ✅ DB updated: matched={result.matched_count}, modified={result.modified_count}")

                # Broadcast to ALL participants
                broadcast_data = {
                    "roomId": room_id,
                    "nextIndex": next_index,
                    "isComplete": is_complete,
                    "timestamp": server_time.isoformat(),
                    "serverTime": server_time.isoformat()
                }
                
                await sio.emit("next_question", broadcast_data, room=room_id)
                print(f"[SOCKET] ✅ Broadcasted next_question to room {room_id}: Q{next_index}, complete={is_complete}")
                
            except Exception as e:
                print(f"[SOCKET ERROR] next_question failed: {e}")
                traceback.print_exc()

    print("[SOCKET] ✅ All event handlers registered successfully")
    return None