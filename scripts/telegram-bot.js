#!/usr/bin/env node
/**
 * Telegram bot "Гей Предсказатель"
 *
 * Sends notifications to a Telegram channel:
 * - 21:00 & 23:00 Tomsk (14:00 & 16:00 UTC): remind players who haven't bet
 * - 13:00 Tomsk (06:00 UTC): leaderboard changes after matches
 *
 * Usage: node scripts/telegram-bot.js [missed|leaderboard|test]
 * Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, SUPABASE_URL, SUPABASE_SERVICE_KEY
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const FLAG_DIR = "/tmp/tg-bot-flags";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Telegram usernames for mentions (tag them to get attention)
const TG_USERNAMES = {
  "1d53fcd7-a779-4bdc-8ae5-6424d110e095": "@honeybadgermike", // Honeybadger / gerasim
  "b889c3a4-6425-42d7-8878-d72236be3c40": "@gaba_762",        // Lakers Nation
  "32818bf6-6094-4fc7-a88a-4f0e9e9ea21e": "@ba1udze",         // Medved
  "bc4a5143-d342-4b7f-bd85-693f770d4701": "@Miron70",         // MIRON 13
};

// ============ GAY ROASTS FOR MISSED BETS ============
const MISSED_ROASTS = [
  (name, match) => `${name}, пидор ленивый, опять забыл поставить на ${match}? Завтра будешь ныть как сучка что не успел 🖕`,
  (name, match) => `Эй ${name}! Пока ты сосал хуи, все уже поставили на ${match}. Двигай жопой, петух! 🍆`,
  (name, match) => `${name} — главный пидрила турнира, не поставил на ${match}. Опять в гриндре членами торгует 📱`,
  (name, match) => `${name} снова пропускает ${match}! Этот пидорас потом скажет "я не видел". Каждый блять раз 🤡`,
  (name, match) => `${name}, жопошник, ${match} ждёт твой прогноз! Вытащи хуй изо рта и поставь ставку 🏳️‍🌈`,
  (name, match) => `${name} игнорирует ${match}. Этот гомосек завтра утром будет скулить что пропустил. Классика 💩`,
  (name, match) => `${name}! Хорош дрочить на мужиков, поставь на ${match}, пидрила! ⏰`,
  (name, match) => `ПОЗОР! ${name} — единственный кто не поставил на ${match}. Пидор обыкновенный 🏳️‍🌈`,
  (name, match) => `${name}, очнись, сука! ${match} скоро начнётся! Или тебе хуй важнее прогнозов? 🍆`,
  (name, match) => `${name} забыл про ${match}. Этот пидр вчера так набухался что мозги вытекли через жопу 🍸`,
  (name, match) => `${name}, ты чё, совсем охуел? Все поставили на ${match}, только ты сидишь как пидор! 🪞`,
  (name, match) => `${name}, мразь ленивая, ${match} — это не шутки! Ставь прогноз или получишь хуем по лбу 👊`,
  (name, match) => `${name}, гейский позор! ${match} без твоей ставки. Видимо руки заняты чем-то другим 🤲`,
  (name, match) => `${name}, блять, ${match}! Поставь ставку, пока тебя не выебали в рейтинге! 📉`,
  (name, match) => `Опять ${name} в пидорской отключке. ${match} горит, а этот хуесос спит! 😴`,
];

// ============ GAY ROASTS FOR LEADERBOARD CHANGES ============
const OVERTAKE_ROASTS = [
  (winner, loser, pos) => `${winner} нагнул ${loser} раком и теперь на ${pos}-м месте! Кто кого ебёт теперь, а? 🔝`,
  (winner, loser, pos) => `${winner} обошёл ${loser}! ${loser} теперь снизу как и положено пидору 😘`,
  (winner, loser, pos) => `${winner} засунул ${loser} на ${pos}-е место! ${loser} обосрался и опустился, лох 💪`,
  (winner, loser, pos) => `${winner} выебал ${loser} по очкам и теперь ${pos}-й! ${loser}, утрись, петушок 🐓`,
  (winner, loser, pos) => `${winner} на ${pos}-м месте! ${loser} сосёт в рейтинге как и в жизни 🚿`,
  (winner, loser, pos) => `${winner} показал ${loser} кто тут альфа-самец! ${pos}-е место! ${loser} — на колени 🧎`,
  (winner, loser, pos) => `${winner} сверху! ${loser} снизу! Как ${loser} и привык. ${pos}-е место! 😜`,
  (winner, loser, pos) => `${winner} порвал ${loser} как тузик грелку! ${pos}-е место, а ${loser} в жопе рейтинга 💀`,
];

const LEADER_CELEBRATION = [
  (name) => `${name} — ПЕРВЫЙ! Главный хуесос турнира забрался на вершину! Остальные пидоры — в очередь 🏆`,
  (name) => `${name} на троне! Все остальные — жалкие подстилки рейтинга! 👑`,
  (name) => `${name} — король пидоров! Номер один! Остальным сосать 💅🏆`,
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Pick N unique items from array (shuffle + slice)
function pickUnique(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

async function sendMessage(text) {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.log("[DRY RUN]", text);
    return;
  }
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: "HTML" }),
  });
  const data = await res.json();
  if (!data.ok) console.error("Telegram error:", data);
  else console.log("Sent:", text.substring(0, 80) + "...");
}

// ============ MISSED PREDICTIONS ============
async function checkMissedPredictions() {
  const { data: teams } = await s.from("nba_teams").select("id, abbreviation");
  const tmap = new Map(teams.map((t) => [t.id, t.abbreviation]));

  // Top 4 users by leaderboard
  const { data: lb } = await s.from("nba_leaderboard").select("user_id, total_points").order("total_points", { ascending: false }).limit(4);
  const userIds = lb.map((l) => l.user_id);
  const { data: users } = await s.from("nba_users").select("id, display_name, name").in("id", userIds);
  const uname = (id) => TG_USERNAMES[id] || users.find((u) => u.id === id)?.display_name || "Аноним";

  // Upcoming games in next 24h
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const { data: games } = await s.from("nba_games").select("*")
    .eq("status", "upcoming")
    .gte("game_date", now.toISOString())
    .lte("game_date", tomorrow.toISOString());

  if (!games || games.length === 0) {
    console.log("No upcoming games in next 24h");
    return;
  }

  // Check predictions
  const { data: preds } = await s.from("nba_predictions").select("user_id, game_id")
    .in("user_id", userIds)
    .in("game_id", games.map((g) => g.id));

  const predSet = new Set(preds?.map((p) => `${p.user_id}_${p.game_id}`) || []);

  // Also check daily questions
  const { data: dqs } = await s.from("nba_daily_questions").select("id, game_id")
    .eq("status", "active")
    .in("game_id", games.map((g) => g.id));

  const { data: dpicks } = dqs && dqs.length > 0
    ? await s.from("nba_daily_picks").select("user_id, question_id").in("user_id", userIds).in("question_id", dqs.map((q) => q.id))
    : { data: [] };

  const dpickSet = new Set(dpicks?.map((p) => `${p.user_id}_${p.question_id}`) || []);

  const messages = [];

  for (const uid of userIds) {
    const name = uname(uid);
    // Missed game predictions
    for (const game of games) {
      if (!predSet.has(`${uid}_${game.id}`)) {
        const match = `${tmap.get(game.home_team_id)} vs ${tmap.get(game.away_team_id)}`;
        messages.push(pick(MISSED_ROASTS)(name, match));
      }
    }
    // Missed daily questions
    for (const dq of (dqs || [])) {
      if (!dpickSet.has(`${uid}_${dq.id}`)) {
        const game = games.find((g) => g.id === dq.game_id);
        const match = game ? `вопрос дня ${tmap.get(game.home_team_id)}-${tmap.get(game.away_team_id)}` : "вопрос дня";
        messages.push(pick(MISSED_ROASTS)(name, match));
      }
    }
  }

  if (messages.length === 0) {
    // Only send "all done" once per day
    const today = new Date().toISOString().split("T")[0];
    const flagFile = `${FLAG_DIR}/all_done_${today}`;
    if (!fs.existsSync(FLAG_DIR)) fs.mkdirSync(FLAG_DIR, { recursive: true });
    if (fs.existsSync(flagFile)) { console.log("All done already sent today"); return; }
    fs.writeFileSync(flagFile, "1");

    const ALL_DONE = [
      "Охуеть, все поставили! Ни одного ленивого пидора сегодня. Чудо блять 🌈✅",
      "Все четыре пидраса сделали прогнозы! Видимо наконец вытащили хуи из рук и зашли на сайт 👏",
      "Ставки сделаны! Все на месте, ни один гомосек не забыл. Отмечаем это событие! 🍾",
      "Вау, все поставили! Может вы не такие тупые пидоры как я думал? Хотя нет, просто повезло 🎰",
      "Прогнозы на месте! Ни одной ленивой пидорской жопы сегодня. Горжусь вами, шлюхи 💕",
      "Невероятно! Все пидоры на месте! Это как увидеть единорога, только единорог — это четыре гомосека с прогнозами 🦄",
      "Ёбаный в рот, все поставили! Я в шоке. Обычно хоть один пидр забывает. Сегодня вы меня удивили 😱",
      "Все ставки на месте! Видимо кто-то каждому пидору персонально хуй к экрану приставил 📲",
      "Ни одного забытого прогноза! Четыре пидора, четыре ставки. Математика для геев ✅",
      "Все поставили! Сегодня можно не материться... да ладно, пидоры вы всё равно 🌈",
      "Охуеть можно! Полный комплект прогнозов! Видимо угроза расстрела хуями работает 🔫🍆",
      "Пидоры, я горжусь! Все четверо зашли и поставили! Первый раз без позора. Слёзы радости текут 😭",
      "ВСЕ НА МЕСТЕ! Ни одного тормоза! Это исторический момент в жизни нашего гей-клуба 🏳️‍🌈🎉",
      "Прогнозы собраны! Ни один хуесос не забыл! Может зря я вас пидорами называю... нет, не зря 💅",
      "Четыре из четырёх! Стопроцентная явка пидоров! Запишите эту дату — такое бывает раз в жизни 📅",
      "Бля, все поставили и вовремя! Я начинаю подозревать что вы не настоящие пидоры а какие-то ответственные мужики 🤔",
      "Все прогнозы на месте! Вот что бывает когда пидорам угрожаешь публичным позором. Работает! 💪",
      "ПОЛНЫЙ СБОР! Ни одной пропущенной ставки! Пидоры, вы сегодня красавцы. Завтра опять будете говном, но сегодня — красавцы 🌟",
      "Ебать-копать, все четверо поставили! Без напоминаний! Я чуть хуй не уронил от удивления 😳",
      "Все ставки есть! Наконец-то! А то я уже устал вас, пидоров, каждый вечер тегать. Так держать, шлюхи! 👊",
    ];
    await sendMessage(pick(ALL_DONE));
  } else {
    // Group messages, max 3 per send
    for (let i = 0; i < messages.length; i += 3) {
      await sendMessage(messages.slice(i, i + 3).join("\n\n"));
    }
  }
}

// ============ DAILY SUMMARY (13:00 Tomsk) ============
async function checkLeaderboard() {
  const { data: teams } = await s.from("nba_teams").select("id, abbreviation");
  const tmap = new Map(teams.map((t) => [t.id, t.abbreviation]));
  const { data: lb } = await s.from("nba_leaderboard").select("user_id, total_points").order("total_points", { ascending: false });
  const { data: users } = await s.from("nba_users").select("id, display_name, name");
  const uname = (id) => TG_USERNAMES[id] || users.find((u) => u.id === id)?.display_name || "Аноним";
  if (!lb || lb.length < 2) return;

  // Yesterday's games by Tomsk date (UTC+7). Report runs at 06:00 UTC = 13:00 Tomsk.
  // "Yesterday Tomsk" = current UTC minus 7h for timezone, then minus 1 day
  const nowTomsk = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const yesterdayTomsk = new Date(nowTomsk);
  yesterdayTomsk.setDate(yesterdayTomsk.getDate() - 1);
  const yDate = yesterdayTomsk.toISOString().split("T")[0];
  // Games from yDate 00:00 UTC-7 (=17:00 UTC day before) to yDate+1 00:00 UTC-7
  const dayStart = new Date(`${yDate}T00:00:00+07:00`).toISOString();
  const dayEnd = new Date(new Date(`${yDate}T00:00:00+07:00`).getTime() + 24 * 60 * 60 * 1000).toISOString();
  const yesterday = dayStart;
  const { data: recentGames } = await s.from("nba_games").select("*")
    .eq("status", "finished").gte("game_date", dayStart).lte("game_date", dayEnd);

  // Get predictions for recent games
  const { data: preds } = recentGames?.length
    ? await s.from("nba_predictions").select("user_id, game_id, points_earned")
        .in("game_id", recentGames.map((g) => g.id))
    : { data: [] };

  // Per-user daily stats
  const top4Ids = lb.slice(0, 4).map((l) => l.user_id);
  const dailyStats = {};
  for (const uid of top4Ids) {
    const userPreds = (preds || []).filter((p) => p.user_id === uid);
    const correct = userPreds.filter((p) => p.points_earned > 0).length;
    const wrong = userPreds.filter((p) => p.points_earned === 0).length;
    const pts = userPreds.reduce((s, p) => s + (p.points_earned || 0), 0);
    dailyStats[uid] = { correct, wrong, total: correct + wrong, pts };
  }

  // Current streaks
  const { data: allPreds } = await s.from("nba_predictions").select("user_id, game_id, points_earned");
  const { data: finGames } = await s.from("nba_games").select("id, game_date").eq("status", "finished").order("game_date");
  const { data: allDP } = await s.from("nba_daily_picks")
    .select("user_id, points_earned, question:nba_daily_questions!nba_daily_picks_question_id_fkey(game_id, status)");

  const streaks = {};
  for (const uid of top4Ids) {
    const items = [];
    for (const p of (allPreds || []).filter((p) => p.user_id === uid)) {
      const g = finGames.find((g) => g.id === p.game_id);
      if (g) items.push({ date: g.game_date, correct: p.points_earned > 0 });
    }
    for (const dp of (allDP || []).filter((d) => d.user_id === uid)) {
      const q = dp.question;
      if (!q || q.status !== "resolved") continue;
      const g = finGames.find((g) => g.id === q.game_id);
      if (g) items.push({ date: g.game_date, correct: dp.points_earned > 0 });
    }
    items.sort((a, b) => a.date.localeCompare(b.date));
    let cur = 0;
    for (const i of items) { if (i.correct) cur++; else cur = 0; }
    streaks[uid] = cur;
  }

  // ====== BUILD MESSAGE ======
  const top4 = lb.slice(0, 4);
  let msg = "📊 <b>ДНЕВНОЙ ОТЧЁТ ПИДОРОВ</b>\n\n";

  // Leaderboard
  msg += "🏆 <b>Рейтинг:</b>\n";
  top4.forEach((entry, i) => {
    const medal = i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : "4️⃣";
    msg += `${medal} ${uname(entry.user_id)} — <b>${entry.total_points}</b> очков\n`;
  });

  // Daily questions resolved recently
  // Daily questions — include in per-user stats (no separate block)
  const recentGameIds = (recentGames || []).map((g) => g.id);
  const { data: resolvedDQ } = recentGameIds.length > 0
    ? await s.from("nba_daily_questions").select("id, game_id").eq("status", "resolved").in("game_id", recentGameIds)
    : { data: [] };
  const { data: allDailyPicks } = resolvedDQ && resolvedDQ.length > 0
    ? await s.from("nba_daily_picks").select("user_id, points_earned, question_id").in("question_id", resolvedDQ.map(q => q.id))
    : { data: [] };

  // Add daily picks to per-user daily stats
  for (const uid of top4Ids) {
    const dp = (allDailyPicks || []).filter(p => p.user_id === uid);
    const dpCorrect = dp.filter(p => p.points_earned > 0).length;
    const dpWrong = dp.filter(p => p.points_earned === 0).length;
    const dpPts = dp.reduce((s, p) => s + (p.points_earned || 0), 0);
    dailyStats[uid].correct += dpCorrect;
    dailyStats[uid].wrong += dpWrong;
    dailyStats[uid].total += dpCorrect + dpWrong;
    dailyStats[uid].pts += dpPts;
  }

  // Per-user roasts based on daily performance
  msg += "\n";
  const bestUid = top4Ids.reduce((a, b) => (dailyStats[a]?.pts || 0) >= (dailyStats[b]?.pts || 0) ? a : b);
  const worstUid = top4Ids.reduce((a, b) => (dailyStats[a]?.correct || 0) <= (dailyStats[b]?.correct || 0) ? a : b);

  for (const uid of top4Ids) {
    const st = dailyStats[uid] || { correct: 0, wrong: 0, total: 0, pts: 0 };
    const streak = streaks[uid] || 0;
    const name = uname(uid);

    if (st.total === 0) {
      msg += `${name} — вообще не играл. Видимо хуи пинал весь день 🍆\n`;
    } else if (st.correct === st.total && st.total >= 2) {
      msg += `${name} — ${st.correct}/${st.total} ВСЕ ВЕРНО! Ебать красавчик, не ожидал от такого пидора 🔥\n`;
    } else if (st.correct === 0) {
      msg += `${name} — ${st.correct}/${st.total} всё мимо! Гнойный пидр, ни одного верного. Иди нахуй 💩\n`;
    } else if (uid === bestUid && st.pts > 0) {
      msg += `${name} — ${st.correct}/${st.total} (+${st.pts}). Лучший пидор дня! Красавчик, хуле 💪\n`;
    } else if (uid === worstUid) {
      msg += `${name} — ${st.correct}/${st.total}. Самый тупой пидор дня. Позорище 🤮\n`;
    } else {
      msg += `${name} — ${st.correct}/${st.total} (+${st.pts}). Серединка на половинку, как всегда 😐\n`;
    }

    // Streak commentary
    if (streak >= 7) {
      msg += `  🔥🔥🔥 СТРИК ${streak}! МАШИНА! Даже для пидора это ахуенно!\n`;
    } else if (streak >= 5) {
      msg += `  🔥🔥 Стрик ${streak}! Неплохо для гомосека!\n`;
    } else if (streak >= 3) {
      msg += `  🔥 Стрик ${streak}. Потянуло на бонусы, пидрила!\n`;
    }
  }

  // Check for exact series score predictions
  const { data: seriesBonuses } = await s.from("nba_series_bonuses").select("user_id, series_id, bonus_type, points")
    .eq("bonus_type", "series_exact");
  if (seriesBonuses && seriesBonuses.length > 0) {
    const { data: allSeries } = await s.from("nba_series").select("*");
    const EXACT_ROASTS = [
      (name, sr) => `ЕБАТЬ!!! ${name} угадал ТОЧНЫЙ СЧЁТ серии ${sr}!!! Это вообще как?! Пидор-экстрасенс! 🔮🏆`,
      (name, sr) => `Ни хуя себе! ${name} попал в точный счёт ${sr}! У этого пидора третий глаз на жопе! 👁️🍑`,
      (name, sr) => `СЕНСАЦИЯ! ${name} — точный счёт серии ${sr}! Остальные пидоры нервно курят в сторонке 🚬`,
      (name, sr) => `Бля, ${name} РЕАЛЬНО угадал счёт ${sr}! Я в ахуе! Этот гомосек — ёбаный Нострадамус! 🧙‍♂️`,
      (name, sr) => `ТОЧНЫЙ СЧЁТ! ${name} разъебал серию ${sr}! Пидор-снайпер! Остальные — жалкие дилетанты! 🎯`,
      (name, sr) => `Ох-у-еть! ${name} и точный счёт ${sr}! Даже не верится что такой пидор может быть таким умным! 🧠`,
      (name, sr) => `${name} УГАДАЛ СЧЁТ ${sr}! Пидорский гений! Мамка бы гордилась, если бы знала чем ты тут занимаешься! 👨‍🎓`,
      (name, sr) => `БОМБА! Точный счёт серии ${sr} от ${name}! Этот пидор либо из будущего, либо сосёт у баскетбольного бога! 🏀✨`,
      (name, sr) => `${name} — ТОЧНЫЙ СЧЁТ ${sr}!!! Жирнейший бонус! Пока остальные пидоры гадают, этот уже знает! 💰`,
      (name, sr) => `Невероятно! ${name} попал в яблочко — ${sr} точный счёт! Пидор года! Нет, пидор десятилетия! 🏅`,
    ];
    const shuffledRoasts = pickUnique(EXACT_ROASTS, seriesBonuses.length);
    seriesBonuses.forEach((b, i) => {
      const sr = allSeries?.find((x) => x.id === b.series_id);
      if (!sr) return;
      const srText = `${tmap.get(sr.team_home_id)} ${sr.home_wins}-${sr.away_wins} ${tmap.get(sr.team_away_id)}`;
      const roastFn = shuffledRoasts[i] || pick(EXACT_ROASTS);
      msg += `\n${roastFn(uname(b.user_id), srText)}`;
    });
  }

  // Tight races
  for (let i = 0; i < top4.length - 1; i++) {
    const diff = top4[i].total_points - top4[i + 1].total_points;
    if (diff <= 2 && diff > 0) {
      msg += `\n⚡ ${uname(top4[i].user_id)} впереди ${uname(top4[i + 1].user_id)} на ${diff}! Один промах и тебя нагнут!`;
    }
    if (diff === 0) {
      msg += `\n⚡ ${uname(top4[i].user_id)} и ${uname(top4[i + 1].user_id)} наравне! Пидорская битва за место!`;
    }
  }

  await sendMessage(msg);
}

// ============ NEW DAILY QUESTION ALERT ============
const DAILY_ALERTS = [
  (q) => `🚨 ВНИМАНИЕ ПИДОРЫ! Новая ставка дня: ${q}! Бегом ставить, а то опять проебётесь как обычно! 🏃‍♂️`,
  (q) => `⚡ СТАВКА ДНЯ ПОЯВИЛАСЬ: ${q}! Шевелите своими гейскими жопами и голосуйте, пидрилы! 🗳️`,
  (q) => `🔔 Эй, пидоры! Новый вопрос дня: ${q}! Кто не поставит — получит хуем по рейтингу! 📉`,
  (q) => `❓ ВОПРОС ДНЯ: ${q}! Не проебите, гомосеки! Последний раз половина забыла. Не будьте как они! 🧠`,
  (q) => `🏀 Ставка дня на месте: ${q}! Всем пидорам срочно зайти и проголосовать! Это приказ! 🫡`,
  (q) => `💥 НОВАЯ СТАВКА ДНЯ! ${q}! Пидоры, хорош дрочить, зайдите на сайт и поставьте! Это займёт 5 секунд! ⏱️`,
  (q) => `📢 АЛЯРМ! Ставка дня: ${q}! Если не поставишь — ты официально самый ленивый пидор турнира! 🏳️‍🌈`,
  (q) => `🎯 Вопрос дня добавлен: ${q}! Все четыре пидора обязаны поставить! Кто забудет — тому пиздец! 💀`,
  (q) => `⭐ СТАВКА ДНЯ! ${q}! Не будь тем пидором который утром ноет "а я не видел". Ставь сейчас! 😤`,
  (q) => `🚀 Вопрос дня залетел: ${q}! Пидоры, у вас есть время до матча. Не просрите, как обычно! 💨`,
  (q) => `📣 ЭЙ! СТАВКА ДНЯ: ${q}! Я знаю вы читаете, ленивые пидрилы! Зайдите и поставьте! СЕЙЧАС! 👆`,
  (q) => `🔥 Горячая ставка дня: ${q}! Кто первый поставит — тот альфа-пидор! Кто последний — петух! 🐓`,
  (q) => `💣 БОМБА! Новый вопрос: ${q}! Пидоры, не тупите! Зайти, нажать, выбрать. Даже гомосек справится! 🧩`,
  (q) => `🎰 Ставка дня ждёт вас, пидоры: ${q}! Кто проебёт — тому потом не жаловаться! Я предупредил! ⚠️`,
  (q) => `🏳️‍🌈 ВНИМАНИЕ ГЕЙ-КЛУБ! Вопрос дня: ${q}! Всем срочно на сайт! Последний пидор ставит — тот мойщик! 🧹`,
];

async function checkNewDailyQuestions() {
  const { data: teams } = await s.from("nba_teams").select("id, abbreviation");
  const tmap = new Map(teams.map((t) => [t.id, t.abbreviation]));

  // Find active questions created in last 45 minutes that haven't been announced
  const cutoff = new Date(Date.now() - 45 * 60 * 1000).toISOString();
  const { data: questions } = await s.from("nba_daily_questions")
    .select("*, game:nba_games!nba_daily_questions_game_id_fkey(home_team_id, away_team_id)")
    .eq("status", "active")
    .gte("created_at", cutoff);

  if (!questions || questions.length === 0) return;

  // Check which ones we already announced (use nba_game_id field trick: set a flag)
  // Simpler: check if ANY picks exist — if someone already answered, it's been up a while
  for (const q of questions) {
    const { count } = await s.from("nba_daily_picks").select("id", { count: "exact", head: true }).eq("question_id", q.id);
    // If no picks yet and question is fresh (< 45 min), announce it
    if ((count || 0) <= 1) {
      const game = q.game;
      const match = game ? `${tmap.get(game.home_team_id)}-${tmap.get(game.away_team_id)}` : "";
      const CATEGORY_NAMES = {
        points: "кто больше забьёт очков",
        threes: "кто больше забьёт трёшек",
        assists: "кто больше сделает передач",
        rebounds: "кто больше соберёт подборов",
        total: "тотал матча",
        steals: "кто больше сделает перехватов",
        blocks: "кто больше сделает блоков",
      };
      const catName = CATEGORY_NAMES[q.category] || q.category;
      const desc = `${catName} ${match}`;
      await sendMessage(pick(DAILY_ALERTS)(desc));
    }
  }
}

// ============ MAIN ============
async function main() {
  const mode = process.argv[2] || "missed";

  if (mode === "missed") {
    await checkMissedPredictions();
  } else if (mode === "leaderboard") {
    await checkLeaderboard();
  } else if (mode === "daily") {
    await checkNewDailyQuestions();
  } else if (mode === "test") {
    await sendMessage("🏳️‍🌈 Гей Предсказатель активирован! Теперь никто не спрячется от прогнозов 💅");
  } else {
    console.log("Usage: node telegram-bot.js [missed|leaderboard|daily|test]");
  }
}

main().catch(console.error);
