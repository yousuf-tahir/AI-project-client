from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Any, Dict, Optional
import re
from datetime import datetime
from db.database import Database
from bson import ObjectId

router = APIRouter(prefix="/api/hr", tags=["applications"])
app_router = APIRouter(prefix="/api", tags=["applications"])


class UpdateStatus(BaseModel):
    candidate_id: Optional[str] = None
    candidate_email: Optional[str] = None
    hr_name: Optional[str] = None
    job_id: Optional[str] = None
    status: str


class ApplicationCreate(BaseModel):
    hr_name: str
    candidate_id: str
    job_id: str


def _pick(obj: Dict[str, Any], keys: List[str], default: Any = None):
    for k in keys:
        v = obj.get(k)
        if v is not None and v != "":
            return v
    return default


def _ensure_list_of_str(val: Any) -> List[str]:
    if val is None:
        return []
    if isinstance(val, list):
        out = []
        for x in val:
            if isinstance(x, str):
                out.append(x)
            elif isinstance(x, dict):
                n = x.get("name") or x.get("label")
                if n:
                    out.append(str(n))
            else:
                out.append(str(x))
        return out
    if isinstance(val, str):
        parts = [s.strip() for s in val.split(",") if s.strip()]
        return parts
    return [str(val)]


def _normalize_profile(profile: Dict[str, Any], fallback: Dict[str, Any]) -> Dict[str, Any]:
    name = _pick(profile, ["name", "full_name", "username"]) or fallback.get("candidate_name") or ""
    email = _pick(profile, ["email"]) or fallback.get("candidate_email") or ""
    # experience: prefer human-readable string; if numeric years, format "X years"
    years = _pick(profile, ["experience_years", "years_experience"]) or None
    months = _pick(profile, ["experience_months"]) or None
    if isinstance(years, (int, float)) or isinstance(months, (int, float)):
        y = int(years or 0)
        m = int(months or 0)
        parts = []
        if y:
            parts.append(f"{y} year" + ("s" if y != 1 else ""))
        if m:
            parts.append(f"{m} month" + ("s" if m != 1 else ""))
        experience = " ".join(parts) or "0 months"
    else:
        exp_raw = _pick(profile, ["experience", "exp"]) or fallback.get("experience")
        experience = exp_raw or ""
    # skills: array or comma string or list of objects
    skills = _ensure_list_of_str(_pick(profile, ["skills", "skill_set", "top_skills"]) or fallback.get("skills") or [])
    # cv / resume
    cv = _pick(profile, ["resume_url", "cv", "resume", "cv_url"]) or fallback.get("cv") or ""
    # certificates: prefer URLs from objects
    certs_val = _pick(profile, ["certificates", "importantCertificates", "certs"]) or fallback.get("certificates") or []
    certs: List[str] = []
    if isinstance(certs_val, list):
        for c in certs_val:
            if isinstance(c, str):
                certs.append(c)
            elif isinstance(c, dict):
                url = c.get("url") or c.get("path") or c.get("link") or c.get("file")
                if url:
                    certs.append(url)
    elif isinstance(certs_val, str):
        certs = [s.strip() for s in certs_val.split(",") if s.strip()]
    # if no explicit CV URL but we have resume_name and certificates, try to infer
    if not cv:
        resume_name = profile.get("resume_name") or fallback.get("resume_name")
        if resume_name and isinstance(certs_val, list):
            match = None
            for c in certs_val:
                if isinstance(c, dict) and str(c.get("name", "")).strip() == str(resume_name).strip():
                    match = c.get("url") or c.get("path") or c.get("link") or c.get("file")
                    if match:
                        break
            if match:
                cv = match
        # fallback to first certificate url if still empty
        if not cv and isinstance(certs_val, list):
            for c in certs_val:
                if isinstance(c, dict):
                    u = c.get("url") or c.get("path") or c.get("link") or c.get("file")
                    if u:
                        cv = u
                        break
    # profile picture (prefer avatar_url)
    pic = _pick(profile, ["avatar_url", "profile_pic", "avatar", "photo"]) or ""
    return {
        "name": name,
        "email": email,
        "profile_pic": pic,
        "experience": experience,
        "skills": skills,
        "cv": cv,
        "certificates": certs,
    }


@router.get("/applications")
async def list_applications(
    hr_name: Optional[str] = Query(None, alias="hr_name"),  # Changed to Optional
    candidate_id: Optional[str] = Query(None, alias="candidate_id")  # Added parameter
) -> List[dict]:
    try:
        db = await Database.get_db()
        apps_col = db["applications"]
        
        # Build the match query based on provided parameters
        match_query = {}
        
        if hr_name:
            # Use regex for case-insensitive matching of hr_name
            match_query["hr_name"] = {"$regex": re.escape(hr_name), "$options": "i"}
        
        if candidate_id:
            match_query["candidate_id"] = candidate_id
        
        # Require at least one parameter for security
        if not match_query:
            raise HTTPException(
                status_code=400, 
                detail="Either 'hr_name' or 'candidate_id' parameter is required"
            )
        
        print(f"🔍 Querying applications with match_query: {match_query}")
        print(f"📊 Parameters: hr_name={hr_name}, candidate_id={candidate_id}")

        pipeline = [
            {"$match": match_query},
            {"$addFields": {
                "candidate_oid": {"$convert": {"input": "$candidate_id", "to": "objectId", "onError": None, "onNull": None}},
                "job_oid": {"$convert": {"input": "$job_id", "to": "objectId", "onError": None, "onNull": None}},
            }},
            {"$lookup": {
                "from": "profiles",
                "localField": "candidate_oid",
                "foreignField": "user_id",
                "as": "profile"
            }},
            {"$unwind": {"path": "$profile", "preserveNullAndEmptyArrays": True}},
            {"$lookup": {
                "from": "job_criteria",
                "localField": "job_oid",
                "foreignField": "_id",
                "as": "job"
            }},
            {"$unwind": {"path": "$job", "preserveNullAndEmptyArrays": True}},
            {"$project": {
                "candidate_id": "$candidate_id",
                "name": {"$ifNull": ["$profile.full_name", "$$REMOVE"]},
                "email": {"$ifNull": ["$profile.email", "$$REMOVE"]},
                "field": {"$ifNull": ["$profile.field", None]},
                "experience": {"$ifNull": ["$profile.experience", None]},
                "experience_years": {"$ifNull": ["$profile.experience_years", None]},
                "experience_months": {"$ifNull": ["$profile.experience_months", None]},
                "skills": {"$ifNull": ["$profile.skills", []]},
                "cv": {"$ifNull": ["$profile.resume_url", None]},
                "certificates": {"$ifNull": ["$profile.certificates", []]},
                "profile_pic": {"$ifNull": ["$profile.avatar_url", None]},
                "job_title": {"$ifNull": ["$job.job_title", None]},
                "job_description": {"$ifNull": ["$job.description", None]},
                "hr_name": "$hr_name",  # Added this field
                "status": {"$ifNull": ["$status", "Pending"]},
                "applied_at": {"$ifNull": ["$applied_at", None]},
                "updated_at": "$updated_at",  # Added this field
                "_id": {"$toString": "$_id"},  # Added for reference
            }},
        ]

        items: List[dict] = []
        async for doc in apps_col.aggregate(pipeline):
            # experience fallback formatting
            if not doc.get("experience"):
                y = doc.pop("experience_years", None) or 0
                m = doc.pop("experience_months", None) or 0
                parts = []
                if isinstance(y, (int, float)) and y:
                    parts.append(f"{int(y)} year" + ("s" if int(y) != 1 else ""))
                if isinstance(m, (int, float)) and m:
                    parts.append(f"{int(m)} month" + ("s" if int(m) != 1 else ""))
                if parts:
                    doc["experience"] = " ".join(parts)
            # sanitize certificates to strings to avoid ObjectId serialization errors
            certs = doc.get("certificates")
            if isinstance(certs, list):
                cleaned: List[str] = []
                for c in certs:
                    if isinstance(c, ObjectId):
                        cleaned.append(str(c))
                    elif isinstance(c, dict):
                        # keep as-is; downstream may look for url strings
                        cleaned.append(c)  # type: ignore
                    else:
                        cleaned.append(str(c))
                doc["certificates"] = cleaned
            # ensure no stray ObjectId values remain in top-level fields
            for k, v in list(doc.items()):
                if isinstance(v, ObjectId):
                    doc[k] = str(v)
            items.append(doc)
        
        print(f"✅ Found {len(items)} applications")
        return items
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in list_applications: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/update-status")
async def update_status(body: UpdateStatus):
    try:
        new_status = body.status.strip().capitalize()
        if new_status not in {"Pending", "Accepted", "Rejected"}:
            raise HTTPException(status_code=400, detail="Invalid status")
        
        db = await Database.get_db()
        apps_col = db["applications"]
        profiles_col = db["profiles"]
        
        # Build query to find the application
        query: Dict[str, Any] = {}
        
        # Step 1: Determine candidate_id
        candidate_id = body.candidate_id
        
        if not candidate_id and body.candidate_email:
            # Look up candidate_id from profiles collection using email
            profile = await profiles_col.find_one(
                {"email": {"$regex": f"^{re.escape(body.candidate_email)}$", "$options": "i"}}, 
                {"user_id": 1}
            )
            if profile and profile.get("user_id"):
                candidate_id = str(profile["user_id"])
        
        if not candidate_id:
            raise HTTPException(status_code=400, detail="Could not identify candidate")
        
        # Step 2: Build query with candidate_id
        query["candidate_id"] = candidate_id
        
        # Step 3: Add HR name filter (case-insensitive) if provided
        if body.hr_name:
            query["hr_name"] = {"$regex": f"^{re.escape(body.hr_name)}$", "$options": "i"}
        
        # Step 4: Add job_id filter if provided
        if body.job_id:
            query["job_id"] = body.job_id

        print(f"🔍 Update query: {query}")
        print(f"🎯 Looking for applications with candidate_id={candidate_id}, hr_name={body.hr_name}, job_id={body.job_id}")
        
        # Check if any applications exist with this query
        count = await apps_col.count_documents(query)
        print(f"📊 Found {count} matching applications")
        
        if count == 0:
            # Try to find applications with any criteria to help debug
            any_by_candidate = await apps_col.count_documents({"candidate_id": candidate_id})
            any_by_hr = await apps_col.count_documents({"hr_name": {"$regex": f"^{re.escape(body.hr_name)}$", "$options": "i"}}) if body.hr_name else 0
            print(f"📊 Debug: {any_by_candidate} apps for candidate, {any_by_hr} apps for HR")
            raise HTTPException(
                status_code=404, 
                detail=f"No matching application found. Found {any_by_candidate} applications for this candidate and {any_by_hr} for this HR."
            )
        
        # Update the application(s)
        update_data = {
            "$set": {
                "status": new_status,
                "updated_at": datetime.utcnow().isoformat() + "Z"
            }
        }
        
        res = await apps_col.update_many(query, update_data)
        
        print(f"✅ Update result: matched={res.matched_count}, modified={res.modified_count}")
        
        return {
            "success": True,
            "updated": res.modified_count,
            "matched": res.matched_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in update_status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app_router.post("/applications")
async def create_application(body: ApplicationCreate):
    try:
        db = await Database.get_db()
        apps_col = db["applications"]
        doc = {
            "hr_name": body.hr_name,
            "candidate_id": body.candidate_id,
            "job_id": body.job_id,
            "status": "Pending",
            "applied_at": datetime.utcnow().isoformat() + "Z",
        }
        # Optional: avoid duplicates
        exists = await apps_col.find_one({
            "hr_name": body.hr_name,
            "candidate_id": body.candidate_id,
            "job_id": body.job_id,
        })
        if exists:
            return {"message": "Application already exists"}
        await apps_col.insert_one(doc)
        return {"message": "Application submitted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
