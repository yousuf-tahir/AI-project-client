# /ai_handler.py - ENHANCED VERSION WITH 7-8 QUESTIONS
import os
from groq import Groq
from db.database import Database
import datetime
import traceback
from typing import List, Dict, Optional
import asyncio
import logging

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
        logger.info("✅ Groq client initialized successfully (FREE API!)")
except Exception as e:
    logger.error(f"Failed to initialize Groq client: {e}")
    client = None

# ENHANCED Field-specific prompts with MORE VARIETY
FIELD_PROMPTS = {
    "web_development": {
        "fundamentals": "Generate a web development question about JavaScript fundamentals, ES6+ features, or core language concepts.",
        "frameworks": "Generate a question about React, Vue, or Angular - focusing on components, state management, or lifecycle.",
        "styling": "Generate a question about CSS, responsive design, Flexbox, Grid, or modern styling approaches.",
        "performance": "Generate a question about web performance optimization, lazy loading, code splitting, or Core Web Vitals.",
        "apis": "Generate a question about REST APIs, GraphQL, fetch/axios, or handling async operations.",
        "security": "Generate a question about web security, XSS, CSRF, authentication, or secure coding practices.",
        "tools": "Generate a question about webpack, build tools, npm/yarn, or development workflows."
    },
    
    "mobile_development": {
        "fundamentals": "Generate a mobile development question about app architecture, lifecycle, or platform basics.",
        "ui": "Generate a question about mobile UI patterns, navigation, or responsive layouts for different screens.",
        "performance": "Generate a question about mobile performance, battery optimization, or memory management.",
        "storage": "Generate a question about local storage, caching strategies, or offline-first approaches.",
        "apis": "Generate a question about mobile API integration, networking, or data synchronization.",
        "security": "Generate a question about mobile security, secure storage, or API authentication.",
        "cross_platform": "Generate a question about React Native, Flutter, or cross-platform considerations."
    },
    
    "data_science": {
        "fundamentals": "Generate a data science question about statistics, probability, or core mathematical concepts.",
        "preprocessing": "Generate a question about data cleaning, handling missing values, or feature engineering.",
        "algorithms": "Generate a question about ML algorithms, when to use them, or their trade-offs.",
        "evaluation": "Generate a question about model evaluation, metrics, or validation techniques.",
        "visualization": "Generate a question about data visualization, choosing charts, or storytelling with data.",
        "tools": "Generate a question about pandas, numpy, scikit-learn, or popular data science tools.",
        "practical": "Generate a question about a real-world data science scenario or case study."
    },
    
    "machine_learning": {
        "fundamentals": "Generate a machine learning question about core concepts, types of learning, or foundations.",
        "training": "Generate a question about model training, optimization, or gradient descent.",
        "neural_networks": "Generate a question about neural network architecture, layers, or activation functions.",
        "overfitting": "Generate a question about overfitting, regularization, or generalization.",
        "frameworks": "Generate a question about TensorFlow, PyTorch, or ML frameworks.",
        "deployment": "Generate a question about model deployment, serving, or monitoring in production.",
        "advanced": "Generate a question about transfer learning, transformers, or advanced ML concepts."
    },
    
    "backend_development": {
        "apis": "Generate a backend question about REST API design, versioning, or best practices.",
        "databases": "Generate a question about database design, queries, indexing, or optimization.",
        "authentication": "Generate a question about authentication, authorization, JWT, OAuth, or sessions.",
        "architecture": "Generate a question about backend architecture, microservices, or design patterns.",
        "performance": "Generate a question about caching, load balancing, or backend performance optimization.",
        "security": "Generate a question about backend security, SQL injection, or secure coding.",
        "tools": "Generate a question about Node.js, Python frameworks, or backend technologies."
    },
    
    "cybersecurity": {
        "attacks": "Generate a cybersecurity question about common attacks like SQL injection, XSS, or phishing.",
        "tools": "Generate a question about security tools like Wireshark, Nmap, Metasploit, or Kali Linux.",
        "encryption": "Generate a question about encryption, hashing, SSL/TLS, or cryptography basics.",
        "network": "Generate a question about network security, firewalls, VPNs, or secure protocols.",
        "authentication": "Generate a question about authentication methods, MFA, or access control.",
        "compliance": "Generate a question about security compliance, auditing, or best practices.",
        "incident": "Generate a question about incident response, vulnerability assessment, or penetration testing."
    },
    
    "devops": {
        "cicd": "Generate a DevOps question about CI/CD pipelines, automation, or deployment strategies.",
        "containers": "Generate a question about Docker, containerization, or container best practices.",
        "orchestration": "Generate a question about Kubernetes, container orchestration, or service management.",
        "cloud": "Generate a question about cloud services, AWS/Azure/GCP, or cloud architecture.",
        "monitoring": "Generate a question about monitoring, logging, alerting, or observability.",
        "iac": "Generate a question about Infrastructure as Code, Terraform, or CloudFormation.",
        "practices": "Generate a question about DevOps culture, collaboration, or best practices."
    },
    
    # Default for fields not explicitly defined
    "general": {
        "fundamentals": "Generate a technical interview question about core programming concepts.",
        "problem_solving": "Generate a question about problem-solving approaches or debugging strategies.",
        "best_practices": "Generate a question about software development best practices or design patterns.",
        "collaboration": "Generate a question about teamwork, code reviews, or technical communication.",
        "learning": "Generate a question about learning new technologies or staying current in tech."
    }
}

# Add default structure for other fields
for field in ["frontend_development", "full_stack_development", "cloud_engineering", 
              "ui_ux_design", "product_management", "qa_testing", "database_administration",
              "system_architecture", "blockchain", "game_development", "embedded_systems"]:
    if field not in FIELD_PROMPTS:
        FIELD_PROMPTS[field] = FIELD_PROMPTS["general"]


async def generate_ai_question(
    interview_id: str, 
    field: str = "general", 
    difficulty: str = "medium",
    topic: str = "fundamentals"
) -> Optional[Dict]:
    """
    Generates a single AI interview question using Groq with topic variety.
    """
    if client is None:
        logger.error("Groq client not initialized. Check GROQ_API_KEY environment variable.")
        return None
    
    db = await Database.get_db()
    if db is None:
        logger.error("Database unavailable")
        return None

    # Get topic-specific prompt
    field_topics = FIELD_PROMPTS.get(field, FIELD_PROMPTS["general"])
    base_prompt = field_topics.get(topic, list(field_topics.values())[0])
    
    # Enhanced difficulty context
    difficulty_context = {
        "easy": "Make it fundamental and accessible - suitable for beginners or junior roles. Focus on definitions and basic concepts.",
        "medium": "Make it practical and technical - suitable for mid-level developers. Focus on real-world application and understanding.",
        "hard": "Make it challenging - suitable for senior developers. Focus on architecture, trade-offs, and advanced scenarios."
    }
    
    prompt = f"{base_prompt} {difficulty_context.get(difficulty, '')} The answer should take 30-60 seconds. Return ONLY the question text, no explanations."

    try:
        logger.info(f"🤖 Generating {difficulty} {field} question (topic: {topic})")
        
        # Use Groq API
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system", 
                    "content": "You are a senior technical interviewer. Generate clear, specific, practical interview questions that test real understanding. Avoid generic questions. Make each question unique and interesting."
                },
                {"role": "user", "content": prompt}
            ],
            max_tokens=120,
            temperature=0.8,  # Slightly higher for more variety
            top_p=0.9
        )

        question_text = response.choices[0].message.content.strip()
        
        # Clean up the question
        if question_text.startswith('"') and question_text.endswith('"'):
            question_text = question_text[1:-1]
        
        import uuid
        question_obj = {
            "id": f"ai-{uuid.uuid4().hex[:8]}",
            "text": question_text,
            "difficulty": difficulty,
            "type": "technical",
            "source": "ai_generated",
            "generated_at": datetime.datetime.utcnow().isoformat(),
            "model": "groq-llama-3.3-70b",
            "field": field,
            "topic": topic
        }

        logger.info(f"✅ Generated question: {question_text[:60]}...")
        return question_obj

    except Exception as e:
        logger.error(f"❌ Failed to generate question: {e}")
        traceback.print_exc()
        return None


async def generate_multiple_ai_questions(
    interview_id: str, 
    field: str = "general", 
    count: int = 8,  # Changed default to 8
    difficulty_mix: bool = True
) -> List[Dict]:
    """
    Generate 7-8 diverse AI questions for an interview using Groq.
    Enhanced with topic variety for better coverage.
    """
    if client is None:
        logger.error("Groq client not initialized. Skipping AI question generation.")
        return []
    
    logger.info(f"🚀 Generating {count} diverse {field} questions using Groq")
    
    questions = []
    
    # Get available topics for this field
    field_topics = FIELD_PROMPTS.get(field, FIELD_PROMPTS["general"])
    topic_list = list(field_topics.keys())
    
    # Enhanced difficulty distribution for 7-8 questions
    if difficulty_mix:
        if count <= 3:
            difficulties = ["easy", "medium", "medium"][:count]
        elif count <= 5:
            difficulties = ["easy", "medium", "medium", "medium", "hard"][:count]
        elif count <= 7:
            difficulties = ["easy", "easy", "medium", "medium", "medium", "hard", "hard"][:count]
        else:  # 8+ questions
            difficulties = ["easy", "easy", "medium", "medium", "medium", "medium", "hard", "hard"][:count]
    else:
        difficulties = ["medium"] * count
    
    # Ensure we cover different topics for variety
    topics_to_use = []
    for i in range(count):
        # Cycle through topics to ensure variety
        topic = topic_list[i % len(topic_list)]
        topics_to_use.append(topic)
    
    # Generate questions with progress tracking
    successful_generations = 0
    failed_attempts = 0
    max_retries = 2  # Retry failed generations
    
    for i in range(count):
        retry_count = 0
        question = None
        
        while retry_count <= max_retries and question is None:
            try:
                difficulty = difficulties[i] if i < len(difficulties) else "medium"
                topic = topics_to_use[i] if i < len(topics_to_use) else topic_list[0]
                
                logger.info(f"📝 Generating question {i+1}/{count} ({difficulty}, {topic})")
                
                question = await generate_ai_question(interview_id, field, difficulty, topic)
                
                if question:
                    questions.append(question)
                    successful_generations += 1
                    # Small delay between successful generations
                    await asyncio.sleep(0.3)
                else:
                    retry_count += 1
                    if retry_count <= max_retries:
                        logger.warning(f"⚠️ Retrying question {i+1} (attempt {retry_count+1})")
                        await asyncio.sleep(0.5)
                        
            except Exception as e:
                logger.error(f"❌ Question generation failed for question {i+1}: {e}")
                retry_count += 1
                if retry_count <= max_retries:
                    await asyncio.sleep(0.5)
        
        if question is None:
            failed_attempts += 1
    
    logger.info(f"✅ Successfully generated {successful_generations}/{count} {field} questions")
    
    # If we have less than 5 questions, supplement with fallbacks
    if successful_generations < 5:
        logger.warning(f"🔄 Only {successful_generations} questions generated, adding fallbacks")
        needed_fallbacks = min(count - successful_generations, 5)
        fallbacks = await get_field_fallbacks(field, needed_fallbacks)
        questions.extend(fallbacks)
    
    return questions


async def get_field_fallbacks(field: str, count: int) -> List[Dict]:
    """
    Provide diverse field-specific fallback questions when AI generation fails.
    Enhanced with more questions per field.
    """
    fallback_questions = {
        "web_development": [
            "What's the difference between let, const, and var in JavaScript?",
            "How would you optimize a website that loads slowly?",
            "What are React hooks and when would you use useState vs useEffect?",
            "How does responsive design work in CSS?",
            "Explain the event loop in JavaScript.",
            "What are the main differences between REST and GraphQL APIs?",
            "How does CSS Grid differ from Flexbox?",
            "What is the virtual DOM and why is it useful in React?"
        ],
        "mobile_development": [
            "What are the main differences between native and hybrid mobile apps?",
            "How would you optimize battery usage in a mobile app?",
            "What considerations are important for mobile app security?",
            "How do you handle different screen sizes in mobile development?",
            "What are the pros and cons of using React Native vs Flutter?",
            "Explain the mobile app lifecycle.",
            "How do you implement offline functionality in mobile apps?",
            "What strategies would you use for mobile data caching?"
        ],
        "data_science": [
            "What's the difference between supervised and unsupervised learning?",
            "How would you handle missing values in a dataset?",
            "What evaluation metrics would you use for a classification problem?",
            "How does cross-validation work in machine learning?",
            "What is the bias-variance tradeoff?",
            "Explain the difference between correlation and causation.",
            "What is feature engineering and why is it important?",
            "How would you detect outliers in a dataset?"
        ],
        "machine_learning": [
            "What is overfitting and how can you prevent it?",
            "How does a neural network learn?",
            "What's the difference between classification and regression?",
            "How would you explain gradient descent to a non-technical person?",
            "What are some common activation functions in neural networks?",
            "Explain the concept of backpropagation.",
            "What is transfer learning and when would you use it?",
            "How do you choose between different ML algorithms for a problem?"
        ],
        "backend_development": [
            "What's the difference between SQL and NoSQL databases?",
            "How does JWT authentication work?",
            "What are the main principles of REST API design?",
            "How would you handle a database connection failure?",
            "What is database indexing and why is it important?",
            "Explain the difference between authentication and authorization.",
            "How do you implement rate limiting in an API?",
            "What strategies would you use for API versioning?"
        ],
        "cybersecurity": [
            "What are the main types of SQL injection attacks and how can they be prevented?",
            "How would you explain the difference between encryption and hashing?",
            "What are some common social engineering tactics used in phishing attacks?",
            "What tools in Kali Linux would you use for basic network reconnaissance?",
            "Why is two-factor authentication important for security?",
            "Explain what a DDoS attack is and how to mitigate it.",
            "What is the principle of least privilege?",
            "How does SSL/TLS work to secure web communications?"
        ],
        "devops": [
            "What are the main benefits of using containers?",
            "How would you explain CI/CD to a developer new to DevOps?",
            "What monitoring tools would you use for a production application?",
            "How does Kubernetes help with container orchestration?",
            "What is Infrastructure as Code and why is it important?",
            "Explain the concept of blue-green deployment.",
            "How do you implement automated rollbacks in a CI/CD pipeline?",
            "What's the difference between horizontal and vertical scaling?"
        ],
        "general": [
            "How do you approach debugging a complex technical issue?",
            "What's your process for learning a new programming language or technology?",
            "How do you stay updated with the latest industry trends?",
            "What project are you most proud of and why?",
            "How do you handle tight deadlines and competing priorities?",
            "Explain a time you had to refactor legacy code.",
            "How do you approach code reviews?",
            "What's your strategy for writing maintainable code?"
        ]
    }
    
    import uuid
    from datetime import datetime
    
    questions = fallback_questions.get(field, fallback_questions["general"])
    selected_questions = questions[:count]
    
    result = []
    for i, q_text in enumerate(selected_questions):
        result.append({
            "id": f"fallback-{uuid.uuid4().hex[:8]}",
            "text": q_text,
            "difficulty": "medium",
            "type": "technical",
            "source": "fallback",
            "generated_at": datetime.utcnow().isoformat(),
            "field": field
        })
    
    logger.info(f"🔄 Using {len(result)} fallback questions for {field}")
    return result


async def merge_questions(
    static_questions: List[Dict], 
    ai_questions: List[Dict], 
    strategy: str = "alternate"
) -> List[Dict]:
    """
    Merge static and AI questions using different strategies.
    """
    # Ensure all static questions have 'source' field
    for q in static_questions:
        if "source" not in q:
            q["source"] = "database" if "database" in str(q.get("id", "")) else "fallback"
    
    if strategy == "alternate":
        # Alternate between static and AI
        merged = []
        max_len = max(len(static_questions), len(ai_questions))
        for i in range(max_len):
            if i < len(static_questions):
                merged.append(static_questions[i])
            if i < len(ai_questions):
                merged.append(ai_questions[i])
        return merged
    
    elif strategy == "static_first":
        return static_questions + ai_questions
    
    elif strategy == "ai_first":
        return ai_questions + static_questions
    
    else:
        return static_questions + ai_questions


async def get_ai_followup_question(
    interview_id: str, 
    previous_answer: str, 
    field: str
) -> Optional[Dict]:
    """
    Generate a follow-up question based on candidate's previous answer using Groq.
    """
    if client is None:
        logger.error("Groq client not initialized")
        return None
    
    db = await Database.get_db()
    if db is None:
        return None
    
    prompt = f"""Based on this candidate's answer to a {field} interview question:
    
"{previous_answer}"

Generate a relevant follow-up question to dive deeper into their knowledge. Keep it concise and technical."""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are an expert technical interviewer conducting a follow-up."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=150,
            temperature=0.7
        )

        question_text = response.choices[0].message.content.strip()
        
        import uuid
        question_obj = {
            "id": f"ai-followup-{uuid.uuid4().hex[:8]}",
            "text": question_text,
            "difficulty": "medium",
            "type": "followup",
            "source": "ai_followup",
            "generated_at": datetime.datetime.utcnow().isoformat(),
            "model": "groq-llama-3.3-70b"
        }

        await db.interviews.update_one(
            {"_id": interview_id},
            {"$push": {"questions": question_obj}}
        )

        logger.info(f"✅ Generated follow-up question: {question_text[:50]}...")
        return question_obj

    except Exception as e:
        logger.error(f"❌ Failed to generate follow-up: {e}")
        traceback.print_exc()
        return None