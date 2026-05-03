-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- User Roles Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('student', 'lecturer');
    END IF;
END $$;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Courses Table
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    lecturer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    enrollment_code TEXT UNIQUE,
    greeting_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Course Enrollments (Student-Course mapping)
CREATE TABLE IF NOT EXISTS course_enrollments (
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (student_id, course_id)
);

-- 4. Documents Table (Metadata for uploaded files)
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_type TEXT NOT NULL, -- 'pdf', 'slide', 'video', 'transcript'
    storage_url TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'indexed', 'error'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    indexed_at TIMESTAMPTZ
);

-- 5. Document Chunks (RAG storage with pgvector)
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding VECTOR(384), -- Optimized for all-MiniLM-L6-v2 (384 dimensions)
    metadata JSONB DEFAULT '{}', -- Store page_number, slide_index, timestamp, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create an HNSW index for fast vector search
CREATE INDEX ON document_chunks USING hnsw (embedding vector_cosine_ops);

-- 6. Chat Sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- 'user', 'assistant'
    content TEXT NOT NULL,
    sources JSONB DEFAULT '[]', -- References to document_chunks used for citations
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Student Knowledge Gaps (for Analytics)
CREATE TABLE IF NOT EXISTS knowledge_gaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    gap_score FLOAT DEFAULT 0.0, -- Higher score = larger gap
    last_detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automated update of updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
