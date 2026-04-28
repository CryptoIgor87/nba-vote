/**
 * Bot v2 response cleaner: strip markdown, links, formatting for Telegram plain text
 */

function clean(text) {
  return text
    .replace(/\[[^\]]*\]\([^)]*\)/g, "")          // [text](url)
    .replace(/\[[^\]]*\]/g, "")                     // [text]
    .replace(/https?:\/\/\S+/g, "")                 // http urls
    .replace(/\b\S+\.\S{2,6}\/\S*/g, "")           // paths like site.com/path
    .replace(/\b\S+\.(com|ru|org|net|io|dev|ai|today|info|pro|cc)\b\S*/gi, "") // domains
    .replace(/\*\*([^*]+)\*\*/g, "$1")              // **bold**
    .replace(/\*([^*]+)\*/g, "$1")                   // *italic*
    .replace(/__([^_]+)__/g, "$1")                   // __bold__
    .replace(/_([^_]+)_/g, "$1")                     // _italic_
    .replace(/```[^`]*```/g, "")                     // ```code blocks```
    .replace(/`([^`]+)`/g, "$1")                     // `inline code`
    .replace(/#+\s/g, "")                            // # headers
    .replace(/[—–]/g, "-")                           // long dashes
    .replace(/\s{2,}/g, " ")                         // multiple spaces
    .trim();
}

module.exports = { clean };
