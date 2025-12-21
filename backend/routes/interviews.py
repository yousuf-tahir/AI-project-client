# routes/interviews.py
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import uuid4
from db.database import Database
import datetime
from fastapi import Request
import logging

router = APIRouter(prefix="/api/interviews", tags=["interviews"])

# --- Request Models ---
class ScheduleInterviewRequest(BaseModel):
    candidate_id: str = Field(..., description="Candidate user ID")
    hr_id: Optional[str] = Field(None, description="HR user ID")
    date: str = Field(..., description="Interview date (YYYY-MM-DD)")
    time: str = Field(..., description="Interview time (HH:MM)")
    type: str = Field(..., description="Interview type: voice/text/both")
    duration: int = Field(30, description="Duration in minutes")
    field: str = Field(..., description="Job field for question selection")  # NEW
    job_id: Optional[str] = Field(None, description="Related job ID")

# --- Schedule Interview ---
@router.post("")
async def schedule_interview(payload: ScheduleInterviewRequest):
    """
    Schedule a new interview.
    Creates an interview document in the database.
    """
    db = await Database.get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database unavailable")

    # Generate interview ID
    interview_id = uuid4().hex
    
    # Validate date/time
    try:
        interview_datetime = datetime.datetime.strptime(
            f"{payload.date} {payload.time}", 
            "%Y-%m-%d %H:%M"
        )
        if interview_datetime <= datetime.datetime.now():
            raise HTTPException(
                status_code=400, 
                detail="Interview must be scheduled in the future"
            )
    except ValueError:
        raise HTTPException(
            status_code=400, 
            detail="Invalid date or time format"
        )

    # Create interview document
    now = datetime.datetime.utcnow()
    interview_doc = {
        "_id": interview_id,
        "candidate_id": payload.candidate_id,
        "hr_id": payload.hr_id,
        "date": payload.date,
        "time": payload.time,
        "type": payload.type,
        "duration": payload.duration,
        "field": payload.field,  # NEW: Store field
        "job_id": payload.job_id,
        "status": "scheduled",
        "room_id": None,
        "room_status": None,
        "participants": [],
        "questions": [],
        "qa": [],
        "current_question_index": 0,
        "created_at": now,
        "updated_at": now
    }

    # Insert into database
    await db.interviews.insert_one(interview_doc)

    return {
        "message": "Interview scheduled successfully",
        "interview_id": interview_id,
        "date": payload.date,
        "time": payload.time,
        "field": payload.field
    }

# --- Get Interviews ---
@router.get("")
async def get_interviews(
    hr_id: Optional[str] = Query(None, description="Filter by HR ID"),
    candidate_id: Optional[str] = Query(None, description="Filter by candidate ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    field: Optional[str] = Query(None, description="Filter by job field")  # NEW
):
    """
    Get list of interviews with optional filters.
    """
    db = await Database.get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database unavailable")

    # Build query
    query = {}
    if hr_id:
        query["hr_id"] = hr_id
    if candidate_id:
        query["candidate_id"] = candidate_id
    if status:
        query["status"] = status
    if field:  # NEW
        query["field"] = field

    # Fetch interviews
    interviews = await db.interviews.find(query).sort("date", 1).to_list(length=100)

    # Populate candidate names
    for interview in interviews:
        # Try to get candidate name
        candidate = await db.users.find_one({"_id": interview["candidate_id"]})
        if candidate:
            full_name = candidate.get("full_name") or candidate.get("name") or candidate.get("email", "")
            interview["candidate_name"] = full_name
        else:
            interview["candidate_name"] = None

    return interviews

# --- Get Single Interview ---
@router.get("/{interview_id}")
async def get_interview(interview_id: str):
    """
    Get details of a specific interview.
    """
    db = await Database.get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database unavailable")

    interview = await db.interviews.find_one({"_id": interview_id})
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    # Get candidate info
    candidate = await db.users.find_one({"_id": interview["candidate_id"]})
    if candidate:
        interview["candidate_name"] = (
            candidate.get("full_name") or 
            candidate.get("name") or 
            candidate.get("email", "Unknown")
        )

    # Get HR info
    if interview.get("hr_id"):
        hr_user = await db.users.find_one({"_id": interview["hr_id"]})
        if hr_user:
            interview["hr_name"] = (
                hr_user.get("full_name") or 
                hr_user.get("name") or 
                hr_user.get("email", "Unknown")
            )

    return interview

# --- FIXED: Get Candidates List ---
@router.get("/candidates/list")
async def get_candidates():
    """
    Get list of all candidates for the dropdown.
    Returns candidates with their names and IDs.
    """
    try:
        db = await Database.get_db()
        if db is None:
            raise HTTPException(status_code=500, detail="Database unavailable")

        # Get all users with role containing 'candidate' (case insensitive)
        candidates = []
        
        # Try regex (case insensitive)
        try:
            candidates = await db.users.find(
                {"role": {"$regex": "candidate", "$options": "i"}}
            ).to_list(length=500)
        except Exception as e:
            print(f"[ERROR] Regex search failed: {e}")
            
            # Fallback: Try exact match
            try:
                candidates = await db.users.find({"role": "candidate"}).to_list(length=500)
            except Exception as e2:
                print(f"[ERROR] Exact match failed: {e2}")
                
                # Last resort: Get all users and filter
                try:
                    all_users = await db.users.find({}).to_list(length=500)
                    candidates = [
                        u for u in all_users 
                        if u.get("role", "").lower().find("candidate") >= 0
                    ]
                except Exception as e3:
                    print(f"[ERROR] All approaches failed: {e3}")
                    candidates = []

        # Format for dropdown - Convert ObjectId to string!
        result = []
        for candidate in candidates:
            # Convert ObjectId to string
            candidate_id = str(candidate["_id"]) if "_id" in candidate else None
            if not candidate_id:
                continue
                
            name = (
                candidate.get("full_name") or 
                candidate.get("name") or 
                candidate.get("email", "Unknown")
            )
            result.append({
                "value": candidate_id,  # String, not ObjectId
                "label": name,
                "email": candidate.get("email", ""),
                "score": None
            })

        print(f"[INFO] Found {len(result)} candidates")
        return result
        
    except Exception as e:
        print(f"[ERROR] get_candidates exception: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching candidates: {str(e)}")

# --- Update Interview Status ---
@router.patch("/{interview_id}/status")
async def update_interview_status(
    interview_id: str,
    status: str = Query(..., description="New status")
):
    """
    Update interview status.
    """
    db = await Database.get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database unavailable")

    result = await db.interviews.update_one(
        {"_id": interview_id},
        {
            "$set": {
                "status": status,
                "updated_at": datetime.datetime.utcnow()
            }
        }
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Interview not found")

    return {"message": "Interview status updated", "status": status}

# --- Delete Interview ---
@router.delete("/{interview_id}")
async def delete_interview(interview_id: str):
    """
    Delete an interview.
    """
    db = await Database.get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database unavailable")

    result = await db.interviews.delete_one({"_id": interview_id})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Interview not found")

    return {"message": "Interview deleted successfully"}

  

@router.get("/my-interviews")
async def get_my_interviews(request: Request):
    """
    Get all interviews for the current user (HR or Candidate)
    """
    db = await Database.get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database unavailable")
    
    # Get user from token (you'll need to implement proper auth check)
    # For now, using a simple approach
    auth_header = request.headers.get('Authorization', '')
    
    try:
        # Extract user info from your auth system
        # This is a placeholder - adjust based on your auth implementation
        user_data = {}  # Parse your JWT token here
        
        # For now, get from query params as fallback
        from fastapi import Query
        
        # Query all interviews - filter will be done in frontend for now
        interviews = await db.interviews.find({}).to_list(length=1000)
        
        return interviews
        
    except Exception as e:
        logger.error(f"Error fetching my interviews: {e}")
        raise HTTPException(status_code=500, detail=str(e))