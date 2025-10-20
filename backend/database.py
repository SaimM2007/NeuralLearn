from sqlalchemy import create_engine, Column, Integer, String, Text, Float, JSON, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime, timezone
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database Models
class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    documents = relationship('Document', back_populates='user')
    conversations = relationship('Conversation', back_populates='user')
    quizzes = relationship('Quiz', back_populates='user')
    progress = relationship('Progress', back_populates='user')

class Document(Base):
    __tablename__ = 'documents'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    filename = Column(String(255), nullable=False)
    content_preview = Column(Text)
    file_type = Column(String(50))
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    user = relationship('User', back_populates='documents')
    knowledge_graphs = relationship('KnowledgeGraph', back_populates='document')

class Conversation(Base):
    __tablename__ = 'conversations'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    session_id = Column(String(100), unique=True, nullable=False, index=True)
    mode = Column(String(50), default='Quick Learner')  # Quick Learner, Deep Thinker, Code Mentor
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    user = relationship('User', back_populates='conversations')
    messages = relationship('Message', back_populates='conversation')

class Message(Base):
    __tablename__ = 'messages'
    
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey('conversations.id'))
    role = Column(String(20), nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    sources = Column(JSON)  # Retrieved document chunks
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    conversation = relationship('Conversation', back_populates='messages')

class Quiz(Base):
    __tablename__ = 'quizzes'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    topic = Column(String(255), nullable=False)
    questions = Column(JSON, nullable=False)
    difficulty = Column(String(20), default='medium')  # easy, medium, hard
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    user = relationship('User', back_populates='quizzes')
    results = relationship('QuizResult', back_populates='quiz')

class QuizResult(Base):
    __tablename__ = 'quiz_results'
    
    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey('quizzes.id'))
    user_id = Column(Integer, ForeignKey('users.id'))
    score = Column(Float, nullable=False)
    total_questions = Column(Integer, nullable=False)
    answers = Column(JSON, nullable=False)
    completed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    quiz = relationship('Quiz', back_populates='results')

class Progress(Base):
    __tablename__ = 'progress'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    topic = Column(String(255), nullable=False, index=True)
    mastery_score = Column(Float, default=0.0)
    study_time_minutes = Column(Integer, default=0)
    quizzes_taken = Column(Integer, default=0)
    last_studied = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    user = relationship('User', back_populates='progress')

class KnowledgeGraph(Base):
    __tablename__ = 'knowledge_graphs'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    document_id = Column(Integer, ForeignKey('documents.id'))
    graph_data = Column(JSON, nullable=False)  # nodes and edges
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    document = relationship('Document', back_populates='knowledge_graphs')

# Create all tables
def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()