import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppShell from '@/components/layout/app-shell';
import EventsClient from './events-client';

export default async function EventsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: dispatches } = await supabase
    .from('meta_event_dispatches')
    .select('*, leads(name)')
    .order('dispatched_at', { ascending: false })
    .limit(100);

  return (
    <AppShell>
      <div className="flex-1 flex flex-col min-w-0">
        <EventsClient dispatches={dispatches || []} />
      </div>
    </AppShell>
  );
}
