import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { extractRequestParams } from '@/lib/meta/param-builder';

export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin') || '*';
  
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'OPTIONS, POST',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(request: Request) {
  // Restringindo a segurança: Apenas aceitar dados que vêm do seu site oficial (ou ambiente local de testes)
  const incomingOrigin = request.headers.get('origin') || '';
  const isAllowedOrigin = incomingOrigin === 'https://belegante.co' || incomingOrigin.includes('localhost');

  if (!isAllowedOrigin) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }

  const corsHeaders = {
    'Access-Control-Allow-Origin': incomingOrigin,
    'Access-Control-Allow-Methods': 'OPTIONS, POST',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    const body = await request.json();
    const { name, email, phone, area, services } = body;

    // Basic validation
    if (!name || (!email && !phone)) {
      return NextResponse.json(
        { error: 'Name and either Email or Phone are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Extrair parâmetros Meta da request headers (server-side)
    const headerParams = extractRequestParams(request);

    // CRITICAL: Accept fbc/fbp from request body too (cross-domain form sends these)
    // Body params take priority over header-extracted ones
    const metaParams = {
      fbc: body.fbc || headerParams.fbc || null,
      fbp: body.fbp || headerParams.fbp || null,
      client_ip_address: headerParams.client_ip_address || body.client_ip_address || null,
      client_user_agent: headerParams.client_user_agent || body.client_user_agent || null,
    };

    const supabase = createAdminClient();

    // 1. Insert into leads table
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .insert({
        name: name,
        email: email || null,
        phone: phone || null,
        source: 'whatsapp',
        stage: 'new',
        score: 20, // default score for conversation_started
        score_band: 'warm',
        environment: 'production', // Since it comes from the real website, it's a real lead
      })
      .select('id')
      .single();

    if (leadError) {
      console.error('Webhook Lead Capture Error:', leadError);
      return NextResponse.json(
        { error: 'Failed to capture lead internally' },
        { status: 500, headers: corsHeaders }
      );
    }

    // 2. Salvar sinais de identidade capturados (body + headers)
    const signalsToInsert: Array<{lead_id: string; signal_type: string; signal_value: string; source: string; is_current: boolean}> = [];

    const addSignal = (type: string, value: string | null | undefined, source: string) => {
      if (value && value.trim()) {
        signalsToInsert.push({ lead_id: leadData.id, signal_type: type, signal_value: value.trim(), source, is_current: true });
      }
    };

    // Core identity
    addSignal('email', email, 'webhook');
    addSignal('phone', phone, 'webhook');

    // Auto-extract first name / last name from full name (boosts EMQ)
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 1) addSignal('fn', parts[0], 'webhook');
      if (parts.length >= 2) addSignal('ln', parts.slice(1).join(' '), 'webhook');
    }

    // Auto-generate external_id from lead UUID (boosts EMQ)
    addSignal('external_id', leadData.id, 'api');

    // Meta attribution signals
    addSignal('fbc', metaParams.fbc, 'api');
    addSignal('fbp', metaParams.fbp, 'api');
    addSignal('client_ip_address', metaParams.client_ip_address, 'api');
    addSignal('client_user_agent', metaParams.client_user_agent, 'api');

    if (signalsToInsert.length > 0) {
      const { error: signalsError } = await supabase.from('lead_identity_signals').insert(signalsToInsert);
      if (signalsError) {
        console.error('Webhook Signals Insert Error:', signalsError);
      }
    }

    // 3. Add services and area to the first note to inform the manager
    const noteText = `Lead capturado automaticamente no Chat do Site.\n* Área/Ramo: ${area || 'Não informado'}\n* Serviços de interesse: ${services?.join(', ') || 'Não informado'}`;

    const { error: noteError } = await supabase
      .from('lead_notes')
      .insert({
        lead_id: leadData.id,
        content: noteText
      });

    if (noteError) {
      console.error('Webhook Note Insert Error:', noteError);
    }

    // 4. Log event
    const { error: eventError } = await supabase
      .from('lead_score_events')
      .insert({
        lead_id: leadData.id,
        event_type: 'conversation_started',
        points: 20,
        note: 'Lead initiated WhatsApp chat from site modal'
      });

    if (eventError) {
      console.error('Webhook Score Event Insert Error:', eventError);
    }

    return NextResponse.json({ success: true, leadId: leadData.id }, { headers: corsHeaders });
  } catch (err: any) {
    console.error('Webhook payload error:', err);
    return NextResponse.json({ error: 'System Error' }, { status: 500, headers: corsHeaders });
  }
}
