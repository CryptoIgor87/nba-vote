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
      <section className="relative py-16 sm:py-24 px-6 text-center">
        {/* Big team logos background */}
        <div className="absolute inset-0 overflow-hidden opacity-[0.07] pointer-events-none">
          <div className="absolute -top-10 -left-10">
            <img src={logo(14)} alt="" className="w-48 h-48" />
          </div>
          <div className="absolute top-5 right-10">
            <img src={logo(2)} alt="" className="w-40 h-40" />
          </div>
          <div className="absolute bottom-0 left-1/4">
            <img src={logo(21)} alt="" className="w-44 h-44" />
          </div>
          <div className="absolute -bottom-5 -right-5">
            <img src={logo(20)} alt="" className="w-52 h-52" />
          </div>
          <div className="absolute top-1/2 left-10 -translate-y-1/2">
            <img src={logo(8)} alt="" className="w-36 h-36" />
          </div>
          <div className="absolute top-1/3 right-1/4">
            <img src={logo(9)} alt="" className="w-32 h-32" />
          </div>
        </div>

        <div className="relative max-w-2xl mx-auto">
          {/* Logo */}
          <div className="inline-flex items-center justify-center w-24 h-24 bg-accent rounded-3xl mb-6 shadow-xl shadow-accent/20">
            <span className="text-white font-black text-3xl">NBA</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black leading-tight mb-3 tracking-tight">
            Predictions
          </h1>
          <p className="text-lg sm:text-xl text-muted max-w-lg mx-auto mb-8 leading-relaxed">
            Делай прогнозы на плей-офф NBA 2026 вместе с друзьями.
            Соревнуйся, набирай баллы, стань лучшим.
          </p>

          {/* CTA */}
          <Link
            href="/auth/signin"
            className="inline-flex items-center gap-2 px-8 py-4 bg-accent hover:bg-accent-hover text-white rounded-2xl text-lg font-bold transition-all shadow-xl shadow-accent/20 hover:shadow-accent/40 hover:scale-105"
          >
            Начать играть
            <ArrowRight size={20} />
          </Link>
        </div>

        {/* Team logos row */}
        <div className="flex items-center justify-center gap-3 sm:gap-5 mt-14 flex-wrap">
          {PLAYOFF_TEAMS.map((t) => (
            <img
              key={t.id}
              src={logo(t.id)}
              alt={t.abbr}
              className="w-12 h-12 sm:w-16 sm:h-16 object-contain hover:scale-125 transition-transform"
            />
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="h-px bg-border" />

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
            desc="Выбирай победителя каждого матча нажатием на логотип"
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
            <ScoreCard icon={Target} title="Победитель матча" points="+1" desc="За каждый правильно угаданный матч" />
            <ScoreCard icon={Trophy} title="Победитель серии" points="+2 / +6" desc="+2 за победителя, +6 за точный счёт серии (4-1, 4-2...)" />
            <ScoreCard icon={TrendingUp} title="Апсет" points="+3" desc="Предсказал победу андердога в серии" />
            <ScoreCard icon={Crosshair} title="Снайпер" points="+3" desc="Угадал все матчи серии без единой ошибки" />
            <ScoreCard icon={Flame} title="Стрик" points="+1 / +3 / +5" desc="3, 5 или 7 правильных прогнозов подряд" />
            <ScoreCard icon={Trophy} title="Чемпион NBA" points="+10" desc="Угадай победителя всего турнира до старта" highlight />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="grid sm:grid-cols-2 gap-6">
          <FeatureCard icon={BarChart3} title="Лидерборд" desc="Рейтинг обновляется автоматически. Смотри кто впереди и чьи прогнозы точнее." />
          <FeatureCard icon={Target} title="Статистика" desc="Точность прогнозов, лучший стрик, разбивка баллов, заработанные бонусы." />
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-accent">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h2 className="text-3xl font-bold text-white mb-3">Play-In стартует уже завтра</h2>
          <p className="text-white/80 mb-8 text-lg">
            Успей сделать прогнозы до начала первых матчей
          </p>
          <Link
            href="/auth/signin"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-accent rounded-2xl text-lg font-bold transition-all hover:bg-white/90 hover:scale-105 shadow-xl"
          >
            Присоединиться
            <ArrowRight size={20} />
          </Link>
        </div>
      </section>
    </div>
  );
}

function StepCard({ step, icon: Icon, title, desc }: { step: number; icon: React.ComponentType<{ size?: number; className?: string }>; title: string; desc: string }) {
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

function ScoreCard({ icon: Icon, title, points, desc, highlight }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; points: string; desc: string; highlight?: boolean }) {
  return (
    <div className={`flex items-start gap-4 p-4 rounded-xl border ${highlight ? "bg-accent/5 border-accent/30" : "bg-background border-border"}`}>
      <div className="shrink-0 mt-0.5"><Icon size={20} className="text-accent" /></div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-sm">{title}</span>
          <span className="text-accent font-bold text-sm whitespace-nowrap">{points}</span>
        </div>
        <p className="text-xs text-muted mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; desc: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <Icon size={24} className="text-accent mb-3" />
      <h3 className="font-bold mb-1">{title}</h3>
      <p className="text-sm text-muted">{desc}</p>
    </div>
  );
}
