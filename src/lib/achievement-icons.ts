// Achievement styles - each has a UNIQUE icon
export const ACHIEVEMENT_STYLES: Record<
  string,
  { icon: string; gradient: string; borderColor: string }
> = {
  // Getting started
  rookie: { icon: "circle-dot", gradient: "from-amber-700 to-amber-500", borderColor: "border-amber-600/40" },
  regular: { icon: "calendar-days", gradient: "from-slate-500 to-slate-300", borderColor: "border-slate-400/40" },
  dedicated: { icon: "heart-handshake", gradient: "from-orange-600 to-yellow-400", borderColor: "border-orange-500/40" },
  all_in: { icon: "check-check", gradient: "from-emerald-600 to-emerald-400", borderColor: "border-emerald-500/40" },

  // Accuracy
  first_blood: { icon: "target", gradient: "from-green-600 to-green-400", borderColor: "border-green-500/40" },
  sharpshooter: { icon: "crosshair", gradient: "from-blue-600 to-blue-400", borderColor: "border-blue-500/40" },
  oracle: { icon: "eye", gradient: "from-purple-600 to-purple-400", borderColor: "border-purple-500/40" },
  prophet: { icon: "sparkles", gradient: "from-violet-600 to-violet-400", borderColor: "border-violet-500/40" },
  nostradamus: { icon: "scroll", gradient: "from-yellow-600 to-amber-300", borderColor: "border-yellow-500/40" },

  // Streaks
  hot_hand: { icon: "flame", gradient: "from-orange-600 to-orange-400", borderColor: "border-orange-500/40" },
  on_fire: { icon: "zap", gradient: "from-red-600 to-orange-400", borderColor: "border-red-500/40" },
  unstoppable: { icon: "shield", gradient: "from-red-700 to-red-400", borderColor: "border-red-600/40" },
  legendary: { icon: "diamond", gradient: "from-cyan-500 to-blue-400", borderColor: "border-cyan-500/40" },

  // Series
  series_master: { icon: "trophy", gradient: "from-yellow-600 to-yellow-400", borderColor: "border-yellow-500/40" },
  exact_science: { icon: "calculator", gradient: "from-teal-600 to-teal-400", borderColor: "border-teal-500/40" },
  sniper: { icon: "scan", gradient: "from-red-600 to-red-400", borderColor: "border-red-500/40" },
  upset_king: { icon: "crown", gradient: "from-amber-500 to-yellow-300", borderColor: "border-amber-500/40" },
  double_upset: { icon: "swords", gradient: "from-amber-600 to-yellow-400", borderColor: "border-amber-500/40" },

  // Leaderboard
  podium: { icon: "award", gradient: "from-yellow-500 to-amber-300", borderColor: "border-yellow-500/40" },
  champion: { icon: "medal", gradient: "from-yellow-500 to-yellow-200", borderColor: "border-yellow-400/40" },
  point_hunter: { icon: "coins", gradient: "from-green-600 to-emerald-400", borderColor: "border-green-500/40" },
  half_century: { icon: "star", gradient: "from-orange-600 to-amber-400", borderColor: "border-orange-500/40" },

  // Social
  chatterbox: { icon: "message-circle", gradient: "from-blue-600 to-blue-400", borderColor: "border-blue-500/40" },
  popular: { icon: "users", gradient: "from-indigo-600 to-indigo-400", borderColor: "border-indigo-500/40" },

  // Special
  fortune_teller: { icon: "wand", gradient: "from-purple-600 to-pink-400", borderColor: "border-purple-500/40" },
  underdog_lover: { icon: "heart", gradient: "from-pink-600 to-rose-400", borderColor: "border-pink-500/40" },
};

export const CATEGORY_LABELS: Record<string, string> = {
  start: "Начало пути",
  accuracy: "Точность",
  streak: "Серии побед",
  series: "Плей-офф серии",
  rank: "Рейтинг",
  social: "Социальные",
  special: "Особые",
};
