import Link from "next/link";
import { branding } from "@/config/branding";
import { clientRoutes } from "@/config/routes";

export function ClientFooter() {
  return (
    <footer className="mt-auto bg-[var(--brand-house)] text-[var(--text-on-dark)]">
      <div className="mx-auto max-w-[var(--column-max)] px-[var(--outer-gutter)] py-12 md:py-16">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-lg font-semibold tracking-[-0.01em] text-white">
              {branding.appNameShort}
            </p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--text-on-dark-muted)]">
              {branding.tagline}
            </p>
          </div>
          <Link
            href={clientRoutes.home}
            className="text-sm text-white/90 underline-offset-4 hover:underline"
          >
            Mở bảng điều khiển
          </Link>
        </div>
        <p className="mt-10 border-t border-white/10 pt-6 text-xs text-[var(--text-on-dark-muted)]">
          © {new Date().getFullYear()} {branding.appNameShort}
        </p>
      </div>
    </footer>
  );
}
