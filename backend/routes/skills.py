from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List
from datetime import datetime
from bson import ObjectId, errors
from db.database import Database

router = APIRouter(
    prefix="/api/skills",
    tags=["Skills"],
    responses={404: {"description": "Not found"}},
)

class SkillBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=50, description="Name of the skill")

class SkillCreate(SkillBase):
    pass

class Skill(SkillBase):
    id: str = Field(..., alias="_id")
    created_at: datetime
    updated_at: datetime

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

@router.get("/", response_model=List[Skill])
async def list_skills():
    try:
        db = await Database.get_db()
        skills = []
        
        async for skill in db["skills"].find().sort("name", 1):
            skill["id"] = str(skill.pop("_id"))
            skills.append(skill)
            
        return skills
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while fetching skills: {str(e)}"
        )

@router.post("/", status_code=status.HTTP_201_CREATED, response_model=Skill)
async def create_skill(skill: SkillCreate):
    try:
        db = await Database.get_db()
        
        # Check if skill already exists (case-insensitive)
        existing_skill = await db["skills"].find_one(
            {"name": {"$regex": f"^{skill.name}$", "$options": "i"}}
        )
        
        if existing_skill:
            existing_skill["id"] = str(existing_skill.pop("_id"))
            return existing_skill
            
        # Create new skill
        now = datetime.utcnow()
        skill_data = {
            "name": skill.name.lower(),
            "created_at": now,
            "updated_at": now
        }
        
        result = await db["skills"].insert_one(skill_data)
        created_skill = await db["skills"].find_one({"_id": result.inserted_id})
        created_skill["id"] = str(created_skill.pop("_id"))
        
        return created_skill
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while creating skill: {str(e)}"
        )
