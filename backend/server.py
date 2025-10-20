from fastapi import FastAPI, APIRouter, File, UploadFile, Depends, HTTPException, Form
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from dotenv import load_dotenv
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import shutil

# Import our modules
from database import init_db, get_db, User, Document, Conversation, Message, Quiz, QuizResult, Progress, KnowledgeGraph
from rag_system import RAGSystem
from quiz_generator import QuizGenerator
from knowledge_graph import KnowledgeGraphBuilder

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Initialize database
init_db()

# Create upload directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# Initialize AI systems
rag_system = RAGSystem()
quiz_generator = QuizGenerator()
knowledge_graph_builder = KnowledgeGraphBuilder()

# Create the main app
app = FastAPI()

# Create a router with /api prefix
api_router = APIRouter(prefix="/api")

# Models
class UserCreate(BaseModel):
    name: str
    email: str

class QueryRequest(BaseModel):
    query: str
    user_id: int
    mode: str = "Quick Learner"

class ConversationCreate(BaseModel):
    user_id: int
    mode: str = "Quick Learner"

class MessageCreate(BaseModel):
    conversation_id: int
    content: str

class QuizCreate(BaseModel):
    user_id: int
    topic: str
    content: str
    difficulty: str = "medium"
    num_questions: int = 5

class QuizSubmit(BaseModel):
    quiz_id: int
    user_id: int
    answers: dict

class ProgressUpdate(BaseModel):
    user_id: int
    topic: str
    study_time_minutes: int

# Routes
@api_router.get("/")
async def root():
    return {"message": "NeuraLearn API is running"}

# User routes
@api_router.post("/users")
async def create_user(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if user exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        return existing_user
    
    user = User(name=user_data.name, email=user_data.email)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@api_router.get("/users/{user_id}")
async def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# Document routes
@api_router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    user_id: int = Form(...),
    db: Session = Depends(get_db)
):
    try:
        # Save file
        file_path = UPLOAD_DIR / f"{uuid.uuid4()}_{file.filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Create document record
        doc = Document(
            user_id=user_id,
            filename=file.filename,
            file_type="pdf"
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        
        # Index document in RAG system
        chunks_count = await rag_system.index_document(str(file_path), user_id, doc.id)
        
        # Generate summary
        summary = await rag_system.generate_summary(str(file_path))
        doc.content_preview = summary
        db.commit()
        
        # Extract topics
        topics_text = await rag_system.extract_topics(str(file_path))
        
        return {
            "id": doc.id,
            "filename": doc.filename,
            "summary": summary,
            "topics": topics_text,
            "chunks_indexed": chunks_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/documents/user/{user_id}")
async def get_user_documents(user_id: int, db: Session = Depends(get_db)):
    docs = db.query(Document).filter(Document.user_id == user_id).all()
    return docs

# Conversation routes
@api_router.post("/conversations")
async def create_conversation(conv_data: ConversationCreate, db: Session = Depends(get_db)):
    conversation = Conversation(
        user_id=conv_data.user_id,
        session_id=str(uuid.uuid4()),
        mode=conv_data.mode
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation

@api_router.post("/query")
async def query_rag(query_req: QueryRequest, db: Session = Depends(get_db)):
    try:
        # get previous messages for conversation memory
        conversation = db.query(Conversation).filter(Conversation.user_id == query_req.user_id).first()
        previous_messages = []
        if conversation:
            prev_msgs = db.query(Message).filter(Message.conversation_id == conversation.id).all()
            previous_messages = [{"role": m.role, "content": m.content} for m in prev_msgs]

        result = await rag_system.query_documents(
            query=query_req.query,
            user_id=query_req.user_id,
            mode=query_req.mode,
            messages=previous_messages
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/conversations/user/{user_id}")
async def get_user_conversations(user_id: int, db: Session = Depends(get_db)):
    conversations = db.query(Conversation).filter(Conversation.user_id == user_id).all()
    return conversations

@api_router.get("/conversations/{conversation_id}/messages")
async def get_conversation_messages(conversation_id: int, db: Session = Depends(get_db)):
    messages = db.query(Message).filter(Message.conversation_id == conversation_id).all()
    return messages

# Quiz routes
@api_router.post("/quiz/generate")
async def generate_quiz(quiz_data: QuizCreate, db: Session = Depends(get_db)):
    try:
        questions = await quiz_generator.generate_quiz(
            quiz_data.topic,
            quiz_data.content,
            quiz_data.difficulty,
            quiz_data.num_questions
        )
        
        quiz = Quiz(
            user_id=quiz_data.user_id,
            topic=quiz_data.topic,
            questions=questions,
            difficulty=quiz_data.difficulty
        )
        db.add(quiz)
        db.commit()
        db.refresh(quiz)
        
        return {
            "id": quiz.id,
            "topic": quiz.topic,
            "questions": questions,
            "difficulty": quiz.difficulty
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/quiz/submit")
async def submit_quiz(submission: QuizSubmit, db: Session = Depends(get_db)):
    quiz = db.query(Quiz).filter(Quiz.id == submission.quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    # Calculate score
    correct = 0
    total = len(quiz.questions)
    
    for idx, question in enumerate(quiz.questions):
        user_answer = submission.answers.get(str(idx))
        if user_answer == question.get('correct_answer'):
            correct += 1
    
    score = correct / total if total > 0 else 0
    
    # Save result
    result = QuizResult(
        quiz_id=quiz.id,
        user_id=submission.user_id,
        score=score,
        total_questions=total,
        answers=submission.answers
    )
    db.add(result)
    
    # Update progress
    progress = db.query(Progress).filter(
        Progress.user_id == submission.user_id,
        Progress.topic == quiz.topic
    ).first()
    
    if progress:
        progress.quizzes_taken += 1
        progress.mastery_score = (progress.mastery_score + score) / 2
        progress.last_studied = datetime.now(timezone.utc)
    else:
        progress = Progress(
            user_id=submission.user_id,
            topic=quiz.topic,
            mastery_score=score,
            quizzes_taken=1
        )
        db.add(progress)
    
    db.commit()
    db.refresh(result)
    
    return {
        "score": score,
        "correct": correct,
        "total": total,
        "percentage": score * 100
    }

@api_router.get("/quiz/user/{user_id}")
async def get_user_quizzes(user_id: int, db: Session = Depends(get_db)):
    quizzes = db.query(Quiz).filter(Quiz.user_id == user_id).all()
    return quizzes

# Progress routes
@api_router.get("/progress/user/{user_id}")
async def get_user_progress(user_id: int, db: Session = Depends(get_db)):
    progress = db.query(Progress).filter(Progress.user_id == user_id).all()
    return progress

@api_router.post("/progress/update")
async def update_progress(progress_data: ProgressUpdate, db: Session = Depends(get_db)):
    progress = db.query(Progress).filter(
        Progress.user_id == progress_data.user_id,
        Progress.topic == progress_data.topic
    ).first()
    
    if progress:
        progress.study_time_minutes += progress_data.study_time_minutes
        progress.last_studied = datetime.now(timezone.utc)
    else:
        progress = Progress(
            user_id=progress_data.user_id,
            topic=progress_data.topic,
            study_time_minutes=progress_data.study_time_minutes
        )
        db.add(progress)
    
    db.commit()
    db.refresh(progress)
    return progress

# Knowledge Graph routes
@api_router.post("/knowledge-graph/generate")
async def generate_knowledge_graph(
    user_id: int = Form(...),
    document_id: int = Form(...),
    content: str = Form(...),
    topic: str = Form(...),
    db: Session = Depends(get_db)
):
    try:
        graph_data = await knowledge_graph_builder.build_graph(content, topic)
        
        kg = KnowledgeGraph(
            user_id=user_id,
            document_id=document_id,
            graph_data=graph_data
        )
        db.add(kg)
        db.commit()
        db.refresh(kg)
        
        return {
            "id": kg.id,
            "graph_data": graph_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/knowledge-graph/document/{document_id}")
async def get_knowledge_graph(document_id: int, db: Session = Depends(get_db)):
    kg = db.query(KnowledgeGraph).filter(KnowledgeGraph.document_id == document_id).first()
    if not kg:
        raise HTTPException(status_code=404, detail="Knowledge graph not found")
    return kg

# Analytics routes
@api_router.get("/analytics/user/{user_id}")
async def get_user_analytics(user_id: int, db: Session = Depends(get_db)):
    progress = db.query(Progress).filter(Progress.user_id == user_id).all()
    quiz_results = db.query(QuizResult).filter(QuizResult.user_id == user_id).all()
    
    # Calculate stats
    total_study_time = sum([p.study_time_minutes for p in progress])
    total_quizzes = len(quiz_results)
    avg_score = sum([r.score for r in quiz_results]) / len(quiz_results) if quiz_results else 0
    
    # Topic mastery
    topic_mastery = [{
        "topic": p.topic,
        "mastery_score": p.mastery_score,
        "quizzes_taken": p.quizzes_taken,
        "study_time": p.study_time_minutes
    } for p in progress]
    
    return {
        "total_study_time_minutes": total_study_time,
        "total_quizzes_taken": total_quizzes,
        "average_score": avg_score,
        "topic_mastery": topic_mastery
    }

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)