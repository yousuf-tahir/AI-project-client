from fastapi import APIRouter, HTTPException, status, Depends
from typing import Dict, Any, List, Optional
from datetime import datetime
from bson import ObjectId

from db.database import Database
from auth.oauth2 import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


def _oid(val: str) -> ObjectId:
    try:
        return ObjectId(val)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")


@router.get("", response_model=List[Dict[str, Any]])
async def list_notifications(
    mine: bool = True,
    status_filter: Optional[str] = None,  # all|unread
    type_filter: Optional[str] = None,    # interviews|feedback|practice|system
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    db = await Database.get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Failed to connect to database")

    query: Dict[str, Any] = {}
    if mine:
        query["user_id"] = _oid(current_user["id"])

    if status_filter == "unread":
        query["read_at"] = {"$exists": False}

    if type_filter:
        query["type"] = type_filter

    cursor = db.notifications.find(query).sort("created_at", -1)
    items: List[Dict[str, Any]] = []
    async for it in cursor:
        items.append({
            "id": str(it.get("_id")),
            "type": it.get("type", "system"),
            "title": it.get("title", ""),
            "message": it.get("message", ""),
            "created_at": it.get("created_at", datetime.utcnow()),
            "read_at": it.get("read_at"),
            "action_url": it.get("action_url", ""),
        })
    return items


@router.patch("/{notif_id}/read", status_code=status.HTTP_200_OK)
async def mark_read(notif_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    db = await Database.get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Failed to connect to database")

    res = await db.notifications.update_one(
        {"_id": _oid(notif_id), "user_id": _oid(current_user["id"])},
        {"$set": {"read_at": datetime.utcnow()}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Marked as read"}


@router.post("/mark-all-read", status_code=status.HTTP_200_OK)
async def mark_all_read(current_user: Dict[str, Any] = Depends(get_current_user)):
    db = await Database.get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Failed to connect to database")

    await db.notifications.update_many(
        {"user_id": _oid(current_user["id"]), "read_at": {"$exists": False}},
        {"$set": {"read_at": datetime.utcnow()}},
    )
    return {"message": "All marked as read"}


@router.delete("/clear-all", status_code=status.HTTP_200_OK)
async def clear_all(current_user: Dict[str, Any] = Depends(get_current_user)):
    db = await Database.get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Failed to connect to database")

    await db.notifications.delete_many({"user_id": _oid(current_user["id"])})
    return {"message": "All notifications cleared"}


# Optional: helper to seed a notification (could be used by other parts of the backend)
async def create_notification(db, user_id: ObjectId, type_: str, title: str, message: str, action_url: str = ""):
    doc = {
        "user_id": user_id,
        "type": type_ or "system",
        "title": title,
        "message": message,
        "action_url": action_url,
        "created_at": datetime.utcnow(),
    }
    await db.notifications.insert_one(doc)
    return doc
