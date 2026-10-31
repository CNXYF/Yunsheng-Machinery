/* Cloudflare Pages API：用 D1 保存站点数据，用 R2 保存上传媒体。 */
import seedContent from "../../content.public.json";
const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const MAX_JSON = 1024 * 1024;

function reply(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

async function readState(env) {
  const row = await env.DB.prepare("SELECT content_json FROM site_state WHERE id = 1").first();
  if (row) return JSON.parse(row.content_json);
  // 首次访问时把构建时复制的公开内容导入数据库；线索列表始终初始化为空。
  const seed = structuredClone(seedContent);
  seed.inquiries = [];
  seed.contacts = [];
  await writeState(env, seed);
  return seed;
}

async function writeState(env, state) {
  await env.DB.prepare("INSERT INTO site_state (id, content_json, updated_at) VALUES (1, ?, CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET content_json = excluded.content_json, updated_at = CURRENT_TIMESTAMP")
    .bind(JSON.stringify(state)).run();
}

async function sign(value, secret) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function isAdmin(request, env) {
  const [payload, signature] = (request.headers.get("X-Admin-Token") || "").split(".");
  if (!payload || !signature || !env.ADMIN_PASSWORD) return false;
  try {
    const decoded = JSON.parse(atob(payload.replaceAll("-", "+").replaceAll("_", "/")));
    return decoded.exp > Date.now() && signature === await sign(payload, env.ADMIN_PASSWORD);
  } catch { return false; }
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const endpoint = params.endpoint;
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { "access-control-allow-methods": "GET, POST, OPTIONS", "access-control-allow-headers": "Content-Type, X-Admin-Token" } });
  if (endpoint === "health" && request.method === "GET") return reply({ ok: true });
  if (endpoint === "session" && request.method === "GET") return reply({ ok: await isAdmin(request, env) });

  if (endpoint === "login" && request.method === "POST") {
    const form = await request.json();
    if (!env.ADMIN_PASSWORD) return reply({ error: "请先在 Cloudflare 设置 ADMIN_PASSWORD 密钥" }, 503);
    if (form.username !== (env.ADMIN_USERNAME || "admin") || form.password !== env.ADMIN_PASSWORD) return reply({ error: "账号或密码错误" }, 401);
    const payload = btoa(JSON.stringify({ exp: Date.now() + 8 * 60 * 60 * 1000 })).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
    return reply({ token: `${payload}.${await sign(payload, env.ADMIN_PASSWORD)}` });
  }

  if (endpoint === "content" && request.method === "GET") {
    const state = await readState(env);
    if (!await isAdmin(request, env)) { state.inquiries = []; state.contacts = []; }
    return reply(await isAdmin(request, env) ? { ok: true, content: state } : state);
  }

  if (endpoint === "inquiries" && request.method === "POST") {
    const form = await request.json();
    const required = ["name", "company", "email", "country", "message"];
    if (required.some(key => !String(form[key] || "").trim())) return reply({ error: "请填写所有必填字段" }, 400);
    if (String(form.message).length > 5000) return reply({ error: "需求内容请控制在 5000 字以内" }, 400);
    const state = await readState(env);
    state.inquiries ||= [];
    state.inquiries.unshift({ id: crypto.randomUUID(), created: new Date().toISOString(), ...Object.fromEntries(required.map(key => [key, String(form[key]).trim()])) });
    await writeState(env, state);
    return reply({ ok: true });
  }

  if (endpoint === "contacts" && request.method === "POST") {
    const form = await request.json();
    const required = ["reason", "industry", "email", "phone", "first_name", "last_name", "company", "street", "city", "country", "postal_code", "product_category", "equipment_type"];
    if (required.some(key => !String(form[key] || "").trim())) return reply({ error: "请完整填写带星号的联系与产品信息" }, 400);
    if (form.consent !== true) return reply({ error: "请先同意隐私政策与联系授权" }, 400);
    if (String(form.details || "").length > 5000) return reply({ error: "补充说明请控制在 5000 字以内" }, 400);
    const state = await readState(env);
    state.contacts ||= [];
    const entry = { id: crypto.randomUUID(), created: new Date().toISOString(), status: "new", owner: "", notes: "", ...form };
    state.contacts.unshift(entry);
    await writeState(env, state);
    return reply({ ok: true, id: entry.id });
  }

  if (!await isAdmin(request, env)) return reply({ error: "请先登录管理员账号" }, 401);
  if (endpoint === "content" && request.method === "POST") {
    const raw = await request.text();
    if (raw.length > MAX_JSON) return reply({ error: "内容超过 1 MB，请减少单次修改的数据量" }, 413);
    const next = JSON.parse(raw);
    const required = ["products", "categories", "news", "cases", "credentials", "settings", "inquiries", "contacts"];
    if (required.some(key => !(key in next))) return reply({ error: "内容数据格式不完整" }, 400);
    await writeState(env, next);
    return reply({ ok: true });
  }
  if (endpoint === "upload" && request.method === "POST") {
    const type = (request.headers.get("content-type") || "").split(";")[0].toLowerCase();
    const allowed = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif", "video/mp4": ".mp4", "video/webm": ".webm", "video/ogg": ".ogv" };
    if (!allowed[type]) return reply({ error: "支持 JPG、PNG、WebP、GIF 图片及 MP4、WebM、OGG 视频" }, 400);
    const bytes = await request.arrayBuffer();
    const limit = type.startsWith("video/") ? 20_000_000 : 8_000_000;
    if (!bytes.byteLength || bytes.byteLength > limit) return reply({ error: "图片最大 8 MB，视频最大 20 MB" }, 400);
    const key = `${crypto.randomUUID()}${allowed[type]}`;
    await env.MEDIA.put(key, bytes, { httpMetadata: { contentType: type } });
    return reply({ url: `/media/${key}` });
  }
  return reply({ error: "未找到接口" }, 404);
}
