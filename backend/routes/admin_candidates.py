from fastapi import APIRouter, HTTPException, status, Depends
from bson import ObjectId
from datetime import datetime
from typing import List, Dict, Any

from db.database import Database
from models.user import UserInDB

router = APIRouter(prefix="/api/admin/candidates", tags=["Admin Candidates"])

STATUS_PENDING = "Pending"
STATUS_APPROVED = "Approved"
STATUS_REJECTED = "Rejected"


def _to_card(user: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": str(user.get("_id")),
        "name": user.get("full_name", ""),
        "company": user.get("company", ""),  # may be missing for candidates
        "email": user.get("email", ""),
        "joinedAt": (user.get("created_at") or datetime.utcnow()).isoformat(),
        "status": user.get("candidate_status", STATUS_PENDING),
    }


@router.get("", response_model=List[Dict[str, Any]])
async def list_candidates():
    db = await Database.get_db()
    cursor = db.users.find({"role": {"$regex": "^\\s*candidate\\s*$", "$options": "i"}}).sort("created_at", -1)
    users = [ _to_card(u) async for u in cursor ]
    return users


@router.post("/{user_id}/approve", status_code=status.HTTP_200_OK)
async def approve_candidate(user_id: str):
    db = await Database.get_db()
    try:
        _id = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user id")

    result = await db.users.update_one(
        {"_id": _id, "role": {"$regex": "^\\s*candidate\\s*$", "$options": "i"}},
        {"$set": {"candidate_status": STATUS_APPROVED, "updated_at": datetime.utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return {"message": "Candidate approved"}


@router.get("/count", response_model=Dict[str, int])
async def get_candidates_count():
    """
    Get the count of all candidates
    """
    db = await Database.get_db()
    
    # Count all candidates
    total = await db.users.count_documents({"role": {"$regex": "^\\s*candidate\\s*$", "$options": "i"}})
    
    # Count approved candidates
    approved = await db.users.count_documents({
        "role": {"$regex": "^\\s*candidate\\s*$", "$options": "i"},
        "candidate_status": "Approved"
    })
    
    # Count pending candidates
    pending = await db.users.count_documents({
        "role": {"$regex": "^\\s*candidate\\s*$", "$options": "i"},
        "candidate_status": "Pending"
    })
    
    # Count rejected candidates
    rejected = await db.users.count_documents({
        "role": {"$regex": "^\\s*candidate\\s*$", "$options": "i"},
        "candidate_status": "Rejected"
    })
    
    return {
        "total": total,
        "approved": approved,
        "pending": pending,
        "rejected": rejected
    }


@router.delete("/{user_id}", status_code=status.HTTP_200_OK)
async def delete_candidate(user_id: str):
    db = await Database.get_db()
    try:
        _id = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user id")

    result = await db.users.delete_one({"_id": _id, "role": {"$regex": "^\\s*candidate\\s*$", "$options": "i"}})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return {"message": "Candidate removed"}
