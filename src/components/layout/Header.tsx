"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Trophy,
  BarChart3,
  Crosshair,
  BookOpen,
  MessageCircle,
  User,
  LogOut,
  Settings,
  Menu,
  X,
  Grip,
} from "lucide-react";
import { useState } from "react";
import ThemeToggle from "./ThemeToggle";

const navItems = [
  { href: "/predictions", label: "Прогнозы", icon: Crosshair, color: "text-orange-400", activeBg: "bg-orange-500/10" },
  { href: "/bracket", label: "Сетка", icon: Grip, color: "text-violet-400", activeBg: "bg-violet-500/10" },
  { href: "/leaderboard", label: "Рейтинг", icon: Trophy, color: "text-amber-400", activeBg: "bg-amber-500/10" },
  { href: "/chat", label: "Чат", icon: MessageCircle, color: "text-sky-400", activeBg: "bg-sky-500/10" },
  { href: "/rules", label: "Правила", icon: BookOpen, color: "text-emerald-400", activeBg: "bg-emerald-500/10" },
];

export default function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin = (session?.user as { role?: string })?.role === "ADMIN";

  if (pathname === "/auth/signin" || pathname === "/") return null;

  return (
    <header className="sticky top-0 z-50 border-b border-border-subtle bg-[#0c0e16]/85 backdrop-blur-2xl backdrop-saturate-150">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/predictions" className="flex items-center gap-2 group">
            <span className="text-[28px] leading-none group-hover:scale-110 transition-transform drop-shadow-[0_2px_4px_rgba(255,106,0,0.3)]">🏀</span>
            <div className="hidden sm:flex items-baseline gap-1">
              <span className="font-display font-black text-base tracking-wider uppercase bg-gradient-to-r from-accent to-amber-400 bg-clip-text text-transparent">
                NBA
              </span>
              <span className="font-display font-bold text-sm tracking-wide uppercase text-foreground/60">
                Predict
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon, color, activeBg }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all duration-150 ${
                    isActive
                      ? `${activeBg} text-foreground`
                      : "text-foreground-tertiary hover:text-foreground hover:bg-surface"
                  }`}
                >
                  <Icon size={16} className={isActive ? color : "text-foreground-tertiary"} strokeWidth={isActive ? 2.5 : 1.8} />
                  {label}
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                href="/admin/settings"
                className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-[13px] transition-all ${
                  pathname === "/admin/settings"
                    ? "bg-surface text-foreground"
                    : "text-foreground-tertiary hover:text-foreground hover:bg-surface"
                }`}
              >
                <Settings size={15} strokeWidth={1.8} />
              </Link>
            )}
          </nav>

          {/* User area */}
          <div className="hidden md:flex items-center gap-1.5">
            <ThemeToggle />
            <Link
              href={session?.user?.id ? `/user/${session.user.id}` : "/profile"}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-sm text-foreground-tertiary hover:text-foreground hover:bg-surface transition-all"
            >
              {session?.user?.image ? (
                <img
                  src={session.user.image}
                  alt=""
                  className="w-7 h-7 rounded-lg ring-1 ring-border object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-surface flex items-center justify-center ring-1 ring-border">
                  <User size={13} />
                </div>
              )}
              <span className="max-w-24 truncate font-medium text-[13px]">
                {session?.user?.name || "Профиль"}
              </span>
            </Link>
            <button
              onClick={() => signOut()}
              className="p-2 rounded-xl text-foreground-tertiary hover:text-danger hover:bg-danger/5 transition-all"
              title="Выйти"
            >
              <LogOut size={15} strokeWidth={1.8} />
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2.5 text-foreground-tertiary hover:text-foreground rounded-xl flex items-center justify-center min-w-[44px] min-h-[44px] active:scale-90 transition-transform"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile nav */}
        {menuOpen && (
          <nav className="md:hidden py-3 border-t border-border-subtle space-y-1 animate-[fadeIn_0.15s_ease-out]">
            {navItems.map(({ href, label, icon: Icon, color, activeBg }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${
                    isActive
                      ? `${activeBg} text-foreground`
                      : "text-foreground-tertiary hover:text-foreground active:bg-surface"
                  }`}
                >
                  <Icon size={20} className={isActive ? color : "text-foreground-tertiary"} strokeWidth={isActive ? 2.5 : 1.8} />
                  {label}
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                href="/admin/settings"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold text-foreground-tertiary hover:text-foreground active:bg-surface"
              >
                <Settings size={20} strokeWidth={1.8} />
                Настройки
              </Link>
            )}
            <div className="border-t border-border-subtle pt-3 mt-2 flex items-center justify-between px-3">
              <div className="flex items-center gap-3">
                <Link
                  href={session?.user?.id ? `/user/${session.user.id}` : "/profile"}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 text-sm font-medium text-foreground-tertiary hover:text-foreground py-2"
                >
                  {session?.user?.image ? (
                    <img src={session.user.image} alt="" className="w-7 h-7 rounded-lg ring-1 ring-border object-cover" />
                  ) : (
                    <User size={18} />
                  )}
                  Профиль
                </Link>
                <ThemeToggle />
              </div>
              <button
                onClick={() => signOut()}
                className="flex items-center gap-2 text-sm font-medium text-foreground-tertiary hover:text-danger py-2 px-3 rounded-xl hover:bg-danger/5 transition-all"
              >
                <LogOut size={16} strokeWidth={1.8} />
                Выйти
              </button>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
