// src/app/update-password/page.tsx
import { UpdatePasswordForm } from "@/features/auth/components/UpdatePasswordForm";
import { Suspense } from "react";

export default function UpdatePasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
      <Suspense fallback={<div className="animate-pulse text-neutral-500 font-medium">Loading secure environment...</div>}>
        <UpdatePasswordForm />
      </Suspense>
    </main>
  );
}