# 云升机械网站：全部迁移到 Cloudflare

此版本将静态前台、管理后台、API、D1 数据库和 R2 媒体文件放在 Cloudflare Pages 项目中。Cloudflare Pages Functions 路由代码位于 `functions/`，数据结构位于 `schema.sql`，绑定配置位于 `wrangler.toml`。原有 `server.py` 保留作为本地/迁移参考，不再是 Cloudflare 线上运行入口。

## 一、创建 Cloudflare 资源

1. 登录 Cloudflare，打开 **Workers & Pages → Create application → Pages → Connect to Git**，连接本项目仓库。
2. 构建命令设置为 `python build_pages.py`，输出目录设置为 `_site`。根目录保持仓库根目录。Pages Functions 代码必须留在项目根目录的 `functions/`。
3. 在 **Workers & Pages → D1 SQL Database** 创建数据库 `yunsheng-site`，进入控制台执行本仓库 `schema.sql` 中的建表语句。
4. 在 **R2 Object Storage** 创建桶 `yunsheng-media`。
5. Pages 项目 **Settings → Functions → D1 database bindings** 增加变量名 `DB` 并选择 `yunsheng-site`；R2 bucket bindings 增加变量名 `MEDIA` 并选择 `yunsheng-media`。
6. 在 Pages 项目 **Settings → Variables and Secrets** 添加 `ADMIN_USERNAME`（可用默认 `admin`）和**加密密钥** `ADMIN_PASSWORD`。使用随机强密码，不要写入仓库。
7. 触发一次部署。部署后打开 `/api/health` 应返回 `{"ok":true}`；首次访问 `/api/content` 会把脱敏公开内容初始化到 D1。
8. 打开 `/admin.html`，使用环境变量中的账号密码登录。发布一条测试登记，确认后台可见；上传图片，确认出现 `/media/...` 地址并可打开。

## 二、绑定配置注意事项

- `wrangler.toml` 的 `database_id` 是占位文字。使用 Wrangler 部署时必须替换成真实 D1 ID；若只用 Pages 控制台配置绑定，可将占位配置替换为真实 ID以免配置校验失败。
- Pages Functions 的绑定名称大小写必须完全匹配 `DB`、`MEDIA`。
- 发布前核实 GitHub Actions 的旧 GitHub Pages workflow 已关闭，避免两种平台的流水线同时发布造成误解。Cloudflare Pages 自身连接 GitHub 后会自动构建。
- Pages API 使用同域相对路径，不需要配置外部 Python API 地址。

## 三、数据和媒体迁移

1. 先从原后端安全导出网站内容。不要把 `data/site.json`、客户登记、询盘或 `.env` 提交到公开仓库。
2. 本版会自动初始化脱敏的 `content.public.json`；客户登记和询盘始终保存在 D1，不会从静态 JSON 导入。
3. 若要迁移现有线索，需要由管理员在旧后台导出 CSV，授权人员在私密环境中导入 D1；本仓库没有内置批量导入接口，以免公开站点暴露批量写入入口。
4. 原有上传媒体位于旧主机 `uploads/`，应由管理员逐项重新上传到后台，或用受控 R2 迁移工具导入并更新对应内容 URL。
5. D1 线索数据与 R2 媒体应定期备份；在生产使用前，核对 Cloudflare 当前套餐限额、备份策略和数据保留要求。

## 四、文件职责和日常维护

- `functions/api/[endpoint].js`：登录、内容读取保存、询盘、联系登记、媒体上传接口。
- `functions/media/[key].js`：从私有 R2 绑定读取媒体对象。
- `schema.sql`：D1 建表语句；新增结构后通过版本化 SQL 迁移。
- `wrangler.toml`：Cloudflare Pages、D1、R2 配置示例。
- `build_pages.py`：将前台与后台页面复制到 `_site`，剔除客户线索并生成同域 API 配置。
- `app.js`、`admin.js`：前端页面和后台交互，后端地址默认同域，无需手工调整。

## 五、上线前检查

- 管理后台仅使用强口令，生产环境绑定 HTTPS；管理员密钥应在 Cloudflare 密钥设置中保管。
- 分别测试中英文页面、询盘、三步联系登记、管理员登录/退出、产品编辑、CSV 导出、图片与视频上传。
- 校验匿名请求无法读取客户线索，未登录无法保存后台内容。
- 控制上传文件大小。当前 Worker 上传接口限制图片 8 MB、视频 20 MB；更大的视频应采用 R2 预签名直传流程扩展。
- 维护前先在 Pages 创建预览部署，并备份 D1 数据及 R2 对象。

此迁移需要在 Cloudflare 控制台创建资源、填写密钥并关联 Git 仓库。代码已准备同域 Pages Functions 方案；实际生产部署需完成上述账户配置后才会启用完整动态功能。
