/**
 * Knowledge Q&A API
 *
 * Handles creation and management of Q&A pairs with automatic embedding generation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServerSupabaseAdminClient } from '@/lib/supabase/server';
import { generateEmbedding } from '@/lib/rag/embeddings';
import { logger } from '@/lib/logger';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

/**
 * POST /api/admin/knowledge/qa
 * Create a new Q&A pair with automatic embedding generation
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const authClient = await createServerSupabaseClient() as AnySupabase;
    const { data: { user } } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const { data: profile } = await authClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { question, answer, category = 'general', language = 'en', source = null } = body;

    if (!question || !answer) {
      return NextResponse.json({ error: 'Question and answer are required' }, { status: 400 });
    }

    logger.info('Creating Q&A pair with embedding', { question: question.substring(0, 50) });

    // Generate embedding for the question
    const embedding = await generateEmbedding(question);

    // Use admin client to bypass RLS for insert
    const adminClient = await createServerSupabaseAdminClient() as AnySupabase;

    // Insert Q&A with embedding
    const { data, error } = await adminClient
      .from('knowledge_qa')
      .insert({
        question,
        answer,
        category,
        language,
        source,
        embedding: JSON.stringify(embedding),
        is_active: true,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to insert Q&A', { error: error.message });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    logger.info('Q&A pair created successfully', { id: data.id });

    return NextResponse.json({
      success: true,
      qa: {
        id: data.id,
        question: data.question,
        category: data.category,
        hasEmbedding: true,
      },
    });
  } catch (error) {
    logger.error('Q&A creation failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create Q&A' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/knowledge/qa
 * List Q&A pairs (with pagination)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const authClient = await createServerSupabaseClient() as AnySupabase;
    const { data: { user } } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use admin client for querying
    const adminClient = await createServerSupabaseAdminClient() as AnySupabase;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const category = searchParams.get('category');

    let query = adminClient
      .from('knowledge_qa')
      .select('id, question, answer, category, language, source, is_active, created_at, embedding', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (category) {
      query = query.eq('category', category);
    }

    const { data, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Mark which ones have embeddings
    const qaWithStatus = (data || []).map((qa: any) => ({
      ...qa,
      hasEmbedding: !!qa.embedding,
      embedding: undefined, // Don't send the actual embedding
    }));

    return NextResponse.json({
      qa: qaWithStatus,
      total: count || 0,
      page,
      pageSize,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch Q&A' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/knowledge/qa
 * Generate embeddings for Q&A pairs that don't have them
 */
export async function PATCH(request: NextRequest) {
  try {
    // Verify admin access
    const authClient = await createServerSupabaseClient() as AnySupabase;
    const { data: { user } } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const { data: profile } = await authClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const adminClient = await createServerSupabaseAdminClient() as AnySupabase;

    // Find Q&A pairs without embeddings
    const { data: qaWithoutEmbeddings, error: fetchError } = await adminClient
      .from('knowledge_qa')
      .select('id, question')
      .is('embedding', null)
      .eq('is_active', true)
      .limit(50); // Process in batches

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!qaWithoutEmbeddings || qaWithoutEmbeddings.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All Q&A pairs already have embeddings',
        processed: 0,
      });
    }

    logger.info('Generating embeddings for Q&A pairs', { count: qaWithoutEmbeddings.length });

    let processed = 0;
    const errors: string[] = [];

    // Process each Q&A
    for (const qa of qaWithoutEmbeddings) {
      try {
        const embedding = await generateEmbedding(qa.question);

        const { error: updateError } = await adminClient
          .from('knowledge_qa')
          .update({ embedding: JSON.stringify(embedding) })
          .eq('id', qa.id);

        if (updateError) {
          errors.push(`Failed to update ${qa.id}: ${updateError.message}`);
        } else {
          processed++;
        }
      } catch (embError) {
        errors.push(`Failed to embed ${qa.id}: ${embError instanceof Error ? embError.message : String(embError)}`);
      }
    }

    logger.info('Embedding generation complete', { processed, errors: errors.length });

    return NextResponse.json({
      success: true,
      processed,
      total: qaWithoutEmbeddings.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process embeddings' },
      { status: 500 }
    );
  }
}
