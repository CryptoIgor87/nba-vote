#!/usr/bin/env node
/**
 * One-time parser: Telegram HTML export → bot_user_notes
 * Usage: node scripts/tools/parse-chat-export.js
 * Env: OPENROUTER_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY
 */

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const EXPORT_DIR = path.join(__dirname, "../../ChatExport_2026-04-28");
const FILES = ["messages.html", "messages2.html", "messages3.html", "messages4.html"];

const NAME_TO_TG = {
  "Андатр Герасим Генадьевич": "@honeybadgermike",
  "Mike Honeybadger": "@honeybadgermike",
  "Ilia N.": "@ba1udze",
  "Илья Кривошеин": "@gaba_762",
  "Юрий Мирон": "@Miron70",
};

const DISPLAY_NAMES = {
  "@honeybadgermike": "Герасим (Honeybadger)",
  "@ba1udze": "Медвед (Илья)",
  "@gaba_762": "Габа (Lakers Nation)",
  "@Miron70": "Мирон",
};

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const db = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function parseHtmlFile(filePath) {
  const html = fs.readFileSync(filePath, "utf-8");
  const messages = [];

  // State machine: track current sender, look for text blocks
  let currentSender = null;
  let inText = false;
  let textBuf = "";

  const lines = html.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect from_name
    if (line.includes("from_name")) {
      // Next non-empty line is the name
      for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
        const name = lines[j].trim();
        if (name.length > 0 && !name.startsWith("<")) {
          const tg = NAME_TO_TG[name];
          if (tg) currentSender = tg;
          else if (name.includes("GAY POLICE") || name.includes("Sapphire")) currentSender = null;
          else currentSender = null; // unknown user
          break;
        }
      }
    }

    // Detect start of text div
    if (line.includes('class="text"')) {
      inText = true;
      textBuf = "";
      // Check if text is on the same line after >
      const afterTag = line.split('class="text">')[1];
      if (afterTag) textBuf += afterTag;
      continue;
    }

    // Collect text content
    if (inText) {
      if (line.includes("</div>")) {
        // End of text block
        const before = line.split("</div>")[0];
        textBuf += " " + before;
        inText = false;

        // Clean up
        let text = textBuf
          .replace(/<[^>]+>/g, "")
          .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
          .replace(/&amp;/g, "&").replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
          .replace(/\s+/g, " ").trim();

        if (text.length > 1 && text.length < 2000 && currentSender) {
          messages.push({ user: currentSender, text });
        }
      } else {
        textBuf += " " + line;
      }
    }
  }

  return messages;
}

async function analyzeUser(tgUsername, messages) {
  const total = messages.length;
  let sample = [];
  if (total <= 300) {
    sample = messages;
  } else {
    sample = [
      ...messages.slice(0, 100),
      ...messages.slice(Math.floor(total / 2) - 50, Math.floor(total / 2) + 50),
      ...messages.slice(-100),
    ];
  }

  const chatText = sample.map(m => m.text).join("\n");
  console.log(`  Analyzing ${tgUsername} (${total} msgs, sample ${sample.length})...`);

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
          content: `Проанализируй сообщения участника чата и создай его портрет.
Ответь СТРОГО в формате JSON (без markdown, без \`\`\`):
{
  "personality": "краткое описание личности, характера, как общается (2-3 предложения)",
  "interests": ["интерес1", "интерес2"],
  "humor_triggers": ["на что ведётся", "какие шутки любит"],
  "hates": ["что бесит", "на что жалуется"],
  "nba_team": "за кого болеет или null",
  "relationships": {"@username": "как общается с этим человеком"},
  "running_jokes": ["повторяющиеся шутки и темы"],
  "communication_style": "стиль общения: длина сообщений, эмодзи, мат, манера шутить",
  "misc": "что ещё интересного, уникальные факты"
}
Пиши на русском. Будь конкретен и специфичен - не общие фразы а реальные наблюдения.
Это чат друзей про NBA с грубым юмором - мат это норма.
Участники: @ba1udze (Медвед/Илья), @gaba_762 (Габа/Илья), @honeybadgermike (Герасим/Миша), @Miron70 (Мирон/Юра).
@honeybadgermike раньше назывался "Андатр Герасим Генадьевич", потом сменил имя на "Mike Honeybadger" - это один и тот же человек.`
        },
        {
          role: "user",
          content: `Сообщения от ${tgUsername} (${DISPLAY_NAMES[tgUsername]}):\n\n${chatText}`
        },
      ],
      max_tokens: 1200,
      temperature: 0.3,
    }),
  });

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content || "{}";
  let cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    console.error(`  JSON parse failed for ${tgUsername}, raw:`, cleaned.slice(0, 300));
    return { personality: cleaned.slice(0, 500), error: "parse_failed" };
  }
}

async function main() {
  console.log("=== Parsing chat export ===\n");

  const allMessages = {};
  for (const file of FILES) {
    const filePath = path.join(EXPORT_DIR, file);
    if (!fs.existsSync(filePath)) { console.log(`Skipping ${file}`); continue; }
    console.log(`Parsing ${file}...`);
    const msgs = parseHtmlFile(filePath);
    console.log(`  Found ${msgs.length} messages`);
    for (const m of msgs) {
      if (!allMessages[m.user]) allMessages[m.user] = [];
      allMessages[m.user].push(m);
    }
  }

  console.log("\n=== Message counts ===");
  for (const [user, msgs] of Object.entries(allMessages)) {
    console.log(`${user}: ${msgs.length} messages`);
  }

  console.log("\n=== Analyzing users ===");
  for (const [tgUsername, msgs] of Object.entries(allMessages)) {
    if (msgs.length < 5) { console.log(`  Skipping ${tgUsername} (${msgs.length} msgs)`); continue; }

    const notes = await analyzeUser(tgUsername, msgs);
    console.log(`  Result: ${JSON.stringify(notes).slice(0, 200)}...`);

    const { error } = await db.from("bot_user_notes").upsert({
      tg_username: tgUsername,
      display_name: DISPLAY_NAMES[tgUsername],
      notes,
      updated_at: new Date().toISOString(),
    }, { onConflict: "tg_username" });

    if (error) console.error(`  DB error:`, error);
    else console.log(`  Saved ${tgUsername}`);
  }

  console.log("\n=== Done ===");
}

main().catch(console.error);
