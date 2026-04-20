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
  const origin = isAllowedOrigin ? incomingOrigin : 'https://belegante.co';

  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
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

    // Extrair parâmetros Meta da request (fbc, fbp, IP, user agent)
    const metaParams = extractRequestParams(request);

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

    // 2. Salvar sinais de identidade capturados da request (fbc, fbp, IP, UA)
    const signalsToInsert = [];

    if (email) {
      signalsToInsert.push({
        lead_id: leadData.id,
        signal_type: 'email',
        signal_value: email,
        source: 'webhook_capture',
        is_current: true,
      });
    }

    if (phone) {
      signalsToInsert.push({
        lead_id: leadData.id,
        signal_type: 'phone',
        signal_value: phone,
        source: 'webhook_capture',
        is_current: true,
      });
    }

    if (metaParams.fbc) {
      signalsToInsert.push({
        lead_id: leadData.id,
        signal_type: 'fbc',
        signal_value: metaParams.fbc,
        source: 'param_builder',
        is_current: true,
      });
    }

    if (metaParams.fbp) {
      signalsToInsert.push({
        lead_id: leadData.id,
        signal_type: 'fbp',
        signal_value: metaParams.fbp,
        source: 'param_builder',
        is_current: true,
      });
    }

    if (metaParams.client_ip_address) {
      signalsToInsert.push({
        lead_id: leadData.id,
        signal_type: 'client_ip_address',
        signal_value: metaParams.client_ip_address,
        source: 'param_builder',
        is_current: true,
      });
    }

    if (metaParams.client_user_agent) {
      signalsToInsert.push({
        lead_id: leadData.id,
        signal_type: 'client_user_agent',
        signal_value: metaParams.client_user_agent,
        source: 'param_builder',
        is_current: true,
      });
    }

    if (signalsToInsert.length > 0) {
      await supabase.from('lead_identity_signals').insert(signalsToInsert);
    }

    // 3. Add services and area to the first note to inform the manager
    const noteText = `Lead capturado automaticamente no Chat do Site.\n* Área/Ramo: ${area || 'Não informado'}\n* Serviços de interesse: ${services?.join(', ') || 'Não informado'}`;
    
    await supabase
      .from('lead_notes')
      .insert({
        lead_id: leadData.id,
        content: noteText
      });

    // 4. Log event
    await supabase
      .from('lead_score_events')
      .insert({
        lead_id: leadData.id,
        event_type: 'conversation_started',
        points: 20,
        note: 'Lead initiatied WhatsApp chat from floating widget'
      });

    return NextResponse.json({ success: true, leadId: leadData.id }, { headers: corsHeaders });
  } catch (err: any) {
    console.error('Webhook payload error:', err);
    return NextResponse.json({ error: 'System Error' }, { status: 500, headers: corsHeaders });
  }
}
