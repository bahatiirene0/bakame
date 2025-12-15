/**
 * Knowledge Document Processing API
 *
 * Processes knowledge documents by:
 * 1. Chunking the content
 * 2. Generating embeddings for each chunk
 * 3. Storing chunks with embeddings in the database
 *
 * This is an admin-only API endpoint.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { chunkDocument, chunkMarkdown, detectKinyarwanda } from '@/lib/rag/chunker';
import { generateBatchEmbeddings, generateEmbedding } from '@/lib/rag/embeddings';
import { logger } from '@/lib/logger';

// Type definitions for database records
interface UserProfile {
  role: string;
}

interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  status: string;
  is_active: boolean;
  metadata: Record<string, unknown>;
}

interface KnowledgeQA {
  id: string;
  question: string;
  answer: string;
  embedding: string | null;
  is_active: boolean;
}

// Type for Supabase client to allow table operations
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

/**
 * POST /api/admin/knowledge/process
 *
 * Process a document to generate embeddings
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const supabase = await createServerSupabaseClient() as AnySupabase;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single() as { data: UserProfile | null };

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get document ID from request
    const { documentId } = await request.json();

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    }

    // Get document from database
    const { data: document, error: docError } = await supabase
      .from('knowledge_documents')
      .select('*')
      .eq('id', documentId)
      .single() as { data: KnowledgeDocument | null; error: Error | null };

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    logger.info('Starting document processing', {
      documentId,
      title: document.title,
      contentLength: document.content.length,
    });

    // Update status to processing
    await supabase
      .from('knowledge_documents')
      .update({ status: 'processing' })
      .eq('id', documentId);

    try {
      // Delete existing chunks for this document
      await supabase
        .from('knowledge_chunks')
        .delete()
        .eq('document_id', documentId);

      // Determine content type and chunk accordingly
      const isKinyarwanda = detectKinyarwanda(document.content);
      const isMarkdown = document.content.includes('```') || /^#{1,6}\s/m.test(document.content);

      let chunks;
      if (isMarkdown) {
        chunks = chunkMarkdown(document.content, {
          contentType: isKinyarwanda ? 'kinyarwanda' : 'prose',
        });
      } else {
        chunks = chunkDocument(document.content, {
          contentType: isKinyarwanda ? 'kinyarwanda' : 'prose',
        });
      }

      logger.info('Document chunked', {
        documentId,
        chunkCount: chunks.length,
        isKinyarwanda,
        isMarkdown,
      });

      if (chunks.length === 0) {
        await supabase
          .from('knowledge_documents')
          .update({
            status: 'error',
            metadata: { ...document.metadata, error: 'No chunks generated from content' },
          })
          .eq('id', documentId);

        return NextResponse.json({
          error: 'No chunks could be generated from the document content',
        }, { status: 400 });
      }

      // Generate embeddings for all chunks
      const chunkTexts = chunks.map((c) => c.content);
      const embeddingResult = await generateBatchEmbeddings(chunkTexts);

      logger.info('Embeddings generated', {
        documentId,
        successful: embeddingResult.results.length,
        failed: embeddingResult.failedIndices.length,
        totalTokens: embeddingResult.totalTokens,
      });

      // Prepare chunks for insertion
      const chunksToInsert = embeddingResult.results.map((result, index) => ({
        document_id: documentId,
        content: result.text,
        embedding: JSON.stringify(result.embedding),
        chunk_index: index,
        token_count: result.tokenCount,
        metadata: {
          section: chunks[index]?.metadata.section,
          startChar: chunks[index]?.metadata.startChar,
          endChar: chunks[index]?.metadata.endChar,
          contentHash: chunks[index]?.contentHash,
        },
      }));

      // Insert chunks in batches
      const batchSize = 50;
      for (let i = 0; i < chunksToInsert.length; i += batchSize) {
        const batch = chunksToInsert.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from('knowledge_chunks')
          .insert(batch);

        if (insertError) {
          throw new Error(`Failed to insert chunks: ${insertError.message}`);
        }
      }

      // Update document status to ready
      await supabase
        .from('knowledge_documents')
        .update({
          status: 'ready',
          is_active: true,
          metadata: {
            ...document.metadata,
            processedAt: new Date().toISOString(),
            chunkCount: chunksToInsert.length,
            totalTokens: embeddingResult.totalTokens,
            isKinyarwanda,
          },
        })
        .eq('id', documentId);

      logger.info('Document processing complete', {
        documentId,
        title: document.title,
        chunkCount: chunksToInsert.length,
      });

      return NextResponse.json({
        success: true,
        documentId,
        chunksCreated: chunksToInsert.length,
        tokensUsed: embeddingResult.totalTokens,
      });
    } catch (processError) {
      logger.error('Document processing failed', {
        documentId,
        error: (processError as Error).message,
      });

      // Update status to error
      await supabase
        .from('knowledge_documents')
        .update({
          status: 'error',
          metadata: {
            ...document.metadata,
            error: (processError as Error).message,
            errorAt: new Date().toISOString(),
          },
        })
        .eq('id', documentId);

      return NextResponse.json({
        error: `Processing failed: ${(processError as Error).message}`,
      }, { status: 500 });
    }
  } catch (error) {
    logger.error('Knowledge process API error', {
      error: (error as Error).message,
    });

    return NextResponse.json({
      error: 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * Process Q&A pair to generate embedding
 */
export async function PUT(request: NextRequest) {
  try {
    // Verify admin access
    const supabase = await createServerSupabaseClient() as AnySupabase;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single() as { data: UserProfile | null };

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { qaId } = await request.json();

    if (!qaId) {
      return NextResponse.json({ error: 'Q&A ID required' }, { status: 400 });
    }

    // Get Q&A from database
    const { data: qa, error: qaError } = await supabase
      .from('knowledge_qa')
      .select('*')
      .eq('id', qaId)
      .single() as { data: KnowledgeQA | null; error: Error | null };

    if (qaError || !qa) {
      return NextResponse.json({ error: 'Q&A not found' }, { status: 404 });
    }

    // Generate embedding for the question
    const embedding = await generateEmbedding(qa.question);

    // Update Q&A with embedding
    await supabase
      .from('knowledge_qa')
      .update({
        embedding: JSON.stringify(embedding),
        is_active: true,
      })
      .eq('id', qaId);

    logger.info('Q&A embedding generated', { qaId });

    return NextResponse.json({
      success: true,
      qaId,
    });
  } catch (error) {
    logger.error('Q&A process API error', {
      error: (error as Error).message,
    });

    return NextResponse.json({
      error: 'Internal server error',
    }, { status: 500 });
  }
}
