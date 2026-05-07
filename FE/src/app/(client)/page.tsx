import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { branding } from "@/config/branding";
import { adminRoutes } from "@/config/routes";

export const metadata: Metadata = {
  title: branding.appNameShort,
};

/** Tạm thời: `/` vào thẳng khu admin (guard đăng nhập trong AdminShell). */
export default function ClientHomePage() {
  redirect(adminRoutes.home);
}
