"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Trophy,
  BarChart3,
  Target,
  BookOpen,
  User,
  LogOut,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import ThemeToggle from "./ThemeToggle";

const navItems = [
  { href: "/predictions", label: "Мои прогнозы", icon: Target },
  { href: "/bracket", label: "Сетка", icon: Trophy },
  { href: "/leaderboard", label: "Рейтинг", icon: BarChart3 },
  { href: "/rules", label: "Правила", icon: BookOpen },
];

export default function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin = (session?.user as { role?: string })?.role === "ADMIN";

  if (pathname === "/auth/signin" || pathname === "/") return null;

  return (
    <header className="bg-card/80 backdrop-blur-xl border-b border-border sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/predictions" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center shadow-lg shadow-accent/20">
              <span className="text-white font-black text-[10px] font-display tracking-wider">NBA</span>
            </div>
            <span className="text-foreground font-display font-bold text-lg tracking-wide uppercase hidden sm:block">
              Predictions
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  pathname === href
                    ? "bg-accent/15 text-accent"
                    : "text-muted hover:text-foreground hover:bg-surface"
                }`}
              >
                <Icon size={15} />
                {label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin/settings"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                  pathname === "/admin/settings"
                    ? "bg-accent/15 text-accent"
                    : "text-muted hover:text-foreground hover:bg-surface"
                }`}
              >
                <Settings size={15} />
              </Link>
            )}
          </nav>

          {/* User area */}
          <div className="hidden md:flex items-center gap-1">
            <ThemeToggle />
            <Link
              href={session?.user?.id ? `/user/${session.user.id}` : "/profile"}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted hover:text-foreground hover:bg-surface transition-all"
            >
              {session?.user?.image ? (
                <img
                  src={session.user.image}
                  alt=""
                  className="w-6 h-6 rounded-full ring-1 ring-border"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-surface flex items-center justify-center ring-1 ring-border">
                  <User size={12} />
                </div>
              )}
              <span className="max-w-20 truncate font-medium">
                {session?.user?.name || "Профиль"}
              </span>
            </Link>
            <button
              onClick={() => signOut()}
              className="p-2 rounded-lg text-muted hover:text-danger transition-all"
              title="Выйти"
            >
              <LogOut size={15} />
            </button>
          </div>

          {/* Mobile */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2.5 text-muted hover:text-foreground rounded-lg flex items-center justify-center min-w-[44px] min-h-[44px]"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {menuOpen && (
          <nav className="md:hidden py-3 border-t border-border space-y-0.5">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-semibold transition-all ${
                  pathname === href
                    ? "bg-accent/15 text-accent"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin/settings"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-semibold text-muted hover:text-foreground"
              >
                <Settings size={18} />
                Настройки
              </Link>
            )}
            <div className="border-t border-border pt-2 mt-2 flex items-center justify-between px-3">
              <div className="flex items-center gap-2">
                <Link
                  href={session?.user?.id ? `/user/${session.user.id}` : "/profile"}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 text-sm font-medium text-muted hover:text-foreground py-2"
                >
                  <User size={16} />
                  Мой профиль
                </Link>
                <ThemeToggle />
              </div>
              <button
                onClick={() => signOut()}
                className="flex items-center gap-2 text-sm font-medium text-muted hover:text-danger py-2"
              >
                <LogOut size={16} />
                Выйти
              </button>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
