import type { Metadata } from "next";

import { branding } from "@/config/branding";
import { LoginView } from "./login-view";

export const metadata: Metadata = {
  title: "Đăng nhập",
  description: `Đăng nhập ${branding.appNameShort} — khu vực quản trị.`,
};

export default function LoginPage() {
  return <LoginView />;
}
