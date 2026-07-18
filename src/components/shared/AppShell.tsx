import Link from "next/link";
import { LogoutButton } from "@/components/auth/LogoutButton";
import type { SafeUser } from "@/models/User";

interface AppShellProps {
  user: SafeUser;
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { href: "/", label: "我的樹" },
  { href: "/log", label: "記錄" },
  { href: "/review", label: "回顧" },
];

export function AppShell({ user, children }: AppShellProps) {
  return (
    <div className="flex min-h-full flex-col bg-surface-muted">
      <header className="sticky top-0 z-20 border-b border-forest-100/80 bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl" aria-hidden>
              🌳
            </span>
            <span className="text-lg font-semibold tracking-tight text-forest-900">
              Focus Tree
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-4 py-2 text-sm font-medium text-forest-700 transition-colors hover:bg-forest-50 hover:text-forest-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden text-sm text-forest-600 sm:inline">
              {user.displayName}
            </span>
            <LogoutButton />
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto border-t border-forest-100/60 px-4 py-2 md:hidden">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-full px-4 py-2 text-sm font-medium text-forest-700 transition-colors hover:bg-forest-50"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
