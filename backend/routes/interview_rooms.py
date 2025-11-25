# routes/interview_rooms.py - FIXED VERSION with server-side socket broadcasts

from fastapi import APIRouter, HTTPException, status, Request
from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import uuid4
from db.database import Database
import os
import datetime

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

# --- Fallback Question Bank (if no DB questions found) ---
QUESTION_BANK = {
    "web_development": [
        {"id": "web-1", "text": "What is React and why use it?", "difficulty": "easy", "type": "technical"},
        {"id": "web-2", "text": "Explain hooks and give an example using useEffect.", "difficulty": "medium", "type": "technical"},
        {"id": "web-3", "text": "How do you optimize React rendering performance?", "difficulty": "hard", "type": "technical"}
    ],
    "backend_development": [
        {"id": "back-1", "text": "Explain REST and how it differs from GraphQL.", "difficulty": "easy", "type": "technical"},
        {"id": "back-2", "text": "Describe transactions in relational databases.", "difficulty": "medium", "type": "technical"},
        {"id": "back-3", "text": "How would you design an authentication system?", "difficulty": "hard", "type": "technical"}
    ],
    "data_science": [
        {"id": "ds-1", "text": "What is the difference between supervised and unsupervised learning?", "difficulty": "easy", "type": "technical"},
        {"id": "ds-2", "text": "Explain overfitting and how to prevent it.", "difficulty": "medium", "type": "technical"},
        {"id": "ds-3", "text": "How do you handle imbalanced datasets?", "difficulty": "hard", "type": "technical"}
    ],
    "general": [
        {"id": "gen-1", "text": "Tell me about your experience relevant to this role.", "difficulty": "easy", "type": "behavioral"},
        {"id": "gen-2", "text": "Why are you interested in this position?", "difficulty": "easy", "type": "behavioral"},
        {"id": "gen-3", "text": "Describe a challenging project you worked on.", "difficulty": "medium", "type": "behavioral"}
    ]
}

# --- Create Interview Room ---
@router.post("/create", response_model=CreateRoomResponse)
async def create_interview_room(payload: CreateRoomRequest):
    """
    Create a room for an existing scheduled interview.
    Only the HR who scheduled it can create the room.
    Automatically loads questions based on interview field.
    """
    db = await Database.get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database unavailable")

    interview = await db.interviews.find_one({"_id": payload.interview_id})
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    if payload.hr_id and interview.get("hr_id") != payload.hr_id:
        raise HTTPException(status_code=403, detail="Only the scheduling HR can create this room")

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
    
    field_key = interview.get("field", "general")
    print(f"[INFO] Loading questions for field: {field_key}")
    
    question_list = []
    try:
        questions_cursor = db.interview_questions.find({"field": field_key}).limit(10)
        questions_from_db = await questions_cursor.to_list(length=10)
        
        if questions_from_db:
            print(f"[INFO] Found {len(questions_from_db)} questions in DB for field {field_key}")
            question_list = [
                {
                    "id": str(q["_id"]),
                    "text": q["question_text"],
                    "difficulty": q.get("difficulty", "medium"),
                    "type": q.get("question_type", "technical")
                }
                for q in questions_from_db
            ]
        else:
            print(f"[WARN] No questions found in DB for field {field_key}, using fallback")
            question_list = QUESTION_BANK.get(field_key, QUESTION_BANK.get("general", []))
    except Exception as e:
        print(f"[ERROR] Error fetching questions: {e}")
        question_list = QUESTION_BANK.get(field_key, QUESTION_BANK.get("general", []))
    
    if not question_list:
        question_list = QUESTION_BANK["general"]
    
    print(f"[INFO] Loaded {len(question_list)} questions for interview")

    now = datetime.datetime.utcnow()
    await db.interviews.update_one(
        {"_id": payload.interview_id},
        {
            "$set": {
                "room_id": room_id,
                "room_status": "created",
                "questions": question_list,
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

    return CreateRoomResponse(
        interviewId=payload.interview_id,
        roomId=room_id,
        joinUrl=join_url,
        candidateId=interview["candidate_id"],
        hrId=interview.get("hr_id", "")
    )


# --- FIXED: Start Interview with Server-Side Broadcast ---
@router.post("/{interview_id}/start-interview")
async def start_interview(interview_id: str, request: Request):
    """
    Start the interview (HR only).
    Sets status to 'in_progress' and broadcasts to all participants.
    """
    db = await Database.get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database unavailable")

    interview = await db.interviews.find_one({"_id": interview_id})
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    if not interview.get("room_id"):
        raise HTTPException(status_code=400, detail="Room not created yet")

    # Update database
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

    print(f"[API] Interview {interview_id} started, broadcasting to room {interview['room_id']}")

    # ✅ CRITICAL FIX: Server-side broadcast via Socket.IO
    try:
        sio = request.app.state.sio  # Access socket.io instance from app state
        await sio.emit('interview_started', {
            'roomId': interview['room_id'],
            'timestamp': datetime.datetime.utcnow().isoformat()
        }, room=interview['room_id'])
        print(f"[API] Broadcasted interview_started to room {interview['room_id']}")
    except Exception as e:
        print(f"[ERROR] Failed to broadcast interview_started: {e}")

    return {
        "message": "Interview started successfully",
        "status": "in_progress"
    }


# --- FIXED: Submit Answer with Server-Side Broadcast ---
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
        "difficulty": question.get("difficulty"),
        "answer": answer_text,
        "answered_by": user_id,
        "answered_at": timestamp,
        "question_index": question_index
    }

    next_index = question_index + 1
    is_last = next_index >= len(questions)

    # Update database
    update_data = {
        "current_question_index": next_index,
        "updated_at": timestamp
    }
    
    if is_last:
        update_data["status"] = "completed"
        update_data["completed_at"] = timestamp

    await db.interviews.update_one(
        {"_id": interview_id},
        {
            "$push": {"qa": qa_record},
            "$set": update_data
        }
    )

    print(f"[API] Answer submitted for Q{question_index}, moving to Q{next_index}, complete={is_last}")

    # ✅ CRITICAL FIX: Server-side broadcast via Socket.IO
    try:
        sio = request.app.state.sio
        await sio.emit('next_question', {
            'roomId': interview['room_id'],
            'nextIndex': next_index,
            'isComplete': is_last,
            'timestamp': timestamp.isoformat()
        }, room=interview['room_id'])
        print(f"[API] Broadcasted next_question to room {interview['room_id']}")
    except Exception as e:
        print(f"[ERROR] Failed to broadcast next_question: {e}")

    return {
        "message": "Answer submitted successfully",
        "next_question_index": next_index,
        "is_complete": is_last
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

    return {
        "interviewId": interview_id,
        "field": interview.get("field"),
        "questions": interview.get("questions", []),
        "current_question_index": interview.get("current_question_index", 0),
        "qa": interview.get("qa", []),
        "total_questions": len(interview.get("questions", [])),
        "status": interview.get("status", "scheduled"),
        "started_at": interview.get("started_at"),
        "completed_at": interview.get("completed_at")
    }


# --- Get Room Status ---
@router.get("/{interview_id}/status", response_model=RoomStatusResponse)
async def get_room_status(interview_id: str):
    """
    Get current status of an interview room.
    Returns room details and active participants.
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
    Returns interview details if authorized.
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
    Returns interviews with join URLs if rooms are created.
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