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
    // 1. EXTRACT AUTHORIZATION HEADER
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or malformed Authorization header' }, { status: 401 });
    }
    
    const apiKey = authHeader.split(' ')[1].trim();
    const payload = await req.json();

    // 2. VERIFY TENANT API KEY
    const { data: business, error: authError } = await supabaseAdmin
      .from('businesses')
      .select('id, business_name, currency')
      .eq('api_key', apiKey)
      .single();

    if (authError || !business) {
      return NextResponse.json({ error: 'Invalid or missing API Key' }, { status: 401 });
    }

    const businessId = business.id;

    // 3. FIND OR CREATE CUSTOMER
    let customerId = null;
    if (payload.customer?.email || payload.customer?.name) {
      // Try to find existing customer by email inside this specific business
      const { data: existingCustomer } = await supabaseAdmin
        .from('customers')
        .select('id')
        .eq('business_id', businessId)
        .eq('email', payload.customer.email)
        .maybeSingle();

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        // Create new customer
        const { data: newCustomer, error: custError } = await supabaseAdmin
          .from('customers')
          .insert({
            business_id: businessId,
            name: payload.customer.name || 'Unknown Client',
            email: payload.customer.email,
            phone: payload.customer.phone
          })
          .select('id')
          .single();

        if (custError) throw new Error(`Customer creation failed: ${custError.message}`);
        customerId = newCustomer.id;
      }
    }

    // 4. GENERATE INCOME / INVOICE RECORD
    // We map to the date, description, and amount fields matching your existing export route
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('income')
      .insert({
        business_id: businessId,
        customer_id: customerId,
        amount: payload.invoice.amount || 0,
        description: payload.invoice.description || 'Automated Contract Invoice',
        date: payload.invoice.date || new Date().toISOString().split('T')[0],
        // Note: account_id and category_id are left null here unless passed in payload
      })
      .select('id')
      .single();

    if (invoiceError) throw new Error(`Invoice generation failed: ${invoiceError.message}`);

    // 5. SUCCESS RESPONSE
    return NextResponse.json({ 
      success: true, 
      message: 'Invoice generated successfully',
      invoice_id: invoice.id,
      tenant: business.business_name
    }, { status: 201 });

  } catch (error: any) {
    console.error('[Macrobiz External API Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}