"use client";

import Link from "next/link";
import {
  Trophy, Target, BarChart3, Flame, Crosshair,
  TrendingUp, Users, ArrowRight, Zap, Shield,
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
    <div className="-mt-6 -mx-4 overflow-hidden">
      {/* Hero */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center px-6 overflow-hidden">
        {/* Background team logos */}
        <div className="absolute inset-0 pointer-events-none">
          <img src={logo(14)} alt="" className="absolute top-[5%] left-[5%] w-32 h-32 sm:w-48 sm:h-48 opacity-[0.04]" />
          <img src={logo(2)} alt="" className="absolute top-[8%] right-[8%] w-28 h-28 sm:w-40 sm:h-40 opacity-[0.04]" />
          <img src={logo(21)} alt="" className="absolute bottom-[15%] left-[15%] w-36 h-36 sm:w-52 sm:h-52 opacity-[0.04]" />
          <img src={logo(20)} alt="" className="absolute bottom-[8%] right-[5%] w-40 h-40 sm:w-56 sm:h-56 opacity-[0.04]" />
          <img src={logo(8)} alt="" className="absolute top-[40%] left-[2%] w-24 h-24 sm:w-36 sm:h-36 opacity-[0.03]" />
          <img src={logo(9)} alt="" className="absolute top-[30%] right-[3%] w-20 h-20 sm:w-32 sm:h-32 opacity-[0.03]" />
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
        </div>

        <div className="relative text-center max-w-3xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-accent/10 border border-accent/20 rounded-full mb-8">
            <Zap size={14} className="text-accent" />
            <span className="text-xs font-semibold text-accent uppercase tracking-wider">Плей-офф 2026</span>
          </div>

          {/* Title */}
          <h1 className="font-display font-extrabold tracking-tight leading-[0.85] mb-6">
            <span className="text-foreground text-3xl sm:text-5xl md:text-6xl">NBA PLAY OFF</span>
            <br />
            <span className="bg-gradient-to-r from-accent to-amber-400 bg-clip-text text-transparent text-5xl sm:text-7xl md:text-9xl">PREDICTIONS</span>
          </h1>

          <p className="text-lg sm:text-xl text-muted max-w-lg mx-auto mb-10 leading-relaxed font-light">
            Делай прогнозы на плей-офф NBA вместе с друзьями.
            Соревнуйся, набирай баллы, стань лучшим.
          </p>

          {/* CTA */}
          <Link
            href="/auth/signin"
            className="group inline-flex items-center gap-2 px-8 py-4 bg-accent hover:bg-accent-hover text-white rounded-xl text-lg font-bold font-display uppercase tracking-wide transition-all shadow-2xl shadow-accent/25 hover:shadow-accent/40 hover:scale-[1.02]"
          >
            Начать играть
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Team logos marquee */}
        <div className="relative mt-16 w-full overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-background to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background to-transparent z-10" />
          <div className="flex items-center gap-6 sm:gap-10 animate-marquee">
            {[...PLAYOFF_TEAMS, ...PLAYOFF_TEAMS].map((t, i) => (
              <img
                key={`${t.id}-${i}`}
                src={logo(t.id)}
                alt={t.abbr}
                className="w-12 h-12 sm:w-14 sm:h-14 object-contain opacity-40 hover:opacity-100 transition-opacity duration-300 shrink-0"
              />
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-wide mb-2">Как это работает</h2>
          <p className="text-muted">Три простых шага</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          <StepCard step={1} icon={Users} title="Регистрация" desc="Войди через Google или Яндекс. Занимает 5 секунд." />
          <StepCard step={2} icon={Target} title="Прогнозы" desc="Выбирай победителя каждого матча плей-офф нажатием на логотип." />
          <StepCard step={3} icon={Trophy} title="Рейтинг" desc="Набирай баллы за верные прогнозы и борись за первое место." />
        </div>
      </section>

      {/* Scoring */}
      <section className="border-y border-border bg-surface/50">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-wide mb-2">Система баллов</h2>
            <p className="text-muted">Чем точнее - тем больше</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ScoreCard icon={Target} title="Победитель матча" points="+1" desc="Угадал кто выиграет" />
            <ScoreCard icon={Trophy} title="Серия" points="+2 / +6" desc="Победитель серии / точный счёт" />
            <ScoreCard icon={TrendingUp} title="Апсет" points="+3" desc="Предсказал победу андердога" />
            <ScoreCard icon={Crosshair} title="Снайпер" points="+3" desc="Все матчи серии без ошибок" />
            <ScoreCard icon={Flame} title="Стрик" points="+1/+3/+5" desc="3, 5 или 7 подряд" />
            <ScoreCard icon={Shield} title="Чемпион" points="+10" desc="Угадай победителя NBA" highlight />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-2xl p-8 card-glow">
            <BarChart3 size={28} className="text-accent mb-4" />
            <h3 className="font-display text-xl font-bold uppercase mb-2">Лидерборд</h3>
            <p className="text-sm text-muted leading-relaxed">
              Рейтинг обновляется автоматически. Лента достижений, бонусы, стрики. Смотри кто впереди.
            </p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-8 card-glow">
            <Target size={28} className="text-accent mb-4" />
            <h3 className="font-display text-xl font-bold uppercase mb-2">Статистика</h3>
            <p className="text-sm text-muted leading-relaxed">
              Детальный профиль: точность, стрики, разбивка баллов, заработанные бонусы.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-accent/20 via-accent/10 to-accent/20" />
        <div className="relative max-w-4xl mx-auto px-6 py-20 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-wide text-foreground mb-3">
            Play-In стартует завтра
          </h2>
          <p className="text-muted mb-8 text-lg">
            Успей сделать прогнозы до начала первых матчей
          </p>
          <Link
            href="/auth/signin"
            className="group inline-flex items-center gap-2 px-8 py-4 bg-accent hover:bg-accent-hover text-white rounded-xl text-lg font-bold font-display uppercase tracking-wide transition-all shadow-2xl shadow-accent/25 hover:shadow-accent/40 hover:scale-[1.02]"
          >
            Присоединиться
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function StepCard({ step, icon: Icon, title, desc }: { step: number; icon: React.ComponentType<{ size?: number; className?: string }>; title: string; desc: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 text-center card-glow">
      <div className="inline-flex items-center justify-center w-14 h-14 bg-accent/10 rounded-2xl mb-4">
        <Icon size={26} className="text-accent" />
      </div>
      <div className="font-display text-xs text-accent font-bold uppercase tracking-widest mb-2">Шаг {step}</div>
      <h3 className="font-display text-lg font-bold uppercase mb-1">{title}</h3>
      <p className="text-sm text-muted">{desc}</p>
    </div>
  );
}

function ScoreCard({ icon: Icon, title, points, desc, highlight }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; points: string; desc: string; highlight?: boolean }) {
  return (
    <div className={`flex items-start gap-4 p-5 rounded-xl border ${highlight ? "bg-accent/5 border-accent/30 card-glow" : "bg-card border-border card-glow"}`}>
      <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center shrink-0">
        <Icon size={20} className="text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="font-display font-bold text-sm uppercase">{title}</span>
          <span className="text-accent font-display font-bold text-sm">{points}</span>
        </div>
        <p className="text-xs text-muted">{desc}</p>
      </div>
    </div>
  );
}
