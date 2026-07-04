// src/app/(dashboard)/admin/page.tsx
import { redirect } from "next/navigation";

export default function AdminIndexPage() {
  // If a user simply types /admin, automatically bounce them to the businesses table
  redirect("/admin/businesses");
}