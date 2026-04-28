/**
 * Bot v2 memory: persistent messages + summaries in Supabase
 */

const SUMMARY_THRESHOLD = 30; // generate summary every N messages

let _db = null;
function init(supabaseClient) { _db = supabaseClient; }

async function saveMessage(chatId, tgUsername, role, content, tgMessageId) {
  if (!_db) return null;
  const { data } = await _db.from("bot_messages").insert({
    chat_id: chatId,
    tg_username: tgUsername,
    role,
    content: content.slice(0, 4000), // cap storage
    tg_message_id: tgMessageId || null,
  }).select("id").single();
  return data?.id || null;
}

async function getRecentMessages(chatId, count = 5) {
  if (!_db) return [];
  const { data } = await _db
    .from("bot_messages")
    .select("tg_username, role, content")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(count);
  return (data || []).reverse(); // chronological order
}

async function getLatestSummary(chatId) {
  if (!_db) return null;
  const { data } = await _db
    .from("bot_summaries")
    .select("summary, msg_to_id")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

async function checkSummaryNeeded(chatId) {
  const latest = await getLatestSummary(chatId);
  const afterId = latest?.msg_to_id || 0;
  const { count } = await _db
    .from("bot_messages")
    .select("id", { count: "exact", head: true })
    .eq("chat_id", chatId)
    .gt("id", afterId);
  return (count || 0) >= SUMMARY_THRESHOLD;
}

async function getUnsummarizedMessages(chatId) {
  const latest = await getLatestSummary(chatId);
  const afterId = latest?.msg_to_id || 0;
  const { data } = await _db
    .from("bot_messages")
    .select("id, tg_username, role, content")
    .eq("chat_id", chatId)
    .gt("id", afterId)
    .order("id", { ascending: true })
    .limit(50);
  return data || [];
}

async function storeSummary(chatId, summary, msgFromId, msgToId, msgCount) {
  await _db.from("bot_summaries").insert({
    chat_id: chatId,
    summary,
    msg_from_id: msgFromId,
    msg_to_id: msgToId,
    msg_count: msgCount,
  });
}

module.exports = {
  init,
  saveMessage,
  getRecentMessages,
  getLatestSummary,
  checkSummaryNeeded,
  getUnsummarizedMessages,
  storeSummary,
};
