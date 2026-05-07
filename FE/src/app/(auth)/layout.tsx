/**
 * Auth (/login, /register): không header/footer storefront.
 * Nền kem (DESIGN.md — page canvas), thẻ form căn giữa màn hình, không ảnh hero.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="ds-auth-page" data-app-shell="auth">
      {children}
    </div>
  );
}
