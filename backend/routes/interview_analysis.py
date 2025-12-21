from fastapi import APIRouter, HTTPException, status
from typing import Optional
import datetime
import logging
import traceback

from db.database import Database
from models.interview_analysis import (
    InterviewAnalysis,
    CandidateAnalysisResponse,
    HRAnalysisResponse,
    GenerateAnalysisRequest,
    QuestionAnalysis
)
from ai_handler_analysis import analyze_complete_interview

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/interview-analysis", tags=["interview-analysis"])


# ============================================
# 1️⃣ Generate Analysis (HR Only)
# ============================================
@router.post("/{interview_id}/generate")
async def generate_analysis(interview_id: str, request: GenerateAnalysisRequest):
    """
    Generate AI analysis for a completed interview.
    HR ONLY - requires completed interview.
    """
    logger.info(f"\n{'='*80}")
    logger.info(f"🧠 GENERATE ANALYSIS - Interview ID: {interview_id}")
    logger.info(f"{'='*80}")
    
    db = await Database.get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database unavailable")
    
    # ============================================
    # Validation: Interview exists and completed
    # ============================================
    interview = await db.interviews.find_one({"_id": interview_id})
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    # Verify HR authorization
    if interview.get("hr_id") != request.hr_id:
        raise HTTPException(
            status_code=403, 
            detail="Only the interviewing HR can generate analysis"
        )
    
    # Check interview status
    if interview.get("status") != "completed":
        raise HTTPException(
            status_code=400,
            detail=f"Interview must be completed. Current status: {interview.get('status')}"
        )
    
    # Check if Q&A exists
    qa_list = interview.get("qa", [])
    if not qa_list:
        raise HTTPException(
            status_code=400,
            detail="No Q&A data found. Interview may not have been conducted properly."
        )
    
    logger.info(f"✅ Interview validated: {len(qa_list)} Q&A pairs found")
    
    # ============================================
    # Check if analysis already exists
    # ============================================
    existing_analysis = await db.interview_analysis.find_one({"interview_id": interview_id})
    
    if existing_analysis and not request.force_regenerate:
        logger.info(f"⚠️ Analysis already exists. Use force_regenerate=true to regenerate.")
        raise HTTPException(
            status_code=409,
            detail="Analysis already exists for this interview. Set force_regenerate=true to regenerate."
        )
    
    if existing_analysis and request.force_regenerate:
        logger.info(f"🔄 Regenerating analysis (force_regenerate=true)")
    
    # ============================================
    # Prepare interview data for AI
    # ============================================
    interview_data = {
        "interview_id": interview_id,
        "field": interview.get("field", "general"),
        "questions": interview.get("questions", []),
        "qa": qa_list,
        "candidate_id": interview.get("candidate_id"),
        "hr_id": interview.get("hr_id"),
        "duration": interview.get("duration", 30),
        "type": interview.get("type", "voice")
    }
    
    logger.info(f"📦 Prepared interview data:")
    logger.info(f"   Field: {interview_data['field']}")
    logger.info(f"   Questions: {len(interview_data['questions'])}")
    logger.info(f"   Q&A Pairs: {len(interview_data['qa'])}")
    
    # ============================================
    # Call AI Analysis Function
    # ============================================
    try:
        logger.info(f"🤖 Calling AI analysis engine...")
        
        analysis_result = await analyze_complete_interview(interview_data)
        
        if not analysis_result:
            raise HTTPException(
                status_code=500,
                detail="AI analysis failed. Check server logs for details."
            )
        
        logger.info(f"✅ AI analysis completed successfully")
        logger.info(f"   Overall Score: {analysis_result.get('overall_score')}")
        logger.info(f"   Verdict: {analysis_result.get('verdict')}")
        logger.info(f"   Question Analyses: {len(analysis_result.get('question_analysis', []))}")
        
    except Exception as e:
        logger.error(f"❌ AI analysis failed: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"AI analysis failed: {str(e)}"
        )
    
    # ============================================
    # Prepare analysis document
    # ============================================
    now = datetime.datetime.utcnow()
    
    analysis_doc = {
        "interview_id": interview_id,
        "candidate_id": interview.get("candidate_id"),
        "hr_id": interview.get("hr_id"),
        "overall_score": analysis_result["overall_score"],
        "verdict": analysis_result["verdict"],
        "strengths": analysis_result["strengths"],
        "weaknesses": analysis_result["weaknesses"],
        "communication_feedback": analysis_result["communication_feedback"],
        "technical_feedback": analysis_result["technical_feedback"],
        "overall_summary": analysis_result["overall_summary"],
        "question_analysis": analysis_result["question_analysis"],
        "ai_model": analysis_result.get("ai_model", "groq-llama-3.3-70b"),
        "created_at": existing_analysis.get("created_at", now) if existing_analysis else now,
        "regenerated_at": now if existing_analysis else None
    }
    
    # ============================================
    # Save to database
    # ============================================
    try:
        if existing_analysis:
            # Update existing analysis
            await db.interview_analysis.update_one(
                {"interview_id": interview_id},
                {"$set": analysis_doc}
            )
            logger.info(f"✅ Analysis updated in database")
        else:
            # Insert new analysis
            result = await db.interview_analysis.insert_one(analysis_doc)
            logger.info(f"✅ Analysis saved to database with ID: {result.inserted_id}")
        
    except Exception as e:
        logger.error(f"❌ Database save failed: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save analysis: {str(e)}"
        )
    
    logger.info(f"{'='*80}\n")
    
    return {
        "message": "Analysis generated successfully",
        "interview_id": interview_id,
        "overall_score": analysis_result["overall_score"],
        "verdict": analysis_result["verdict"],
        "created_at": analysis_doc["created_at"].isoformat(),
        "regenerated_at": analysis_doc["regenerated_at"].isoformat() if analysis_doc["regenerated_at"] else None
    }


# ============================================
# 2️⃣ Get Analysis for HR (Full Details)
# ============================================
@router.get("/{interview_id}/hr", response_model=HRAnalysisResponse)
async def get_analysis_for_hr(interview_id: str, hr_id: str):
    """
    Get complete interview analysis including per-question breakdown.
    HR ONLY - includes sensitive data.
    """
    logger.info(f"📊 HR requesting analysis for interview: {interview_id}")
    
    db = await Database.get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database unavailable")
    
    # Verify interview exists and HR authorization
    interview = await db.interviews.find_one({"_id": interview_id})
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    if interview.get("hr_id") != hr_id:
        raise HTTPException(
            status_code=403,
            detail="Unauthorized: You can only view analyses for your own interviews"
        )
    
    # Get analysis
    analysis = await db.interview_analysis.find_one({"interview_id": interview_id})
    if not analysis:
        raise HTTPException(
            status_code=404,
            detail="Analysis not found. Generate it first using POST /{interview_id}/generate"
        )
    
    logger.info(f"✅ Retrieved analysis for HR (includes {len(analysis.get('question_analysis', []))} question breakdowns)")
    
    # Return full analysis with all details
    return HRAnalysisResponse(
        overall_score=analysis["overall_score"],
        verdict=analysis["verdict"],
        strengths=analysis["strengths"],
        weaknesses=analysis["weaknesses"],
        communication_feedback=analysis["communication_feedback"],
        technical_feedback=analysis["technical_feedback"],
        overall_summary=analysis["overall_summary"],
        question_analysis=[QuestionAnalysis(**qa) for qa in analysis["question_analysis"]],
        ai_model=analysis.get("ai_model", "groq-llama-3.3-70b"),
        created_at=analysis["created_at"],
        regenerated_at=analysis.get("regenerated_at")
    )


# ============================================
# 3️⃣ Get Analysis for Candidate (Filtered)
# ============================================
@router.get("/{interview_id}/candidate", response_model=CandidateAnalysisResponse)
async def get_analysis_for_candidate(interview_id: str, candidate_id: str):
    """
    Get filtered interview analysis for candidate.
    NO per-question breakdown - only high-level feedback.
    """
    logger.info(f"👤 Candidate requesting analysis for interview: {interview_id}")
    
    db = await Database.get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database unavailable")
    
    # Verify interview exists and candidate authorization
    interview = await db.interviews.find_one({"_id": interview_id})
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    if interview.get("candidate_id") != candidate_id:
        raise HTTPException(
            status_code=403,
            detail="Unauthorized: You can only view your own interview analysis"
        )
    
    # Get analysis
    analysis = await db.interview_analysis.find_one({"interview_id": interview_id})
    if not analysis:
        raise HTTPException(
            status_code=404,
            detail="Analysis not available yet. Please check back later."
        )
    
    logger.info(f"✅ Retrieved filtered analysis for candidate (NO question breakdown)")
    
    # Return FILTERED response - NO question_analysis
    return CandidateAnalysisResponse(
        overall_score=analysis["overall_score"],
        verdict=analysis["verdict"],
        strengths=analysis["strengths"],
        areas_to_improve=analysis["weaknesses"],  # Renamed for friendlier tone
        overall_summary=analysis["overall_summary"]
    )


# ============================================
# 4️⃣ Check if Analysis Exists
# ============================================
@router.get("/{interview_id}/exists")
async def check_analysis_exists(interview_id: str):
    """
    Check if analysis exists for an interview.
    Useful for UI to show "Generate Analysis" button conditionally.
    """
    db = await Database.get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database unavailable")
    
    analysis = await db.interview_analysis.find_one({"interview_id": interview_id})
    
    return {
        "exists": analysis is not None,
        "interview_id": interview_id,
        "created_at": analysis["created_at"].isoformat() if analysis else None,
        "regenerated_at": analysis.get("regenerated_at").isoformat() if analysis and analysis.get("regenerated_at") else None
    }


# ============================================
# 5️⃣ Delete Analysis (Admin/HR Only)
# ============================================
@router.delete("/{interview_id}")
async def delete_analysis(interview_id: str, hr_id: str):
    """
    Delete interview analysis.
    HR ONLY - can only delete their own interview analyses.
    """
    logger.info(f"🗑️ HR requesting to delete analysis for interview: {interview_id}")
    
    db = await Database.get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database unavailable")
    
    # Verify interview exists and HR authorization
    interview = await db.interviews.find_one({"_id": interview_id})
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    if interview.get("hr_id") != hr_id:
        raise HTTPException(
            status_code=403,
            detail="Unauthorized: You can only delete analyses for your own interviews"
        )
    
    # Delete analysis
    result = await db.interview_analysis.delete_one({"interview_id": interview_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    logger.info(f"✅ Analysis deleted successfully")
    
    return {
        "message": "Analysis deleted successfully",
        "interview_id": interview_id
    }