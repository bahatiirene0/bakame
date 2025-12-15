-- ============================================
-- RAG & Memory System Migration for Bakame AI
-- ============================================
-- This migration creates tables for:
-- 1. Knowledge Base (RAG) - Documents, chunks, and vector embeddings
-- 2. User Memory - Long-term user context storage
-- 3. Supporting functions for similarity search
--
-- Prerequisites: Enable pgvector extension in Supabase Dashboard
-- or run: CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
-- ============================================

-- Enable pgvector extension (must be done via Supabase Dashboard or with superuser)
-- CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- ============================================
-- KNOWLEDGE DOCUMENTS - Source documents for RAG
-- ============================================
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Document identification
  title TEXT NOT NULL,
  description TEXT,
  source TEXT,                                    -- e.g., "RRA Official", "Irembo Guide"
  source_url TEXT,

  -- Content
  original_content TEXT,                          -- Full original text (for re-chunking)

  -- Classification
  category TEXT NOT NULL DEFAULT 'general',       -- tax, business, health, education, etc.
  subcategory TEXT,
  tags TEXT[] DEFAULT '{}',
  language TEXT NOT NULL DEFAULT 'en',            -- 'en', 'rw', 'both'

  -- Status & Priority
  status TEXT NOT NULL DEFAULT 'pending',         -- pending, processing, ready, error
  priority INTEGER NOT NULL DEFAULT 5,            -- 1-10, higher = more authoritative
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Metadata
  metadata JSONB DEFAULT '{}',                    -- Flexible additional data
  chunk_count INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,

  -- File info (if uploaded)
  file_path TEXT,
  file_type TEXT,                                 -- pdf, docx, txt, md, csv
  file_size INTEGER,

  -- Tracking
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Indexes for knowledge_documents
CREATE INDEX IF NOT EXISTS idx_knowledge_docs_category ON knowledge_documents(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_docs_status ON knowledge_documents(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_docs_active ON knowledge_documents(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_knowledge_docs_language ON knowledge_documents(language);
CREATE INDEX IF NOT EXISTS idx_knowledge_docs_tags ON knowledge_documents USING GIN(tags);

-- ============================================
-- KNOWLEDGE CHUNKS - Embedded text chunks for vector search
-- ============================================
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Document relationship
  document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,                   -- Order within document

  -- Content
  content TEXT NOT NULL,                          -- The actual text chunk

  -- Vector embedding (OpenAI text-embedding-3-small = 1536 dimensions)
  embedding vector(1536),

  -- Metadata
  metadata JSONB DEFAULT '{}',                    -- section, page number, etc.
  token_count INTEGER,

  -- Search optimization
  content_hash TEXT,                              -- For deduplication

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: one chunk per index per document
  UNIQUE(document_id, chunk_index)
);

-- HNSW index for fast similarity search (cosine distance)
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding
  ON knowledge_chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Other indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_document ON knowledge_chunks(document_id);

-- ============================================
-- KNOWLEDGE QA - Direct question-answer pairs (high precision)
-- ============================================
CREATE TABLE IF NOT EXISTS knowledge_qa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Question
  question TEXT NOT NULL,
  question_variants TEXT[] DEFAULT '{}',          -- Alternative phrasings

  -- Answer
  answer TEXT NOT NULL,

  -- Vector embedding of question
  embedding vector(1536),

  -- Classification
  category TEXT NOT NULL DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',
  language TEXT NOT NULL DEFAULT 'en',

  -- Source & Authority
  source TEXT,
  source_url TEXT,
  priority INTEGER NOT NULL DEFAULT 5,            -- 1-10, higher = more authoritative

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Tracking
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- HNSW index for QA embeddings
CREATE INDEX IF NOT EXISTS idx_knowledge_qa_embedding
  ON knowledge_qa USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Other indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_qa_category ON knowledge_qa(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_qa_active ON knowledge_qa(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_knowledge_qa_tags ON knowledge_qa USING GIN(tags);

-- ============================================
-- USER MEMORIES - Long-term user context
-- ============================================
CREATE TABLE IF NOT EXISTS user_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User relationship
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Memory content
  content TEXT NOT NULL,                          -- The fact/preference/context
  memory_type TEXT NOT NULL DEFAULT 'fact',       -- fact, preference, context, goal
  category TEXT DEFAULT 'general',                -- personal, business, technical, etc.

  -- Vector embedding for semantic retrieval
  embedding vector(1536),

  -- Confidence & Source
  confidence FLOAT NOT NULL DEFAULT 0.8,          -- 0-1, extraction confidence
  source TEXT NOT NULL DEFAULT 'extracted',       -- extracted, user_stated, inferred
  source_session_id UUID,                         -- Which conversation extracted this

  -- Relevance tracking
  importance FLOAT NOT NULL DEFAULT 0.5,          -- 0-1, user-rated or inferred importance
  access_count INTEGER NOT NULL DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,

  -- Memory decay
  strength FLOAT NOT NULL DEFAULT 1.0,            -- Current memory strength (decays)

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_validated BOOLEAN NOT NULL DEFAULT false,    -- User confirmed accuracy

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- HNSW index for memory embeddings
CREATE INDEX IF NOT EXISTS idx_user_memories_embedding
  ON user_memories USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Other indexes
CREATE INDEX IF NOT EXISTS idx_user_memories_user ON user_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memories_type ON user_memories(memory_type);
CREATE INDEX IF NOT EXISTS idx_user_memories_active ON user_memories(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_memories_strength ON user_memories(user_id, strength DESC);

-- ============================================
-- RAG CACHE - Cache for RAG search results
-- ============================================
CREATE TABLE IF NOT EXISTS rag_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Cache key (hash of query embedding)
  cache_key TEXT NOT NULL UNIQUE,

  -- Query info
  query_text TEXT NOT NULL,
  query_embedding vector(1536),

  -- Cached results
  results JSONB NOT NULL,                         -- Array of chunk IDs and scores
  result_count INTEGER NOT NULL,

  -- Cache metadata
  hit_count INTEGER NOT NULL DEFAULT 0,

  -- TTL
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Index for cache lookup and cleanup
CREATE INDEX IF NOT EXISTS idx_rag_cache_key ON rag_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_rag_cache_expires ON rag_cache(expires_at);

-- ============================================
-- FUNCTIONS: Similarity Search
-- ============================================

-- Search knowledge chunks by semantic similarity
CREATE OR REPLACE FUNCTION search_knowledge_chunks(
  query_embedding vector(1536),
  match_count INTEGER DEFAULT 5,
  similarity_threshold FLOAT DEFAULT 0.5,
  category_filter TEXT DEFAULT NULL,
  language_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  similarity FLOAT,
  category TEXT,
  document_title TEXT,
  source TEXT,
  metadata JSONB
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    kc.id,
    kc.document_id,
    kc.content,
    1 - (kc.embedding <=> query_embedding) AS similarity,
    kd.category,
    kd.title AS document_title,
    kd.source,
    kc.metadata
  FROM knowledge_chunks kc
  JOIN knowledge_documents kd ON kd.id = kc.document_id
  WHERE kd.is_active = true
    AND kd.status = 'ready'
    AND (category_filter IS NULL OR kd.category = category_filter)
    AND (language_filter IS NULL OR kd.language = language_filter OR kd.language = 'both')
    AND 1 - (kc.embedding <=> query_embedding) > similarity_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Search knowledge QA pairs by semantic similarity
CREATE OR REPLACE FUNCTION search_knowledge_qa(
  query_embedding vector(1536),
  match_count INTEGER DEFAULT 3,
  similarity_threshold FLOAT DEFAULT 0.7,
  category_filter TEXT DEFAULT NULL,
  language_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  question TEXT,
  answer TEXT,
  similarity FLOAT,
  category TEXT,
  source TEXT,
  priority INTEGER
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    kq.id,
    kq.question,
    kq.answer,
    1 - (kq.embedding <=> query_embedding) AS similarity,
    kq.category,
    kq.source,
    kq.priority
  FROM knowledge_qa kq
  WHERE kq.is_active = true
    AND (category_filter IS NULL OR kq.category = category_filter)
    AND (language_filter IS NULL OR kq.language = language_filter OR kq.language = 'both')
    AND 1 - (kq.embedding <=> query_embedding) > similarity_threshold
  ORDER BY kq.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Search user memories by semantic similarity
CREATE OR REPLACE FUNCTION search_user_memories(
  p_user_id UUID,
  query_embedding vector(1536),
  match_count INTEGER DEFAULT 5,
  similarity_threshold FLOAT DEFAULT 0.5,
  memory_type_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  memory_type TEXT,
  category TEXT,
  similarity FLOAT,
  confidence FLOAT,
  importance FLOAT,
  strength FLOAT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    um.id,
    um.content,
    um.memory_type,
    um.category,
    1 - (um.embedding <=> query_embedding) AS similarity,
    um.confidence,
    um.importance,
    um.strength
  FROM user_memories um
  WHERE um.user_id = p_user_id
    AND um.is_active = true
    AND um.strength > 0.1
    AND (memory_type_filter IS NULL OR um.memory_type = memory_type_filter)
    AND 1 - (um.embedding <=> query_embedding) > similarity_threshold
  ORDER BY
    -- Combine similarity with importance and strength for relevance
    (1 - (um.embedding <=> query_embedding)) * um.strength * (0.5 + um.importance * 0.5) DESC
  LIMIT match_count;
$$;

-- ============================================
-- FUNCTIONS: Memory Management
-- ============================================

-- Update memory access (called when memory is retrieved)
CREATE OR REPLACE FUNCTION touch_user_memory(memory_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE user_memories
  SET
    access_count = access_count + 1,
    last_accessed_at = NOW(),
    -- Boost strength when accessed (reinforcement)
    strength = LEAST(1.0, strength + 0.05)
  WHERE id = memory_id;
END;
$$;

-- Apply memory decay (run periodically)
CREATE OR REPLACE FUNCTION decay_user_memories()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  -- Apply exponential decay based on time since last access
  -- Different decay rates for different memory types
  UPDATE user_memories
  SET strength = GREATEST(
    0.0,
    strength * CASE memory_type
      WHEN 'fact' THEN 0.999          -- Very slow decay for facts
      WHEN 'preference' THEN 0.995    -- Slow decay for preferences
      WHEN 'context' THEN 0.98        -- Moderate decay for context
      WHEN 'goal' THEN 0.97           -- Faster decay for goals (temporal)
      ELSE 0.99
    END
  )
  WHERE is_active = true
    AND strength > 0.1;

  GET DIAGNOSTICS affected_count = ROW_COUNT;

  -- Archive memories that have decayed too much
  UPDATE user_memories
  SET is_active = false
  WHERE strength <= 0.1;

  RETURN affected_count;
END;
$$;

-- ============================================
-- FUNCTIONS: Cache Management
-- ============================================

-- Clean expired cache entries
CREATE OR REPLACE FUNCTION clean_rag_cache()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM rag_cache
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on tables
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_qa ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_cache ENABLE ROW LEVEL SECURITY;

-- Knowledge tables: Read access for all authenticated, write for admin
CREATE POLICY "knowledge_documents_read" ON knowledge_documents
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "knowledge_documents_admin" ON knowledge_documents
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "knowledge_chunks_read" ON knowledge_chunks
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "knowledge_chunks_admin" ON knowledge_chunks
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "knowledge_qa_read" ON knowledge_qa
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "knowledge_qa_admin" ON knowledge_qa
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- User memories: Users can only access their own
CREATE POLICY "user_memories_own" ON user_memories
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Cache: Read/write for service role only (handled by backend)
CREATE POLICY "rag_cache_service" ON rag_cache
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER knowledge_documents_updated_at
  BEFORE UPDATE ON knowledge_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER knowledge_qa_updated_at
  BEFORE UPDATE ON knowledge_qa
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER user_memories_updated_at
  BEFORE UPDATE ON user_memories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update chunk count when chunks change
CREATE OR REPLACE FUNCTION update_document_chunk_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'DELETE' THEN
    UPDATE knowledge_documents
    SET chunk_count = (
      SELECT COUNT(*) FROM knowledge_chunks WHERE document_id = COALESCE(NEW.document_id, OLD.document_id)
    )
    WHERE id = COALESCE(NEW.document_id, OLD.document_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER knowledge_chunks_count
  AFTER INSERT OR DELETE ON knowledge_chunks
  FOR EACH ROW EXECUTE FUNCTION update_document_chunk_count();

-- ============================================
-- GRANTS
-- ============================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION search_knowledge_chunks TO authenticated;
GRANT EXECUTE ON FUNCTION search_knowledge_qa TO authenticated;
GRANT EXECUTE ON FUNCTION search_user_memories TO authenticated;
GRANT EXECUTE ON FUNCTION touch_user_memory TO authenticated;

-- Service role functions
GRANT EXECUTE ON FUNCTION decay_user_memories TO service_role;
GRANT EXECUTE ON FUNCTION clean_rag_cache TO service_role;
