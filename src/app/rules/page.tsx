"use client";

import { useEffect, useState } from "react";
import { Trophy, Target, Award, Crown, Flame, Crosshair, TrendingUp, Rat } from "lucide-react";

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
      <h1 className="text-2xl font-bold mb-4">Правила</h1>
      <div className="bg-accent/10 border border-accent/20 rounded-xl px-4 py-3 mb-6 text-sm text-accent">
        По всем вопросам, багам и предложениям пишите в Telegram:{" "}
        <a href="https://t.me/ba1udze" target="_blank" rel="noopener" className="font-bold underline hover:no-underline">@ba1udze</a>
      </div>

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

            <div className="bg-background rounded-lg p-3">
              <div className="flex justify-between text-sm">
                <span>Вопрос дня</span>
                <span className="text-accent font-bold">+{pts("points_daily_question", 1)} балл</span>
              </div>
              <p className="text-xs text-muted mt-1">
                Каждый день — вопрос по статистике матча: кто наберёт больше очков, трёшек, передач и т.д. Выберите одного из 4 игроков или &quot;Другой&quot;.
              </p>
            </div>

            {/* Streaks */}
            <div className="bg-background rounded-lg p-3">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-1.5">
                  <Flame size={14} className="text-accent" />
                  Стрик
                </span>
              </div>
              <p className="text-xs text-muted mt-1">
                Каждая серия правильных прогнозов подряд награждается. Бонусы суммируются:
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
                <span>3 подряд: <strong className="text-accent">+{pts("points_streak_3", 1)}</strong></span>
                <span>5 подряд: {"ещё "}<strong className="text-accent">+{pts("points_streak_5", 2)}</strong></span>
                <span>7 подряд: {"ещё "}<strong className="text-accent">+{pts("points_streak_7", 3)}</strong></span>
              </div>
              <p className="text-xs text-muted mt-1">
                Итого за стрик 7: +{pts("points_streak_3", 1) + pts("points_streak_5", 2) + pts("points_streak_7", 3)}. Новый стрик после проигрыша — бонусы заново.
              </p>
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
              Одноразовая ставка до начала первого матча серии.
            </p>
          </div>
        </section>

        {/* Anti-rat */}
        <section className="bg-card border border-danger/30 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Rat size={20} className="text-danger" />
            Анти-крыса
          </h2>
          <p className="text-sm text-foreground/80 mb-3">
            Чтобы никто не подглядывал чужие прогнозы и не копировал их, действуют ограничения:
          </p>
          <div className="space-y-2">
            <div className="bg-background rounded-lg p-3">
              <p className="text-sm font-medium">Прогнозы на матч</p>
              <p className="text-xs text-muted mt-1">
                Становятся видны в профиле игрока и сводной таблице только после начала матча
                (за {pts("betting_close_minutes", 30)} минут до старта приём прогнозов закрывается).
              </p>
            </div>
            <div className="bg-background rounded-lg p-3">
              <p className="text-sm font-medium">Прогнозы на серию</p>
              <p className="text-xs text-muted mt-1">
                Становятся видны только после начала первого матча серии. До этого момента
                никто не узнает, на кого вы поставили.
              </p>
            </div>
            <div className="bg-background rounded-lg p-3">
              <p className="text-sm font-medium">Вопросы дня</p>
              <p className="text-xs text-muted mt-1">
                Ответы видны только после начала матча, к которому привязан вопрос.
              </p>
            </div>
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
