from fastapi import APIRouter, HTTPException, status
from bson import ObjectId
from datetime import datetime
from typing import List, Dict, Any

from db.database import Database

router = APIRouter(prefix="/api/admin/hr-users", tags=["Admin HR"])

STATUS_PENDING = "Pending"
STATUS_APPROVED = "Approved"
STATUS_REJECTED = "Rejected"


def _to_hr_card(user: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": str(user.get("_id")),
        "name": user.get("full_name", ""),
        "company": user.get("company", ""),
        "email": user.get("email", ""),
        "joinedAt": (user.get("created_at") or datetime.utcnow()).isoformat(),
        "status": user.get("hr_status", STATUS_PENDING),
    }


@router.get("", response_model=List[Dict[str, Any]])
async def list_hr_users():
    db = await Database.get_db()
    cursor = db.users.find({"role": {"$regex": "^\\s*hr\\s*$", "$options": "i"}}).sort("created_at", -1)
    users = [ _to_hr_card(u) async for u in cursor ]
    return users


@router.post("/{user_id}/approve", status_code=status.HTTP_200_OK)
async def approve_hr_user(user_id: str):
    db = await Database.get_db()
    try:
        _id = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user id")

    result = await db.users.update_one({"_id": _id, "role": {"$regex": "^\\s*hr\\s*$", "$options": "i"}}, {"$set": {"hr_status": STATUS_APPROVED, "updated_at": datetime.utcnow()}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="HR user not found")
    return {"message": "HR approved"}


@router.post("/{user_id}/reject", status_code=status.HTTP_200_OK)
async def reject_hr_user(user_id: str):
    db = await Database.get_db()
    try:
        _id = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user id")

    result = await db.users.update_one({"_id": _id, "role": {"$regex": "^\\s*hr\\s*$", "$options": "i"}}, {"$set": {"hr_status": STATUS_REJECTED, "updated_at": datetime.utcnow()}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="HR user not found")
    return {"message": "HR rejected"}


@router.delete("/{user_id}", status_code=status.HTTP_200_OK)
async def delete_hr_user(user_id: str):
    db = await Database.get_db()
    try:
        _id = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user id")

    result = await db.users.delete_one({"_id": _id, "role": {"$regex": "^\\s*hr\\s*$", "$options": "i"}})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="HR user not found")
    return {"message": "HR removed"}
