import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppShell from '@/components/layout/app-shell';
import LeadsClient from './leads-client';

export default async function LeadsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <AppShell>
      <div className="app-header">
        <span className="app-header-title">Leads</span>
      </div>
      <div className="app-content">
        <LeadsClient />
      </div>
    </AppShell>
  );
}
