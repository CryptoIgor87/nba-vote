"use client";

import Link from "next/link";
import {
  Trophy,
  Target,
  BarChart3,
  Flame,
  Crosshair,
  TrendingUp,
  Users,
  ArrowRight,
} from "lucide-react";

const PLAYOFF_TEAMS = [
  { abbr: "DET", id: 9 }, { abbr: "BOS", id: 2 }, { abbr: "NYK", id: 20 },
  { abbr: "CLE", id: 6 }, { abbr: "ATL", id: 1 }, { abbr: "TOR", id: 28 },
  { abbr: "OKC", id: 21 }, { abbr: "SAS", id: 27 }, { abbr: "DEN", id: 8 },
  { abbr: "LAL", id: 14 }, { abbr: "HOU", id: 11 }, { abbr: "MIN", id: 18 },
];

const NBA_IDS: Record<number, number> = {
  1: 1610612737, 2: 1610612738, 6: 1610612739, 8: 1610612743,
  9: 1610612765, 11: 1610612745, 14: 1610612747, 18: 1610612750,
  20: 1610612752, 21: 1610612760, 27: 1610612759, 28: 1610612761,
};

function logo(id: number) {
  return `https://cdn.nba.com/logos/nba/${NBA_IDS[id] || id}/primary/L/logo.svg`;
}

export default function LandingPage() {
  return (
    <div className="-mt-6 -mx-4">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1a1a1a] via-[#2d1a00] to-[#1a1a1a] text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-40 h-40 rounded-full border-2 border-orange-500/20" />
          <div className="absolute bottom-20 right-20 w-60 h-60 rounded-full border-2 border-orange-500/20" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full border border-orange-500/10" />
        </div>

        <div className="relative max-w-4xl mx-auto px-6 py-20 text-center">
          {/* Logo */}
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#e65100] rounded-3xl mb-6 shadow-2xl shadow-orange-500/30">
            <span className="text-white font-black text-2xl">NBA</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-4 tracking-tight">
            Predictions
          </h1>
          <p className="text-lg sm:text-xl text-white/70 max-w-xl mx-auto mb-8 leading-relaxed">
            Делай прогнозы на плей-офф NBA 2026 вместе с друзьями.
            Соревнуйся, набирай баллы, стань лучшим предсказателем.
          </p>

          {/* CTA */}
          <Link
            href="/auth/signin"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#e65100] hover:bg-[#ff6d00] text-white rounded-2xl text-lg font-bold transition-all shadow-xl shadow-orange-500/20 hover:shadow-orange-500/40 hover:scale-105"
          >
            Начать играть
            <ArrowRight size={20} />
          </Link>

          {/* Team logos ticker */}
          <div className="flex items-center justify-center gap-4 mt-12 opacity-60">
            {PLAYOFF_TEAMS.map((t) => (
              <img
                key={t.id}
                src={logo(t.id)}
                alt={t.abbr}
                className="w-8 h-8 sm:w-10 sm:h-10 object-contain grayscale hover:grayscale-0 transition-all"
              />
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-10">Как это работает</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          <StepCard
            step={1}
            icon={Users}
            title="Зарегистрируйся"
            desc="Войди через Google или Яндекс за 5 секунд"
          />
          <StepCard
            step={2}
            icon={Target}
            title="Делай прогнозы"
            desc="Выбирай победителя каждого матча нажатием на логотип команды"
          />
          <StepCard
            step={3}
            icon={Trophy}
            title="Набирай баллы"
            desc="Получай очки за правильные прогнозы и борись за первое место"
          />
        </div>
      </section>

      {/* Scoring */}
      <section className="bg-card border-y border-border">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-center mb-2">Система баллов</h2>
          <p className="text-center text-muted text-sm mb-10">
            Чем точнее прогнозы - тем больше очков
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            <ScoreCard
              icon={Target}
              title="Победитель матча"
              points="+1"
              desc="За каждый правильно угаданный матч"
            />
            <ScoreCard
              icon={Trophy}
              title="Победитель серии"
              points="+2 / +6"
              desc="+2 за победителя, +6 за точный счёт серии (4-1, 4-2...)"
            />
            <ScoreCard
              icon={TrendingUp}
              title="Апсет"
              points="+3"
              desc="Предсказал победу андердога в серии"
            />
            <ScoreCard
              icon={Crosshair}
              title="Снайпер"
              points="+3"
              desc="Угадал все матчи серии без единой ошибки"
            />
            <ScoreCard
              icon={Flame}
              title="Стрик"
              points="+1 / +3 / +5"
              desc="3, 5 или 7 правильных прогнозов подряд"
            />
            <ScoreCard
              icon={Trophy}
              title="Чемпион NBA"
              points="+10"
              desc="Угадай победителя всего турнира до старта"
              highlight
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="grid sm:grid-cols-2 gap-6">
          <FeatureCard
            icon={BarChart3}
            title="Лидерборд"
            desc="Рейтинг обновляется автоматически. Смотри кто впереди и чьи прогнозы оказались точнее."
          />
          <FeatureCard
            icon={Target}
            title="Статистика профиля"
            desc="Точность прогнозов, лучший стрик, разбивка баллов по категориям, заработанные бонусы."
          />
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-r from-[#e65100] to-[#ff6d00] text-white">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h2 className="text-3xl font-bold mb-3">Play-In стартует уже завтра</h2>
          <p className="text-white/80 mb-8 text-lg">
            Успей сделать прогнозы до начала первых матчей
          </p>
          <Link
            href="/auth/signin"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[#e65100] rounded-2xl text-lg font-bold transition-all hover:bg-white/90 hover:scale-105 shadow-xl"
          >
            Присоединиться
            <ArrowRight size={20} />
          </Link>
        </div>
      </section>
    </div>
  );
}

function StepCard({
  step,
  icon: Icon,
  title,
  desc,
}: {
  step: number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 bg-accent/10 rounded-xl mb-4">
        <Icon size={24} className="text-accent" />
      </div>
      <div className="text-xs text-accent font-bold mb-2">Шаг {step}</div>
      <h3 className="font-bold mb-1">{title}</h3>
      <p className="text-sm text-muted">{desc}</p>
    </div>
  );
}

function ScoreCard({
  icon: Icon,
  title,
  points,
  desc,
  highlight,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  points: string;
  desc: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-4 p-4 rounded-xl border ${
        highlight
          ? "bg-accent/5 border-accent/30"
          : "bg-background border-border"
      }`}
    >
      <div className="shrink-0 mt-0.5">
        <Icon size={20} className="text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-sm">{title}</span>
          <span className="text-accent font-bold text-sm whitespace-nowrap">
            {points}
          </span>
        </div>
        <p className="text-xs text-muted mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <Icon size={24} className="text-accent mb-3" />
      <h3 className="font-bold mb-1">{title}</h3>
      <p className="text-sm text-muted">{desc}</p>
    </div>
  );
}
