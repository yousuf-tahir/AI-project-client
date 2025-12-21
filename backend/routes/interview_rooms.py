# routes/interview_rooms.py - AI INTEGRATION COMPLETE

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Optional, List
import os
import datetime
import logging
import traceback

from db.database import Database

# AI handler imports with proper error handling
try:
    from ai_handler import generate_multiple_ai_questions, merge_questions, generate_ai_question
    AI_HANDLER_AVAILABLE = True
    logging.info("✅ AI handler imported successfully")
except ImportError as e:
    logging.warning(f"⚠️ AI handler not available: {e}")
    AI_HANDLER_AVAILABLE = False
    
    # Create dummy functions to prevent errors
    async def generate_multiple_ai_questions(*args, **kwargs):
        return []
    
    async def merge_questions(static_questions, ai_questions, strategy="alternate"):
        return static_questions + ai_questions
    
    async def generate_ai_question(*args, **kwargs):
        return None

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/interview-rooms", tags=["interview-rooms"])

# --- Request/Response Models ---
class CreateRoomRequest(BaseModel):
    interview_id: str = Field(..., description="The scheduled interview ID")
    hr_id: Optional[str] = Field(None, description="HR user creating the room")

class CreateRoomResponse(BaseModel):
    interviewId: str
    roomId: str
    joinUrl: str
    candidateId: str
    hrId: str

class JoinRoomRequest(BaseModel):
    room_id: str
    user_id: str
    user_type: str = Field(..., description="'hr' or 'candidate'")

class RoomStatusResponse(BaseModel):
    roomId: str
    interviewId: str
    status: str
    participants: List[dict]
    createdAt: str

# --- Fallback Question Bank ---
QUESTION_BANK = {
    "web_development": [
        {"id": "web-1", "text": "What is React and why use it?", "difficulty": "easy", "type": "technical", "source": "fallback"},
        {"id": "web-2", "text": "Explain hooks and give an example using useEffect.", "difficulty": "medium", "type": "technical", "source": "fallback"},
        {"id": "web-3", "text": "How do you optimize React rendering performance?", "difficulty": "hard", "type": "technical", "source": "fallback"},
        {"id": "web-4", "text": "What are the key differences between REST and GraphQL?", "difficulty": "medium", "type": "technical", "source": "fallback"},
        {"id": "web-5", "text": "Explain the virtual DOM and its benefits.", "difficulty": "medium", "type": "technical", "source": "fallback"}
    ],
    "backend_development": [
        {"id": "back-1", "text": "Explain REST and how it differs from GraphQL.", "difficulty": "easy", "type": "technical", "source": "fallback"},
        {"id": "back-2", "text": "Describe transactions in relational databases.", "difficulty": "medium", "type": "technical", "source": "fallback"},
        {"id": "back-3", "text": "How would you design an authentication system?", "difficulty": "hard", "type": "technical", "source": "fallback"},
        {"id": "back-4", "text": "What is SQL injection and how do you prevent it?", "difficulty": "medium", "type": "technical", "source": "fallback"},
        {"id": "back-5", "text": "Explain microservices architecture.", "difficulty": "hard", "type": "technical", "source": "fallback"}
    ],
    "data_science": [
        {"id": "ds-1", "text": "What is the difference between supervised and unsupervised learning?", "difficulty": "easy", "type": "technical", "source": "fallback"},
        {"id": "ds-2", "text": "Explain overfitting and how to prevent it.", "difficulty": "medium", "type": "technical", "source": "fallback"},
        {"id": "ds-3", "text": "How do you handle imbalanced datasets?", "difficulty": "hard", "type": "technical", "source": "fallback"},
        {"id": "ds-4", "text": "What is cross-validation and why is it important?", "difficulty": "medium", "type": "technical", "source": "fallback"},
        {"id": "ds-5", "text": "Explain the bias-variance tradeoff.", "difficulty": "hard", "type": "technical", "source": "fallback"}
    ],
    "devops": [
        {"id": "devops-1", "text": "Explain CI/CD pipeline and its benefits.", "difficulty": "easy", "type": "technical", "source": "fallback"},
        {"id": "devops-2", "text": "How do you handle container orchestration with Kubernetes?", "difficulty": "medium", "type": "technical", "source": "fallback"},
        {"id": "devops-3", "text": "Design a highly available infrastructure on AWS.", "difficulty": "hard", "type": "technical", "source": "fallback"},
        {"id": "devops-4", "text": "What is Infrastructure as Code and why use it?", "difficulty": "medium", "type": "technical", "source": "fallback"},
        {"id": "devops-5", "text": "Explain Docker and containerization benefits.", "difficulty": "easy", "type": "technical", "source": "fallback"}
    ],
    "mobile_development": [
        {"id": "mobile-1", "text": "What are the differences between iOS and Android development?", "difficulty": "easy", "type": "technical", "source": "fallback"},
        {"id": "mobile-2", "text": "Explain state management in React Native.", "difficulty": "medium", "type": "technical", "source": "fallback"},
        {"id": "mobile-3", "text": "How do you optimize mobile app performance?", "difficulty": "hard", "type": "technical", "source": "fallback"},
        {"id": "mobile-4", "text": "What are the key considerations for mobile app security?", "difficulty": "medium", "type": "technical", "source": "fallback"},
        {"id": "mobile-5", "text": "Explain push notifications and their implementation.", "difficulty": "medium", "type": "technical", "source": "fallback"}
    ],
    "general": [
        {"id": "gen-1", "text": "Tell me about your experience relevant to this role.", "difficulty": "easy", "type": "behavioral", "source": "fallback"},
        {"id": "gen-2", "text": "Why are you interested in this position?", "difficulty": "easy", "type": "behavioral", "source": "fallback"},
        {"id": "gen-3", "text": "Describe a challenging project you worked on.", "difficulty": "medium", "type": "behavioral", "source": "fallback"},
        {"id": "gen-4", "text": "How do you handle tight deadlines?", "difficulty": "medium", "type": "behavioral", "source": "fallback"},
        {"id": "gen-5", "text": "Describe a time you had to learn a new technology quickly.", "difficulty": "medium", "type": "behavioral", "source": "fallback"}
    ]
}

# --- Create Interview Room ---
@router.post("/create", response_model=CreateRoomResponse)
async def create_interview_room(payload: CreateRoomRequest):
    """
    Create a room for an existing scheduled interview.
    Only the HR who scheduled it can create the room.
    Questions will be loaded when interview starts.
    """
    db = await Database.get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database unavailable")

    interview = await db.interviews.find_one({"_id": payload.interview_id})
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    if payload.hr_id and interview.get("hr_id") != payload.hr_id:
        raise HTTPException(status_code=403, detail="Only the scheduling HR can create this room")

    # If room already exists, return existing data
    if interview.get("room_id"):
        frontend_base = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")
        return CreateRoomResponse(
            interviewId=payload.interview_id,
            roomId=interview["room_id"],
            joinUrl=f"{frontend_base}/interview-room/{payload.interview_id}",
            candidateId=interview["candidate_id"],
            hrId=interview.get("hr_id", "")
        )

    room_id = f"interview_{payload.interview_id}"
    
    logger.info(f"Creating room for interview: {payload.interview_id}")

    # Don't load questions here - they'll be loaded on interview start
    now = datetime.datetime.utcnow()
    await db.interviews.update_one(
        {"_id": payload.interview_id},
        {
            "$set": {
                "room_id": room_id,
                "room_status": "created",
                "status": "scheduled",
                "questions": [],  # Empty - will be populated on start
                "current_question_index": 0,
                "qa": [],
                "participants": [],
                "room_created_at": now,
                "updated_at": now
            }
        }
    )

    frontend_base = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")
    join_url = f"{frontend_base}/interview-room/{payload.interview_id}"

    logger.info(f"✅ Room created: {room_id}")
    
    return CreateRoomResponse(
        interviewId=payload.interview_id,
        roomId=room_id,
        joinUrl=join_url,
        candidateId=interview["candidate_id"],
        hrId=interview.get("hr_id", "")
    )


# --- Start Interview with AI Question Generation ---
@router.post("/{interview_id}/start-interview")
async def start_interview(interview_id: str, request: Request):
    """
    Start the interview (HR only).
    Generates AI questions, merges with static questions, and broadcasts to all participants.
    """
    logger.info(f"\n{'='*80}")
    logger.info(f"🚀 START INTERVIEW CALLED - ID: {interview_id}")
    logger.info(f"{'='*80}")
    
    db = await Database.get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database unavailable")

    interview = await db.interviews.find_one({"_id": interview_id})
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    if not interview.get("room_id"):
        raise HTTPException(status_code=400, detail="Room not created yet")

    field = interview.get("field", "general")
    logger.info(f"📂 Interview field: {field}")
    
    # ============================================
    # STEP 1: Load Static Questions from Database
    # ============================================
    static_questions = []
    try:
        logger.info(f"🔍 Searching database for {field} questions...")
        questions_cursor = db.interview_questions.find({"field": field}).limit(5)
        questions_from_db = await questions_cursor.to_list(length=5)
        
        if questions_from_db:
            logger.info(f"✅ Found {len(questions_from_db)} questions in database")
            static_questions = [
                {
                    "id": str(q["_id"]),
                    "text": q["question_text"],
                    "difficulty": q.get("difficulty", "medium"),
                    "type": q.get("question_type", "technical"),
                    "source": "database"
                }
                for q in questions_from_db
            ]
        else:
            logger.warning(f"⚠️ No database questions found, using fallback")
            static_questions = QUESTION_BANK.get(field, QUESTION_BANK.get("general", []))[:5]
        
        logger.info(f"📝 Static questions loaded: {len(static_questions)}")
        for i, q in enumerate(static_questions, 1):
            logger.info(f"   {i}. [{q.get('source', 'unknown')}] {q['text'][:60]}...")
            
    except Exception as e:
        logger.error(f"❌ Error loading static questions: {e}")
        traceback.print_exc()
        static_questions = QUESTION_BANK.get(field, QUESTION_BANK.get("general", []))[:5]
    
    # ============================================
    # STEP 2: Generate AI Questions
    # ============================================
    ai_questions = []
    
    if AI_HANDLER_AVAILABLE:
        try:
            api_key = os.getenv("GROQ_API_KEY")
            
            if api_key:
                logger.info(f"🤖 Generating AI questions for field: {field}")
                logger.info(f"🔑 API Key present: {api_key[:20]}...")
                
                # Generate 3 AI questions with difficulty mix
                ai_questions = await generate_multiple_ai_questions(
                    interview_id=interview_id,
                    field=field,
                    count=8,
                    difficulty_mix=True
                )
                
                if ai_questions:
                    logger.info(f"✅ Generated {len(ai_questions)} AI questions")
                    for i, q in enumerate(ai_questions, 1):
                        logger.info(f"   {i}. [AI-{q.get('difficulty', 'medium')}] {q['text'][:60]}...")
                else:
                    logger.warning("⚠️ AI generation returned empty list")
            else:
                logger.warning("⚠️ No GROQ_API_KEY found - skipping AI generation")
                
        except Exception as e:
            logger.error(f"❌ AI question generation failed: {e}")
            traceback.print_exc()
    else:
        logger.warning("⚠️ AI handler not available - using static questions only")
    
    # ============================================
    # STEP 3: Merge Questions
    # ============================================
    logger.info(f"\n🔀 Merging questions...")
    logger.info(f"   Static: {len(static_questions)}")
    logger.info(f"   AI: {len(ai_questions)}")
    
    try:
        # Use alternate strategy: static, AI, static, AI, ...
        final_questions = await merge_questions(
            static_questions=static_questions,
            ai_questions=ai_questions,
            strategy="alternate"
        )
        logger.info(f"✅ Merged successfully: {len(final_questions)} total questions")
    except Exception as e:
        logger.error(f"❌ Merge failed: {e}")
        # Fallback: just combine them
        final_questions = static_questions + ai_questions
    
    # Display final question list
    logger.info(f"\n📋 FINAL QUESTION LIST ({len(final_questions)} total):")
    for i, q in enumerate(final_questions, 1):
        source = q.get('source', 'unknown')
        emoji = "🤖" if source == "ai_generated" else "📚"
        logger.info(f"   {i}. {emoji} [{source}] {q['text'][:60]}...")
    
    # ============================================
    # STEP 4: Save to Database
    # ============================================
    logger.info(f"\n💾 Saving to database...")
    server_time = datetime.datetime.utcnow()
    
    try:
        await db.interviews.update_one(
            {"_id": interview_id},
            {
                "$set": {
                    "status": "in_progress",
                    "started_at": server_time,
                    "updated_at": server_time,
                    "current_question_index": 0,
                    "questions": final_questions
                }
            }
        )
        logger.info(f"✅ Database updated successfully")
    except Exception as e:
        logger.error(f"❌ Database update failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update interview: {str(e)}")

    # ============================================
    # STEP 5: Broadcast via Socket.IO
    # ============================================
    logger.info(f"\n📡 Broadcasting to room: {interview['room_id']}")
    
    try:
        sio = getattr(request.app.state, 'sio', None)
        
        if sio is not None:
            broadcast_data = {
                'roomId': interview['room_id'],
                'timestamp': server_time.isoformat(),
                'serverTime': server_time.isoformat(),
                'currentQuestionIndex': 0,
                'totalQuestions': len(final_questions),
                'questions': final_questions
            }
            
            await sio.emit('interview_started', broadcast_data, room=interview['room_id'])
            logger.info(f"✅ Broadcast successful")
        else:
            logger.warning("⚠️ Socket.IO not available in app.state")
        
    except Exception as e:
        logger.error(f"❌ Broadcast failed: {e}")
        traceback.print_exc()

    # ============================================
    # STEP 6: Return Response
    # ============================================
    static_count = len([q for q in final_questions if q.get("source") not in ["ai_generated", "ai_followup"]])
    ai_count = len([q for q in final_questions if q.get("source") == "ai_generated"])
    
    logger.info(f"\n✅ INTERVIEW STARTED SUCCESSFULLY")
    logger.info(f"   Total Questions: {len(final_questions)}")
    logger.info(f"   Static: {static_count}")
    logger.info(f"   AI Generated: {ai_count}")
    logger.info(f"{'='*80}\n")
    
    return {
        "message": "Interview started successfully",
        "status": "in_progress",
        "startedAt": server_time.isoformat(),
        "serverTime": server_time.isoformat(),
        "totalQuestions": len(final_questions),
        "staticQuestions": static_count,
        "aiQuestions": ai_count,
        "questions": final_questions
    }


# --- Submit Answer ---
@router.post("/{interview_id}/submit-answer")
async def submit_answer(interview_id: str, payload: dict, request: Request):
    """
    Submit an answer for the current question.
    Saves the Q&A pair, moves to next question, and broadcasts to all participants.
    """
    db = await Database.get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database unavailable")

    interview = await db.interviews.find_one({"_id": interview_id})
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    question_index = payload.get("question_index", 0)
    answer_text = payload.get("answer", "")
    user_id = payload.get("user_id")
    timestamp = datetime.datetime.utcnow()

    questions = interview.get("questions", [])
    if question_index >= len(questions):
        raise HTTPException(status_code=400, detail="Invalid question index")

    question = questions[question_index]

    qa_record = {
        "question_id": question.get("id"),
        "question_text": question.get("text"),
        "question_type": question.get("type"),
        "question_source": question.get("source", "unknown"),
        "difficulty": question.get("difficulty"),
        "answer": answer_text,
        "answered_by": user_id,
        "answered_at": timestamp,
        "question_index": question_index
    }

    next_index = question_index + 1
    is_last = next_index >= len(questions)
    
    logger.info(f"Answer submitted: Q{question_index}, next={next_index}, total={len(questions)}, isLast={is_last}")

    # Update database
    update_data = {
        "current_question_index": next_index,
        "updated_at": timestamp
    }
    
    if is_last:
        update_data["status"] = "completed"
        update_data["completed_at"] = timestamp
        update_data["room_status"] = "completed"
        logger.info(f"✅ Interview completed!")

    await db.interviews.update_one(
        {"_id": interview_id},
        {
            "$push": {"qa": qa_record},
            "$set": update_data
        }
    )

    # Broadcast via Socket.IO
    try:
        sio = getattr(request.app.state, 'sio', None)
        
        if sio is not None:
            room_id = interview['room_id']
            broadcast_data = {
                'roomId': room_id,
                'nextIndex': next_index,
                'isComplete': is_last,
                'timestamp': timestamp.isoformat(),
                'serverTime': timestamp.isoformat()
            }
            
            await sio.emit('next_question', broadcast_data, room=room_id)
            logger.info(f"✅ Broadcasted next_question: nextIndex={next_index}, isComplete={is_last}")
        else:
            logger.warning("⚠️ Socket.IO not available")
            
    except Exception as e:
        logger.error(f"❌ Broadcast failed: {e}")
        traceback.print_exc()

    return {
        "message": "Answer submitted successfully",
        "next_question_index": next_index,
        "is_complete": is_last,
        "serverTime": timestamp.isoformat()
    }


# --- Get Current State ---
@router.get("/{interview_id}/current-state")
async def get_current_interview_state(interview_id: str):
    """
    Get current state of interview including questions and current index.
    """
    db = await Database.get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database unavailable")

    interview = await db.interviews.find_one({"_id": interview_id})
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    server_time = datetime.datetime.utcnow()
    
    return {
        "interviewId": interview_id,
        "field": interview.get("field"),
        "questions": interview.get("questions", []),
        "current_question_index": interview.get("current_question_index", 0),
        "qa": interview.get("qa", []),
        "total_questions": len(interview.get("questions", [])),
        "status": interview.get("status", "scheduled"),
        "started_at": interview.get("started_at").isoformat() if interview.get("started_at") else None,
        "completed_at": interview.get("completed_at").isoformat() if interview.get("completed_at") else None,
        "serverTime": server_time.isoformat()
    }


# --- Get Room Status ---
@router.get("/{interview_id}/status", response_model=RoomStatusResponse)
async def get_room_status(interview_id: str):
    """
    Get current status of an interview room.
    """
    db = await Database.get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database unavailable")

    interview = await db.interviews.find_one({"_id": interview_id})
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    if not interview.get("room_id"):
        raise HTTPException(status_code=400, detail="Room not created yet")

    return RoomStatusResponse(
        roomId=interview["room_id"],
        interviewId=interview_id,
        status=interview.get("room_status", "created"),
        participants=interview.get("participants", []),
        createdAt=interview.get("room_created_at", "").isoformat() if interview.get("room_created_at") else ""
    )


# --- Validate Join Permission ---
@router.post("/validate-join")
async def validate_join(payload: JoinRoomRequest):
    """
    Validate that a user can join a specific room.
    """
    db = await Database.get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database unavailable")

    interview_id = payload.room_id.replace("interview_", "")
    
    interview = await db.interviews.find_one({"_id": interview_id})
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    if not interview.get("room_id"):
        raise HTTPException(status_code=400, detail="Room not created yet")

    if payload.user_type == "hr":
        if interview.get("hr_id") != payload.user_id:
            raise HTTPException(status_code=403, detail="Not authorized to join this room")
    elif payload.user_type == "candidate":
        if interview.get("candidate_id") != payload.user_id:
            raise HTTPException(status_code=403, detail="Not authorized to join this room")
    else:
        raise HTTPException(status_code=400, detail="Invalid user type")

    return {
        "authorized": True,
        "interviewId": interview_id,
        "roomId": interview["room_id"],
        "interviewDate": interview.get("date"),
        "interviewTime": interview.get("time"),
        "duration": interview.get("duration"),
        "type": interview.get("type"),
        "field": interview.get("field")
    }


# --- Get Candidate's Upcoming Interviews ---
@router.get("/candidate/{candidate_id}/upcoming")
async def get_candidate_interviews(candidate_id: str):
    """
    Get list of upcoming interviews for a candidate.
    """
    db = await Database.get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database unavailable")

    now = datetime.datetime.utcnow()
    interviews = await db.interviews.find({
        "candidate_id": candidate_id,
        "date": {"$gte": now.strftime("%Y-%m-%d")}
    }).sort("date", 1).to_list(length=50)

    frontend_base = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")
    
    result = []
    for interview in interviews:
        job_title = "Interview Session"
        if interview.get("job_id"):
            job = await db.jobs.find_one({"_id": interview["job_id"]})
            if job:
                job_title = job.get("title", "Interview Session")
        
        if interview.get("field"):
            field_display = interview["field"].replace("_", " ").title()
            job_title = f"{job_title} - {field_display}"
        
        item = {
            "interviewId": interview["_id"],
            "jobTitle": job_title,
            "date": interview.get("date"),
            "time": interview.get("time"),
            "duration": interview.get("duration", 30),
            "type": interview.get("type", "voice"),
            "field": interview.get("field"),
            "hasRoom": bool(interview.get("room_id")),
            "roomStatus": interview.get("room_status"),
            "joinUrl": None
        }
        
        if interview.get("room_id"):
            item["joinUrl"] = f"{frontend_base}/interview-room/{interview['_id']}"
        
        result.append(item)

    return result