// src/app/(dashboard)/loading.tsx
export default function DashboardLoading() {
  return (
    <div className="flex h-[50vh] w-full items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        {/* A simple Tailwind CSS spinning circle */}
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-800"></div>
        <p className="text-sm font-medium text-neutral-500 animate-pulse">
          Loading secure data...
        </p>
      </div>
    </div>
  );
}