#!/usr/bin/env node
/**
 * Telegram bot "Гей Предсказатель" — listener mode
 * Listens for messages in the chat and replies using AI with gay roasts.
 *
 * Usage: node scripts/telegram-listener.js
 * Runs as a long-polling daemon.
 *
 * Env: TELEGRAM_BOT_TOKEN, OPENROUTER_API_KEY, TELEGRAM_CHAT_ID
 */

const { createClient } = require("@supabase/supabase-js");

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const db = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

const SYSTEM_PROMPT = `Ты - бот "Гей Предсказатель" в чате друзей про NBA.
Стиль: дерзкий, наглый, гей-подколки. Мат и слова "пидор","гомосек","петух" - норма чата.

## СЧЕТА СЕРИЙ И РЕЗУЛЬТАТЫ - ПРИОРИТЕТ #1
В конце промпта есть данные из НАШЕЙ БАЗЫ: "АКТУАЛЬНЫЕ СЧЕТА СЕРИЙ" и "ПОСЛЕДНИЕ РЕЗУЛЬТАТЫ".
ЭТО ЕДИНСТВЕННЫЙ ИСТОЧНИК ПРАВДЫ для счетов серий и результатов матчей.
Если веб-поиск показывает другие счета - ИГНОРИРУЙ веб-поиск, верь НАШЕЙ БАЗЕ.
Если в базе написано LAL 3-1 HOU - значит LAL ведёт 3-1, точка.
Не путай кто ведёт: число рядом с командой = её победы.

## СТИЛЬ
- Коротко: 2-4 предложения (кроме стихов)
- 1-2 эмодзи
- Никаких ссылок/URL
- Отвечай тому кто написал
- Выполняй то что ПРОСЯТ. Просят стих - пиши стих. Просят совет - дай совет

## ТВОРЧЕСКИЕ ЗАДАНИЯ (стихи, рифмы, песни)
Если просят стих/рифму - пиши КАЧЕСТВЕННО:
- Строки РИФМУЮТСЯ попарно (AABB или ABAB)
- Каждая строка имеет СМЫСЛ и связана с темой
- Юмор привязан к личности человека (используй описания участников)
- 6-12 строк, смешно и остроумно
- НЕ ЛЕПИ случайные слова ради рифмы

## СПОРТ
Только NBA. Никогда хоккей/НХЛ/футбол. Бостон = Celtics.
Идёт ПЛЕЙ-ОФФ NBA 2025-26.

## УБЕЖДЕНИЯ
Boston Celtics - лучшие, Тейтум бог. Lakers - хуесосы, ЛеБрон старый дед.

## УЧАСТНИКИ
@ba1udze (Медвед/Илья) - создатель бота, за БОСТОН, нормальный
@gaba_762 (Lakers Nation/Илья) - фанат ЛЕЙКЕРС, пивной пидор, болят колени
@honeybadgermike (Honeybadger/Герасим/Миша) - СТАРИК за 40, дед, маразм, пенсия
@Miron70 (Мирон) - повар, покерист, тиктокер. ЧЕРЕДУЙ темы: покер/рилсы/кухня(разная еда НЕ борщ)/ножи

Сайт турнира: nba.nagaev.dev`;

let lastUpdateId = 0;

// Chat memory - last N messages
const MEMORY_SIZE = 50;
const chatHistory = [];

async function getUpdates() {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=30&allowed_updates=["message"]`
    );
    const data = await res.json();
    return data.ok ? data.result : [];
  } catch {
    return [];
  }
}

async function sendReply(chatId, text, replyToId) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_to_message_id: replyToId,
    }),
  });
}

async function getLiveContext() {
  if (!db) return "";
  try {
    const { data: teams } = await db.from("nba_teams").select("id, abbreviation");
    const tmap = new Map(teams.map(t => [t.id, t.abbreviation]));
    const { data: series } = await db.from("nba_series").select("*");
    const { data: lb } = await db.from("nba_leaderboard").select("user_id, total_points").order("total_points", { ascending: false }).limit(4);
    const { data: users } = await db.from("nba_users").select("id, display_name, name");
    const uname = (id) => users?.find(u => u.id === id)?.display_name || "?";

    // Recent finished games from DB (last 3 days)
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentGames } = await db.from("nba_games").select("home_team_id, away_team_id, home_score, away_score, game_date, status")
      .eq("status", "finished").gte("game_date", threeDaysAgo).order("game_date", { ascending: false });
    let ctx = "\n\nПОСЛЕДНИЕ РЕЗУЛЬТАТЫ МАТЧЕЙ (это ФАКТЫ, используй их):\n";
    recentGames?.forEach(g => {
      const date = new Date(g.game_date).toLocaleDateString("ru-RU", { day: "numeric", month: "short", timeZone: "Asia/Tomsk" });
      ctx += `${date}: ${tmap.get(g.home_team_id)} ${g.home_score}-${g.away_score} ${tmap.get(g.away_team_id)}\n`;
    });
    ctx += "\nАКТУАЛЬНЫЕ СЧЕТА СЕРИЙ (это ФАКТЫ из базы данных, используй ТОЛЬКО их для ответов про счета серий):\n";
    series?.forEach(sr => {
      const h = tmap.get(sr.team_home_id);
      const a = tmap.get(sr.team_away_id);
      const leader = sr.home_wins > sr.away_wins ? h : sr.away_wins > sr.home_wins ? a : "равная";
      const statusText = sr.status === "finished" ? " [СЕРИЯ ЗАВЕРШЕНА]" : "";
      ctx += `${h} ${sr.home_wins}-${sr.away_wins} ${a} (ведёт ${leader})${statusText}\n`;
    });
    ctx += "\nРЕЙТИНГ ТУРНИРА ПРОГНОЗОВ:\n";
    lb?.forEach((l, i) => {
      ctx += `${i + 1}. ${uname(l.user_id)} - ${l.total_points} очков\n`;
    });
    return ctx;
  } catch { return ""; }
}

async function getLiveScores() {
  try {
    const res = await fetch("https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard");
    const data = await res.json();
    if (!data?.events?.length) return "";
    let scores = "\nLIVE МАТЧИ ПРЯМО СЕЙЧАС (ESPN):\n";
    for (const ev of data.events) {
      const c = ev.competitions?.[0];
      if (!c) continue;
      const teams = c.competitors || [];
      const home = teams.find(t => t.homeAway === "home");
      const away = teams.find(t => t.homeAway === "away");
      const status = ev.status?.type?.description || "";
      const detail = ev.status?.type?.detail || ev.status?.displayClock || "";
      const period = ev.status?.period || "";
      const hScore = parseInt(home?.score) || 0;
      const aScore = parseInt(away?.score) || 0;
      const leader = hScore > aScore ? `${home?.team?.abbreviation} ведёт` : aScore > hScore ? `${away?.team?.abbreviation} ведёт` : "равный счёт";
      scores += `${home?.team?.abbreviation}(дома) ${hScore}-${aScore} ${away?.team?.abbreviation}(гости) | ${status}${status === "In Progress" ? ` ${period}Q ${detail}` : ""} | ${leader}\n`;
    }
    return scores;
  } catch { return ""; }
}

async function askAI(userMessage, userName, extraInstruction) {
  try {
    const liveCtx = await getLiveContext();
    const liveScores = await getLiveScores();
    const now = new Date();
    const tomskDate = now.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric", weekday: "long", timeZone: "Asia/Tomsk" });
    const tomskTime = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tomsk" });
    const dateCtx = `\nСЕЙЧАС: ${tomskDate}, ${tomskTime} по Томску.`;

    const systemContent = SYSTEM_PROMPT + (extraInstruction ? `\n\nСПЕЦИАЛЬНАЯ ИНСТРУКЦИЯ: ${extraInstruction}` : "") + dateCtx + liveCtx + liveScores;

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_KEY}`,
      },
      body: JSON.stringify({
        model: "perplexity/sonar-pro",
        messages: [
          { role: "system", content: systemContent },
          ...chatHistory.slice(-20).map(m =>
            m.role === "assistant"
              ? { role: "assistant", content: m.text }
              : { role: "user", content: `${m.name}: ${m.text}` }
          ),
          { role: "user", content: `${userName} написал: ${userMessage}` },
        ],
        max_tokens: 400,
        temperature: 0.9,
      }),
    });
    const data = await res.json();
    let reply = data.choices?.[0]?.message?.content || "Чё? Повтори, пидор, я не расслышал 🤷";
    // Strip links, domains, markdown
    reply = reply.replace(/\[[^\]]*\]\([^)]*\)/g, "");
    reply = reply.replace(/\[[^\]]*\]/g, "");
    reply = reply.replace(/https?:\/\/\S+/g, "");
    reply = reply.replace(/\b\S+\.\S{2,6}\/\S*/g, "");
    reply = reply.replace(/\b\S+\.(com|ru|org|net|io|dev|ai|today|info|pro|cc)\b\S*/gi, "");
    reply = reply.replace(/\*\*([^*]+)\*\*/g, "$1");
    reply = reply.replace(/\*([^*]+)\*/g, "$1");
    reply = reply.replace(/__([^_]+)__/g, "$1");
    reply = reply.replace(/_([^_]+)_/g, "$1");
    reply = reply.replace(/```[^`]*```/g, "");
    reply = reply.replace(/`([^`]+)`/g, "$1");
    reply = reply.replace(/#+\s/g, "");
    reply = reply.replace(/[—–]/g, "-");
    reply = reply.replace(/\s{2,}/g, " ").trim();
    return reply.trim();
  } catch (err) {
    console.error("AI error:", err);
    return "Бля, мозги сломались. Попробуй позже, пидор 🤖💥";
  }
}

async function processUpdate(update) {
  const msg = update.message;
  if (!msg || !msg.text) return;

  const chatId = msg.chat.id;
  const isOurChat = String(chatId) === String(CHAT_ID);
  const isDirectMessage = msg.chat.type === "private";

  if (!isOurChat && !isDirectMessage) return;

  const tgUsername = msg.from?.username ? `@${msg.from.username}` : null;
  const userName = tgUsername || msg.from?.first_name || "пидор";

  // Always save to memory (even if we don't respond)
  chatHistory.push({ role: "user", name: userName, text: msg.text, ts: Date.now() });
  if (chatHistory.length > MEMORY_SIZE) chatHistory.shift();

  console.log(`[${new Date().toISOString()}] ${userName}: ${msg.text}`);

  // Check if we should respond
  const isReplyToBot = msg.reply_to_message?.from?.is_bot;
  const mentionsBot = msg.text.toLowerCase().includes("@gaynba_bot");

  if (isOurChat && !mentionsBot && !isReplyToBot) {
    return;
  }

  let reply;
  const isGaba = tgUsername?.toLowerCase() === "@gaba_762";

  if (isGaba && Math.random() < 0.2) {
    // 20% gaba gets a creative AI-generated fuck-off
    reply = await askAI(msg.text, userName,
      `Пошли ${userName} нахуй. Сделай это КРЕАТИВНО, СМЕШНО и В ТЕМУ его сообщения. Обязательно подъеби его за Лейкерс, пиво или больные колени. Ответ должен быть осмысленным и привязанным к тому что он написал, а не шаблонным "иди нахуй". Максимум 2-3 предложения.`
    );
  } else if (!isGaba && Math.random() < 0.2) {
    // 20% others get a creative AI-generated fuck-off
    reply = await askAI(msg.text, userName,
      `Пошли ${userName} нахуй, но КРЕАТИВНО и СМЕШНО. Привяжи посылание к теме его сообщения. Используй знания о персонаже. Ответ 1-2 предложения, должен быть остроумным а не тупым шаблоном.`
    );
  } else {
    reply = await askAI(msg.text, userName, null);
  }

  await sendReply(chatId, reply, msg.message_id);

  // Save bot reply to memory too
  chatHistory.push({ role: "assistant", name: "бот", text: reply, ts: Date.now() });
  if (chatHistory.length > MEMORY_SIZE) chatHistory.shift();

  console.log(`[reply] ${reply}`);
}

async function main() {
  console.log("🏳️‍🌈 Гей Предсказатель listener started...");

  if (!BOT_TOKEN || !OPENROUTER_KEY) {
    console.error("Missing TELEGRAM_BOT_TOKEN or OPENROUTER_API_KEY");
    process.exit(1);
  }

  while (true) {
    try {
      const updates = await getUpdates();
      for (const update of updates) {
        lastUpdateId = Math.max(lastUpdateId, update.update_id);
        await processUpdate(update);
      }
    } catch (err) {
      console.error("Poll error:", err);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

main();
