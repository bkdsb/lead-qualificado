import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppShell from '@/components/layout/app-shell';
import QAClient from './qa-client';

export default async function QAPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Fetch recent dispatches with signal info
  const { data: recentDispatches } = await supabase
    .from('meta_event_dispatches')
    .select('*')
    .order('dispatched_at', { ascending: false })
    .limit(20);

  // Fetch latest DQ snapshots
  const { data: dqSnapshots } = await supabase
    .from('dataset_quality_snapshots')
    .select('*')
    .order('fetched_at', { ascending: false })
    .limit(10);

  return (
    <AppShell>
      <div className="app-header">
        <span className="app-header-title">QA Panel — Qualidade & Testes</span>
      </div>
      <div className="app-content">
        <QAClient
          dispatches={recentDispatches || []}
          dqSnapshots={dqSnapshots || []}
        />
      </div>
    </AppShell>
  );
}
