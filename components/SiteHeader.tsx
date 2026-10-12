import Link from "next/link";
import { BookOpen, LayoutDashboard, LogOut } from "lucide-react";
import { getAuthUser } from "@/lib/auth";
import { logout } from "@/app/actions/auth";
import ThemeToggle from "@/components/ThemeToggle";

export default async function SiteHeader() {
  const user = await getAuthUser();

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-stone-50/85 backdrop-blur dark:border-stone-800 dark:bg-stone-950/85">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <BookOpen className="h-5 w-5" />
          Jurnalku
        </Link>

        <nav className="flex items-center gap-1">
          {user ? (
            <>
              <Link href="/dashboard" className="btn btn-ghost">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
              <form action={logout}>
                <button type="submit" className="btn btn-ghost" title="Keluar">
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Keluar</span>
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="btn btn-ghost">
              Masuk
            </Link>
          )}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
