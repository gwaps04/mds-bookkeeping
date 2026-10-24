// FILE: src/app/api/v1/invoices/external/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// WOZ ZERO-LEAK SECURITY: We use the Service Role Key ONLY in this isolated server route.
// This allows M2M communication to bypass RLS, secured entirely by our API Key check.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or malformed Authorization header' }, { status: 401 });
    }
    
    const apiKey = authHeader.split(' ')[1].trim();
    const payload = await req.json();

    // 1. VERIFY TENANT API KEY
    const { data: business, error: authError } = await supabaseAdmin
      .from('businesses')
      .select('id, business_name')
      .eq('api_key', apiKey)
      .single();

    if (authError || !business) {
      return NextResponse.json({ error: 'Invalid or missing API Key' }, { status: 401 });
    }

    // 2. DROP INTO CRM INBOX (Draft/Staging Area)
    const { data: inboxItem, error: inboxError } = await supabaseAdmin
      .from('crm_inbox')
      .insert({
        business_id: business.id,
        client_name: payload.customer?.name || 'Unknown Client',
        client_email: payload.customer?.email || null,
        client_phone: payload.customer?.phone || null,
        amount: payload.invoice?.amount || 0,
        description: payload.invoice?.description || 'Automated Contract Deal',
        status: 'PENDING'
      })
      .select('id')
      .single();

    if (inboxError) throw new Error(`Inbox insertion failed: ${inboxError.message}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Deal securely staged in CRM Inbox',
      inbox_id: inboxItem.id,
      tenant: business.business_name
    }, { status: 201 });

  } catch (error: any) {
    console.error('[Macrobiz External API Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}