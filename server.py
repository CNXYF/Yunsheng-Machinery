"""云升机械网站的轻量后端。

使用 Python 标准库提供网站文件、管理员登录、内容管理、图片上传和询盘保存。
适合本地演示及小型初期网站；正式商用前应部署到 HTTPS 服务器并设置强口令。
"""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse
import base64, hashlib, hmac, json, mimetypes, os, secrets, time

ROOT = Path(__file__).parent.resolve()
DATA = Path(os.environ.get("YUNSHENG_DATA_DIR", ROOT / "data"))
UPLOADS = Path(os.environ.get("YUNSHENG_UPLOAD_DIR", ROOT / "uploads"))
DB = DATA / "site.json"
DATA.mkdir(exist_ok=True)
UPLOADS.mkdir(exist_ok=True)
PUBLIC_API_URL = os.environ.get("PUBLIC_API_URL", "").rstrip("/")
ALLOWED_ORIGINS = {x.strip() for x in os.environ.get("ALLOWED_ORIGINS", "https://cnxyf.github.io,http://localhost:8000,http://127.0.0.1:8000").split(",") if x.strip()}
ADMIN_USER = os.environ.get("YUNSHENG_ADMIN", "admin")
ADMIN_PASSWORD = os.environ.get("YUNSHENG_PASSWORD", "")
SESSIONS = {}

SEED = {
  "products": [{"id":"p1","status":"published","category":"加工设备","image":"","name_zh":"高精度数控加工中心","name_en":"Precision CNC Machining Center","summary_zh":"面向复杂零件加工的高刚性、高效率解决方案。","summary_en":"A rigid, efficient solution for complex part machining.","specs_zh":"行程、主轴转速及配置可按工件需求定制。","specs_en":"Travel, spindle speed and configuration can be tailored to your parts."}],
  "categories": [{"id":"c1","status":"published","name_zh":"加工设备","name_en":"Machining Equipment"},{"id":"c2","status":"published","name_zh":"自动化产线","name_en":"Automation Lines"}],
  "news": [{"id":"n1","status":"published","title_zh":"欢迎了解云升机械","title_en":"Welcome to Yunsheng Machinery","body_zh":"我们专注于为全球客户提供可靠的机械设备与服务。更多公司动态即将发布。","body_en":"We provide reliable machinery and service for customers worldwide. Company updates coming soon.","date":"2026-10-30"}],
  "cases": [{"id":"k1","status":"published","title_zh":"面向多行业的设备解决方案","title_en":"Equipment solutions across industries","body_zh":"根据客户工艺需求配置设备与技术支持。","body_en":"Equipment and technical support tailored to customer processes."}],
  "credentials": [], "settings": {"company_zh":"云升机械","company_en":"Yunsheng Machinery","email":"sales@example.com","phone":"+86 (please update)","address_zh":"请在管理后台更新公司地址","address_en":"Update company address in the admin panel","seo_title_zh":"云升机械 | 精密制造 · 服务全球","seo_title_en":"Yunsheng Machinery | Precision Manufacturing","seo_description_zh":"云升机械为全球客户提供可靠的机械设备、自动化产线与技术服务。","seo_description_en":"Reliable machinery, automation and service for manufacturers worldwide.","hero_title_zh":"让可靠的制造，驱动每一次进步。","hero_title_en":"Reliable engineering drives every advance.","hero_intro_zh":"从先进设备到完整生产方案，云升机械与您携手，把每个制造构想变为稳定、高效的成果。","hero_intro_en":"From advanced machinery to complete production solutions, we turn ideas into reliable, efficient results.","contact_title_zh":"您的下一步，从一次交流开始。","contact_title_en":"Your next step starts with a conversation."}, "inquiries": [], "contacts": []
}

def load_db():
    if not DB.exists(): DB.write_text(json.dumps(SEED, ensure_ascii=False, indent=2), encoding="utf-8")
    try:
        db=json.loads(DB.read_text(encoding="utf-8")); db.setdefault("contacts",[]); return db
    except (ValueError, OSError): return json.loads(json.dumps(SEED))

def save_db(db): DB.write_text(json.dumps(db, ensure_ascii=False, indent=2), encoding="utf-8")

class Handler(SimpleHTTPRequestHandler):
    """API 路由与静态文件共用的请求处理器。"""
    def __init__(self, *args, **kwargs): super().__init__(*args, directory=str(ROOT), **kwargs)
    def reply(self, payload, status=200):
        raw = json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(status); self.send_header("Content-Type", "application/json; charset=utf-8"); self.send_header("Content-Length", str(len(raw))); self.send_header("X-Content-Type-Options", "nosniff")
        origin=self.headers.get("Origin", "")
        if origin in ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin); self.send_header("Vary", "Origin")
        self.end_headers(); self.wfile.write(raw)
    def do_OPTIONS(self):
        origin=self.headers.get("Origin", "")
        if origin not in ALLOWED_ORIGINS: return self.reply({"error":"此来源不允许访问接口"},403)
        self.send_response(204); self.send_header("Access-Control-Allow-Origin", origin); self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS"); self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Admin-Token"); self.send_header("Access-Control-Max-Age", "600"); self.send_header("Vary", "Origin"); self.end_headers()
    def body(self, limit=8_000_000):
        size = int(self.headers.get("Content-Length", "0"))
        if size > limit: raise ValueError("上传内容超过允许大小")
        return self.rfile.read(size)
    def authorized(self):
        token = self.headers.get("X-Admin-Token", "")
        return token in SESSIONS and SESSIONS[token] > time.time()
    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/health": return self.reply({"ok":True})
        if path == "/api/content":
            # 管理员使用相同地址读取完整数据；匿名访客仅能读取公开展示内容。
            db=load_db()
            if self.authorized(): return self.reply({"ok":True,"content":db})
            db["inquiries"]=[]; db["contacts"]=[]
            return self.reply(db)
        if path == "/api/session": return self.reply({"ok": self.authorized()})
        if path.startswith("/api/"):
            if not self.authorized(): return self.reply({"error":"请先登录管理员账号"}, 401)
            return self.reply({"ok":True,"content":load_db()})
        return super().do_GET()
    def do_POST(self):
        path = urlparse(self.path).path
        try:
            if path == "/api/login":
                data = json.loads(self.body()); password = ADMIN_PASSWORD or ""
                if not password: return self.reply({"error":"管理员密码尚未设置。请按 README 设置环境变量后重启。"}, 503)
                if not hmac.compare_digest(str(data.get("username","")), ADMIN_USER) or not hmac.compare_digest(str(data.get("password","")), password): return self.reply({"error":"账号或密码错误"}, 401)
                token = secrets.token_urlsafe(32); SESSIONS[token] = time.time() + 8*3600
                return self.reply({"token":token})
            if path == "/api/inquiries":
                form = json.loads(self.body()); required = ("name","company","email","country","message")
                if any(not str(form.get(k,"")).strip() for k in required): return self.reply({"error":"请填写所有必填字段"}, 400)
                if len(form["message"]) > 5000: return self.reply({"error":"需求内容请控制在 5000 字以内"}, 400)
                db=load_db(); db["inquiries"].insert(0,{"id":secrets.token_hex(8),"created":time.strftime("%Y-%m-%d %H:%M UTC",time.gmtime()),**{k:str(form[k]).strip() for k in required}}); save_db(db)
                return self.reply({"ok":True})
            if path == "/api/contacts":
                form=json.loads(self.body())
                required=("reason","industry","email","phone","first_name","last_name","company","street","city","country","postal_code","product_category","equipment_type")
                if any(not str(form.get(k,"")).strip() for k in required): return self.reply({"error":"请完整填写带星号的联系与产品信息"},400)
                if form.get("consent") is not True: return self.reply({"error":"请先同意隐私政策与联系授权"},400)
                if len(str(form.get("details","")))>5000: return self.reply({"error":"补充说明请控制在 5000 字以内"},400)
                entry={"id":secrets.token_hex(8),"created":time.strftime("%Y-%m-%d %H:%M UTC",time.gmtime()),"status":"new","owner":"","notes":"",**{k:str(v).strip() if isinstance(v,str) else v for k,v in form.items()}}
                db=load_db(); db.setdefault("contacts",[]).insert(0,entry); save_db(db)
                return self.reply({"ok":True,"id":entry["id"]})
            if not self.authorized(): return self.reply({"error":"请先登录管理员账号"}, 401)
            if path == "/api/upload":
                ctype=self.headers.get("Content-Type","")
                # 图片和常用网页视频格式进入同一媒体目录，由后台字段引用。
                media_types={"image/jpeg":".jpg","image/png":".png","image/webp":".webp","image/gif":".gif","video/mp4":".mp4","video/webm":".webm","video/ogg":".ogv"}
                normalized=ctype.split(";")[0].lower()
                if normalized not in media_types: return self.reply({"error":"支持 JPG、PNG、WebP、GIF 图片及 MP4、WebM、OGG 视频"},400)
                limit=100_000_000 if normalized.startswith("video/") else 8_000_000
                data=self.body(limit)
                if not data or len(data)>limit: return self.reply({"error":"图片最大 8 MB，视频最大 100 MB"},400)
                ext=media_types[normalized]
                name=secrets.token_hex(12)+ext; (UPLOADS/name).write_bytes(data); return self.reply({"url":PUBLIC_API_URL+"/uploads/"+name})
            if path == "/api/content":
                db=json.loads(self.body()); required=("products","categories","news","cases","credentials","settings","inquiries","contacts")
                if any(k not in db for k in required): return self.reply({"error":"内容数据格式不完整"},400)
                save_db(db); return self.reply({"ok":True})
            return self.reply({"error":"未找到接口"},404)
        except (ValueError, TypeError, OSError) as exc: return self.reply({"error":str(exc)},400)
    def log_message(self, fmt, *args): print("[%s] %s"%(self.log_date_time_string(),fmt%args))

if __name__ == "__main__":
    if not ADMIN_PASSWORD: print("提示：尚未设置管理员密码。请阅读 README.md 中的启动说明。")
    print("网站已启动：http://localhost:8000")
    ThreadingHTTPServer(("0.0.0.0", int(os.environ.get("PORT","8000"))), Handler).serve_forever()

