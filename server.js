// Autopilot Social — small Node server
// Serves the app from /public and adds an /api/ai route so the AI writing features work.
// Needs Node 18+ (uses built-in fetch). No npm packages required.

const http = require("http");
const fs = require("fs");
const path = require("path");

// Load a .env file if present (simple KEY=value lines)
try {
  fs.readFileSync(path.join(__dirname, ".env"), "utf8").split("\n").forEach((line) => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  });
} catch (_) {}

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY || "";
const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5-5";
const PUBLIC = path.join(__dirname, "public");

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".json": "application/json" };

// Story pictures: free AI images from Pollinations by default. Swap in any image API that
// takes a text prompt in the URL by setting IMAGE_API_URL ({prompt} and {seed} are filled in).
const IMAGE_URL = process.env.IMAGE_API_URL || "https://image.pollinations.ai/prompt/{prompt}?width=720&height=1280&seed={seed}&nologo=true&model=flux";
const IMAGE_TOKEN = process.env.IMAGE_API_TOKEN || "";

// Basic per-IP rate limits: 40 AI calls and 120 pictures per 10 minutes
const hits = new Map();
function limited(ip, bucket = "ai", max = 40) {
  const now = Date.now();
  const key = bucket + "|" + ip;
  const list = (hits.get(key) || []).filter((t) => now - t < 10 * 60 * 1000);
  list.push(now);
  hits.set(key, list);
  return list.length > max;
}

function parseJson(text) {
  try { return JSON.parse(text); } catch (_) {}
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) { try { return JSON.parse(fence[1]); } catch (_) {} }
  const start = text.search(/[\[{]/);
  const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (start >= 0 && end > start) { try { return JSON.parse(text.slice(start, end + 1)); } catch (_) {} }
  return null;
}

async function handleAi(req, res) {
  const send = (code, obj) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };
  if (!API_KEY) return send(503, { error: "AI is not configured. Set ANTHROPIC_API_KEY." });
  if (limited(req.socket.remoteAddress)) return send(429, { error: "Too many requests" });

  let body = "";
  for await (const chunk of req) { body += chunk; if (body.length > 200000) return send(413, { error: "Too large" }); }
  let prompt, maxTokens;
  try { const b = JSON.parse(body); prompt = b.prompt; maxTokens = Number(b.maxTokens) || 4000; } catch (_) { return send(400, { error: "Bad request" }); }
  // Story chapters need room to breathe; everything else stays at 4000
  maxTokens = Math.max(500, Math.min(16000, maxTokens));
  if (typeof prompt !== "string" || !prompt.trim()) return send(400, { error: "Missing prompt" });

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system: "Your reply is parsed by a program. Reply with only the JSON value requested, no other text.",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await r.json();
    if (!r.ok) { console.error("Claude API error", data); return send(502, { error: "AI request failed" }); }
    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
    const result = parseJson(text);
    if (result === null) return send(502, { error: "AI reply was not JSON" });
    send(200, { result });
  } catch (e) {
    console.error(e);
    send(502, { error: "AI request failed" });
  }
}

// Fetches a story picture on the server so the browser can draw it into videos without CORS problems
async function handleImage(req, res, url) {
  const fail = (code) => { res.writeHead(code); res.end(); };
  if (limited(req.socket.remoteAddress, "img", 120)) return fail(429);
  const prompt = (url.searchParams.get("prompt") || "").slice(0, 1200).trim();
  const seed = parseInt(url.searchParams.get("seed"), 10) || 1;
  if (!prompt) return fail(400);
  const target = IMAGE_URL.replace("{prompt}", encodeURIComponent(prompt)).replace("{seed}", String(seed));
  try {
    const r = await fetch(target, { headers: IMAGE_TOKEN ? { Authorization: "Bearer " + IMAGE_TOKEN } : {}, signal: AbortSignal.timeout(90000) });
    const type = r.headers.get("content-type") || "";
    if (!r.ok || !type.startsWith("image/")) { console.error("Image API error", r.status); return fail(502); }
    const buf = Buffer.from(await r.arrayBuffer());
    res.writeHead(200, { "Content-Type": type, "Cache-Control": "public, max-age=604800" });
    res.end(buf);
  } catch (e) {
    console.error("Image fetch failed", e.message);
    fail(502);
  }
}

http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/api/ai" && req.method === "POST") return handleAi(req, res);
  if (url.pathname === "/api/image" && req.method === "GET") return handleImage(req, res, url);
  if (url.pathname === "/health") { res.writeHead(200); return res.end("ok"); }

  let file = path.normalize(path.join(PUBLIC, decodeURIComponent(url.pathname)));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  if (!fs.existsSync(file)) file = path.join(PUBLIC, "index.html");
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => {
  console.log(`Autopilot Social running on http://localhost:${PORT}`);
  if (!API_KEY) console.log("Note: ANTHROPIC_API_KEY not set — the app will use its built-in post templates.");
});
