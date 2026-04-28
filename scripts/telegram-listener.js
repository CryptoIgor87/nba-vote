#!/usr/bin/env node
/**
 * Telegram bot "Гей Предсказатель" v2 — listener daemon
 * Smart memory + selective context + model routing
 *
 * Usage: node scripts/telegram-listener.js
 * Env: TELEGRAM_BOT_TOKEN, OPENROUTER_API_KEY, TELEGRAM_CHAT_ID,
 *      SUPABASE_URL, SUPABASE_SERVICE_KEY
 */

const { createClient } = require("@supabase/supabase-js");
const memory = require("./bot/memory");
const userNotes = require("./bot/user-notes");
const contextManager = require("./bot/context-manager");
const { classify } = require("./bot/intent-detector");
const { ask, generateSummary } = require("./bot/ai-router");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Init Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const db = SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

memory.init(db);
userNotes.init(db);
contextManager.init(db);

let lastUpdateId = 0;

// --- Telegram API ---

async function getUpdates() {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=30&allowed_updates=["message"]`
    );
    const data = await res.json();
    return data.ok ? data.result : [];
  } catch { return []; }
}

async function sendReply(chatId, text, replyToId) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, reply_to_message_id: replyToId }),
  });
}

// --- Summary generation (async, non-blocking) ---

async function maybeSummarize(chatId) {
  try {
    const needed = await memory.checkSummaryNeeded(chatId);
    if (!needed) return;

    const msgs = await memory.getUnsummarizedMessages(chatId);
    if (msgs.length < 10) return;

    console.log(`[summary] generating for ${msgs.length} messages...`);
    const summary = await generateSummary(msgs);
    if (!summary) return;

    await memory.storeSummary(
      chatId,
      summary,
      msgs[0].id,
      msgs[msgs.length - 1].id,
      msgs.length
    );
    console.log(`[summary] stored: ${summary.slice(0, 80)}...`);
  } catch (err) {
    console.error("[summary] error:", err.message);
  }
}

// --- Main message handler ---

async function processUpdate(update) {
  const msg = update.message;
  if (!msg || !msg.text) return;

  const chatId = msg.chat.id;
  const isOurChat = String(chatId) === String(CHAT_ID);
  const isDirectMessage = msg.chat.type === "private";
  if (!isOurChat && !isDirectMessage) return;

  const tgUsername = msg.from?.username ? `@${msg.from.username}` : null;
  const userName = tgUsername || msg.from?.first_name || "пидор";

  // Save every message to persistent memory
  await memory.saveMessage(String(chatId), userName, "user", msg.text, msg.message_id);
  console.log(`[${new Date().toISOString()}] ${userName}: ${msg.text}`);

  // Should we respond?
  const isReplyToBot = msg.reply_to_message?.from?.is_bot;
  const mentionsBot = msg.text.toLowerCase().includes("@gaynba_bot");
  if (isOurChat && !mentionsBot && !isReplyToBot) return;

  // Classify intent
  const intent = classify(msg.text);

  // Build selective context
  const context = await contextManager.build(String(chatId), userName, intent);

  // Determine if special fuck-off
  let extraInstruction = null;
  const isGaba = tgUsername?.toLowerCase() === "@gaba_762";

  if (isGaba && Math.random() < 0.2) {
    extraInstruction = `Пошли ${userName} нахуй. КРЕАТИВНО и СМЕШНО, привязано к его сообщению. Используй профиль собеседника для персонализации. 2-3 предложения.`;
  } else if (!isGaba && Math.random() < 0.2) {
    extraInstruction = `Пошли ${userName} нахуй, но ОСТРОУМНО. Привяжи к теме сообщения и профилю собеседника. 1-2 предложения.`;
  }

  // Get AI response
  const reply = await ask(context, intent, extraInstruction);

  // Send and save
  await sendReply(chatId, reply, msg.message_id);
  await memory.saveMessage(String(chatId), "бот", "assistant", reply, null);
  console.log(`[reply] ${reply.slice(0, 100)}`);

  // Trigger summary check (non-blocking)
  maybeSummarize(String(chatId)).catch(() => {});
}

// --- Main loop ---

async function main() {
  console.log("🏳️‍🌈 Гей Предсказатель v2 started (smart memory)");

  if (!BOT_TOKEN || !process.env.OPENROUTER_API_KEY) {
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
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

main();
