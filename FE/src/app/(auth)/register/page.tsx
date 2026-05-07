import type { Metadata } from "next";

import { branding } from "@/config/branding";
import { RegisterView } from "./register-view";

export const metadata: Metadata = {
  title: "Đăng ký",
  description: `Tạo tài khoản truy cập ${branding.appNameShort}.`,
};

export default function RegisterPage() {
  return <RegisterView />;
}
