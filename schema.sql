-- 云升机械 Cloudflare D1 初始化结构。网站内容暂以单行 JSON 保存，便于兼容现有可视化后台。
CREATE TABLE IF NOT EXISTS site_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  content_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
