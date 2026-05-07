import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppShell from '@/components/layout/app-shell';
import SettingsClient from './settings-client';

export default async function SettingsPage() {
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

  const { data: settings } = await supabase
    .from('system_settings')
    .select('*')
    .order('key');

  const { data: credRefs } = await supabase
    .from('api_credentials_refs')
    .select('*')
    .order('provider');

  return (
    <AppShell initialUserRole={initialUserRole}>
      <SettingsClient
        settings={settings || []}
        credentialRefs={credRefs || []}
        currentUserEmail={user.email || ''}
      />
    </AppShell>
  );
}
