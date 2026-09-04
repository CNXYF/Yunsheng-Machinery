/* ============================================
   公共 JS 文件 - common.js
   --------------------------------------------
   1. 动态渲染所有页面的导航栏（统一品牌 + 产品下拉菜单）
   2. 动态渲染所有页面的页脚
   3. 实现导航栏当前页面高亮（active 状态）
   4. 实现移动端汉堡菜单的展开/收起
   5. 实现移动端"产品介绍"子菜单的点击展开/收起
   ============================================ */

/**
 * 页面加载完成后，统一渲染导航栏与页脚
 * 每个 HTML 页面中放置两个占位元素：
 *   <div id="navbar-placeholder"></div>
 *   <div id="footer-placeholder"></div>
 * 即可由以下代码自动填充完整结构。
 */
document.addEventListener("DOMContentLoaded", function () {
  renderNavbar();   // 渲染导航栏
  renderFooter();   // 渲染页脚
  bindNavEvents();  // 绑定移动端交互事件
  highlightActiveNav(); // 高亮当前页面对应的导航项
});

/* ============================================
   渲染导航栏
   产品下拉菜单的数据来源于 products-data.js 中的 products 数组
   ============================================ */
function renderNavbar() {
  // 找到页面中的占位元素
  const placeholder = document.getElementById("navbar-placeholder");
  if (!placeholder) return; // 某些页面可能不需要导航栏，防御性处理

  // 动态生成产品下拉菜单项（遍历 products 数组）
  let dropdownItemsHtml = "";
  if (typeof products !== "undefined" && Array.isArray(products)) {
    products.forEach(function (product) {
      dropdownItemsHtml +=
        '<a class="dropdown-item" href="product.html?id=' + product.id + '">' +
        product.name +
        "</a>";
    });
  }

  // 组合完整的导航栏 HTML
  const html =
    '<nav class="navbar">' +
      '<div class="navbar-inner">' +
        // 品牌 Logo（点击返回首页）
        '<a href="index.html" class="brand">' +
          '<span class="dot"></span>' +
          '<span>智享科技</span>' +
        "</a>" +
        // 导航菜单（桌面端水平，移动端垂直）
        '<ul class="nav-links" id="navLinks">' +
          // 首页
          '<li class="nav-item">' +
            '<a href="index.html" class="nav-link" data-page="home">首页</a>' +
          "</li>" +
          // 公司简介
          '<li class="nav-item">' +
            '<a href="about.html" class="nav-link" data-page="about">公司简介</a>' +
          "</li>" +
          // 产品介绍（带下拉菜单）
          '<li class="nav-item dropdown" id="productDropdown">' +
            '<a href="products.html" class="nav-link" data-page="products">产品介绍</a>' +
            '<ul class="dropdown-menu" id="productDropdownMenu">' +
              dropdownItemsHtml +
            "</ul>" +
          "</li>" +
          // 联系我们
          '<li class="nav-item">' +
            '<a href="contact.html" class="nav-link" data-page="contact">联系我们</a>' +
          "</li>" +
        "</ul>" +
        // 汉堡按钮（仅移动端显示）
        '<button class="hamburger" id="hamburgerBtn" aria-label="菜单">' +
          "<span></span>" +
          "<span></span>" +
          "<span></span>" +
        "</button>" +
      "</div>" +
    "</nav>";

  // 将渲染好的 HTML 写入占位元素
  placeholder.innerHTML = html;
}

/* ============================================
   渲染页脚
   ============================================ */
function renderFooter() {
  const placeholder = document.getElementById("footer-placeholder");
  if (!placeholder) return;

  const html =
    '<footer class="footer">' +
      '<div class="container">' +
        '<div class="footer-grid">' +
          // 公司信息栏
          '<div class="footer-col">' +
            '<div class="footer-brand">智享科技 <span style="color:#F97316;">·</span></div>' +
            "<p>我们致力于为消费者提供高品质、高性价比的智能电子产品，\n让科技真正融入生活每一个角落。</p>" +
          "</div>" +
          // 快速导航栏
          '<div class="footer-col">' +
            "<h4>快速导航</h4>" +
            "<ul>" +
              '<li><a href="index.html">首页</a></li>' +
              '<li><a href="about.html">公司简介</a></li>' +
              '<li><a href="products.html">产品介绍</a></li>' +
              '<li><a href="contact.html">联系我们</a></li>' +
            "</ul>" +
          "</div>" +
          // 产品系列
          '<div class="footer-col">' +
            "<h4>产品系列</h4>" +
            "<ul>" +
              (typeof products !== "undefined" && Array.isArray(products)
                ? products
                    .map(function (p) {
                      return '<li><a href="product.html?id=' + p.id + '">' + p.name + "</a></li>";
                    })
                    .join("")
                : "") +
            "</ul>" +
          "</div>" +
          // 联系方式
          '<div class="footer-col">' +
            "<h4>联系我们</h4>" +
            "<ul>" +
              "<li>电话：400-888-8888</li>" +
              "<li>邮箱：contact@zhixiang-tech.com</li>" +
              "<li>地址：北京市朝阳区建国路 88 号</li>" +
            "</ul>" +
          "</div>" +
        "</div>" +
        // 版权信息
        '<div class="footer-bottom">' +
          "&copy; " +
          new Date().getFullYear() +
          " 智享科技 版权所有 &nbsp;|&nbsp; All Rights Reserved." +
        "</div>" +
      "</div>" +
    "</footer>";

  placeholder.innerHTML = html;
}

/* ============================================
   绑定导航交互事件
   1. 汉堡菜单：点击展开/收起整个导航
   2. 移动端产品介绍下拉：点击展开/收起产品子菜单
   ============================================ */
function bindNavEvents() {
  // --- 汉堡菜单点击事件 ---
  const hamburger = document.getElementById("hamburgerBtn");
  const navLinks = document.getElementById("navLinks");
  if (hamburger && navLinks) {
    hamburger.addEventListener("click", function () {
      hamburger.classList.toggle("active");   // 切换 X 图标
      navLinks.classList.toggle("open");      // 切换导航显示
    });
  }

  // --- 移动端"产品介绍"点击展开子菜单 ---
  const productDropdown = document.getElementById("productDropdown");
  if (productDropdown) {
    // 找到"产品介绍"这个 a 标签
    const productLink = productDropdown.querySelector('a[data-page="products"]');
    if (productLink) {
      productLink.addEventListener("click", function (e) {
        // 仅在移动端（汉堡菜单可见时）才阻止跳转，让用户先展开子菜单
        const isMobile =
          window.getComputedStyle(hamburger).display !== "none";
        if (isMobile) {
          // 阻止默认的页面跳转（先展开子菜单；若用户再次点击则跳转）
          // 策略：当子菜单未展开时，点击展开；已展开时，正常跳转到 products.html
          if (!productDropdown.classList.contains("open")) {
            e.preventDefault();
            productDropdown.classList.add("open");
          }
          // 如果已经 open，就正常跳转到 products.html（不拦截）
        }
        // 桌面端（汉堡菜单 hidden）：不处理，默认 hover 展开 + 点击跳转
      });
    }
  }
}

/* ============================================
   根据当前页面文件名，高亮对应的导航项
   支持：index.html / about.html / products.html / contact.html / product.html
   其中 product.html 属于"产品介绍"分类，故高亮 products 项
   ============================================ */
function highlightActiveNav() {
  // 获取当前页面文件名（如 "index.html"）
  const path = window.location.pathname;
  const fileName = path.substring(path.lastIndexOf("/") + 1) || "index.html";

  // 根据文件名映射到 data-page 标识
  let activePage = "";
  switch (fileName) {
    case "index.html":
    case "":
      activePage = "home";
      break;
    case "about.html":
      activePage = "about";
      break;
    case "products.html":
    case "product.html": // 产品详情页归属到"产品介绍"
      activePage = "products";
      break;
    case "contact.html":
      activePage = "contact";
      break;
    default:
      activePage = "";
  }

  if (!activePage) return;

  // 给对应 .nav-link 加上 active 类
  const activeLink = document.querySelector(
    '.nav-link[data-page="' + activePage + '"]'
  );
  if (activeLink) {
    activeLink.classList.add("active");
  }
}

/* ============================================
   公共：渲染产品卡片 HTML（供首页、产品总览页复用）
   参数：product 数据对象
   返回：产品卡片 HTML 字符串
   ============================================ */
function renderProductCard(product) {
  // 如果没有单独的缩略图，就取第一张图片
  const thumb = product.thumbnail || (product.images && product.images[0]) || "";

  return (
    '<article class="product-card">' +
      // 产品缩略图（点击也可进入详情）
      '<a href="product.html?id=' + product.id + '">' +
        '<img src="' + thumb + '" alt="' + product.name + '" loading="lazy">' +
      "</a>" +
      // 卡片内容区
      '<div class="product-card-body">' +
        // 产品名
        '<h3><a href="product.html?id=' + product.id + '">' + product.name + "</a></h3>" +
        // 简短描述
        '<p class="desc">' + product.shortDesc + "</p>" +
        // 价格
        '<div class="price">' + product.price + "</div>" +
        // 查看详情按钮
        '<a href="product.html?id=' + product.id + '" class="btn btn-primary">查看详情</a>' +
      "</div>" +
    "</article>"
  );
}
