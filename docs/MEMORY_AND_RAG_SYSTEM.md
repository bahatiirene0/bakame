# Bakame AI - Memory & RAG System Documentation

> **Version**: 1.0.0
> **Last Updated**: December 2024
> **Author**: Bakame AI Team

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [RAG System](#rag-system)
5. [Memory System](#memory-system)
6. [Chat Integration](#chat-integration)
7. [Admin Dashboard](#admin-dashboard)
8. [API Reference](#api-reference)
9. [Configuration](#configuration)
10. [Usage Examples](#usage-examples)
11. [Best Practices](#best-practices)
12. [Troubleshooting](#troubleshooting)

---

## Overview

The Memory & RAG (Retrieval-Augmented Generation) system enables Bakame AI to:

1. **Remember users** - Store facts, preferences, goals, and context from conversations
2. **Use Rwanda-specific knowledge** - Prioritize verified knowledge over LLM base knowledge
3. **Provide accurate answers** - Use semantic search to find relevant information
4. **Personalize responses** - Tailor answers based on user history

### Key Principles

- **RAG Priority**: Knowledge from our database takes precedence over GPT's training data
- **Privacy First**: User memories are per-user and protected by Row Level Security
- **Bilingual Support**: Optimized for both English and Kinyarwanda
- **Performance**: Redis caching for fast retrieval

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Message                             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Chat API                                 │
│  /src/app/api/chat/route.ts                                     │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
┌───────────────────┐ ┌─────────────────┐ ┌─────────────────────┐
│   RAG Retrieval   │ │ Memory Context  │ │   System Prompt     │
│   /lib/rag/       │ │ /lib/memory/    │ │   /lib/prompts/     │
└───────────────────┘ └─────────────────┘ └─────────────────────┘
        │                     │                     │
        ▼                     ▼                     │
┌───────────────────┐ ┌─────────────────┐           │
│ Vector Search     │ │ User Memories   │           │
│ (pgvector)        │ │ (pgvector)      │           │
└───────────────────┘ └─────────────────┘           │
        │                     │                     │
        └──────────┬──────────┘                     │
                   ▼                                │
┌─────────────────────────────────────────────────────────────────┐
│                    Augmented System Prompt                       │
│  Base Prompt + RAG Context + Memory Context                     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         LLM (GPT-4o-mini)                       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Response + Memory Extraction                │
│                      (Background process)                        │
└─────────────────────────────────────────────────────────────────┘
```

### Components

| Component | Location | Purpose |
|-----------|----------|---------|
| RAG Module | `/src/lib/rag/` | Knowledge retrieval and search |
| Memory Module | `/src/lib/memory/` | User memory extraction and storage |
| Chat API | `/src/app/api/chat/route.ts` | Main chat endpoint with RAG/Memory integration |
| Admin UI | `/src/app/(admin)/admin/knowledge/` | Knowledge management interface |
| Processing API | `/src/app/api/admin/knowledge/process/` | Document embedding generation |

---

## Database Schema

### Tables Overview

```sql
-- Knowledge Documents (source documents)
knowledge_documents
├── id (UUID)
├── title (TEXT)
├── content (TEXT)
├── category (TEXT) -- tax, business, government, health, etc.
├── language (TEXT) -- 'en' or 'rw'
├── source (TEXT)   -- URL or reference
├── priority (INT)  -- Higher = more important
├── status (TEXT)   -- pending, processing, ready, error
├── is_active (BOOL)
└── metadata (JSONB)

-- Knowledge Chunks (embedded segments)
knowledge_chunks
├── id (UUID)
├── document_id (UUID) → knowledge_documents
├── content (TEXT)
├── embedding (VECTOR(1536)) -- OpenAI embedding
├── chunk_index (INT)
├── token_count (INT)
└── metadata (JSONB)

-- Q&A Pairs (direct answers)
knowledge_qa
├── id (UUID)
├── document_id (UUID) -- optional link to source
├── question (TEXT)
├── answer (TEXT)
├── category (TEXT)
├── language (TEXT)
├── embedding (VECTOR(1536))
├── source (TEXT)
└── is_active (BOOL)

-- User Memories
user_memories
├── id (UUID)
├── user_id (UUID) → users
├── content (TEXT)
├── memory_type (TEXT) -- fact, preference, context, goal
├── category (TEXT)
├── embedding (VECTOR(1536))
├── confidence (FLOAT) -- 0-1
├── strength (FLOAT)   -- decays over time
├── source (TEXT)      -- extracted, user_stated, inferred
├── is_active (BOOL)
├── last_accessed (TIMESTAMP)
└── metadata (JSONB)

-- RAG Cache
rag_cache
├── id (UUID)
├── cache_key (TEXT)
├── result (JSONB)
├── expires_at (TIMESTAMP)
└── created_at (TIMESTAMP)
```

### Vector Indexes (HNSW)

```sql
-- Fast similarity search indexes
CREATE INDEX idx_knowledge_chunks_embedding
  ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);

CREATE INDEX idx_knowledge_qa_embedding
  ON knowledge_qa USING hnsw (embedding vector_cosine_ops);

CREATE INDEX idx_user_memories_embedding
  ON user_memories USING hnsw (embedding vector_cosine_ops);
```

### Key Database Functions

```sql
-- Search knowledge chunks by similarity
search_knowledge_chunks(
  query_embedding VECTOR(1536),
  match_count INTEGER,
  similarity_threshold FLOAT,
  category_filter TEXT,
  language_filter TEXT
) RETURNS TABLE(...)

-- Search Q&A pairs
search_knowledge_qa(
  query_embedding VECTOR(1536),
  match_count INTEGER,
  similarity_threshold FLOAT,
  category_filter TEXT,
  language_filter TEXT
) RETURNS TABLE(...)

-- Search user memories
search_user_memories(
  p_user_id UUID,
  query_embedding VECTOR(1536),
  match_count INTEGER,
  similarity_threshold FLOAT,
  min_strength FLOAT,
  type_filter TEXT,
  category_filter TEXT
) RETURNS TABLE(...)

-- Reinforce memory on access
touch_user_memory(memory_id UUID) RETURNS VOID

-- Decay old memories (run periodically)
decay_user_memories() RETURNS INTEGER
```

---

## RAG System

### Module Structure

```
/src/lib/rag/
├── index.ts       # Module exports
├── embeddings.ts  # OpenAI embedding generation
├── chunker.ts     # Document chunking
├── search.ts      # Semantic search with caching
└── retriever.ts   # High-level retrieval interface
```

### Embeddings (`embeddings.ts`)

Generates vector embeddings using OpenAI's `text-embedding-3-small` model.

```typescript
// Generate single embedding
const embedding = await generateEmbedding("What is VAT in Rwanda?");
// Returns: number[] (1536 dimensions)

// Generate batch embeddings (more efficient)
const result = await generateBatchEmbeddings([
  "Text 1",
  "Text 2",
  "Text 3"
]);
// Returns: { results: EmbeddingResult[], totalTokens: number, failedIndices: number[] }

// Get model info
const info = getEmbeddingModelInfo();
// Returns: { model: 'text-embedding-3-small', dimensions: 1536, costPer1MTokens: 0.02 }
```

**Features:**
- Automatic retry with exponential backoff
- Rate limit handling
- Text cleaning and truncation
- Batch processing (max 100 per batch)

### Chunking (`chunker.ts`)

Splits documents into semantically meaningful chunks for embedding.

```typescript
// Basic chunking
const chunks = chunkDocument(longText, {
  contentType: 'prose',  // or 'technical', 'qa', 'kinyarwanda'
  chunkSize: 512,        // tokens
  overlap: 50            // tokens
});

// Markdown-aware chunking
const chunks = chunkMarkdown(markdownText);

// Q&A pair extraction
const qaChunks = chunkQAPairs(qaText);

// Detect if text is Kinyarwanda
const isKinyarwanda = detectKinyarwanda(text);
```

**Chunk Configurations:**

| Type | Chunk Size | Overlap | Use Case |
|------|------------|---------|----------|
| default | 512 | 50 | General text |
| prose | 768 | 100 | Long-form content |
| technical | 512 | 80 | Code, documentation |
| qa | 256 | 0 | Question-answer pairs |
| kinyarwanda | 384 | 60 | Kinyarwanda text (smaller due to morphological complexity) |

### Search (`search.ts`)

Performs semantic search over the knowledge base.

```typescript
// Full search (chunks + Q&A)
const results = await searchKnowledge("What is the VAT rate?", {
  matchCount: 5,
  similarityThreshold: 0.5,
  category: 'tax',
  language: 'en',
  includeQA: true,
  skipCache: false
});

// Returns:
// {
//   chunks: KnowledgeSearchResult[],
//   qa: KnowledgeQASearchResult[],
//   fromCache: boolean,
//   metadata: { query, totalResults, searchTimeMs }
// }

// Q&A only search (higher precision)
const qaResults = await searchQA("What is VAT?", {
  matchCount: 3,
  similarityThreshold: 0.7
});

// Category search
const taxDocs = await searchByCategory('tax', 'registration', 10);

// Get available categories
const categories = await getKnowledgeCategories();
```

**Caching:**
- Results cached in Redis for 5 minutes
- Cache key includes query, filters, and options
- Automatic cache invalidation on TTL expiry

### Retriever (`retriever.ts`)

High-level interface for knowledge retrieval with context formatting.

```typescript
// Main retrieval function
const retrieval = await retrieveKnowledge("How do I register a company?", {
  userLanguage: 'en',
  maxContextTokens: 2000,
  includeSources: true
});

// Returns:
// {
//   context: string,           // Formatted for LLM
//   hasKnowledge: boolean,
//   confidence: 'high' | 'medium' | 'low' | 'none',
//   sources: Array<{ title, source, category }>,
//   raw: SearchResult,
//   fallbackSuggestion?: 'web_search' | 'ask_clarification' | 'use_base_knowledge'
// }

// Get direct answer from Q&A
const answer = await retrieveDirectAnswer("What is VAT rate?");
// Returns: { answer: string, source: string, confidence: number } | null

// Format for system prompt
const promptContext = formatForSystemPrompt(retrieval, 'en');
```

**Confidence Levels:**

| Level | Criteria | Action |
|-------|----------|--------|
| high | Q&A match >= 0.85 similarity | Use directly |
| medium | Match >= 0.5 similarity | Use with context |
| low | Match >= 0.5 but weak | Supplement with base knowledge |
| none | No matches found | Suggest web search or clarification |

---

## Memory System

### Module Structure

```
/src/lib/memory/
├── index.ts      # Module exports
├── extractor.ts  # Memory extraction from conversations
└── store.ts      # Memory persistence and retrieval
```

### Memory Types

| Type | Description | Example |
|------|-------------|---------|
| `fact` | Definite information | "User's name is Jean" |
| `preference` | Likes, dislikes | "User prefers English" |
| `context` | Situational info | "User is planning a trip" |
| `goal` | Objectives | "User wants to start a business" |

### Memory Categories

- `personal` - Name, location, family, age
- `business` - Job, company, projects
- `preferences` - Likes, dislikes, communication style
- `technical` - Tools, languages, expertise
- `goals` - Objectives, intentions
- `context` - Temporary but relevant info

### Extraction (`extractor.ts`)

Extracts memories from conversations using LLM + pattern matching.

```typescript
// Extract from conversation
const result = await extractMemories(
  ["I'm a coffee farmer in Musanze", "I have 5 hectares"],
  ["That's great! How can I help?"],
  ["User is from Rwanda"]  // existing memories to avoid duplicates
);

// Returns:
// {
//   memories: [
//     { content: "User is a coffee farmer", type: "fact", category: "business", confidence: 0.95 },
//     { content: "User lives in Musanze", type: "fact", category: "personal", confidence: 0.95 },
//     { content: "User has 5 hectares of land", type: "context", category: "business", confidence: 0.9 }
//   ],
//   success: true
// }

// Quick extraction from single message (pattern-based first)
const memories = await extractFromMessage("My name is Jean and I'm from Kigali");

// Summarize old memories
const summary = await summarizeMemories(
  ["User has farm", "Farm is in Musanze", "Farm grows coffee"],
  "business"
);
// Returns: "User owns a coffee farm in Musanze"
```

**Pattern-Based Extraction (Fast, No API):**
- Name patterns: "my name is", "I'm called", "nitwa"
- Location patterns: "I live in", "I'm from", "ntuye"
- Occupation patterns: "I am a", "I work as", "ndi"
- Preference patterns: "I prefer", "I like", "nkunda"

### Storage (`store.ts`)

Handles memory persistence with deduplication and decay.

```typescript
// Store single memory
const memoryId = await storeMemory(userId, {
  content: "User is a coffee farmer",
  type: "fact",
  category: "business",
  confidence: 0.9,
  reasoning: "User explicitly stated"
}, {
  source: 'extracted',
  tags: ['agriculture']
});

// Store multiple memories
const ids = await storeMemories(userId, extractedMemories);

// Search memories by similarity
const memories = await searchMemories(userId, "farming business", {
  matchCount: 10,
  similarityThreshold: 0.6,
  memoryType: 'fact'
});

// Get all user memories
const allMemories = await getUserMemories(userId, {
  memoryType: 'fact',
  category: 'business',
  limit: 50
});

// Get formatted context for LLM
const context = await getMemoryContext(userId, "Help with my farm", 'en');
// Returns:
// {
//   context: "## USER CONTEXT\n- [Fact] User is a coffee farmer\n...",
//   hasMemories: true,
//   count: 5,
//   memories: [...]
// }

// Update memory
await updateMemory(memoryId, userId, "Updated content");

// Deactivate memory
await deactivateMemory(memoryId, userId);
```

### Memory Strength & Decay

Memories have a `strength` value (0-1) that:
- Starts at 1.0 when created
- Increases slightly when accessed (via `touch_user_memory`)
- Decays exponentially over time (via `decay_user_memories`)

**Decay Formula:**
```sql
strength = strength * 0.95  -- 5% decay per day
```

**Minimum Strength:** Memories below 0.3 strength are excluded from search.

---

## Chat Integration

The chat API (`/src/app/api/chat/route.ts`) integrates RAG and Memory.

### Flow

1. **Receive message** from user
2. **Retrieve RAG knowledge** relevant to the query
3. **Retrieve user memories** relevant to the query
4. **Build augmented system prompt** with RAG + Memory context
5. **Send to LLM** for response generation
6. **Stream response** to user
7. **Extract memories** in background (non-blocking)

### Code Integration Points

```typescript
// 1. RAG Knowledge Retrieval
const ragResult = await retrieveKnowledge(userQuery, {
  userLanguage: uiLanguage === 'rw' ? 'rw' : 'en',
  maxContextTokens: 2000,
  includeSources: true,
});

if (ragResult.hasKnowledge) {
  ragContext = formatForSystemPrompt(ragResult, language);
}

// 2. Memory Context Retrieval (authenticated users only)
if (user?.id) {
  const memoryResult = await getMemoryContext(user.id, userQuery, language);
  if (memoryResult.hasMemories) {
    memoryContext = memoryResult.context;
  }
}

// 3. Augment System Prompt
systemPrompt += '\n\n' + ragContext;
systemPrompt += '\n\n' + memoryContext;

// 4. Background Memory Extraction (after response)
if (user?.id) {
  (async () => {
    const extracted = await extractMemories(userMessages, assistantMessages);
    if (extracted.success && extracted.memories.length > 0) {
      await storeMemories(user.id, extracted.memories);
    }
  })();
}
```

### System Prompt Structure

```
[Base System Prompt]
- Bakame identity
- Capabilities
- Behavior guidelines

[RAG Knowledge Context] (if found)
## KNOWLEDGE BASE CONTEXT (PRIORITY: HIGH)
The following information is from Bakame's verified knowledge base.
ALWAYS use this information when answering related questions.
...

[User Memory Context] (if available)
## USER CONTEXT (Personal Information)
The following is what you know about this user...
- [Fact] User's name is Jean
- [Preference] User prefers English
...
```

---

## Admin Dashboard

### Knowledge Base Management

**Location:** `/admin/knowledge`

**Features:**
- View all knowledge documents with pagination
- Add new documents with title, content, category, language
- Edit existing documents
- Delete documents (cascades to chunks)
- Process documents (generate embeddings)
- Toggle document active status
- View processing status (pending, processing, ready, error)
- View chunk count per document

**Add Q&A Pairs:**
- Question and answer fields
- Category and language selection
- Source attribution
- Auto-embedding generation

### User Memories Management

**Location:** `/admin/memories`

**Features:**
- View all user memories across users
- Filter by user ID, memory type
- View memory statistics by type
- Delete inappropriate memories
- View confidence and strength scores
- See memory sources (extracted, user_stated, inferred)

### Navigation

Added to sidebar under "Management":
- Knowledge Base (BookOpen icon)
- User Memories (Brain icon)

---

## API Reference

### Knowledge Processing API

**Endpoint:** `POST /api/admin/knowledge/process`

**Purpose:** Process a document to generate embeddings

**Request:**
```json
{
  "documentId": "uuid-string"
}
```

**Response:**
```json
{
  "success": true,
  "documentId": "uuid-string",
  "chunksCreated": 15,
  "tokensUsed": 2500
}
```

**Errors:**
- 401: Unauthorized (not authenticated)
- 403: Admin access required
- 404: Document not found
- 400: No chunks generated
- 500: Processing failed

### Q&A Processing API

**Endpoint:** `PUT /api/admin/knowledge/process`

**Purpose:** Generate embedding for a Q&A pair

**Request:**
```json
{
  "qaId": "uuid-string"
}
```

**Response:**
```json
{
  "success": true,
  "qaId": "uuid-string"
}
```

### Admin Actions

All admin actions are in `/src/app/(admin)/admin/_lib/actions.ts`:

```typescript
// Knowledge Documents
getKnowledgeDocuments(options?)
getKnowledgeStats()
createKnowledgeDocument(document)
updateKnowledgeDocument(documentId, updates)
deleteKnowledgeDocument(documentId)
processKnowledgeDocument(documentId)

// Q&A Pairs
getKnowledgeQA(options?)
createKnowledgeQA(qa)
deleteKnowledgeQA(qaId)

// Categories
getKnowledgeCategories()

// User Memories
getUserMemories(options?)
getMemoryStats()
deleteUserMemory(memoryId)
```

---

## Configuration

### Environment Variables

```env
# Required
OPENAI_API_KEY=sk-...              # For embeddings

# Optional
OPENROUTER_API_KEY=sk-or-...       # Alternative to OpenAI
NEXT_PUBLIC_APP_URL=https://...    # For internal API calls
```

### Embedding Model

**Model:** `text-embedding-3-small`
**Dimensions:** 1536
**Cost:** $0.02 per 1M tokens

To change the model, update `/src/lib/rag/embeddings.ts`:

```typescript
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;
```

### Chunking Configuration

Update `/src/lib/rag/chunker.ts`:

```typescript
export const CHUNK_CONFIG = {
  default: { chunkSize: 512, overlap: 50, separator: '\n\n' },
  prose: { chunkSize: 768, overlap: 100, separator: '\n\n' },
  technical: { chunkSize: 512, overlap: 80, separator: '\n' },
  qa: { chunkSize: 256, overlap: 0, separator: '\n---\n' },
  kinyarwanda: { chunkSize: 384, overlap: 60, separator: '\n\n' },
};
```

### Search Thresholds

Update `/src/lib/rag/search.ts`:

```typescript
const DEFAULT_SIMILARITY_THRESHOLD = 0.5;  // Minimum for inclusion
const QA_SIMILARITY_THRESHOLD = 0.7;       // Higher for Q&A precision
```

### Cache TTL

```typescript
// RAG cache: /src/lib/rag/search.ts
const RAG_CACHE_TTL = 300;  // 5 minutes

// Memory cache: /src/lib/memory/store.ts
const MEMORY_CACHE_TTL = 600;  // 10 minutes
```

---

## Usage Examples

### Adding Knowledge via Admin UI

1. Navigate to `/admin/knowledge`
2. Click "Add Document"
3. Fill in:
   - Title: "VAT Registration Guide"
   - Category: Tax & RRA
   - Language: English
   - Content: (paste your content)
   - Source: https://rra.gov.rw/...
4. Click "Add Document"
5. Click the ⚡ (process) button to generate embeddings
6. Toggle "Active" to enable in search

### Adding Q&A Pairs

1. Navigate to `/admin/knowledge`
2. Switch to "Q&A Pairs" tab
3. Click "Add Q&A"
4. Fill in:
   - Question: "What is the VAT rate in Rwanda?"
   - Answer: "The standard VAT rate in Rwanda is 18%..."
   - Category: Tax & RRA
   - Language: English
   - Source: RRA Website
5. Click "Add Q&A"

### Testing RAG

```typescript
import { retrieveKnowledge, formatForSystemPrompt } from '@/lib/rag';

async function testRAG() {
  const result = await retrieveKnowledge("What is VAT in Rwanda?", {
    userLanguage: 'en',
    maxContextTokens: 2000,
  });

  console.log('Has knowledge:', result.hasKnowledge);
  console.log('Confidence:', result.confidence);
  console.log('Sources:', result.sources);
  console.log('Context:', result.context);
}
```

### Testing Memory

```typescript
import { extractMemories, storeMemories, getMemoryContext } from '@/lib/memory';

async function testMemory(userId: string) {
  // Extract from conversation
  const extracted = await extractMemories(
    ["My name is Jean and I'm a farmer in Musanze"],
    ["Nice to meet you, Jean!"]
  );

  console.log('Extracted:', extracted.memories);

  // Store memories
  if (extracted.memories.length > 0) {
    const ids = await storeMemories(userId, extracted.memories);
    console.log('Stored IDs:', ids);
  }

  // Retrieve context
  const context = await getMemoryContext(userId, "farming advice", 'en');
  console.log('Memory context:', context.context);
}
```

---

## Best Practices

### Knowledge Management

1. **Use specific categories** - Helps with filtering and relevance
2. **Include source URLs** - For attribution and verification
3. **Write clear Q&A pairs** - Direct questions get direct answers
4. **Keep content updated** - Re-process documents when content changes
5. **Use both languages** - Add content in both English and Kinyarwanda

### Content Quality

1. **Factual accuracy** - Verify information before adding
2. **Authoritative sources** - Use official government/organization sources
3. **Clear language** - Avoid jargon, be concise
4. **Structured format** - Use headings, lists for better chunking

### Performance

1. **Monitor cache hit rates** - Adjust TTL if needed
2. **Batch document processing** - Process multiple documents together
3. **Regular memory decay** - Run `decay_user_memories()` daily
4. **Index maintenance** - HNSW indexes auto-update

### Privacy

1. **Never store sensitive data** - No passwords, financial info
2. **User consent** - Inform users about memory storage
3. **Admin audit logs** - Track who accesses/deletes memories
4. **Data retention** - Consider automatic deletion policies

---

## Troubleshooting

### Common Issues

**1. "No chunks generated from content"**
- Content too short (< 100 characters)
- Content is only whitespace
- Solution: Add more substantial content

**2. "Embedding generation failed"**
- Invalid OpenAI API key
- Rate limit exceeded
- Solution: Check API key, wait and retry

**3. "Knowledge not being retrieved"**
- Document not processed (status != 'ready')
- Document not active (is_active = false)
- Similarity threshold too high
- Solution: Process document, activate it, lower threshold

**4. "Memories not being extracted"**
- User not authenticated
- Messages too short/vague
- Solution: Ensure user is logged in, provide meaningful content

**5. "Search returning irrelevant results"**
- Similarity threshold too low
- Content not properly chunked
- Solution: Increase threshold, re-chunk with better config

### Debugging

**Check document status:**
```sql
SELECT id, title, status, is_active,
       (SELECT COUNT(*) FROM knowledge_chunks WHERE document_id = knowledge_documents.id) as chunk_count
FROM knowledge_documents
WHERE id = 'your-document-id';
```

**Check embeddings exist:**
```sql
SELECT id, LEFT(content, 50), embedding IS NOT NULL as has_embedding
FROM knowledge_chunks
WHERE document_id = 'your-document-id';
```

**Test similarity search:**
```sql
SELECT * FROM search_knowledge_chunks(
  '[0.1, 0.2, ...]'::vector,  -- your query embedding
  5,      -- match count
  0.5,    -- threshold
  NULL,   -- category
  NULL    -- language
);
```

**Check user memories:**
```sql
SELECT content, memory_type, confidence, strength, last_accessed
FROM user_memories
WHERE user_id = 'user-id'
ORDER BY strength DESC, last_accessed DESC;
```

### Logs

Check application logs for:
- `RAG knowledge retrieved` - Successful retrieval
- `RAG retrieval failed` - Retrieval errors
- `User memory context retrieved` - Memory found
- `Memory extraction failed` - Extraction errors
- `Memories extracted and stored` - Successful storage

---

## Database Migration

Run the migration to set up all tables:

```bash
# Using Supabase CLI
npx supabase db push

# Or run SQL directly
psql $DATABASE_URL < supabase/migrations/001_rag_and_memory.sql
```

### Enable pgvector

If not already enabled:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## Future Enhancements

1. **Hybrid Search** - Combine vector + keyword search
2. **Multi-modal** - Support image embeddings
3. **Memory Consolidation** - Auto-summarize related memories
4. **Knowledge Graphs** - Entity relationships
5. **Fine-tuned Embeddings** - Rwanda-specific embedding model
6. **Real-time Updates** - WebSocket for live knowledge updates

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/bakame-ai/bakame/issues
- Documentation: /docs/
- Admin Dashboard: /admin/

---

*Built with ❤️ for Rwanda by Kigali AI Labs*
