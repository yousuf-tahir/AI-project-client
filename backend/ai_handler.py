# /ai_handler.py - GROQ VERSION (FREE!) - COMPLETE FIELD COVERAGE
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

# COMPLETE Field-specific prompts for ALL fields
FIELD_PROMPTS = {
    "web_development": (
        "Generate a practical web development interview question suitable for a 30-second answer. "
        "Focus on: React components, hooks, or state management; JavaScript fundamentals (ES6+, async/await, closures); "
        "CSS layout (Flexbox, Grid, responsive design); Browser APIs or DOM manipulation; Web performance optimization. "
        "Make it technical but not too advanced."
    ),
    
    "mobile_development": (
        "Generate a practical mobile development interview question suitable for a 30-second answer. "
        "Focus on: Mobile app architecture patterns (MVC, MVVM); Platform-specific considerations (iOS/Android); "
        "Performance optimization for mobile; Mobile security best practices; Cross-platform development (React Native, Flutter). "
        "Make it technical but practical."
    ),
    
    "data_science": (
        "Generate a practical data science interview question suitable for a 30-second answer. "
        "Focus on: Machine learning basics (supervised vs unsupervised); Data preprocessing and cleaning; "
        "Model evaluation metrics (accuracy, precision, recall); Common algorithms (linear regression, decision trees); "
        "Data visualization principles. Make it technical but clear."
    ),
    
    "machine_learning": (
        "Generate a practical machine learning interview question suitable for a 30-second answer. "
        "Focus on: Neural networks basics; Training vs testing concepts; Overfitting/underfitting; "
        "Feature engineering; Model evaluation techniques; Popular ML frameworks (TensorFlow, PyTorch). "
        "Make it technical but accessible."
    ),
    
    "backend_development": (
        "Generate a practical backend development interview question suitable for a 30-second answer. "
        "Focus on: REST API design and best practices; Database concepts (SQL vs NoSQL, indexing, transactions); "
        "Authentication/authorization (JWT, OAuth, sessions); Server architecture and scaling; Error handling and logging. "
        "Make it technical but practical."
    ),
    
    "frontend_development": (
        "Generate a practical frontend development interview question suitable for a 30-second answer. "
        "Focus on: JavaScript frameworks (React, Vue, Angular); CSS methodologies (BEM, CSS-in-JS); "
        "State management (Redux, Context API); Web performance optimization; Browser compatibility issues. "
        "Make it technical but focused on user interface."
    ),
    
    "full_stack_development": (
        "Generate a practical full-stack development interview question suitable for a 30-second answer. "
        "Focus on: End-to-end application architecture; API integration; Database design; Deployment strategies; "
        "Troubleshooting across frontend and backend. Make it comprehensive but concise."
    ),
    
    "devops": (
        "Generate a practical DevOps interview question suitable for a 30-second answer. "
        "Focus on: CI/CD pipeline concepts; Containerization (Docker basics, Kubernetes fundamentals); "
        "Cloud services (AWS/Azure/GCP core services); Monitoring and logging; Infrastructure as Code (Terraform, CloudFormation). "
        "Make it technical but approachable."
    ),
    
    "cloud_engineering": (
        "Generate a practical cloud engineering interview question suitable for a 30-second answer. "
        "Focus on: Cloud service models (IaaS, PaaS, SaaS); Scalability and load balancing; "
        "Cloud security best practices; Cost optimization; Multi-cloud strategies. "
        "Make it focused on cloud infrastructure."
    ),
    
    "cybersecurity": (
        "Generate a practical cybersecurity interview question suitable for a 30-second answer. "
        "Focus on: Common attacks (phishing, SQL injection, XSS, DDoS); Security tools (Wireshark, Nmap, Metasploit, Kali Linux); "
        "Basic concepts (encryption, firewalls, VPN, authentication); Network security fundamentals; Vulnerability assessment basics. "
        "Make it technical but accessible."
    ),
    
    "ui_ux_design": (
        "Generate a practical UI/UX design interview question suitable for a 30-second answer. "
        "Focus on: User research methods; Design thinking process; Wireframing and prototyping; "
        "Usability principles; Accessibility standards; Design tools (Figma, Sketch). "
        "Make it practical and user-focused."
    ),
    
    "product_management": (
        "Generate a practical product management interview question suitable for a 30-second answer. "
        "Focus on: Product strategy and roadmap; User story creation; Prioritization frameworks; "
        "Metrics and KPIs; Stakeholder management; Agile methodologies. "
        "Make it strategic and customer-oriented."
    ),
    
    "qa_testing": (
        "Generate a practical QA/testing interview question suitable for a 30-second answer. "
        "Focus on: Testing methodologies (unit, integration, end-to-end); Test automation frameworks; "
        "Bug reporting and tracking; Performance testing; Security testing basics. "
        "Make it practical and quality-focused."
    ),
    
    "database_administration": (
        "Generate a practical database administration interview question suitable for a 30-second answer. "
        "Focus on: Database design principles; Query optimization; Backup and recovery strategies; "
        "Database security; Performance tuning; SQL vs NoSQL trade-offs. "
        "Make it technical and data-focused."
    ),
    
    "system_architecture": (
        "Generate a practical system architecture interview question suitable for a 30-second answer. "
        "Focus on: System design patterns; Scalability considerations; Microservices vs monolith; "
        "Load balancing; Caching strategies; Database architecture. "
        "Make it high-level but technical."
    ),
    
    "blockchain": (
        "Generate a practical blockchain interview question suitable for a 30-second answer. "
        "Focus on: Cryptocurrency fundamentals; Smart contracts; Consensus mechanisms; "
        "Blockchain security; Decentralized applications (dApps); Web3 concepts. "
        "Make it technical but accessible."
    ),
    
    "game_development": (
        "Generate a practical game development interview question suitable for a 30-second answer. "
        "Focus on: Game engines (Unity, Unreal); Physics and collision detection; "
        "Game loop concepts; Asset management; Performance optimization for games; Multiplayer networking. "
        "Make it creative and technical."
    ),
    
    "embedded_systems": (
        "Generate a practical embedded systems interview question suitable for a 30-second answer. "
        "Focus on: Microcontroller programming; Real-time operating systems; "
        "Hardware-software integration; Power management; Sensor integration; IoT concepts. "
        "Make it hardware-focused and technical."
    ),
    
    "general": (
        "Generate a practical technical interview question suitable for a 30-second answer. "
        "Focus on: Problem-solving approaches; Basic programming concepts; Software development lifecycle; "
        "Team collaboration and communication; Learning and adaptation skills. "
        "Make it engaging but technical."
    )
}

async def generate_ai_question(interview_id: str, field: str = "general", difficulty: str = "medium") -> Optional[Dict]:
    """
    Generates a single AI interview question using Groq (FREE!)
    Enhanced for better field-specific technical questions.
    """
    if client is None:
        logger.error("Groq client not initialized. Check GROQ_API_KEY environment variable.")
        return None
    
    db = await Database.get_db()
    if db is None:
        logger.error("Database unavailable")
        return None

    # Get enhanced field-specific prompt
    base_prompt = FIELD_PROMPTS.get(field, FIELD_PROMPTS["general"])
    
    # Enhanced difficulty context for better questions
    difficulty_context = {
        "easy": "Make it fundamental and accessible - suitable for beginners or junior roles. Focus on core concepts.",
        "medium": "Make it practical and technical - suitable for mid-level developers with some experience.",
        "hard": "Make it challenging but fair - suitable for senior developers focusing on architecture and best practices."
    }
    
    prompt = f"{base_prompt} {difficulty_context.get(difficulty, '')} Return ONLY the question text, no explanations or preamble."

    try:
        logger.info(f"🤖 Generating {difficulty} {field} question using Groq")
        
        # Use Groq API with enhanced parameters
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",  # Fast and powerful
            messages=[
                {
                    "role": "system", 
                    "content": "You are a senior technical interviewer. Generate clear, practical, and field-specific interview questions that can be answered in 30-60 seconds. Focus on real-world scenarios and practical knowledge."
                },
                {"role": "user", "content": prompt}
            ],
            max_tokens=120,  # Slightly reduced for more concise questions
            temperature=0.7,  # Balanced creativity
            top_p=0.9
        )

        question_text = response.choices[0].message.content.strip()
        
        # Clean up the question (remove quotes if present)
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
            "field": field  # Track which field this was for
        }

        logger.info(f"✅ Generated {field} question: {question_text[:60]}...")
        return question_obj

    except Exception as e:
        logger.error(f"❌ Failed to generate {field} question: {e}")
        traceback.print_exc()
        return None


async def generate_multiple_ai_questions(
    interview_id: str, 
    field: str = "general", 
    count: int = 3,
    difficulty_mix: bool = True
) -> List[Dict]:
    """
    Generate multiple AI questions for an interview using Groq
    Enhanced with better difficulty distribution for balanced interviews.
    """
    if client is None:
        logger.error("Groq client not initialized. Skipping AI question generation.")
        return []
    
    logger.info(f"🚀 Generating {count} {field} questions using Groq")
    
    questions = []
    
    # Enhanced difficulty distribution for better interview flow
    if difficulty_mix:
        if count == 1:
            difficulties = ["medium"]
        elif count == 2:
            difficulties = ["easy", "medium"]
        elif count == 3:
            difficulties = ["easy", "medium", "medium"]
        elif count >= 4:
            # Start easy, mostly medium, end with one hard if enough questions
            difficulties = ["easy"] + ["medium"] * (count - 2) + (["hard"] if count >= 4 else [])
    else:
        difficulties = ["medium"] * count
    
    # Sequential generation with progress tracking
    successful_generations = 0
    for i in range(count):
        try:
            difficulty = difficulties[i] if i < len(difficulties) else "medium"
            logger.info(f"📝 Generating question {i+1}/{count} ({difficulty} difficulty)")
            
            question = await generate_ai_question(interview_id, field, difficulty)
            
            if question:
                questions.append(question)
                successful_generations += 1
                # Small delay to be respectful to the API
                await asyncio.sleep(0.2)
            else:
                logger.warning(f"⚠️ Failed to generate question {i+1}/{count}")
                
        except Exception as e:
            logger.error(f"❌ Question generation failed for question {i+1}: {e}")
            continue
    
    logger.info(f"✅ Successfully generated {successful_generations}/{count} {field} questions")
    
    # If we failed to generate any questions, provide fallbacks
    if successful_generations == 0:
        logger.warning("🔄 No AI questions generated, using field-specific fallbacks")
        return await get_field_fallbacks(field, count)
    
    return questions


async def get_field_fallbacks(field: str, count: int) -> List[Dict]:
    """
    Provide field-specific fallback questions when AI generation fails.
    """
    fallback_questions = {
        "web_development": [
            "What's the difference between let, const, and var in JavaScript?",
            "How would you optimize a website that loads slowly?",
            "What are React hooks and when would you use useState vs useEffect?",
            "How does responsive design work in CSS?",
            "What are the main differences between REST and GraphQL APIs?"
        ],
        "mobile_development": [
            "What are the main differences between native and hybrid mobile apps?",
            "How would you optimize battery usage in a mobile app?",
            "What considerations are important for mobile app security?",
            "How do you handle different screen sizes in mobile development?",
            "What are the pros and cons of using React Native vs Flutter?"
        ],
        "data_science": [
            "What's the difference between supervised and unsupervised learning?",
            "How would you handle missing values in a dataset?",
            "What evaluation metrics would you use for a classification problem?",
            "How does cross-validation work in machine learning?",
            "What is the bias-variance tradeoff?"
        ],
        "machine_learning": [
            "What is overfitting and how can you prevent it?",
            "How does a neural network learn?",
            "What's the difference between classification and regression?",
            "How would you explain gradient descent to a non-technical person?",
            "What are some common activation functions in neural networks?"
        ],
        "backend_development": [
            "What's the difference between SQL and NoSQL databases?",
            "How does JWT authentication work?",
            "What are the main principles of REST API design?",
            "How would you handle a database connection failure?",
            "What is database indexing and why is it important?"
        ],
        "frontend_development": [
            "What's the difference between state and props in React?",
            "How would you optimize website performance?",
            "What are the benefits of using CSS Grid over Flexbox?",
            "How do you handle cross-browser compatibility issues?",
            "What is the virtual DOM and why is it useful?"
        ],
        "full_stack_development": [
            "How would you design a full-stack application from scratch?",
            "What considerations are important when choosing a tech stack?",
            "How do you ensure security across frontend and backend?",
            "What deployment strategies would you use for a web application?",
            "How do you handle API versioning in a growing application?"
        ],
        "devops": [
            "What are the main benefits of using containers?",
            "How would you explain CI/CD to a developer new to DevOps?",
            "What monitoring tools would you use for a production application?",
            "How does Kubernetes help with container orchestration?",
            "What is Infrastructure as Code and why is it important?"
        ],
        "cloud_engineering": [
            "What are the main differences between IaaS, PaaS, and SaaS?",
            "How would you design a highly available system in the cloud?",
            "What strategies would you use to optimize cloud costs?",
            "How do you ensure security in a cloud environment?",
            "What are the benefits of using multiple cloud providers?"
        ],
        "cybersecurity": [
            "What are the main types of SQL injection attacks and how can they be prevented?",
            "How would you explain the difference between encryption and hashing?",
            "What are some common social engineering tactics used in phishing attacks?",
            "What tools in Kali Linux would you use for basic network reconnaissance?",
            "Why is two-factor authentication important for security?"
        ],
        "ui_ux_design": [
            "What is the difference between UI and UX design?",
            "How would you conduct user research for a new product?",
            "What are some key principles of good usability?",
            "How do you approach creating a wireframe?",
            "Why is accessibility important in design?"
        ],
        "product_management": [
            "How would you prioritize features for a new product?",
            "What metrics would you track to measure product success?",
            "How do you gather and incorporate user feedback?",
            "What is the difference between a product roadmap and a backlog?",
            "How would you handle conflicting stakeholder requirements?"
        ],
        "qa_testing": [
            "What's the difference between unit testing and integration testing?",
            "How would you approach testing a new feature?",
            "What are some common test automation frameworks?",
            "How do you write a good bug report?",
            "What is regression testing and why is it important?"
        ],
        "database_administration": [
            "What's the difference between a primary key and a foreign key?",
            "How would you optimize a slow database query?",
            "What backup strategies would you implement for a production database?",
            "How do you ensure database security?",
            "What are the ACID properties in database transactions?"
        ],
        "system_architecture": [
            "What are the trade-offs between microservices and monolithic architecture?",
            "How would you design a system that needs to handle high traffic?",
            "What caching strategies would you implement for better performance?",
            "How do you ensure system reliability and fault tolerance?",
            "What factors influence your database choice for a new system?"
        ],
        "blockchain": [
            "How would you explain blockchain to someone without a technical background?",
            "What are smart contracts and how are they used?",
            "What is the difference between proof of work and proof of stake?",
            "How does cryptocurrency mining work?",
            "What are some security considerations in blockchain development?"
        ],
        "game_development": [
            "What is a game loop and why is it important?",
            "How would you optimize game performance for mobile devices?",
            "What considerations are important for game physics?",
            "How do you handle asset management in a large game?",
            "What are the challenges in developing multiplayer games?"
        ],
        "embedded_systems": [
            "What is the difference between a microcontroller and a microprocessor?",
            "How would you approach power management in an embedded device?",
            "What considerations are important for real-time systems?",
            "How do you debug hardware-software integration issues?",
            "What are some common communication protocols used in embedded systems?"
        ],
        "general": [
            "How do you approach debugging a complex technical issue?",
            "What's your process for learning a new programming language or technology?",
            "How do you stay updated with the latest industry trends?",
            "What project are you most proud of and why?",
            "How do you handle tight deadlines and competing priorities?"
        ]
    }
    
    import uuid
    from datetime import datetime
    
    questions = fallback_questions.get(field, fallback_questions["general"])
    selected_questions = questions[:count]  # Take first N questions
    
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


async def merge_questions(static_questions: List[Dict], ai_questions: List[Dict], strategy: str = "alternate") -> List[Dict]:
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
        # Default: static first
        return static_questions + ai_questions


async def get_ai_followup_question(interview_id: str, previous_answer: str, field: str) -> Optional[Dict]:
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