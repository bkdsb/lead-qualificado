import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppShell from '@/components/layout/app-shell';
import LeadDetailClient from './lead-detail-client';

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Fetch user role for permission control
  const { data: dbUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const userRole = (dbUser?.role as 'admin' | 'operator') || 'operator';

  return (
    <AppShell>
      <LeadDetailClient leadId={id} userRole={userRole} />
    </AppShell>
  );
}
