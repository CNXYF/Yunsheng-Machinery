# 云升机械网站（新手启动说明）

本项目使用 Python 标准库，无需安装前端依赖。访客网站、中英切换、产品项目小窗、分步联系登记窗、管理后台、询盘收集及图片上传均已提供。重要代码有中文说明；请先阅读本文件再启动。

## 一、准备环境

安装 Python 3.10 或更新版本。打开 PowerShell，进入本项目目录：

```powershell
cd "D:\Documents\ChatGPT\云升机械公司网站"
```

## 二、设置管理员密码并启动

**首次启动必须先设置强密码**。在同一个 PowerShell 窗口执行：

```powershell
$env:YUNSHENG_ADMIN = "admin"`r`n$env:YUNSHENG_PASSWORD = "请替换为你自己的强密码"
$env:YUNSHENG_PASSWORD = "请替换为你自己的强密码"
python server.py
```

浏览器访问 `http://localhost:8000` 查看网站；管理后台为 `http://localhost:8000/admin.html`。登录账号是上面设置的账号及密码。关闭服务器时在 PowerShell 按 `Ctrl+C`。每次新开窗口启动前都需重新设置这两个环境变量。

> 不要把真实密码写入代码或发到 GitHub。服务器未配置管理员密码时会拒绝登录。正式部署公网时必须配置 HTTPS、强密码、定期备份与服务器访问控制。当前版本是轻量单机后端，适合小型首版；询盘邮件通知还需配置邮件服务后续接入。

## 三、修改网站内容

登录后台后，管理概览查看产品、新闻、快捷询盘和联系登记数量；“网站信息与首页设置”可编辑公司资料、首页标题简介、联系区标题及中英文 SEO 标题摘要。产品、分类、新闻、案例和资质可新增、编辑、删除、保存草稿或发布。联系登记栏目可搜索记录、更新跟进状态/负责人/备注并导出 CSV；快捷询盘也可搜索并导出。后台数据接口需管理员登录，公开网站接口会剔除联系登记和询盘个人信息。

首页视觉文案与导航文案位于 `app.js` 的 `copy` 中，可搜索对应中文直接改；布局及颜色位于 `style.css` 顶部的 CSS 变量。编辑代码前建议在 Git 中提交一次，方便误改后恢复。

## 四、数据与备份

首次运行会自动创建 `data/site.json`，其中保存网站内容、快捷询盘和分步联系登记；上传图片保存在 `uploads/`。已有旧版数据会在读取时自动补上联系登记列表，不会覆盖原内容。请定期把 `data/` 和 `uploads/` 一起复制到安全位置。恢复时，将备份文件夹放回项目目录并重新启动服务。

## 五、后续建议

1. 用真实公司简介、产品规格、实拍图片、资质和联系方式替换演示内容。
2. 配置企业邮箱通知、HTTPS 域名和自动备份，再公开网站。
3. 按目标市场补充德语、西班牙语等语言，加入产品筛选、案例筛选及询盘来源统计。
4. 询盘增加后再接 CRM、线索分派、跟进状态与导出功能；同时考虑迁移到正式数据库和受管托管平台。

## 目录说明

- `index.html`：访客页面结构。
- `style.css`：颜色、排版、组件和手机适配。
- `app.js`：前台交互、双语文字和询盘提交。
- `admin.html`、`admin.js`：内容管理页面与后台交互。
- `server.py`：网站服务、管理员验证、内容保存、图片上传和询盘接口。
- `data/site.json`：自动创建的网站内容和询盘数据；请备份。
- `uploads/`：后台上传的产品图片；请备份。



## 六、部署线上后台（Render）

Pages 负责静态前台，Render Blueprint 负责 Python 后台、客户登记和持久媒体文件。仓库根目录的 `render.yaml` 已定义后端服务与 1 GB 持久磁盘。

1. 使用 GitHub 账号登录 Render，选择 **New → Blueprint**，导入 `CNXYF/Yunsheng-Machinery` 仓库。
2. Render 会要求配置 `YUNSHENG_PASSWORD`。在 Render 控制台创建强密码，只保存到 Render 密钥配置中，不要发给任何人或提交到仓库。
3. Render Blueprint 使用带持久磁盘的 Starter 服务计划；创建时会显示费用。确认预算后再在 Render 页面提交创建。
4. 服务就绪后检查 `https://yunsheng-machinery-api.onrender.com/api/health` 返回 `{"ok": true}`。Pages 构建会使用此 API 地址，推送后自动重新部署前台。
5. 管理后台地址为 `https://yunsheng-machinery-api.onrender.com/admin.html`。客户登记和上传文件保存在持久磁盘 `/var/data`。

`server.py` 的 CORS 仅允许 GitHub Pages 域名和本地开发域名；跨域管理请求仍需管理员令牌。GitHub Pages 构建只发布静态前台和脱敏内容，不会打包后台客户记录。

