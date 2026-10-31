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

// 先把任意长度的值压成固定长度，再使用运行时常量时间比较函数。
async function secureEqual(left, right) {
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right)),
  ]);
  const a = new Uint8Array(leftHash);
  const b = new Uint8Array(rightHash);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}

// 管理员密码用每个账号独立的随机盐和 PBKDF2 哈希保存，不把明文写入 D1。
function toBase64Url(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function fromBase64Url(value) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  return Uint8Array.from(atob(base64 + "=".repeat((4 - base64.length % 4) % 4)), c => c.charCodeAt(0));
}

async function hashPassword(password, saltText) {
  const salt = saltText ? fromBase64Url(saltText) : crypto.getRandomValues(new Uint8Array(16));
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  // Pages 免费 CPU 时间有限；40,000 轮兼顾密码哈希安全性与运行开销。
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 40000 }, material, 256);
  return { salt: toBase64Url(salt), hash: toBase64Url(bits) };
}

async function ensureOwnerAccount(env, form) {
  const row = await env.DB.prepare("SELECT id FROM admin_users LIMIT 1").first();
  if (row || !env.ADMIN_PASSWORD) return null;
  const username = String(env.ADMIN_USERNAME || "admin").trim();
  if (String(form.username || "").trim().toLowerCase() !== username.toLowerCase()) return null;
  // 仅在空表首次迁移时校验一次旧密钥；正常登录仍校验密码哈希。
  if (String(form.password || "") !== env.ADMIN_PASSWORD) return null;
  const { salt, hash } = await hashPassword(env.ADMIN_PASSWORD);
  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT OR IGNORE INTO admin_users (id, username, password_salt, password_hash, role, is_active) VALUES (?, ?, ?, ?, 'owner', 1)")
    .bind(id, username, salt, hash).run();
  return findAdminById(env, id);
}

async function findAdminById(env, id) {
  return env.DB.prepare("SELECT id, username, password_salt, password_hash, role, is_active, token_version, created_at FROM admin_users WHERE id = ?")
    .bind(id).first();
}

async function getAdmin(request, env) {
  const [payload, signature] = (request.headers.get("X-Admin-Token") || "").split(".");
  if (!payload || !signature) return null;
  try {
    const decoded = JSON.parse(atob(payload.replaceAll("-", "+").replaceAll("_", "/")));
    if (!decoded.id || decoded.exp <= Date.now()) return null;
    const admin = await findAdminById(env, decoded.id);
    if (!admin || !admin.is_active) return null;
    if (decoded.ver !== admin.token_version || !await secureEqual(signature, await sign(payload, admin.password_hash))) return null;
    return admin;
  } catch { return null; }
}

function publicAdmin(admin) {
  return { id: admin.id, username: admin.username, role: admin.role, is_active: !!admin.is_active, created_at: admin.created_at };
}

function validUsername(value) {
  return /^[A-Za-z0-9]{1,8}$/.test(String(value || "").trim());
}

function validPassword(value) {
  return typeof value === "string" && /^[A-Za-z0-9]{8,13}$/.test(value);
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const endpoint = params.endpoint;
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { "access-control-allow-methods": "GET, POST, OPTIONS", "access-control-allow-headers": "Content-Type, X-Admin-Token" } });
  if (endpoint === "health" && request.method === "GET") return reply({ ok: true });
  if (endpoint === "session" && request.method === "GET") return reply({ ok: !!await getAdmin(request, env) });

  if (endpoint === "login" && request.method === "POST") {
    let stage = "read request";
    try {
      const form = await request.json();
      stage = "bootstrap owner";
      const bootstrappedAdmin = await ensureOwnerAccount(env, form);
      const username = String(form.username || "").trim();
      stage = "read administrator";
      const admin = await env.DB.prepare("SELECT id, username, password_salt, password_hash, role, is_active, token_version, created_at FROM admin_users WHERE username = ? COLLATE NOCASE")
        .bind(username).first();
      // 按要求区分账号状态与密码验证结果，便于用户知道登录失败原因。
      if (!admin) return reply({ error: "账号错误：未找到该管理员账号" }, 401);
      if (!admin.is_active) return reply({ error: "账号错误：该管理员账号已停用" }, 401);
      if (typeof form.password !== "string") return reply({ error: "密码错误" }, 401);
      if (admin.id !== bootstrappedAdmin?.id) {
        stage = "verify password";
        const { hash } = await hashPassword(form.password, admin.password_salt);
        if (!await secureEqual(hash, admin.password_hash)) return reply({ error: "密码错误" }, 401);
      }
      stage = "sign session";
      const payload = toBase64Url(new TextEncoder().encode(JSON.stringify({ id: admin.id, ver: admin.token_version, exp: Date.now() + 8 * 60 * 60 * 1000 })));
      return reply({ token: `${payload}.${await sign(payload, admin.password_hash)}`, admin: publicAdmin(admin) });
    } catch (error) {
      console.error("管理员登录处理失败", stage, String(error));
      return reply({ error: "管理员登录暂时失败，请稍后重试" }, 500);
    }
  }

  if (endpoint === "me" && request.method === "GET") {
    const admin = await getAdmin(request, env);
    if (!admin) return reply({ error: "请先登录管理员账号" }, 401);
    return reply({ admin: publicAdmin(admin) });
  }

  if (endpoint === "admins") {
    const currentAdmin = await getAdmin(request, env);
    if (!currentAdmin) return reply({ error: "请先登录管理员账号" }, 401);
    if (currentAdmin.role !== "owner") return reply({ error: "只有主管理员可以管理管理员账号" }, 403);
    if (request.method === "GET") {
      const { results } = await env.DB.prepare("SELECT id, username, role, is_active, created_at FROM admin_users ORDER BY created_at ASC").all();
      return reply({ admins: results.map(publicAdmin) });
    }
    if (request.method === "POST") {
      const form = await request.json();
      if (form.action === "create") {
        const username = String(form.username || "").trim();
        if (!validUsername(username)) return reply({ error: "账号只能使用 1 至 8 位英文字母或数字" }, 400);
        if (!validPassword(form.password)) return reply({ error: "密码需为 8 至 13 位英文字母或数字" }, 400);
        const { salt, hash } = await hashPassword(form.password);
        const id = crypto.randomUUID();
        try {
          await env.DB.prepare("INSERT INTO admin_users (id, username, password_salt, password_hash, role, is_active) VALUES (?, ?, ?, ?, 'admin', 1)")
            .bind(id, username, salt, hash).run();
        } catch (error) {
          if (String(error).toLowerCase().includes("unique")) return reply({ error: "此管理员账号已存在" }, 409);
          throw error;
        }
        return reply({ ok: true, admin: publicAdmin(await findAdminById(env, id)) }, 201);
      }
      if (form.action === "update") {
        const target = await findAdminById(env, String(form.id || ""));
        if (!target) return reply({ error: "找不到此管理员账号" }, 404);
        const username = String(form.username || "").trim();
        if (!validUsername(username)) return reply({ error: "账号只能使用 1 至 8 位英文字母或数字" }, 400);
        const active = form.is_active === true;
        if (target.id === currentAdmin.id && !active) return reply({ error: "不能停用当前正在使用的管理员账号" }, 400);
        let result;
        if (form.password) {
          if (!validPassword(form.password)) return reply({ error: "新密码需为 8 至 13 位英文字母或数字" }, 400);
          const { salt, hash } = await hashPassword(form.password);
          result = await env.DB.prepare("UPDATE admin_users SET username = ?, password_salt = ?, password_hash = ?, is_active = ?, token_version = token_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
            .bind(username, salt, hash, active ? 1 : 0, target.id).run();
        } else {
          result = await env.DB.prepare("UPDATE admin_users SET username = ?, is_active = ?, token_version = token_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
            .bind(username, active ? 1 : 0, target.id).run();
        }
        if (!result.success) return reply({ error: "保存管理员信息失败" }, 500);
        return reply({ ok: true, admin: publicAdmin(await findAdminById(env, target.id)) });
      }
      return reply({ error: "不支持的管理员操作" }, 400);
    }
    return reply({ error: "不支持的请求方法" }, 405);
  }

  if (endpoint === "content" && request.method === "GET") {
    const state = await readState(env);
    const admin = await getAdmin(request, env);
    if (!admin) { state.inquiries = []; state.contacts = []; }
    return reply(admin ? { ok: true, content: state } : state);
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

  if (!await getAdmin(request, env)) return reply({ error: "请先登录管理员账号" }, 401);
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

