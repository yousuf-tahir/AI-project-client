from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List
from datetime import datetime
from bson import ObjectId

from db.database import Database
from auth.oauth2 import get_current_user

router = APIRouter(prefix="/api/feedback", tags=["Feedback"]) 


def _oid(val: str) -> ObjectId:
    try:
        return ObjectId(val)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_feedback(payload: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Create feedback. Body can include: feedbackType, rating, title, description, experience, improvements.
    user_id and role are derived from the token.
    """
    db = await Database.get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Failed to connect to database")

    now = datetime.utcnow()
    try:
        doc: Dict[str, Any] = {
            "user_id": _oid(current_user["id"]),
            "role": current_user.get("role", "user"),
            "feedbackType": payload.get("feedbackType", "suggestion"),
            "rating": int(payload.get("rating", 0) or 0),
            "title": (payload.get("title") or "").strip(),
            "description": (payload.get("description") or "").strip(),
            "experience": payload.get("experience", ""),
            "improvements": (payload.get("improvements") or "").strip(),
            "created_at": now,
            "updated_at": now,
        }
        res = await db.feedback.insert_one(doc)
        if not res.inserted_id:
            raise HTTPException(status_code=500, detail="Failed to save feedback")
        return {"message": "Feedback submitted", "id": str(res.inserted_id)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=List[Dict[str, Any]])
async def list_feedback(mine: bool = True, current_user: Dict[str, Any] = Depends(get_current_user)):
    db = await Database.get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Failed to connect to database")

    query: Dict[str, Any] = {}
    if mine:
        query["user_id"] = _oid(current_user["id"])

    cursor = db.feedback.find(query).sort("created_at", -1)
    items: List[Dict[str, Any]] = []
    async for it in cursor:
        user_name = ""
        email = ""
        uid = it.get("user_id")
        if uid:
            try:
                user_doc = await db.users.find_one({"_id": uid if isinstance(uid, ObjectId) else _oid(str(uid))})
                if user_doc:
                    user_name = user_doc.get("full_name") or user_doc.get("name") or ""
                    email = user_doc.get("email") or ""
            except Exception:
                pass

        items.append({
            "id": str(it.get("_id")),
            "user_id": str(it.get("user_id")) if it.get("user_id") else None,
            "user_name": user_name,
            "email": email,
            "role": it.get("role", ""),
            "feedbackType": it.get("feedbackType", ""),
            "rating": it.get("rating", 0),
            "title": it.get("title", ""),
            "description": it.get("description", ""),
            "experience": it.get("experience", ""),
            "improvements": it.get("improvements", ""),
            "created_at": it.get("created_at", datetime.utcnow()),
        })
    return items


@router.get("/count", response_model=Dict[str, int])
async def get_feedback_count():
    """
    Get the total count of feedback entries.
    """
    try:
        db = await Database.get_db()
        if db is None:
            raise HTTPException(status_code=500, detail="Failed to connect to database")
        
        # Get total count of all feedback
        total_feedback = await db.feedback.count_documents({})
        
        # Get count of feedback by type
        feedback_by_type = {}
        cursor = db.feedback.aggregate([
            {"$group": {"_id": "$feedbackType", "count": {"$sum": 1}}},
            {"$project": {"type": "$_id", "count": 1, "_id": 0}}
        ])
        
        async for doc in cursor:
            feedback_type = doc.get('type', 'other')
            feedback_by_type[feedback_type] = doc.get('count', 0)
        
        return {
            "total_feedback": total_feedback,
            **feedback_by_type
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error counting feedback: {str(e)}")
