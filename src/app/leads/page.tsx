import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppShell from '@/components/layout/app-shell';
import LeadsClient from './leads-client';

export default async function LeadsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: dbUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
  const initialUserRole =
    dbUser?.role === 'admin' ? 'admin' : dbUser?.role === 'operator' ? 'operator' : undefined;

  return (
    <AppShell initialUserRole={initialUserRole}>
      <LeadsClient userRole={initialUserRole || 'operator'} />
    </AppShell>
  );
}
