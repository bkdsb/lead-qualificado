import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/leads/[id]/notes — Get notes for a lead
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('lead_notes')
    .select('*')
    .eq('lead_id', id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ notes: data });
}

/**
 * POST /api/leads/[id]/notes — Add a note to a lead
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { content } = body;

  if (!content || content.trim() === '') {
    return NextResponse.json({ error: 'Conteúdo é obrigatório' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: note, error } = await admin
    .from('lead_notes')
    .insert({
      lead_id: id,
      content: content.trim(),
      author_id: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update last contact
  await admin
    .from('leads')
    .update({ last_contact_at: new Date().toISOString() })
    .eq('id', id);

  return NextResponse.json({ note }, { status: 201 });
}
