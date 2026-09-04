/* ============================================
   产品数据文件 - products-data.js
   --------------------------------------------
   所有产品信息统一在此文件中维护：
   - 导航栏产品下拉菜单自动读取此数据生成
   - 产品总览页 (products.html) 自动读取此数据渲染卡片
   - 产品详情页 (product.html) 根据 URL 参数 id 读取对应产品
   
   后续将示例数据替换为真实产品数据即可，无需修改其他页面代码。
   ============================================ */

/**
 * 产品数据数组
 * 每个产品对象字段说明：
 *   id          : 产品唯一标识（用于 URL 参数，如 product.html?id=xxx，务必使用英文+数字+短横线）
 *   name        : 产品名称（中文展示名）
 *   shortDesc   : 产品简短描述（用于卡片、首页精选等位置）
 *   thumbnail   : 产品缩略图（用于卡片），通常取 images[0]，也可单独指定
 *   images      : 产品详情页展示的多张图片数组（详情页左栏，可点击缩略图切换）
 *   video       : 产品介绍视频地址（详情页右栏，使用 HTML5 <video> 内置播放）
 *   description : 产品详细介绍文本（富文本纯文字，分段可用 \n\n 分隔）
 *   specs       : 产品规格参数数组（字符串列表，如 ["屏幕：1.43英寸 AMOLED", "续航：14天"]）
 *   advantages  : 产品优势卖点数组（字符串列表）
 *   price       : 产品售价展示字符串（如 "¥999"）
 *   featured    : 是否为精选产品（true/false，用于首页精选展示区）
 */
const products = [
  /* ======================= 产品 1：智能手表 X1 ======================= */
  {
    id: "smart-watch-x1",
    name: "智能手表 X1",
    shortDesc: "一款功能强大、续航持久的全能智能手表，支持健康监测、运动记录和消息通知。",
    thumbnail: "https://placehold.co/800x500?text=Smart+Watch+X1+Thumb",
    images: [
      "https://placehold.co/800x500?text=Smart+Watch+X1+Front",
      "https://placehold.co/800x500?text=Smart+Watch+X1+Side",
      "https://placehold.co/800x500?text=Smart+Watch+X1+Back",
      "https://placehold.co/800x500?text=Smart+Watch+X1+App"
    ],
    video: "https://www.w3schools.com/html/mov_bbb.mp4",
    description:
      "智能手表 X1 是我们的旗舰可穿戴产品，专为追求科技与品质生活的用户设计。采用 1.43 英寸 AMOLED 高清屏幕，显示效果清晰细腻，户外阳光下依然可读。\n\n" +
      "内置高精度光学传感器，可 24 小时持续监测心率、血氧水平与睡眠质量，帮助你全面了解自身健康状态。支持 120+ 种运动模式，无论是跑步、骑行、游泳还是瑜伽，都能精准记录运动轨迹与关键数据。\n\n" +
      "搭载大容量低功耗芯片，单次充电可正常使用 14 天，告别一日一充的焦虑。5ATM 防水等级，洗手、淋雨、游泳均可无忧佩戴。",
    specs: [
      "屏幕：1.43英寸 AMOLED 高清屏",
      "分辨率：466 × 466",
      "续航：典型使用 14 天",
      "防水等级：5ATM（50 米）",
      "传感器：心率 / 血氧 / 加速度 / 陀螺仪",
      "连接：蓝牙 5.2 BLE",
      "重量：约 42 克（不含表带）"
    ],
    advantages: [
      "14 天超长续航，告别电量焦虑",
      "5ATM 专业防水，运动游泳无忧佩戴",
      "AMOLED 高清屏，色彩鲜艳观感佳",
      "120+ 种运动模式，全面覆盖日常锻炼",
      "全天候健康监测，数据精确可靠",
      "磁吸快充，2 小时即可充满"
    ],
    price: "¥999",
    featured: true
  },

  /* ======================= 产品 2：无线耳机 Pro ======================= */
  {
    id: "wireless-earbuds-pro",
    name: "无线耳机 Pro",
    shortDesc: "主动降噪旗舰真无线耳机，Hi-Fi 级音质表现，带来沉浸式听觉体验。",
    thumbnail: "https://placehold.co/800x500?text=Wireless+Earbuds+Pro+Thumb",
    images: [
      "https://placehold.co/800x500?text=Earbuds+Pro+Case+Open",
      "https://placehold.co/800x500?text=Earbuds+Pro+Close+Up",
      "https://placehold.co/800x500?text=Earbuds+Pro+Wearing",
      "https://placehold.co/800x500?text=Earbuds+Pro+Lifestyle"
    ],
    video: "https://www.w3schools.com/html/mov_bbb.mp4",
    description:
      "无线耳机 Pro 搭载双馈式主动降噪系统，深度可降至 -45dB，让你在飞机、地铁、办公室等嘈杂环境中，也能独享一方宁静。\n\n" +
      "采用 11mm 定制动圈单元，配合高分子复合振膜，低音澎湃有力，中音自然饱满，高音通透细腻，还原音乐本真。支持 LDAC 与 LHDC 高清蓝牙编码，无损传输高品质音源。\n\n" +
      "单次续航可达 8 小时，搭配充电盒总续航 36 小时。支持无线充电与快充，充电 10 分钟即可使用 2 小时。IPX5 防水防汗，运动健身亦能安心使用。",
    specs: [
      "驱动单元：11mm 定制动圈",
      "降噪深度：最大 -45dB（双馈 ANC）",
      "蓝牙版本：蓝牙 5.3，支持 LDAC / LHDC",
      "单次续航：耳机 8 小时 / 充电盒 36 小时",
      "防水等级：IPX5（耳机）",
      "充电方式：Type-C 有线 + Qi 无线快充",
      "重量：单耳约 5.2 克"
    ],
    advantages: [
      "旗舰级 -45dB 深度主动降噪",
      "Hi-Fi 级音质，LDAC 无损传输",
      "36 小时超长总续航，出行无忧",
      "IPX5 防水防汗，运动不怕汗水",
      "双麦 AI 通话降噪，通话清晰如面聊",
      "多点连接，手机电脑无缝切换"
    ],
    price: "¥1299",
    featured: true
  },

  /* ======================= 产品 3：便携充电宝 Mini ======================= */
  {
    id: "power-bank-mini",
    name: "便携充电宝 Mini",
    shortDesc: "小巧轻便、容量足 10000mAh 的口袋充电宝，出行、通勤必备。",
    thumbnail: "https://placehold.co/800x500?text=Power+Bank+Mini+Thumb",
    images: [
      "https://placehold.co/800x500?text=Power+Bank+Mini+Front",
      "https://placehold.co/800x500?text=Power+Bank+Mini+Size",
      "https://placehold.co/800x500?text=Power+Bank+Mini+Charging",
      "https://placehold.co/800x500?text=Power+Bank+Mini+Colors"
    ],
    video: "https://www.w3schools.com/html/mov_bbb.mp4",
    description:
      "便携充电宝 Mini 只有银行卡般大小，却拥有 10000mAh 大容量，可轻松放入裤兜、随身小包。真正的\"口袋里的电量安全感\"。\n\n" +
      "支持 22.5W 双向快充，可为 iPhone 系列机型充满约 1.8 次，为小米安卓旗舰充满约 1.5 次。30 分钟即可为手机回血 60%，应急场景不再焦虑。\n\n" +
      "内置 9 重智能安全保护，过充、过放、过流、短路等风险全部兜底。符合民航携带规定，可直接带上飞机。多彩配色，日常搭配也能彰显个性。",
    specs: [
      "容量：10000mAh（37Wh，符合民航规定）",
      "最大输出：22.5W（USB-A）/ 20W PD（USB-C）",
      "输入：USB-C PD 18W 快充",
      "接口：USB-A × 1，USB-C × 1",
      "尺寸：约 108 × 60 × 25 mm",
      "重量：约 200 克",
      "安全保护：9 重智能防护"
    ],
    advantages: [
      "卡片级尺寸，轻松放入口袋",
      "22.5W 双向快充，充电快人一步",
      "10000mAh 容量，日常应急足够用",
      "200g 轻量化，随身无负担",
      "9 重安全保护，使用更安心",
      "民航可携，出行无忧"
    ],
    price: "¥199",
    featured: true
  }
];

/* ============================================
   工具函数：根据产品 id 获取产品数据
   供 product.html 详情页使用
   ============================================ */
function getProductById(id) {
  // 在 products 数组中查找 id 匹配的产品
  return products.find(function (p) {
    return p.id === id;
  });
}

/* ============================================
   工具函数：获取所有精选产品（首页使用）
   ============================================ */
function getFeaturedProducts() {
  return products.filter(function (p) {
    return p.featured === true;
  });
}

/* ============================================
   工具函数：获取 URL 查询参数
   例：product.html?id=smart-watch-x1 → 获取 "smart-watch-x1"
   ============================================ */
function getQueryParam(name) {
  // 使用 URLSearchParams 解析浏览器地址栏参数
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}
