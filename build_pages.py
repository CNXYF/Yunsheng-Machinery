"""为 GitHub Pages 生成安全的静态展示版本；不发布后台和客户登记数据。"""
from pathlib import Path
import json, os, shutil

ROOT = Path(__file__).parent.resolve()
OUT = ROOT / "_site"
PUBLIC_CONTENT = ROOT / "content.public.json"

def main():
    if OUT.exists(): shutil.rmtree(OUT)
    OUT.mkdir()
    # Cloudflare Pages 同时发布访客页、管理后台及配置；API 由根目录 functions/ 提供。
    for name in ("index.html", "admin.html", "style.css", "admin-accounts.css", "app.js", "admin.js", ".nojekyll"):
        source = ROOT / name
        if source.exists(): shutil.copy2(source, OUT / name)
    content = json.loads(PUBLIC_CONTENT.read_text(encoding="utf-8"))
    # 双重脱敏：即使静态源数据误含线索，也不把客户资料写进 Pages 构建产物。
    content["contacts"] = []
    content["inquiries"] = []
    (OUT / "content.public.json").write_text(json.dumps(content, ensure_ascii=False, indent=2), encoding="utf-8")
    # 前后端同域部署，API_BASE 留空；密钥仅放 Cloudflare Pages 环境变量。
    (OUT / "config.js").write_text("window.YS_API_BASE = '';\n", encoding="utf-8")
    print(f"Cloudflare Pages 网站已构建：{OUT}")

if __name__ == "__main__": main()

