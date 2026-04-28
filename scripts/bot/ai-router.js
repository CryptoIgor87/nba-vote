/**
 * Bot v2 AI router: model selection + API calls
 * Claude Haiku for 90%+ requests, Perplexity only for web search
 */

const { clean } = require("./response-cleaner");

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

async function ask(context, intent, extraInstruction) {
  const model = intent.needsWebSearch
    ? "perplexity/sonar-pro"
    : intent.isCreativeRequest
    ? "anthropic/claude-sonnet-4"
    : "anthropic/claude-3.5-haiku";

  const maxTokens = intent.isCreativeRequest ? 600 : 400;

  const messages = buildMessages(context, extraInstruction);

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature: 0.9,
      }),
    });
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content
      || "Чё? Повтори, пидор, я не расслышал 🤷";
    return clean(raw);
  } catch (err) {
    console.error("[ai-router] error:", err.message);
    return "Бля, мозги сломались. Попробуй позже, пидор 🤖💥";
  }
}

function buildMessages(context, extraInstruction) {
  let system = context.systemPrompt;

  // Speaker profile
  if (context.speakerNotes) {
    system += `\n\nО СОБЕСЕДНИКЕ:\n${context.speakerNotes}`;
  }

  // Special instruction (e.g. "пошли нахуй креативно")
  if (extraInstruction) {
    system += `\n\nСПЕЦИАЛЬНАЯ ИНСТРУКЦИЯ: ${extraInstruction}`;
  }

  // Date/time
  system += `\nСЕЙЧАС: ${context.dateTime}`;

  // Summary of past conversation
  if (context.summary) {
    system += `\n\nКОНТЕКСТ РАЗГОВОРА (саммари):\n${context.summary}`;
  }

  // On-demand NBA data
  if (context.extraContext) {
    system += `\n${context.extraContext}`;
  }

  const msgs = [{ role: "system", content: system }];

  // Last 5 messages
  for (const m of context.recentMessages) {
    if (m.role === "assistant") {
      msgs.push({ role: "assistant", content: m.content });
    } else {
      msgs.push({ role: "user", content: `${m.tg_username}: ${m.content}` });
    }
  }

  return msgs;
}

// Summary generation uses a separate cheap call
async function generateSummary(messages) {
  try {
    const chatText = messages.map(m =>
      `${m.tg_username || "бот"}: ${m.content}`
    ).join("\n");

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_KEY}`,
      },
      body: JSON.stringify({
        model: "anthropic/claude-3.5-haiku",
        messages: [
          {
            role: "system",
            content: "Сделай краткое саммари этого чата на русском языке за 3-4 предложения. Что обсуждали, кто что говорил, какие были шутки/темы. Максимум 200 токенов.",
          },
          { role: "user", content: chatText },
        ],
        max_tokens: 250,
        temperature: 0.3,
      }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.error("[ai-router] summary error:", err.message);
    return null;
  }
}

module.exports = { ask, generateSummary };
