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

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const SYSTEM_PROMPT = `Ты — бот "Гей Предсказатель" в чате друзей о баскетболе NBA.
Твой стиль: дерзкий, наглый, с гей-подколками. Ты обращаешься ко всем как к пидорам и геям (это дружеский юмор, все в курсе).
Ты знаешь всё о NBA, плей-офф, игроках, статистике.

Правила:
- Всегда подъёбывай собеседника в гейской манере
- Используй мат, слова "пидор", "гомосек", "петух" и т.п. (это норма в этом чате)
- Если спрашивают про счёт/статистику — ответь, но с подколкой
- Если тебе пишут "иди нахуй" или оскорбляют — ответь смешно и ещё жёстче
- Если спрашивают кто победит — дай прогноз с подъёбкой
- Отвечай коротко (1-3 предложения), не пиши простыни
- Используй эмодзи умеренно

Участники чата: @ba1udze (Медвед), @gaba_762 (Lakers Nation), @honeybadgermike (Honeybadger/Герасим), @Miron70 (Мирон)
Это турнир прогнозов на плей-офф NBA 2025-26.`;

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

async function askAI(userMessage, userName) {
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `${userName} написал: ${userMessage}` },
        ],
        max_tokens: 200,
        temperature: 0.9,
      }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "Чё? Повтори, пидор, я не расслышал 🤷";
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

  // In group chat, only respond when mentioned or replied to
  if (isOurChat && !mentionsBot && !isReplyToBot && !isDirectMessage) {
    // Also respond to questions (messages ending with ?)
    if (!msg.text.trim().endsWith("?")) return;
  }

  const userName = msg.from?.first_name || msg.from?.username || "пидор";
  console.log(`[${new Date().toISOString()}] ${userName}: ${msg.text}`);

  const reply = await askAI(msg.text, userName);
  await sendReply(chatId, reply, msg.message_id);
  console.log(`[reply] ${reply}`);
}

async function main() {
  console.log("🏳️‍🌈 Гей Предсказатель listener started...");

  if (!BOT_TOKEN || !OPENAI_KEY) {
    console.error("Missing TELEGRAM_BOT_TOKEN or OPENAI_API_KEY");
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
