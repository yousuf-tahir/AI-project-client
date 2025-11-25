from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field, validator
from typing import List, Optional
from datetime import datetime
from bson import ObjectId, errors
from db.database import Database
from pymongo import ReturnDocument, ASCENDING

router = APIRouter(
    prefix="/api/job-criteria",
    tags=["Job Criteria"],
    responses={404: {"description": "Not found"}},
)

class SkillBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=50, description="Name of the skill")
    
    @validator('name')
    def name_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError('Skill name cannot be empty')
        return v.strip().lower()

class SkillCreate(SkillBase):
    pass

class Skill(SkillBase):
    id: str = Field(..., alias="_id")
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        json_encoders = {ObjectId: str}
        json_schema_extra = {
            "example": {
                "id": "507f1f77bcf86cd799439011",
                "name": "python",
                "created_at": "2023-01-01T00:00:00",
                "updated_at": "2023-01-01T00:00:00"
            }
        }

class JobCriteriaBase(BaseModel):
    job_title: str = Field(..., min_length=2, max_length=100)
    experience_years: int = Field(..., ge=0, le=50)
    qualification: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=5000, description="Job description text")
    skills: List[str] = Field(..., description="List of skill names")
    user_id: str = Field(..., description="ID of the user who created this criteria")


class JobCriteriaCreate(JobCriteriaBase):
    @validator('skills')
    def validate_skills(cls, v):
        if not v:
            raise ValueError("At least one skill is required")
        if len(v) > 20:  # Arbitrary limit to prevent abuse
            raise ValueError("Maximum 20 skills allowed")
        return [skill.strip().lower() for skill in v if isinstance(skill, str) and skill.strip()]

class JobCriteria(JobCriteriaBase):
    id: str = Field(..., alias="_id")
    created_at: datetime
    updated_at: datetime
    skills: List[Skill] = Field(default_factory=list, description="List of skill objects")

    class Config:
        populate_by_name = True

async def get_or_create_skill(db, skill_name: str) -> str:
    """Helper function to get existing skill or create a new one"""
    skill = await db["skills"].find_one({"name": skill_name.lower()})
    if not skill:
        result = await db["skills"].insert_one({"name": skill_name.lower()})
        return str(result.inserted_id)
    return str(skill["_id"])


@router.get("", response_model=List[JobCriteria])
async def list_all_job_criteria():
    try:
        db = await Database.get_db()
        criteria_list: List[dict] = []
        pipeline = [
            {"$sort": {"created_at": -1}},
            {
                "$lookup": {
                    "from": "skills",
                    "localField": "skill_ids",
                    "foreignField": "_id",
                    "as": "skills",
                }
            },
            {
                "$addFields": {
                    "skills": {
                        "$map": {
                            "input": "$skills",
                            "as": "skill",
                            "in": {
                                "_id": {"$toString": "$$skill._id"},
                                "name": "$$skill.name",
                                "created_at": "$$skill.created_at",
                                "updated_at": "$$skill.updated_at",
                            },
                        }
                    }
                }
            },
        ]

        async for criteria in db["job_criteria"].aggregate(pipeline):
            criteria["id"] = str(criteria.pop("_id"))
            if isinstance(criteria.get("user_id"), ObjectId):
                criteria["user_id"] = str(criteria["user_id"])
            criteria_list.append(criteria)

        return criteria_list
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while listing job criteria: {str(e)}",
        )

@router.post("/", status_code=status.HTTP_201_CREATED, response_model=dict)
async def create_job_criteria(criteria: JobCriteriaCreate):
    db = await Database.get_db()
    try:
        # Validate user exists and parse ObjectId
        try:
            user_id = ObjectId(criteria.user_id)
        except errors.InvalidId:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid user ID format",
            )
        user = await db["users"].find_one({"_id": user_id})
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        # Build or fetch skills (no transactions; sequential ops)
        skill_ids = []
        for skill_name in criteria.skills:
            skill = await db["skills"].find_one({"name": skill_name.lower()})
            if not skill:
                res = await db["skills"].insert_one({
                    "name": skill_name.lower(),
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                })
                skill_ids.append(res.inserted_id)
            else:
                skill_ids.append(skill["_id"])

        # Create criteria
        doc = {
            "job_title": criteria.job_title,
            "experience_years": criteria.experience_years,
            "qualification": criteria.qualification,
            "description": criteria.description,
            "skill_ids": skill_ids,
            "user_id": user_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        result = await db["job_criteria"].insert_one(doc)
        crit_id = result.inserted_id

        # Join table entries
        if skill_ids:
            await db["criteria_skills"].insert_many([
                {"criteria_id": crit_id, "skill_id": sid, "created_at": datetime.utcnow()}
                for sid in skill_ids
            ])

        return {"id": str(crit_id), "message": "Job criteria created successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred: {str(e)}",
        )

@router.get("/user/{user_id}", response_model=List[JobCriteria])
async def get_user_job_criteria(user_id: str):
    try:
        db = await Database.get_db()
        criteria_list = []
        
        # Validate user exists and convert to ObjectId
        try:
            user_id_obj = ObjectId(user_id)
            user = await db["users"].find_one({"_id": user_id_obj})
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
        except errors.InvalidId:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid user ID format"
            )
        
        # Get all job criteria for the user with skills populated
        pipeline = [
            {"$match": {"user_id": user_id_obj}},  # Use ObjectId for matching
            {"$sort": {"created_at": -1}},
            {
                "$lookup": {
                    "from": "skills",
                    "localField": "skill_ids",
                    "foreignField": "_id",
                    "as": "skills"
                }
            },
            {
                "$addFields": {
                    "skills": {
                        "$map": {
                            "input": "$skills",
                            "as": "skill",
                            "in": {
                                "_id": {"$toString": "$$skill._id"},
                                "name": "$$skill.name",
                                "created_at": "$$skill.created_at",
                                "updated_at": "$$skill.updated_at"
                            }
                        }
                    }
                }
            }
        ]
        
        async for criteria in db["job_criteria"].aggregate(pipeline):
            criteria["id"] = str(criteria.pop("_id"))
            # Convert ObjectId fields to strings to satisfy response schema
            if isinstance(criteria.get("user_id"), ObjectId):
                criteria["user_id"] = str(criteria["user_id"])
            criteria_list.append(criteria)
            
        return criteria_list
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while fetching job criteria: {str(e)}"
        )

@router.get("/{criteria_id}", response_model=JobCriteria)
async def get_job_criteria(criteria_id: str):
    try:
        db = await Database.get_db()
        
        try:
            criteria_id_obj = ObjectId(criteria_id)
        except errors.InvalidId:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid criteria ID format"
            )
        
        # Get job criteria with skills populated
        pipeline = [
            {"$match": {"_id": criteria_id_obj}},
            {
                "$lookup": {
                    "from": "skills",
                    "localField": "skill_ids",
                    "foreignField": "_id",
                    "as": "skills"
                }
            },
            {
                "$addFields": {
                    "skills": {
                        "$map": {
                            "input": "$skills",
                            "as": "skill",
                            "in": {
                                "_id": {"$toString": "$$skill._id"},
                                "name": "$$skill.name",
                                "created_at": "$$skill.created_at",
                                "updated_at": "$$skill.updated_at"
                            }
                        }
                    }
                }
            }
        ]
        
        criteria = await db["job_criteria"].aggregate(pipeline).to_list(1)
        
        if not criteria:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job criteria not found"
            )
            
        criteria = criteria[0]
        criteria["id"] = str(criteria.pop("_id"))
        if isinstance(criteria.get("user_id"), ObjectId):
            criteria["user_id"] = str(criteria["user_id"])
        
        return criteria
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while fetching job criteria: {str(e)}"
        )

@router.put("/{criteria_id}", response_model=dict)
async def update_job_criteria(criteria_id: str, criteria: JobCriteriaCreate):
    try:
        db = await Database.get_db()
        
        try:
            # Convert string IDs to ObjectId
            criteria_id_obj = ObjectId(criteria_id)
            user_id_obj = ObjectId(criteria.user_id)
            
            # Verify the job criteria exists and belongs to the user
            existing_criteria = await db["job_criteria"].find_one({
                "_id": criteria_id_obj,
                "user_id": user_id_obj
            })
            
            if not existing_criteria:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Job criteria not found or access denied"
                )
                
        except errors.InvalidId:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid ID format"
            )
            
        # No transactions: process sequentially
        # Process skills - get or create each skill and collect their IDs as ObjectIds
        skill_ids = []
        for skill_name in criteria.skills:
            skill = await db["skills"].find_one({"name": {"$regex": f"^{skill_name}$", "$options": "i"}})
            if not skill:
                res = await db["skills"].insert_one({
                    "name": skill_name.lower(),
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                })
                skill_ids.append(res.inserted_id)
            else:
                skill_ids.append(skill["_id"])

        update_data = {
            "job_title": criteria.job_title,
            "experience_years": criteria.experience_years,
            "qualification": criteria.qualification,
            "description": criteria.description,
            "skill_ids": skill_ids,
            "updated_at": datetime.utcnow(),
        }

        result = await db["job_criteria"].update_one({"_id": criteria_id_obj}, {"$set": update_data})
        if result.matched_count == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job criteria not found")

        # Refresh join docs
        await db["criteria_skills"].delete_many({"criteria_id": criteria_id_obj})
        if skill_ids:
            await db["criteria_skills"].insert_many([
                {"criteria_id": criteria_id_obj, "skill_id": sid, "created_at": datetime.utcnow()}
                for sid in skill_ids
            ])

        return {"message": "Job criteria updated successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        if 'session' in locals():
            await session.abort_transaction()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while updating job criteria: {str(e)}"
        )

@router.delete("/{criteria_id}", response_model=dict)
async def delete_job_criteria(criteria_id: str):
    try:
        db = await Database.get_db()
        
        try:
            criteria_id_obj = ObjectId(criteria_id)
        except errors.InvalidId:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid criteria ID format"
            )
        
        # Delete the criteria
        result = await db["job_criteria"].delete_one({"_id": criteria_id_obj})
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job criteria not found"
            )
        # Also clean up join docs
        await db["criteria_skills"].delete_many({"criteria_id": criteria_id_obj})
        
        return {"message": "Job criteria deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while deleting job criteria: {str(e)}"
        )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Job criteria not found")
    
    # Note: We're not deleting the skills as they might be referenced by other criteria
    
    return {"message": "Job criteria deleted successfully"}