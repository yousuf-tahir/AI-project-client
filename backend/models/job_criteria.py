from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel, Field, validator
from typing import List, Optional
from enum import Enum

class JobType(str, Enum):
    FULL_TIME = "Full-time"
    PART_TIME = "Part-time"
    CONTRACT = "Contract"
    TEMPORARY = "Temporary"
    INTERNSHIP = "Internship"

class DocumentRequirement(BaseModel):
    cv_required: bool = Field(default=False, description="Whether CV is required")
    cover_letter_required: bool = Field(default=False, description="Whether cover letter is required")
    cv_template: Optional[str] = Field(None, description="URL or path to CV template")
    cover_letter_template: Optional[str] = Field(None, description="URL or path to cover letter template")

class JobCriteriaBase(BaseModel):
    job_title: str = Field(..., min_length=2, max_length=200, description="Title of the job position")
    experience_years: float = Field(..., ge=0, le=50, description="Years of experience required")
    preferred_field: str = Field(..., min_length=2, max_length=100, description="Preferred field of expertise")
    job_type: JobType = Field(..., description="Type of employment")
    
    # Skills will be stored as references to the skills collection
    skill_ids: List[str] = Field(..., min_items=1, description="List of skill IDs required for the job")
    
    # Document requirements
    documents: DocumentRequirement = Field(default_factory=DocumentRequirement)
    
    # Important certificates and notes
    important_certificates: List[str] = Field(
        default_factory=list, 
        description="List of important certificates or qualifications"
    )
    
    # Application deadline
    application_deadline: datetime = Field(..., description="Deadline for job applications")
    
    # Foreign key to user who created this criteria
    user_id: str = Field(..., description="ID of the HR/user who created this criteria")
    
    # Status
    is_active: bool = Field(default=True, description="Whether this criteria is currently active")
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_encoders = {ObjectId: str}
        json_schema_extra = {
            "example": {
                "job_title": "Senior Software Engineer",
                "experience_years": 5,
                "preferred_field": "Web Development",
                "job_type": "Full-time",
                "skill_ids": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"],
                "documents": {
                    "cv_required": True,
                    "cover_letter_required": True,
                    "cv_template": None,
                    "cover_letter_template": None
                },
                "important_certificates": ["AWS Certified", "PMP"],
                "application_deadline": "2023-12-31T23:59:59Z",
                "user_id": "507f1f77bcf86cd799439013",
                "is_active": True,
                "created_at": "2023-01-01T00:00:00Z",
                "updated_at": "2023-01-01T00:00:00Z"
            }
        }

class JobCriteriaCreate(JobCriteriaBase):
    pass

class JobCriteriaUpdate(BaseModel):
    job_title: Optional[str] = Field(None, min_length=2, max_length=200)
    experience_years: Optional[float] = Field(None, ge=0, le=50)
    preferred_field: Optional[str] = Field(None, min_length=2, max_length=100)
    job_type: Optional[JobType] = None
    skill_ids: Optional[List[str]] = Field(None, min_items=1)
    documents: Optional[DocumentRequirement] = None
    important_certificates: Optional[List[str]] = None
    application_deadline: Optional[datetime] = None
    is_active: Optional[bool] = None
    
    class Config:
        json_encoders = {ObjectId: str}

class JobCriteriaInDB(JobCriteriaBase):
    id: str = Field(..., alias="_id")
    
    class Config:
        json_encoders = {ObjectId: str}
        populate_by_name = True
