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

function formatForPrompt(username, displayName, notes) {
  const parts = [];
  if (displayName) parts.push(displayName);
  if (notes.personality) parts.push(notes.personality);
  if (notes.nba_team) parts.push(`Болеет за ${notes.nba_team}`);
  if (notes.interests?.length) parts.push(`Интересы: ${notes.interests.join(", ")}`);
  if (notes.humor_triggers?.length) parts.push(`Ведётся на: ${notes.humor_triggers.join(", ")}`);
  if (notes.hates?.length) parts.push(`Бесит: ${notes.hates.join(", ")}`);
  if (notes.running_jokes?.length) parts.push(`Внутренние шутки: ${notes.running_jokes.join(", ")}`);
  if (notes.relationships) {
    const rels = Object.entries(notes.relationships).map(([k, v]) => `${k}: ${v}`);
    if (rels.length) parts.push(`Отношения: ${rels.join("; ")}`);
  }
  if (notes.misc) parts.push(notes.misc);
  return `${username}: ${parts.join(". ")}`;
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
