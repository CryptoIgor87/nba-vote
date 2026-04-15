"use client";

import {
  Trophy, Target, Crosshair, Flame, Shield, Diamond,
  Crown, Award, Star, Eye, Sparkles, Scroll, Zap,
  Heart, MessageCircle, Users, Calculator, Scan,
  Lock, CircleDot, CalendarDays, HeartHandshake,
  CheckCheck, Swords, Medal, Coins, Wand,
} from "lucide-react";

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  trophy: Trophy,
  target: Target,
  crosshair: Crosshair,
  flame: Flame,
  shield: Shield,
  diamond: Diamond,
  crown: Crown,
  award: Award,
  star: Star,
  eye: Eye,
  sparkles: Sparkles,
  scroll: Scroll,
  zap: Zap,
  heart: Heart,
  "message-circle": MessageCircle,
  users: Users,
  calculator: Calculator,
  scan: Scan,
  "circle-dot": CircleDot,
  "calendar-days": CalendarDays,
  "heart-handshake": HeartHandshake,
  "check-check": CheckCheck,
  swords: Swords,
  medal: Medal,
  coins: Coins,
  wand: Wand,
};

const GRADIENTS: Record<string, string> = {
  "from-amber-700 to-amber-500": "linear-gradient(135deg, #b45309, #f59e0b)",
  "from-slate-500 to-slate-300": "linear-gradient(135deg, #64748b, #cbd5e1)",
  "from-orange-600 to-yellow-400": "linear-gradient(135deg, #ea580c, #facc15)",
  "from-emerald-600 to-emerald-400": "linear-gradient(135deg, #059669, #34d399)",
  "from-green-600 to-green-400": "linear-gradient(135deg, #16a34a, #4ade80)",
  "from-blue-600 to-blue-400": "linear-gradient(135deg, #2563eb, #60a5fa)",
  "from-purple-600 to-purple-400": "linear-gradient(135deg, #9333ea, #c084fc)",
  "from-violet-600 to-violet-400": "linear-gradient(135deg, #7c3aed, #a78bfa)",
  "from-yellow-600 to-amber-300": "linear-gradient(135deg, #ca8a04, #fcd34d)",
  "from-red-600 to-orange-400": "linear-gradient(135deg, #dc2626, #fb923c)",
  "from-red-700 to-red-400": "linear-gradient(135deg, #b91c1c, #f87171)",
  "from-cyan-500 to-blue-400": "linear-gradient(135deg, #06b6d4, #60a5fa)",
  "from-teal-600 to-teal-400": "linear-gradient(135deg, #0d9488, #2dd4bf)",
  "from-amber-500 to-yellow-300": "linear-gradient(135deg, #f59e0b, #fde047)",
  "from-amber-600 to-yellow-400": "linear-gradient(135deg, #d97706, #facc15)",
  "from-yellow-500 to-amber-300": "linear-gradient(135deg, #eab308, #fcd34d)",
  "from-yellow-500 to-yellow-200": "linear-gradient(135deg, #eab308, #fef08a)",
  "from-green-600 to-emerald-400": "linear-gradient(135deg, #16a34a, #34d399)",
  "from-orange-600 to-amber-400": "linear-gradient(135deg, #ea580c, #fbbf24)",
  "from-orange-600 to-orange-400": "linear-gradient(135deg, #ea580c, #fb923c)",
  "from-indigo-600 to-indigo-400": "linear-gradient(135deg, #4f46e5, #818cf8)",
  "from-purple-600 to-pink-400": "linear-gradient(135deg, #9333ea, #f472b6)",
  "from-pink-600 to-rose-400": "linear-gradient(135deg, #db2777, #fb7185)",
  "from-red-600 to-red-400": "linear-gradient(135deg, #dc2626, #f87171)",
  "from-yellow-600 to-yellow-400": "linear-gradient(135deg, #ca8a04, #facc15)",
};

import { ACHIEVEMENT_STYLES } from "@/lib/achievement-icons";

interface Achievement {
  id: string;
  title: string;
  description: string;
  category: string;
  unlocked: boolean;
  unlocked_at: string | null;
}

export default function AchievementBadge({
  achievement,
  size = "md",
}: {
  achievement: Achievement;
  size?: "sm" | "md" | "lg";
}) {
  const style = ACHIEVEMENT_STYLES[achievement.id];
  const IconComp = ICONS[style?.icon || "trophy"] || Trophy;
  const gradient = GRADIENTS[style?.gradient || "from-amber-700 to-amber-500"] || GRADIENTS["from-amber-700 to-amber-500"];

  const sizes = {
    sm: { badge: "w-12 h-12", icon: 18, text: "text-[9px]" },
    md: { badge: "w-16 h-16", icon: 24, text: "text-[10px]" },
    lg: { badge: "w-20 h-20", icon: 30, text: "text-xs" },
  };

  const s = sizes[size];

  return (
    <div className="flex flex-col items-center gap-1.5 group">
      <div className="relative">
        <div
          className={`${s.badge} rounded-full flex items-center justify-center transition-all ${
            achievement.unlocked
              ? "shadow-lg group-hover:scale-110"
              : "grayscale opacity-30"
          }`}
          style={{
            background: achievement.unlocked ? gradient : "linear-gradient(135deg, #374151, #1f2937)",
          }}
        >
          {achievement.unlocked ? (
            <IconComp size={s.icon} className="text-white drop-shadow-md" />
          ) : (
            <Lock size={s.icon * 0.7} className="text-gray-500" />
          )}
        </div>
        {achievement.unlocked && (
          <div
            className="absolute -inset-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity -z-10 blur-md"
            style={{ background: gradient }}
          />
        )}
      </div>
      <span
        className={`${s.text} font-medium text-center leading-tight w-full ${
          achievement.unlocked ? "text-foreground" : "text-muted/50"
        }`}
      >
        {achievement.title}
      </span>
    </div>
  );
}
