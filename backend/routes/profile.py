from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Form
from typing import Dict, Any
from datetime import datetime
from bson import ObjectId
from pathlib import Path
import os

from db.database import Database
from auth.oauth2 import get_current_user

router = APIRouter(prefix="/api/profile", tags=["Profile"])


def _oid(val: str) -> ObjectId:
    try:
        return ObjectId(val)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user_id")


@router.get("/{user_id}")
async def get_profile(user_id: str):
    db = await Database.get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Failed to connect to database")

    prof = await db.profiles.find_one({"user_id": _oid(user_id)})
    if not prof:
        return {}
    prof["id"] = str(prof.get("_id"))
    prof["user_id"] = str(prof.get("user_id")) if prof.get("user_id") else None
    prof.pop("_id", None)
    return prof


@router.post("", status_code=status.HTTP_201_CREATED)
async def upsert_profile(payload: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Create or update a profile document for a user. If a profile exists for the provided user_id,
    it will be updated; otherwise it will be created.

    Expected body (subset is fine):
      { user_id, full_name, email, phone, location, headline, field, 
        experience_years, experience_months, skills: [str], 
        resume_name, certificates: [{name,url}], avatar_url }
    """
    db = await Database.get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Failed to connect to database")

    user_id = payload.get("user_id") or current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")

    now = datetime.utcnow()

    # Build set document with ALL fields
    doc: Dict[str, Any] = {
        "full_name": payload.get("full_name"),
        "email": payload.get("email"),
        "phone": payload.get("phone"),
        "location": payload.get("location"),
        "headline": payload.get("headline"),  # Added
        "field": payload.get("field") or payload.get("headline"),  # Added with fallback
        "experience_years": int(payload.get("experience_years") or 0),
        "experience_months": int(payload.get("experience_months") or 0),
        "skills": payload.get("skills") or [],
        "resume_name": payload.get("resume_name") or None,
        "resume_url": payload.get("resume_url") or None,  # Added
        "certificates": payload.get("certificates") or [],
        "avatar_url": payload.get("avatar_url") or None,
        "updated_at": now,
    }

    # Clean Nones to avoid overwriting with nulls if omitted
    clean_doc = {k: v for k, v in doc.items() if v is not None}

    res = await db.profiles.update_one(
        {"user_id": _oid(user_id)},
        {"$set": clean_doc, "$setOnInsert": {"user_id": _oid(user_id), "created_at": now}},
        upsert=True,
    )

    created = res.upserted_id is not None
    return {"message": "Profile created" if created else "Profile updated"}


@router.put("/{user_id}")
async def replace_profile(user_id: str, payload: Dict[str, Any], current_user: Dict[str, Any] = Depends(get_current_user)):
    db = await Database.get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Failed to connect to database")

    now = datetime.utcnow()
    payload = dict(payload)
    payload["user_id"] = _oid(user_id)
    payload["updated_at"] = now
    payload.setdefault("created_at", now)
    # Ensure field is saved
    if "headline" in payload and "field" not in payload:
        payload["field"] = payload["headline"]

    await db.profiles.replace_one({"user_id": _oid(user_id)}, payload, upsert=True)
    return {"message": "Profile saved"}


@router.post("/{user_id}/upload-certificate", status_code=status.HTTP_200_OK)
async def upload_certificate(user_id: str, file: UploadFile = File(...), name: str | None = Form(None), current_user: Dict[str, Any] = Depends(get_current_user)):
    db = await Database.get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Failed to connect to database")

    # Save under backend/static/profile_docs/{user_id}/certs/
    base_dir = Path(__file__).resolve().parent.parent  # backend/
    docs_dir = base_dir / "static" / "profile_docs" / user_id / "certs"
    docs_dir.mkdir(parents=True, exist_ok=True)

    # Determine safe filename
    orig = file.filename or "certificate.pdf"
    fname = f"{int(datetime.utcnow().timestamp())}_{orig}"
    target = docs_dir / fname
    content = await file.read()
    with open(target, "wb") as out:
        out.write(content)

    rel_url = f"/static/profile_docs/{user_id}/certs/{fname}"

    # Push into profiles.certificates
    await db.profiles.update_one(
        {"user_id": _oid(user_id)},
        {"$push": {"certificates": {"name": name or orig, "url": rel_url}}, "$setOnInsert": {"created_at": datetime.utcnow(), "user_id": _oid(user_id)}},
        upsert=True,
    )

    return {"url": rel_url, "name": name or orig}


@router.post("/{user_id}/upload-resume", status_code=status.HTTP_200_OK)
async def upload_resume(user_id: str, file: UploadFile = File(...), current_user: Dict[str, Any] = Depends(get_current_user)):
    db = await Database.get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Failed to connect to database")

    base_dir = Path(__file__).resolve().parent.parent
    docs_dir = base_dir / "static" / "profile_docs" / user_id
    docs_dir.mkdir(parents=True, exist_ok=True)

    # Save resume with stable name
    _, ext = os.path.splitext(file.filename or "")
    if not ext:
        ext = ".pdf"
    safe_ext = ext.lower() if ext.lower() in [".pdf", ".doc", ".docx"] else ".pdf"
    fname = f"resume{safe_ext}"
    target = docs_dir / fname
    content = await file.read()
    with open(target, "wb") as out:
        out.write(content)

    rel_url = f"/static/profile_docs/{user_id}/{fname}"
    await db.profiles.update_one(
        {"user_id": _oid(user_id)},
        {"$set": {"resume_url": rel_url, "resume_name": file.filename or fname, "updated_at": datetime.utcnow()}, "$setOnInsert": {"created_at": datetime.utcnow(), "user_id": _oid(user_id)}},
        upsert=True,
    )

    return {"url": rel_url, "name": file.filename or fname}