import os
import json
import logging
import traceback
from typing import Dict, Optional
from groq import Groq

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Groq client
try:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        logger.error("GROQ_API_KEY not found in environment variables")
        client = None
    else:
        client = Groq(api_key=api_key)
        logger.info("✅ Groq client initialized for interview analysis")
except Exception as e:
    logger.error(f"Failed to initialize Groq client: {e}")
    client = None


async def analyze_complete_interview(interview_data: Dict) -> Optional[Dict]:
    """
    Analyze the entire interview in ONE AI call.
    Returns structured JSON with per-question analysis + overall feedback.
    
    Args:
        interview_data: Dict containing:
            - interview_id: str
            - field: str (e.g., 'web_development')
            - questions: List[Dict]
            - qa: List[Dict] (question-answer pairs)
            - candidate_id: str
            - hr_id: str
    
    Returns:
        Dict with complete analysis or None if failed
    """
    if client is None:
        logger.error("Groq client not initialized. Cannot analyze interview.")
        return None
    
    logger.info(f"\n{'='*80}")
    logger.info(f"🧠 ANALYZING INTERVIEW")
    logger.info(f"{'='*80}")
    logger.info(f"Interview ID: {interview_data.get('interview_id')}")
    logger.info(f"Field: {interview_data.get('field')}")
    logger.info(f"Q&A Pairs: {len(interview_data.get('qa', []))}")
    
    # ============================================
    # Build the AI Prompt
    # ============================================
    field = interview_data.get("field", "general")
    qa_list = interview_data.get("qa", [])
    
    if not qa_list:
        logger.error("No Q&A data provided")
        return None
    
    # Format Q&A for the prompt
    qa_formatted = []
    for idx, qa in enumerate(qa_list, 1):
        qa_formatted.append({
            "question_number": idx,
            "question": qa.get("question_text", ""),
            "answer": qa.get("answer", ""),
            "type": qa.get("question_type", "technical"),
            "difficulty": qa.get("difficulty", "medium"),
            "source": qa.get("question_source", "unknown")
        })
    
    # Create the analysis prompt
    prompt = f"""You are an expert technical interviewer analyzing a completed {field} interview.

**Interview Details:**
- Field: {field}
- Total Questions: {len(qa_list)}

**Question-Answer Pairs:**
{json.dumps(qa_formatted, indent=2)}

**Your Task:**
Analyze this interview comprehensively and provide feedback in STRICT JSON format.

**Output Format (MUST be valid JSON, no markdown, no extra text):**
{{
  "overall_score": <float between 0-10>,
  "verdict": "<Strong Hire | Hire | Hold | Reject>",
  "strengths": [<list of 3-5 specific strengths>],
  "weaknesses": [<list of 3-5 specific areas for improvement>],
  "communication_feedback": "<2-3 sentences about communication quality>",
  "technical_feedback": "<2-3 sentences about technical depth and accuracy>",
  "overall_summary": "<3-4 sentences summarizing the interview performance>",
  "question_analysis": [
    {{
      "question_text": "<exact question>",
      "answer": "<candidate's answer>",
      "question_type": "<type>",
      "question_source": "<source>",
      "difficulty": "<difficulty>",
      "score": <float 0-10>,
      "remark": "<1-2 sentences of specific feedback>"
    }}
  ]
}}

**Scoring Guidelines:**
- 9-10: Exceptional, exceeds expectations significantly
- 7-8: Strong performance, minor gaps only
- 5-6: Adequate but needs improvement
- 3-4: Below expectations, significant gaps
- 0-2: Poor, fundamental misunderstandings

**Verdict Guidelines:**
- Strong Hire: Score 8.5+, minimal weaknesses
- Hire: Score 7-8.5, solid with some gaps
- Hold: Score 5-7, uncertain fit
- Reject: Score <5, significant concerns

**Important:**
1. Be constructive but honest
2. Focus on technical accuracy and depth
3. Consider communication clarity
4. Provide actionable feedback
5. Return ONLY valid JSON, no preamble

Analyze now:"""

    # ============================================
    # Call Groq API
    # ============================================
    try:
        logger.info(f"🤖 Sending interview to AI for analysis...")
        
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert technical interviewer providing detailed, constructive feedback. You always return valid JSON without any markdown formatting."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_tokens=3000,  # Enough for detailed analysis
            temperature=0.3,  # Lower temp for consistent, structured output
            top_p=0.9
        )
        
        raw_response = response.choices[0].message.content.strip()
        logger.info(f"✅ Received AI response ({len(raw_response)} chars)")
        
        # ============================================
        # Parse and Validate JSON Response
        # ============================================
        try:
            # Clean up potential markdown formatting
            if raw_response.startswith("```json"):
                raw_response = raw_response.replace("```json", "").replace("```", "").strip()
            elif raw_response.startswith("```"):
                raw_response = raw_response.replace("```", "").strip()
            
            analysis_result = json.loads(raw_response)
            logger.info(f"✅ Successfully parsed JSON response")
            
            # Validate required fields
            required_fields = [
                "overall_score", "verdict", "strengths", "weaknesses",
                "communication_feedback", "technical_feedback", 
                "overall_summary", "question_analysis"
            ]
            
            missing_fields = [f for f in required_fields if f not in analysis_result]
            if missing_fields:
                logger.error(f"Missing required fields: {missing_fields}")
                return get_fallback_analysis(interview_data)
            
            # Validate score range
            if not (0 <= analysis_result["overall_score"] <= 10):
                logger.warning(f"Score out of range: {analysis_result['overall_score']}, clamping...")
                analysis_result["overall_score"] = max(0, min(10, analysis_result["overall_score"]))
            
            # Validate verdict
            valid_verdicts = ["Strong Hire", "Hire", "Hold", "Reject"]
            if analysis_result["verdict"] not in valid_verdicts:
                logger.warning(f"Invalid verdict: {analysis_result['verdict']}, defaulting to 'Hold'")
                analysis_result["verdict"] = "Hold"
            
            # Ensure question_analysis has all Q&A
            if len(analysis_result["question_analysis"]) != len(qa_list):
                logger.warning(f"Question analysis count mismatch: {len(analysis_result['question_analysis'])} vs {len(qa_list)}")
            
            # Add metadata
            analysis_result["ai_model"] = "groq-llama-3.3-70b"
            
            logger.info(f"✅ Analysis validated successfully")
            logger.info(f"   Overall Score: {analysis_result['overall_score']}")
            logger.info(f"   Verdict: {analysis_result['verdict']}")
            logger.info(f"   Strengths: {len(analysis_result['strengths'])}")
            logger.info(f"   Weaknesses: {len(analysis_result['weaknesses'])}")
            logger.info(f"   Question Analyses: {len(analysis_result['question_analysis'])}")
            
            logger.info(f"{'='*80}\n")
            return analysis_result
            
        except json.JSONDecodeError as e:
            logger.error(f"❌ Failed to parse JSON response: {e}")
            logger.error(f"Raw response: {raw_response[:500]}...")
            return get_fallback_analysis(interview_data)
        
    except Exception as e:
        logger.error(f"❌ AI analysis call failed: {e}")
        traceback.print_exc()
        return get_fallback_analysis(interview_data)


def get_fallback_analysis(interview_data: Dict) -> Dict:
    """
    Provide a fallback analysis if AI fails.
    This ensures the system never completely fails.
    """
    logger.warning("⚠️ Using fallback analysis")
    
    qa_list = interview_data.get("qa", [])
    field = interview_data.get("field", "general")
    
    # Generate simple per-question analysis
    question_analysis = []
    total_score = 0
    
    for qa in qa_list:
        # Simple scoring based on answer length
        answer = qa.get("answer", "")
        answer_length = len(answer.strip())
        
        if answer_length > 200:
            score = 7.0
            remark = "Good detailed response."
        elif answer_length > 100:
            score = 6.0
            remark = "Adequate response with room for more depth."
        elif answer_length > 50:
            score = 5.0
            remark = "Brief response, could provide more detail."
        else:
            score = 4.0
            remark = "Very brief response, needs more elaboration."
        
        total_score += score
        
        question_analysis.append({
            "question_text": qa.get("question_text", ""),
            "answer": answer,
            "question_type": qa.get("question_type", "technical"),
            "question_source": qa.get("question_source", "unknown"),
            "difficulty": qa.get("difficulty", "medium"),
            "score": score,
            "remark": remark
        })
    
    # Calculate overall score
    overall_score = round(total_score / len(qa_list), 1) if qa_list else 5.0
    
    # Determine verdict
    if overall_score >= 8:
        verdict = "Hire"
    elif overall_score >= 6:
        verdict = "Hold"
    else:
        verdict = "Reject"
    
    return {
        "overall_score": overall_score,
        "verdict": verdict,
        "strengths": [
            "Participated in the complete interview",
            "Provided responses to all questions",
            "Demonstrated basic communication skills"
        ],
        "weaknesses": [
            "Analysis performed with limited AI capabilities",
            "Detailed technical assessment not available",
            "Recommend manual review by HR"
        ],
        "communication_feedback": "Unable to perform detailed communication analysis. Please review manually.",
        "technical_feedback": f"Basic assessment for {field} field. Manual technical review recommended.",
        "overall_summary": f"This is a fallback analysis due to AI limitations. The candidate completed the interview with an average score of {overall_score}/10. Manual review by HR is strongly recommended for accurate assessment.",
        "question_analysis": question_analysis,
        "ai_model": "fallback-basic"
    }