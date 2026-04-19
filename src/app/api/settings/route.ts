import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/settings — Get all system settings
 */
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .order('key');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Transform array to key-value object
  const settings: Record<string, unknown> = {};
  for (const row of data || []) {
    settings[row.key] = row.value;
  }

  return NextResponse.json({ settings });
}

/**
 * PATCH /api/settings — Update a system setting
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { key, value } = body;

  if (!key) {
    return NextResponse.json({ error: 'key é obrigatório' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from('system_settings')
    .upsert({
      key,
      value,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit
  await admin.from('audit_logs').insert({
    entity_type: 'setting',
    action: 'setting_change',
    actor_id: user.id,
    details: { key, value },
  });

  return NextResponse.json({ success: true });
}
