from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Dict, Any, Optional
from datetime import datetime
from db.database import Database
from auth.oauth2 import get_current_user

router = APIRouter(prefix="/api/system-logs", tags=["System Logs"])

# Expected document shape in collection `systemLogs`:
# { _id, user: str, role: 'admin'|'hr'|'candidate', action: str, status: 'Success'|'Failed'|'Error', timestamp: datetime }

@router.get("", response_model=List[Dict[str, Any]])
async def list_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    q: Optional[str] = None,
    role: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    sort_by: Optional[str] = Query("date_desc") ,
    current_user: dict = Depends(get_current_user)
):
    db = await Database.get_db()
    coll = db.systemLogs

    # Build query
    query: Dict[str, Any] = {}
    if q:
        query["$or"] = [
            {"user": {"$regex": q, "$options": "i"}},
            {"role": {"$regex": q, "$options": "i"}},
            {"action": {"$regex": q, "$options": "i"}},
        ]
    if role:
        query["role"] = {"$regex": f"^{role}$", "$options": "i"}
    if status_filter:
        query["status"] = {"$regex": f"^{status_filter}$", "$options": "i"}

    # Sort
    sort_spec = [("timestamp", -1)]
    if sort_by == "date_asc":
        sort_spec = [("timestamp", 1)]
    elif sort_by == "status_asc":
        sort_spec = [("status", 1), ("timestamp", -1)]
    elif sort_by == "status_desc":
        sort_spec = [("status", -1), ("timestamp", -1)]

    skip = (page - 1) * limit

    results: List[Dict[str, Any]] = []
    async for doc in coll.find(query).sort(sort_spec).skip(skip).limit(limit):
        results.append({
            "id": str(doc.get("_id")),
            "user": doc.get("user", ""),
            "role": doc.get("role", ""),
            "action": doc.get("action", ""),
            "status": doc.get("status", ""),
            "timestamp": (doc.get("timestamp") or datetime.utcnow()).isoformat()
        })
    return results


@router.post("", status_code=status.HTTP_201_CREATED)
async def add_log(payload: Dict[str, Any]):
    """
    Record a system log entry. This endpoint is intentionally public so that
    login events (before token issuance) can be recorded. Do not store secrets.

    Body example:
      { "user": "email@example.com", "role": "hr|candidate|admin",
        "action": "Login|Logout|...", "status": "Success|Failed|Error",
        "timestamp": optional ISO string }
    """
    try:
        db = await Database.get_db()
        coll = db.systemLogs

        user = str(payload.get("user", "")).strip()[:120]
        role = str(payload.get("role", "")).strip()[:40]
        action = str(payload.get("action", "")).strip()[:60]
        status_text = str(payload.get("status", "")).strip()[:40]

        if not action:
            raise HTTPException(status_code=400, detail="'action' is required")

        ts_in = payload.get("timestamp")
        ts = datetime.fromisoformat(ts_in) if isinstance(ts_in, str) and ts_in else datetime.utcnow()

        doc = {
            "user": user,
            "role": role,
            "action": action,
            "status": status_text or "",
            "timestamp": ts,
        }
        await coll.insert_one(doc)
        return {"message": "logged"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record log: {str(e)}")


@router.delete("", status_code=status.HTTP_200_OK)
async def clear_logs(current_user: dict = Depends(get_current_user)):
    db = await Database.get_db()
    coll = db.systemLogs
    await coll.delete_many({})
    return {"message": "All logs cleared"}
