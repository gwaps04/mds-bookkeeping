// src/lib/audit.ts
import { createAdminClient } from "@/lib/supabase/admin"; // Using Admin to bypass RLS blocks!

export async function logSecurityEvent({
  businessId,
  actorId,
  action,
  tableName,
  recordId,
  details
}: {
  businessId: string;
  actorId: string;
  action: string;
  tableName: string;
  recordId?: string;
  details?: any;
}) {
  // Use the Admin Client so the system can log the action even if the user is just "Staff"
  const supabaseAdmin = createAdminClient();
  
  const { error } = await supabaseAdmin
    .from("audit_logs")
    .insert([{
      business_id: businessId,
      actor_id: actorId,
      action: action,
      table_name: tableName,
      record_id: recordId,
      details: details || {}
    }]);

  if (error) {
    console.error("[SECURITY LOGGER FAILED]:", error.message);
  }
}