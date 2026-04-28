/**
 * Bot v2 user notes: per-user personality profiles with in-memory cache
 */

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let _db = null;
const cache = new Map(); // tgUsername -> { notes, loadedAt }

function init(supabaseClient) { _db = supabaseClient; }

async function get(tgUsername) {
  if (!tgUsername || !_db) return null;

  const cached = cache.get(tgUsername);
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL) {
    return cached.formatted;
  }

  const { data } = await _db
    .from("bot_user_notes")
    .select("display_name, notes")
    .eq("tg_username", tgUsername)
    .maybeSingle();

  if (!data) return null;

  const formatted = formatForPrompt(tgUsername, data.display_name, data.notes);
  cache.set(tgUsername, { formatted, loadedAt: Date.now() });
  return formatted;
}

function pick(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function formatForPrompt(username, displayName, notes) {
  // Pick random subset of traits to prevent fixation on one topic
  const parts = [];
  if (displayName) parts.push(displayName);
  if (notes.nba_team) parts.push(`Болеет за ${notes.nba_team}`);

  // Randomly pick 2-3 interests, 1-2 triggers, 1-2 hates
  if (notes.interests?.length) parts.push(`Темы для подъёбок: ${pick(notes.interests, 3).join(", ")}`);
  if (notes.humor_triggers?.length) parts.push(`Ведётся на: ${pick(notes.humor_triggers, 2).join(", ")}`);
  if (notes.hates?.length) parts.push(`Бесит его: ${pick(notes.hates, 2).join(", ")}`);
  if (notes.running_jokes?.length) parts.push(`Шутки: ${pick(notes.running_jokes, 2).join(", ")}`);
  if (notes.misc) parts.push(notes.misc);

  return `${username} (${displayName}): ${parts.join(". ")}. Используй ОДНУ из этих тем, не все сразу.`;
}

async function getAllNotes() {
  if (!_db) return [];
  const { data } = await _db.from("bot_user_notes").select("tg_username, display_name, notes");
  return (data || []).map(d => formatForPrompt(d.tg_username, d.display_name, d.notes));
}

function invalidate(tgUsername) {
  cache.delete(tgUsername);
}

module.exports = { init, get, getAllNotes, invalidate };
