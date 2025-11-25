# routes/interview_questions.py
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional, List
from datetime import datetime
from db.database import Database
from models.interview_questions import CreateQuestion, UpdateQuestion, AVAILABLE_FIELDS

router = APIRouter(prefix="/api/interview-questions", tags=["interview-questions"])

# Helper to get current user (adjust based on your auth implementation)
async def get_current_user_id():
    # This is a placeholder - replace with your actual auth logic
    # For now, return a dummy user ID
    return "507f1f77bcf86cd799439011"

@router.post("/")
async def create_question(question: CreateQuestion):
    """
    Create a new interview question with field specification.
    """
    db = await Database.get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database unavailable")
    
    # Validate field
    if question.field not in AVAILABLE_FIELDS:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid field. Must be one of: {', '.join(AVAILABLE_FIELDS)}"
        )
    
    # Get current user (replace with actual auth)
    user_id = await get_current_user_id()
    
    # Create question document
    now = datetime.utcnow()
    question_doc = {
        "question_text": question.question_text,
        "question_type": question.question_type,
        "difficulty": question.difficulty,
        "category": question.category,
        "field": question.field,
        "tags": question.tags,
        "created_by": user_id,
        "created_at": now,
        "updated_at": now
    }
    
    result = await db.interview_questions.insert_one(question_doc)
    
    return {
        "message": "Question created successfully",
        "id": str(result.inserted_id),
        "field": question.field
    }

@router.get("/")
async def get_questions(
    field: Optional[str] = Query(None, description="Filter by job field"),
    question_type: Optional[str] = Query(None, description="Filter by question type"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty"),
    category: Optional[str] = Query(None, description="Filter by category"),
    limit: int = Query(100, ge=1, le=500),
    page: int = Query(1, ge=1)
):
    """
    Get list of interview questions with optional filters.
    Can filter by field to get questions specific to a job field.
    """
    db = await Database.get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database unavailable")
    
    # Build query
    query = {}
    if field:
        query["field"] = field
    if question_type:
        query["question_type"] = question_type
    if difficulty:
        query["difficulty"] = difficulty
    if category:
        query["category"] = category
    
    # Calculate skip for pagination
    skip = (page - 1) * limit
    
    # Fetch questions
    cursor = db.interview_questions.find(query).sort("created_at", -1).skip(skip).limit(limit)
    questions = await cursor.to_list(length=limit)
    
    # Convert ObjectId to string
    for q in questions:
        if "_id" in q:
            q["_id"] = str(q["_id"])
        if "created_by" in q:
            q["created_by"] = str(q["created_by"])
    
    return questions

@router.get("/fields")
async def get_available_fields():
    """
    Get list of available job fields.
    """
    return {
        "fields": [
            {"value": field, "label": field.replace("_", " ").title()}
            for field in AVAILABLE_FIELDS
        ]
    }

@router.get("/by-field/{field}")
async def get_questions_by_field(
    field: str,
    limit: int = Query(10, ge=1, le=100),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty")
):
    """
    Get random questions for a specific field.
    Useful for generating interview question sets.
    """
    db = await Database.get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database unavailable")
    
    if field not in AVAILABLE_FIELDS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid field. Must be one of: {', '.join(AVAILABLE_FIELDS)}"
        )
    
    # Build query
    query = {"field": field}
    if difficulty:
        query["difficulty"] = difficulty
    
    # Use aggregation to get random questions
    pipeline = [
        {"$match": query},
        {"$sample": {"size": limit}}
    ]
    
    questions = await db.interview_questions.aggregate(pipeline).to_list(length=limit)
    
    # Convert ObjectId to string
    for q in questions:
        if "_id" in q:
            q["_id"] = str(q["_id"])
        if "created_by" in q:
            q["created_by"] = str(q["created_by"])
    
    return questions

@router.get("/{question_id}")
async def get_question(question_id: str):
    """
    Get a specific question by ID.
    """
    db = await Database.get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database unavailable")
    
    question = await db.interview_questions.find_one({"_id": question_id})
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Convert ObjectId to string
    if "_id" in question:
        question["_id"] = str(question["_id"])
    if "created_by" in question:
        question["created_by"] = str(question["created_by"])
    
    return question

@router.patch("/{question_id}")
async def update_question(question_id: str, updates: UpdateQuestion):
    """
    Update an existing question.
    """
    db = await Database.get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database unavailable")
    
    # Build update dict (only include fields that were provided)
    update_dict = {}
    if updates.question_text is not None:
        update_dict["question_text"] = updates.question_text
    if updates.question_type is not None:
        update_dict["question_type"] = updates.question_type
    if updates.difficulty is not None:
        update_dict["difficulty"] = updates.difficulty
    if updates.category is not None:
        update_dict["category"] = updates.category
    if updates.field is not None:
        if updates.field not in AVAILABLE_FIELDS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid field. Must be one of: {', '.join(AVAILABLE_FIELDS)}"
            )
        update_dict["field"] = updates.field
    if updates.tags is not None:
        update_dict["tags"] = updates.tags
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_dict["updated_at"] = datetime.utcnow()
    
    result = await db.interview_questions.update_one(
        {"_id": question_id},
        {"$set": update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Question not found")
    
    return {"message": "Question updated successfully"}

@router.delete("/{question_id}")
async def delete_question(question_id: str):
    """
    Delete a question.
    """
    db = await Database.get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database unavailable")
    
    result = await db.interview_questions.delete_one({"_id": question_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Question not found")
    
    return {"message": "Question deleted successfully"}

@router.get("/stats/by-field")
async def get_question_stats_by_field():
    """
    Get statistics of questions grouped by field.
    Useful for dashboard analytics.
    """
    db = await Database.get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database unavailable")
    
    pipeline = [
        {
            "$group": {
                "_id": "$field",
                "count": {"$sum": 1},
                "easy": {
                    "$sum": {"$cond": [{"$eq": ["$difficulty", "easy"]}, 1, 0]}
                },
                "medium": {
                    "$sum": {"$cond": [{"$eq": ["$difficulty", "medium"]}, 1, 0]}
                },
                "hard": {
                    "$sum": {"$cond": [{"$eq": ["$difficulty", "hard"]}, 1, 0]}
                }
            }
        },
        {"$sort": {"count": -1}}
    ]
    
    stats = await db.interview_questions.aggregate(pipeline).to_list(length=100)
    
    return stats