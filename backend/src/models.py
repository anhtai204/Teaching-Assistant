import uuid
from sqlalchemy import Column, String, Text, ForeignKey, DateTime, Enum, Float, Table, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import enum

class UserRole(str, enum.Enum):
    student = "student"
    lecturer = "lecturer"

# Association table for course enrollments
course_enrollments = Table(
    "course_enrollments",
    Base.metadata,
    Column("student_id", UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("course_id", UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), primary_key=True),
    Column("enrolled_at", DateTime(timezone=True), server_default=func.now()),
)

# Association table for course documents (Many-to-Many)
course_document_links = Table(
    "course_document_links",
    Base.metadata,
    Column("course_id", UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), primary_key=True),
    Column("document_id", UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), primary_key=True),
    Column("linked_at", DateTime(timezone=True), server_default=func.now()),
)

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, nullable=False) # Simplified from Enum for compatibility
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    lectured_courses = relationship("Course", back_populates="lecturer")
    enrolled_courses = relationship("Course", secondary=course_enrollments, back_populates="students")
    chat_sessions = relationship("ChatSession", back_populates="student")

class Course(Base):
    __tablename__ = "courses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text)
    lecturer_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    enrollment_code = Column(String, unique=True, nullable=True)
    greeting_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    lecturer = relationship("User", back_populates="lectured_courses")
    students = relationship("User", secondary=course_enrollments, back_populates="enrolled_courses")
    documents = relationship("Document", secondary=course_document_links, back_populates="courses")
    chat_sessions = relationship("ChatSession", back_populates="course")

class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lecturer_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    name = Column(String, nullable=False)
    file_type = Column(String, nullable=False) # 'pdf', 'slide', 'video', 'transcript'
    storage_url = Column(String, nullable=False)
    status = Column(String, default="pending") # 'pending', 'processing', 'indexed', 'error'
    is_visible = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    indexed_at = Column(DateTime(timezone=True))

    # Relationships
    courses = relationship("Course", secondary=course_document_links, back_populates="documents")
    chunks = relationship("DocumentChunk", back_populates="document")

from pgvector.sqlalchemy import Vector

class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"))
    content = Column(Text, nullable=False)
    embedding = Column(Vector(768)) # Optimized for text-embedding-004 (768 dimensions)
    metadata_json = Column("metadata", JSONB, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    document = relationship("Document", back_populates="chunks")

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"))
    title = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_message_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    student = relationship("User", back_populates="chat_sessions")
    course = relationship("Course", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("chat_sessions.id", ondelete="CASCADE"))
    role = Column(String, nullable=False) # 'user', 'assistant'
    content = Column(Text, nullable=False)
    sources = Column(JSONB, default=[])
    is_flagged = Column(Boolean, default=False)
    feedback_rating = Column(Integer, nullable=True) # 1 for Up, -1 for Down
    feedback_comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    session = relationship("ChatSession", back_populates="messages")

class KnowledgeGap(Base):
    __tablename__ = "knowledge_gaps"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"))
    topic = Column(String, nullable=False)
    frequency = Column(Integer, default=1)
    metadata_json = Column("metadata", JSONB, default={})
    last_detected_at = Column(DateTime(timezone=True), server_default=func.now())

class RoadmapItem(Base):
    __tablename__ = "roadmap_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=True)
    topic = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    priority = Column(String, default="medium")
    progress = Column(Integer, default=0)
    status = Column(String, default="todo")
    sources = Column(JSONB, default=[])
    actions = Column(JSONB, default=[])
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class MaterialRequest(Base):
    __tablename__ = "material_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"))
    topic_name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default="pending") # 'pending', 'fulfilled', 'rejected'
    lecturer_comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    student = relationship("User")
    course = relationship("Course")

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    course_ids = Column(JSONB, default=[]) # List of course UUID strings
    questions = Column(JSONB, nullable=False) # Full question objects with explanations
    answers = Column(JSONB, nullable=False) # List of selected indices
    score = Column(Float, nullable=True) # Null until completed
    total = Column(Integer, nullable=False)
    status = Column(String, default="pending") # 'pending', 'completed'
    title = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    student = relationship("User")

class FAQCache(Base):
    __tablename__ = "faq_cache"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=True)
    question = Column(Text, nullable=False)
    question_embedding = Column(Vector(768))
    answer = Column(Text, nullable=False)
    sources = Column(JSONB, default=[])
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class CourseQuestion(Base):
    __tablename__ = "course_questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=True)
    question = Column(Text, nullable=False)
    options = Column(JSONB, default=[]) # e.g. ["A", "B", "C", "D"]
    correct_index = Column(Integer, nullable=False) # 0-3
    topic = Column(String, nullable=False)
    explanation = Column(Text, nullable=True)
    difficulty = Column(String, default="medium") # 'easy', 'medium', 'hard'
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    course = relationship("Course")
    document = relationship("Document")
