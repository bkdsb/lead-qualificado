import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const email = String(body?.email ?? '').trim().toLowerCase();

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
  }

  if (email === (user.email ?? '').toLowerCase()) {
    return NextResponse.json({ error: 'Informe um email diferente do atual' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: updated, error } = await admin.auth.admin.updateUserById(user.id, {
    email,
    email_confirm: true,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await admin.from('audit_logs').insert({
    entity_type: 'user',
    entity_id: user.id,
    action: 'setting_change',
    actor_id: user.id,
    details: {
      field: 'email',
      old_email: user.email,
      new_email: email,
      mode: 'admin_update_user_by_id',
    },
  });

  return NextResponse.json({
    success: true,
    email: updated.user?.email ?? email,
  });
}

