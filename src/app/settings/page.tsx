import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppShell from '@/components/layout/app-shell';
import SettingsClient from './settings-client';

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: settings } = await supabase
    .from('system_settings')
    .select('*')
    .order('key');

  const { data: credRefs } = await supabase
    .from('api_credentials_refs')
    .select('*')
    .order('provider');

  return (
    <AppShell>
      <div className="app-header">
        <span className="app-header-title">Configurações</span>
      </div>
      <div className="app-content">
        <SettingsClient
          settings={settings || []}
          credentialRefs={credRefs || []}
        />
      </div>
    </AppShell>
  );
}
