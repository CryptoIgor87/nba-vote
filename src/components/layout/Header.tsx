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

const navItems = [
  { href: "/bracket", label: "Сетка", icon: Trophy },
  { href: "/predictions", label: "Прогнозы", icon: Target },
  { href: "/leaderboard", label: "Рейтинг", icon: BarChart3 },
  { href: "/rules", label: "Правила", icon: BookOpen },
];

export default function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin = (session?.user as { role?: string })?.role === "ADMIN";

  // Don't show header on signin page
  if (pathname === "/auth/signin") return null;

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/bracket"
            className="flex items-center gap-2"
          >
            <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-sm">NBA</span>
            </div>
            <span className="text-foreground font-bold text-lg tracking-tight hidden sm:block">
              Predictions
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  pathname === href
                    ? "bg-accent-light text-accent shadow-sm"
                    : "text-muted hover:text-foreground hover:bg-surface"
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin/settings"
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                  pathname === "/admin/settings"
                    ? "bg-accent-light text-accent"
                    : "text-muted hover:text-foreground hover:bg-surface"
                }`}
              >
                <Settings size={16} />
              </Link>
            )}
          </nav>

          {/* User area */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              href="/profile"
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted hover:text-foreground hover:bg-surface transition-all"
            >
              {session?.user?.image ? (
                <img
                  src={session.user.image}
                  alt=""
                  className="w-7 h-7 rounded-full border border-border"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-surface flex items-center justify-center">
                  <User size={14} />
                </div>
              )}
              <span className="max-w-24 truncate font-medium">
                {session?.user?.name || "Профиль"}
              </span>
            </Link>
            <button
              onClick={() => signOut()}
              className="p-2 rounded-xl text-muted hover:text-danger hover:bg-danger-light transition-all"
              title="Выйти"
            >
              <LogOut size={16} />
            </button>
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 text-muted hover:text-foreground rounded-xl hover:bg-surface"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile nav */}
        {menuOpen && (
          <nav className="md:hidden py-3 border-t border-border space-y-1 animate-in slide-in-from-top-2">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  pathname === href
                    ? "bg-accent-light text-accent"
                    : "text-muted hover:text-foreground hover:bg-surface"
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
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-muted hover:text-foreground hover:bg-surface"
              >
                <Settings size={18} />
                Настройки
              </Link>
            )}
            <div className="border-t border-border pt-3 mt-3 flex items-center justify-between px-4">
              <Link
                href="/profile"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 text-sm font-medium text-muted hover:text-foreground"
              >
                <User size={16} />
                Профиль
              </Link>
              <button
                onClick={() => signOut()}
                className="flex items-center gap-2 text-sm font-medium text-muted hover:text-danger"
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
