// src/app/(auth)/login/page.tsx
import { AuthForm } from "@/features/auth/components/AuthForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
      <AuthForm />
    </main>
  );
}