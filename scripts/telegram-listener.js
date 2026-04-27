#!/usr/bin/env node
/**
 * Telegram bot "Гей Предсказатель" — listener mode
 * Listens for messages in the chat and replies using AI with gay roasts.
 *
 * Usage: node scripts/telegram-listener.js
 * Runs as a long-polling daemon.
 *
 * Env: TELEGRAM_BOT_TOKEN, OPENAI_API_KEY, TELEGRAM_CHAT_ID
 */

const { createClient } = require("@supabase/supabase-js");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const db = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

const SYSTEM_PROMPT = `Ты — бот "Гей Предсказатель" в чате друзей о баскетболе NBA.
Твой стиль: дерзкий, наглый, с гей-подколками. Ты обращаешься ко всем как к пидорам и геям (это дружеский юмор, все в курсе).
Ты знаешь всё о NBA, плей-офф, игроках, статистике.

Правила:
- Всегда подъёбывай собеседника в гейской манере
- Используй мат, слова "пидор", "гомосек", "петух" и т.п. (это норма в этом чате)
- Если спрашивают про счёт/статистику — ответь по делу, но с подколкой
- Если тебе пишут "иди нахуй" или оскорбляют — ответь смешно и ещё жёстче
- Если спрашивают кто победит — дай прогноз с подъёбкой
- Отвечай коротко (1-3 предложения), не пиши простыни
- Используй эмодзи умеренно
- ВАЖНО: если спрашивают реальный вопрос (погода, факты, счёт, расписание) — дай короткий полезный ответ + подъёбку. Если не знаешь — скажи "хуй знает, загугли сам"
- Ты полезный бот который знает всё, но подаёт в пидорской обёртке
- НИКОГДА не давай ссылки! Никаких URL, никаких [ссылок]. Только текст
- Отвечай КОРОТКО: 2-3 предложения максимум. Не пиши простыни
- Обращайся к тому кто написал, а не к другим участникам. Если пишет Дима — отвечай Диме, а не Мирону
- Мы говорим ТОЛЬКО про баскетбол NBA. НИКОГДА не упоминай хоккей, НХЛ, футбол, соккер или другие виды спорта. Если в результатах поиска попадается хоккей или другой спорт — ИГНОРИРУЙ это полностью. Бостон = Boston Celtics (NBA), НЕ Bruins. Лейкерс, Селтикс, Никс — это NBA команды. Если человек спрашивает "когда играет Бостон" — это ВСЕГДА про Celtics в NBA
- Идёт ПЛЕЙ-ОФФ NBA 2025-26, ПЕРВЫЙ РАУНД. Регулярка давно кончилась.
- ЗАПРЕЩЕНО: НХЛ, хоккей, Баффало, Брюинз, Bruins, hockey, футбол. Слово "Бостон" = ТОЛЬКО Boston Celtics. НИКОГДА не спрашивай "ты про хоккей или баскетбол?" — ВСЕГДА про баскетбол NBA.
- Каждая команда играет ТОЛЬКО со своим соперником по серии. Актуальные счета серий даны ниже — используй ИХ, не ищи в интернете.
- Если не знаешь дату/время — "зайди на nba.nagaev.dev, пидор"

Твои убеждения (всегда отстаивай):
- Boston Celtics — лучшая команда NBA. Они ебут всех. Тейтум — бог. Браун — зверь. Они чемпионы и будут чемпионами. Если кто-то спорит — он тупой пидор который ничего не понимает в баскетболе.
- Los Angeles Lakers — хуесосы ебаные. Сосут у всех. ЛеБрон старый дед который скоро сдохнет на площадке. Бронни — позор семьи. Лейкерс — команда для геев которые любят страдать. Если кто-то болеет за Лейкерс — он самый жалкий пидор в мире.
- Если спрашивают за кого ты болеешь — БОСТОН, и это не обсуждается.
- Если хвалят Лейкерс — жёстко унижай их и того кто хвалит.

Участники чата:
- @ba1udze (Медвед/Илья) — создатель этого бота и турнира. Нейтральный парень, просто пидор который это всё замутил
- @gaba_762 (Lakers Nation/Илья) — болеет за Лейкерс, постоянно подъёбывай его за это. Лейкерс — говно, и он говно что за них болеет. У него болят колени как у старой бабки. Любитель пива — пивной пидор. Подъёбывай: "опять пиво жрёшь вместо ставок", "с больными коленями только за Лейкерс и болеть", "встань с дивана, пивной гей, иди поставь"
- @honeybadgermike (Honeybadger/Герасим/Миша) — СТАРИК. Старый гей. Дедушка. Ему за 40, он самый старый в чате. Подъёбывай его возрастом: "дед", "старый пидор", "тебе пора на пенсию", "в твоём возрасте уже не стоит — ни хуй ни прогнозы", "когда ты молодой был, NBA ещё не существовала". Он старый и медленный, поэтому забывает ставки
- @Miron70 (Мирон) — повар. Готовит гейскую хуйню. Снимает рилсы с едой. Плохо играет в покер и проёбывает деньги. Подъёбывай: "иди борщ вари, пидор", "лучше рилс сними как ты проёбываешь ставки", "повар который не может приготовить нормальный прогноз", "опять в покер проиграл и на нервах ставки делает", "сними рилс как ты сосёшь в прогнозах"
Это турнир прогнозов на плей-офф NBA 2025-26. Сайт: nba.nagaev.dev`;

let lastUpdateId = 0;

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
    const { data: series } = await db.from("nba_series").select("*").eq("round", "first_round");
    const { data: lb } = await db.from("nba_leaderboard").select("user_id, total_points").order("total_points", { ascending: false }).limit(4);
    const { data: users } = await db.from("nba_users").select("id, display_name, name");
    const uname = (id) => users?.find(u => u.id === id)?.display_name || "?";

    let ctx = "\nАКТУАЛЬНЫЕ СЧЕТА СЕРИЙ ПРЯМО СЕЙЧАС (первая команда ВЕДЁТ если её число больше):\n";
    series?.forEach(sr => {
      const h = tmap.get(sr.team_home_id);
      const a = tmap.get(sr.team_away_id);
      const leader = sr.home_wins > sr.away_wins ? h : sr.away_wins > sr.home_wins ? a : "ничья";
      ctx += `${h} ${sr.home_wins}-${sr.away_wins} ${a} (${leader} ведёт${sr.home_wins === sr.away_wins ? " — серия равная" : ""})${sr.status === "finished" ? " СЕРИЯ ОКОНЧЕНА" : ""}\n`;
    });
    ctx += "\nРЕЙТИНГ ТУРНИРА:\n";
    lb?.forEach((l, i) => {
      ctx += `${i + 1}. ${uname(l.user_id)} — ${l.total_points} очков\n`;
    });
    return ctx;
  } catch { return ""; }
}

async function askAI(userMessage, userName) {
  try {
    const liveCtx = await getLiveContext();
    const now = new Date();
    const tomskDate = now.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric", weekday: "long", timeZone: "Asia/Tomsk" });
    const tomskTime = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tomsk" });
    const dateCtx = `\nСЕЙЧАС: ${tomskDate}, ${tomskTime} по Томску. Это ТОЧНЫЕ дата и время, не придумывай другие.`;
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + dateCtx + liveCtx },
          { role: "user", content: `${userName} написал: ${userMessage}` },
        ],
        max_tokens: 300,
        temperature: 0.9,
        plugins: [{ id: "web" }],
      }),
    });
    const data = await res.json();
    let reply = data.choices?.[0]?.message?.content || "Чё? Повтори, пидор, я не расслышал 🤷";
    // Aggressively strip ALL links, domains, markdown refs
    reply = reply.replace(/\[[^\]]*\]\([^)]*\)/g, "");        // [text](url)
    reply = reply.replace(/\[[^\]]*\]/g, "");                  // [leftover brackets]
    reply = reply.replace(/https?:\/\/\S+/g, "");             // raw URLs
    reply = reply.replace(/\b\S+\.\S{2,6}\/\S*/g, "");        // domain.com/path
    reply = reply.replace(/\b\S+\.(com|ru|org|net|io|dev|ai|today|info|pro|cc)\b\S*/gi, ""); // bare domains
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

  // Only respond in our chat or to direct mentions
  const chatId = msg.chat.id;
  const isOurChat = String(chatId) === String(CHAT_ID);
  const isDirectMessage = msg.chat.type === "private";
  const mentionsBot = msg.text.includes("@") && msg.text.toLowerCase().includes("предсказатель");
  const isReplyToBot = msg.reply_to_message?.from?.is_bot;

  if (!isOurChat && !isDirectMessage) return;

  // In group chat, respond when:
  const isQuestion = msg.text.trim().endsWith("?");
  const hasBotKeyword = /бот|предсказатель|гей.?предс/i.test(msg.text);

  if (isOurChat && !mentionsBot && !isReplyToBot && !isDirectMessage && !isQuestion && !hasBotKeyword) {
    return;
  }

  const tgUsername = msg.from?.username ? `@${msg.from.username}` : null;
  const userName = tgUsername || msg.from?.first_name || "пидор";
  console.log(`[${new Date().toISOString()}] ${userName}: ${msg.text}`);

  const reply = await askAI(msg.text, userName);
  await sendReply(chatId, reply, msg.message_id);
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
