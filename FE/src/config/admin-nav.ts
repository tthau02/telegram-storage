import type { LucideIcon } from "lucide-react";
import { Cloud, FolderOpen, Users } from "lucide-react";
import { adminRoutes } from "@/config/routes";

/**
 * Một mục menu admin (có thể lồng children = menu con).
 * Thêm menu mới: khai báo object vào `adminNavTree` — không cần sửa component sidebar.
 *
 * - `href` bỏ trống → chỉ làm nhóm (menu cha), bắt buộc có `children`.
 * - `permissions` bỏ trống / [] → ai cũng thấy. Có giá trị → user cần **ít nhất một** key (OR).
 */
export type AdminNavItem = {
  id: string;
  label: string;
  href?: string;
  icon: LucideIcon;
  /** Key quyền (VD: `users.read`). Không gán = không kiểm tra */
  permissions?: readonly string[];
  children?: AdminNavItem[];
};

function canSeeItem(
  item: AdminNavItem,
  userPermissions: ReadonlySet<string> | undefined,
): boolean {
  if (!item.permissions?.length) return true;
  if (!userPermissions) return true;
  return item.permissions.some((p) => userPermissions.has(p));
}

/**
 * Trả về cây menu đã lọc theo quyền. `userPermissions` undefined = coi như thấy hết (tiện dev).
 */
export function filterAdminNavTree(
  tree: readonly AdminNavItem[],
  userPermissions?: readonly string[],
): AdminNavItem[] {
  const set = userPermissions?.length ? new Set(userPermissions) : undefined;

  function filterTree(nodes: readonly AdminNavItem[]): AdminNavItem[] {
    const result: AdminNavItem[] = [];
    for (const node of nodes) {
      if (!canSeeItem(node, set)) continue;
      const children = node.children ? filterTree(node.children) : undefined;
      if (!node.href && (!children || children.length === 0)) continue;
      result.push({ ...node, children });
    }
    return result;
  }

  return filterTree(tree);
}

/** Active cho một link: `/admin` khớp chính xác; các path khác cho phép prefix. */
export function isAdminNavHrefActive(pathname: string, href: string): boolean {
  if (href === adminRoutes.home) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** true nếu `item` hoặc bất kỳ hậu duệ nào đang active (để mở menu cha / highlight nhánh). */
export function isAdminNavBranchActive(
  item: AdminNavItem,
  pathname: string,
): boolean {
  if (item.href && isAdminNavHrefActive(pathname, item.href)) return true;
  if (item.children)
    return item.children.some((c) => isAdminNavBranchActive(c, pathname));
  return false;
}

/** Cấu hình menu — nguồn duy nhất cho sidebar admin */
export const adminNavTree: AdminNavItem[] = [
  {
    id: "cloud",
    label: "Kho file Telegram",
    href: adminRoutes.cloud,
    icon: Cloud,
    permissions: ["users.read"],
  },
  {
    id: "folders",
    label: "Thư mục",
    href: adminRoutes.folders,
    icon: FolderOpen,
  },
  {
    id: "users",
    label: "Người dùng",
    href: adminRoutes.users,
    icon: Users,
    permissions: ["users.read"],
  },
];
