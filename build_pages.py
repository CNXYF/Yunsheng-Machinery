"""为 GitHub Pages 生成安全的静态展示版本；不发布后台和客户登记数据。"""
from pathlib import Path
import json, os, shutil

ROOT = Path(__file__).parent.resolve()
OUT = ROOT / "_site"
PUBLIC_CONTENT = ROOT / "content.public.json"

def main():
    if OUT.exists(): shutil.rmtree(OUT)
    OUT.mkdir()
    # Pages 只部署静态访客页面。Python 管理后台需运行在支持后端的服务器。
    for name in ("index.html", "style.css", "app.js", ".nojekyll"):
        source = ROOT / name
        if source.exists(): shutil.copy2(source, OUT / name)
    content = json.loads(PUBLIC_CONTENT.read_text(encoding="utf-8"))
    # 双重脱敏：即使静态源数据误含线索，也不把客户资料写进 Pages 构建产物。
    content["contacts"] = []
    content["inquiries"] = []
    (OUT / "content.public.json").write_text(json.dumps(content, ensure_ascii=False, indent=2), encoding="utf-8")
    # API 地址通过 GitHub Actions 变量配置，避免把任何密钥写进前端文件。
    api_base=os.environ.get("SITE_API_URL", "https://yunsheng-machinery-api.onrender.com").rstrip("/")
    (OUT / "config.js").write_text("window.YS_API_BASE = "+json.dumps(api_base)+";\n", encoding="utf-8")
    uploads = ROOT / "uploads"
    if uploads.exists(): shutil.copytree(uploads, OUT / "uploads", dirs_exist_ok=True)
    print(f"GitHub Pages 静态网站已构建：{OUT}")

if __name__ == "__main__": main()

