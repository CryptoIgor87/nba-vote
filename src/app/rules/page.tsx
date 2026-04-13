"use client";

import { useEffect, useState } from "react";
import { Trophy, Target, Award, Crown, Flame, Crosshair, TrendingUp } from "lucide-react";

export default function RulesPage() {
  const [settings, setSettings] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        const map: Record<string, number> = {};
        data?.forEach((s: { key: string; value: number }) => {
          map[s.key] = s.value;
        });
        setSettings(map);
      });
  }, []);

  const pts = (key: string, fallback: number) => settings[key] ?? fallback;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Правила</h1>

      <div className="space-y-6">
        {/* How it works */}
        <section className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Target size={20} className="text-accent" />
            Как это работает
          </h2>
          <ul className="space-y-2 text-sm text-foreground/80">
            <li>1. Зарегистрируйтесь через Google или Яндекс</li>
            <li>2. Перед каждым матчем выберите победителя нажатием на логотип команды</li>
            <li>
              3. Приём прогнозов закрывается за{" "}
              <strong>{pts("betting_close_minutes", 30)} минут</strong> до начала матча
            </li>
            <li>4. После завершения матча система автоматически начисляет баллы</li>
            <li>5. Следите за своим рейтингом в таблице лидеров</li>
          </ul>
        </section>

        {/* Play-In */}
        <section className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Award size={20} className="text-accent" />
            Play-In турнир
          </h2>
          <p className="text-sm text-foreground/80 mb-2">
            Play-In - это отдельные матчи (не серии). Начисление баллов:
          </p>
          <div className="bg-background rounded-lg p-3">
            <div className="flex justify-between text-sm">
              <span>Угадал победителя матча</span>
              <span className="text-accent font-bold">+{pts("points_correct_winner", 1)} балл</span>
            </div>
          </div>
        </section>

        {/* Playoffs */}
        <section className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Trophy size={20} className="text-accent" />
            Плей-офф (серии до 4 побед)
          </h2>
          <p className="text-sm text-foreground/80 mb-3">
            В плей-офф вы выбираете победителя каждого матча серии. Баллы начисляются за:
          </p>
          <div className="space-y-2">
            <div className="bg-background rounded-lg p-3">
              <div className="flex justify-between text-sm">
                <span>Угадал победителя матча</span>
                <span className="text-accent font-bold">+{pts("points_correct_winner", 1)} балл</span>
              </div>
              <p className="text-xs text-muted mt-1">
                За каждый матч, где вы правильно выбрали победителя
              </p>
            </div>

            <div className="bg-background rounded-lg p-3">
              <div className="flex justify-between text-sm">
                <span>Угадал победителя серии</span>
                <span className="text-accent font-bold">+{pts("points_correct_series_winner", 2)} балла</span>
              </div>
              <p className="text-xs text-muted mt-1">
                Бонус после завершения серии, если в ваших прогнозах правильная команда побеждала чаще
              </p>
            </div>

            <div className="bg-background rounded-lg p-3 border border-accent/20">
              <div className="flex justify-between text-sm">
                <span>Угадал победителя серии + точный счёт</span>
                <span className="text-accent font-bold">+{pts("points_correct_series_score", 6)} баллов</span>
              </div>
              <p className="text-xs text-muted mt-1">
                Вместо +{pts("points_correct_series_winner", 2)}. Например: предсказали 4-2, и серия закончилась 4-2
              </p>
            </div>
          </div>
        </section>

        {/* Bonuses */}
        <section className="bg-card border border-accent/30 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Flame size={20} className="text-accent" />
            Бонусы
          </h2>
          <div className="space-y-2">
            {/* Upset */}
            <div className="bg-background rounded-lg p-3">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-accent" />
                  Апсет
                </span>
                <span className="text-accent font-bold">+{pts("points_upset_bonus", 3)} балла</span>
              </div>
              <p className="text-xs text-muted mt-1">
                Предсказали победу нижнего сида в серии и он победил. Смелый прогноз вознаграждается!
              </p>
            </div>

            {/* Sniper */}
            <div className="bg-background rounded-lg p-3">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-1.5">
                  <Crosshair size={14} className="text-accent" />
                  Снайпер
                </span>
                <span className="text-accent font-bold">+{pts("points_sniper", 3)} балла</span>
              </div>
              <p className="text-xs text-muted mt-1">
                Угадали победителя во ВСЕХ матчах серии (минимум 4 игры). Требует идеальной точности.
              </p>
            </div>

            {/* Streaks */}
            <div className="bg-background rounded-lg p-3">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-1.5">
                  <Flame size={14} className="text-accent" />
                  Стрик
                </span>
                <span className="text-accent font-bold">до +{pts("points_streak_7", 5)} баллов</span>
              </div>
              <p className="text-xs text-muted mt-1">
                Серия правильных прогнозов подряд (считается лучший стрик):
              </p>
              <div className="flex gap-4 mt-2 text-xs">
                <span>3 подряд: <strong className="text-accent">+{pts("points_streak_3", 1)}</strong></span>
                <span>5 подряд: <strong className="text-accent">+{pts("points_streak_5", 3)}</strong></span>
                <span>7 подряд: <strong className="text-accent">+{pts("points_streak_7", 5)}</strong></span>
              </div>
            </div>
          </div>
        </section>

        {/* Tournament winner */}
        <section className="bg-card border border-accent/30 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Crown size={20} className="text-accent" />
            Победитель турнира
          </h2>
          <div className="bg-background rounded-lg p-3">
            <div className="flex justify-between text-sm">
              <span>Угадал чемпиона NBA</span>
              <span className="text-accent font-bold">+{pts("points_tournament_winner", 10)} баллов</span>
            </div>
            <p className="text-xs text-muted mt-1">
              Одноразовая ставка до начала первых матчей. Можно менять до старта play-in.
            </p>
          </div>
        </section>

        {/* Example */}
        <section className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-3">Пример</h2>
          <p className="text-sm text-foreground/80">
            Серия между Celtics и Heat закончилась 4-2. Вы угадали победителя в 5
            из 6 матчей (<strong>+{5 * pts("points_correct_winner", 1)}</strong>),
            правильно предсказали что Celtics выиграют серию 4-2
            (<strong>+{pts("points_correct_series_score", 6)}</strong> бонус),
            плюс угадали все 4 победы Celtics верно
            (<strong>+{pts("points_sniper", 3)}</strong> Снайпер).
            Итого: <strong>
              {5 * pts("points_correct_winner", 1) +
                pts("points_correct_series_score", 6) +
                pts("points_sniper", 3)}{" "}
              баллов
            </strong> за серию.
          </p>
        </section>
      </div>
    </div>
  );
}
