from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional
from bson import ObjectId
from models.base import PyObjectId

class Question(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    question_text: str
    question_type: str  # e.g., 'technical', 'behavioral', 'situational'
    difficulty: str  # 'easy', 'medium', 'hard'
    category: str  # e.g., 'programming', 'databases', 'system design'
    field: str  # NEW: e.g., 'web_development', 'data_science', 'mobile_development', etc.
    tags: List[str] = []
    created_by: PyObjectId
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}
        json_schema_extra = {
            "example": {
                "question_text": "Explain the difference between let, const, and var in JavaScript.",
                "question_type": "technical",
                "difficulty": "easy",
                "category": "programming",
                "field": "web_development",
                "tags": ["javascript", "frontend"],
                "created_by": "507f1f77bcf86cd799439011"
            }
        }


class CreateQuestion(BaseModel):
    question_text: str
    question_type: str
    difficulty: str
    category: str
    field: str  # NEW: Required field
    tags: List[str] = []


class UpdateQuestion(BaseModel):
    question_text: Optional[str] = None
    question_type: Optional[str] = None
    difficulty: Optional[str] = None
    category: Optional[str] = None
    field: Optional[str] = None  # NEW: Optional for updates
    tags: Optional[List[str]] = None


# Field options for validation/reference
AVAILABLE_FIELDS = [
    "web_development",
    "mobile_development",
    "data_science",
    "machine_learning",
    "backend_development",
    "frontend_development",
    "full_stack_development",
    "devops",
    "cloud_engineering",
    "cybersecurity",
    "ui_ux_design",
    "product_management",
    "qa_testing",
    "database_administration",
    "system_architecture",
    "blockchain",
    "game_development",
    "embedded_systems",
    "general"  # For questions applicable to all fields
]