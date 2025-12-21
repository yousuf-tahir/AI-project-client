from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional
from bson import ObjectId
from models.base import PyObjectId

class QuestionAnalysis(BaseModel):
    """Individual question analysis (HR ONLY)"""
    question_text: str
    answer: str
    question_type: str  # 'technical', 'behavioral', etc.
    question_source: str  # 'ai_generated', 'database', 'fallback'
    difficulty: str
    score: float = Field(..., ge=0, le=10, description="Score out of 10")
    remark: str = Field(..., description="AI's feedback on this answer")

    class Config:
        json_schema_extra = {
            "example": {
                "question_text": "What is React and why use it?",
                "answer": "React is a JavaScript library for building user interfaces...",
                "question_type": "technical",
                "question_source": "database",
                "difficulty": "medium",
                "score": 7.5,
                "remark": "Correct conceptually but lacked real-world examples and depth."
            }
        }


class InterviewAnalysis(BaseModel):
    """Complete interview analysis stored in database"""
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    interview_id: PyObjectId = Field(..., description="Reference to the interview")
    candidate_id: str
    hr_id: str
    
    # Overall metrics
    overall_score: float = Field(..., ge=0, le=10, description="Overall interview score")
    verdict: str = Field(..., description="Strong Hire | Hire | Hold | Reject")
    
    # Feedback sections
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    communication_feedback: str
    technical_feedback: str
    overall_summary: str
    
    # Detailed question-wise breakdown (HR ONLY - never exposed to candidate)
    question_analysis: List[QuestionAnalysis] = Field(default_factory=list)
    
    # Metadata
    ai_model: str = Field(default="groq-llama-3.3-70b")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    regenerated_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str, datetime: lambda v: v.isoformat()}
        json_schema_extra = {
            "example": {
                "interview_id": "507f1f77bcf86cd799439011",
                "candidate_id": "cand_123",
                "hr_id": "hr_456",
                "overall_score": 7.8,
                "verdict": "Hire",
                "strengths": ["Strong problem-solving", "Clear communication"],
                "weaknesses": ["Limited experience with cloud platforms"],
                "communication_feedback": "Excellent verbal communication...",
                "technical_feedback": "Solid understanding of core concepts...",
                "overall_summary": "Strong candidate with good fundamentals...",
                "question_analysis": [],
                "ai_model": "groq-llama-3.3-70b"
            }
        }


class CandidateAnalysisResponse(BaseModel):
    """Filtered response for candidates - NO per-question breakdown"""
    overall_score: float
    verdict: str
    strengths: List[str]
    areas_to_improve: List[str]  # Renamed from 'weaknesses' for friendlier tone
    overall_summary: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "overall_score": 7.8,
                "verdict": "Hire",
                "strengths": ["Strong problem-solving", "Clear communication"],
                "areas_to_improve": ["Consider gaining more cloud platform experience"],
                "overall_summary": "You demonstrated strong technical fundamentals..."
            }
        }


class HRAnalysisResponse(BaseModel):
    """Complete response for HR - includes everything"""
    overall_score: float
    verdict: str
    strengths: List[str]
    weaknesses: List[str]
    communication_feedback: str
    technical_feedback: str
    overall_summary: str
    question_analysis: List[QuestionAnalysis]
    ai_model: str
    created_at: datetime
    regenerated_at: Optional[datetime] = None
    
    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


class GenerateAnalysisRequest(BaseModel):
    """Request to generate analysis"""
    hr_id: str = Field(..., description="HR user requesting the analysis")
    force_regenerate: bool = Field(default=False, description="Force regeneration if analysis exists")