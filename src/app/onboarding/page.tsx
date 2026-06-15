// src/app/(dashboard)/onboarding/page.tsx
import { OnboardingForm } from "@/features/businesses/components/OnboardingForm";

export default function OnboardingPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
      <OnboardingForm />
    </main>
  );
}