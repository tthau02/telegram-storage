import type { Metadata } from "next";
import { branding } from "@/config/branding";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: `Quản trị — ${branding.appNameShort}`,
};

export default function AdminSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
