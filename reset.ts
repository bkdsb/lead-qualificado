import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Deleting all leads...');
  const { error: e1 } = await supabase.from('leads').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Leads delete:', e1 ? e1.message : 'OK');
  
  const { error: e2 } = await supabase.from('meta_event_dispatches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Events delete:', e2 ? e2.message : 'OK');

  const { error: e3 } = await supabase.from('lead_stage_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('History delete:', e3 ? e3.message : 'OK');
  
  const { error: e4 } = await supabase.from('lead_identity_signals').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Signals delete:', e4 ? e4.message : 'OK');
}

run();
