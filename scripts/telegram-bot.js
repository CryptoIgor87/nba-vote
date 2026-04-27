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
    const ALL_DONE = [
      "Охуеть, все поставили! Ни одного ленивого пидора сегодня. Чудо блять 🌈✅",
      "Все четыре пидраса сделали прогнозы! Видимо наконец вытащили хуи из рук и зашли на сайт 👏",
      "Ставки сделаны! Все на месте, ни один гомосек не забыл. Отмечаем это событие! 🍾",
      "Вау, все поставили! Может вы не такие тупые пидоры как я думал? Хотя нет, просто повезло 🎰",
      "Прогнозы на месте! Ни одной ленивой пидорской жопы сегодня. Горжусь вами, шлюхи 💕",
    ];
    await sendMessage(pick(ALL_DONE));
  } else {
    // Group messages, max 3 per send
    for (let i = 0; i < messages.length; i += 3) {
      await sendMessage(messages.slice(i, i + 3).join("\n\n"));
    }
  }
}

// ============ LEADERBOARD CHANGES ============
async function checkLeaderboard() {
  // Current leaderboard
  const { data: lb } = await s.from("nba_leaderboard").select("user_id, total_points").order("total_points", { ascending: false });
  const { data: users } = await s.from("nba_users").select("id, display_name, name");
  const uname = (id) => TG_USERNAMES[id] || users.find((u) => u.id === id)?.display_name || "Аноним";

  if (!lb || lb.length < 2) return;

  // Check if top positions are close or changed (send summary)
  const top4 = lb.slice(0, 4);
  let msg = "🏆 <b>Рейтинг после вчерашних матчей:</b>\n\n";
  top4.forEach((entry, i) => {
    const medal = i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : "4️⃣";
    msg += `${medal} <b>${uname(entry.user_id)}</b> — ${entry.total_points} очков\n`;
  });

  // Check tight races
  for (let i = 0; i < top4.length - 1; i++) {
    const diff = top4[i].total_points - top4[i + 1].total_points;
    if (diff <= 2 && diff > 0) {
      msg += `\n🔥 ${uname(top4[i].user_id)} опережает ${uname(top4[i + 1].user_id)} всего на ${diff}! Один промах и тебя выебут, пидор!`;
    }
    if (diff === 0) {
      msg += `\n⚡ ${uname(top4[i].user_id)} и ${uname(top4[i + 1].user_id)} наравне! Кто кого нагнёт первым? Пидорская интрига! 🍆`;
    }
  }

  await sendMessage(msg);
}

// ============ MAIN ============
async function main() {
  const mode = process.argv[2] || "missed";

  if (mode === "missed") {
    await checkMissedPredictions();
  } else if (mode === "leaderboard") {
    await checkLeaderboard();
  } else if (mode === "test") {
    await sendMessage("🏳️‍🌈 Гей Предсказатель активирован! Теперь никто не спрячется от прогнозов 💅");
  } else {
    console.log("Usage: node telegram-bot.js [missed|leaderboard|test]");
  }
}

main().catch(console.error);
