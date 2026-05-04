import { redirect } from "next/navigation";

import { adminRoutes } from "@/config/routes";

/** /admin không còn trong menu — đưa thẳng tới trang quản lý người dùng. */
export default function AdminHomePage() {
  redirect(adminRoutes.users);
}
