// src/app/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function RootPage() {
  const supabase = await createClient();
  
  // Check if the browser already has an active session
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // If they are already logged in, send them straight to the command center
    redirect("/dashboard");
  } else {
    // If they are a new visitor, send them to the login screen
    redirect("/login");
  }
}

// Force Vercel to recognize public repository