const pptxgen = require("pptxgenjs");
const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.title = "EasyRecord 傻瓜教程";

// ===== COLOR PALETTE =====
// Primary: 6C63FF (紫色品牌色)
// Dark BG: 1E1E2E
// Light BG: F5F4FF
// Accent: FFD166 (黄)
// Text dark: 1E1E2E
// Text light: FFFFFF
// Step accent: 02C39A (mint green)

const C = {
  brand: "6C63FF",
  dark: "1E1E2E",
  light: "F5F4FF",
  accent: "FFD166",
  mint: "02C39A",
  coral: "FF6B6B",
  white: "FFFFFF",
  gray: "64748B",
  lightGray: "E2E8F0",
  cardBg: "FFFFFF",
  purple2: "9B8FFF",
};

// ===== SLIDE 1: 封面 =====
{
  const s = pres.addSlide();
  s.background = { color: C.dark };

  // 顶部品牌色大色块
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 1.4,
    fill: { color: C.brand },
    line: { color: C.brand },
  });

  // Logo 圆圈
  s.addShape(pres.shapes.OVAL, {
    x: 0.55, y: 0.4, w: 0.65, h: 0.65,
    fill: { color: C.dark },
    line: { color: C.dark },
  });
  s.addText("●", {
    x: 0.55, y: 0.4, w: 0.65, h: 0.65,
    fontSize: 18, color: C.accent,
    align: "center", valign: "middle", margin: 0,
  });

  // 产品名
  s.addText("EasyRecord", {
    x: 1.35, y: 0.45, w: 4, h: 0.55,
    fontSize: 22, bold: true, color: C.white,
    align: "left", valign: "middle", margin: 0,
  });

  // 大标题
  s.addText("浏览器白板录屏工具", {
    x: 0.7, y: 1.7, w: 8.6, h: 1.05,
    fontSize: 44, bold: true, color: C.white,
    align: "center", valign: "middle", margin: 0,
  });

  // 副标题
  s.addText("五分钟上手 · 免费 · 无需安装", {
    x: 0.7, y: 2.9, w: 8.6, h: 0.5,
    fontSize: 20, color: C.purple2,
    align: "center", valign: "middle", margin: 0,
  });

  // 分隔线
  s.addShape(pres.shapes.RECTANGLE, {
    x: 3.8, y: 3.55, w: 2.4, h: 0.05,
    fill: { color: C.accent },
    line: { color: C.accent },
  });

  // 三个特性标签
  const tags = ["🖊 白板画图", "📷 摄像头露脸", "🎬 直接导出MP4"];
  tags.forEach((t, i) => {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.8 + i * 3, y: 3.85, w: 2.5, h: 0.52,
      fill: { color: "FFFFFF", transparency: 88 },
      line: { color: C.purple2, width: 1.5 },
      rectRadius: 0.1,
    });
    s.addText(t, {
      x: 0.8 + i * 3, y: 3.85, w: 2.5, h: 0.52,
      fontSize: 14, color: C.white,
      align: "center", valign: "middle", margin: 0,
    });
  });

  // 底部链接
  s.addText("👉 https://20260314221416.vercel.app", {
    x: 0.7, y: 4.7, w: 8.6, h: 0.4,
    fontSize: 13, color: C.gray,
    align: "center", valign: "middle", margin: 0,
  });
}

// ===== SLIDE 2: 这是什么？ =====
{
  const s = pres.addSlide();
  s.background = { color: C.light };

  // 顶部色条
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.08,
    fill: { color: C.brand }, line: { color: C.brand },
  });

  s.addText("这是什么工具？", {
    x: 0.6, y: 0.25, w: 8.8, h: 0.65,
    fontSize: 32, bold: true, color: C.dark,
    align: "left", valign: "middle", margin: 0,
  });

  // 左侧说明
  s.addText("适合所有想录制讲解视频的人", {
    x: 0.6, y: 1.1, w: 4.5, h: 0.4,
    fontSize: 15, color: C.gray,
    align: "left", valign: "middle", margin: 0,
  });

  const items = [
    { icon: "📚", title: "老师 / 讲师", desc: "录制白板讲解课\n导出发给学生" },
    { icon: "💼", title: "职场人", desc: "录产品演示视频\n不用 OBS 也能搞定" },
    { icon: "📲", title: "自媒体", desc: "制作短视频内容\n人脸+白板一键合成" },
  ];
  items.forEach((item, i) => {
    const yy = 1.65 + i * 1.1;
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.6, y: yy, w: 4.3, h: 0.9,
      fill: { color: C.white },
      line: { color: C.lightGray, width: 1 },
      shadow: { type: "outer", color: "000000", blur: 8, offset: 2, angle: 135, opacity: 0.07 },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.6, y: yy, w: 0.06, h: 0.9,
      fill: { color: C.brand }, line: { color: C.brand },
    });
    s.addText(item.icon + " " + item.title, {
      x: 0.8, y: yy + 0.05, w: 4.0, h: 0.35,
      fontSize: 15, bold: true, color: C.dark,
      align: "left", valign: "middle", margin: 0,
    });
    s.addText(item.desc, {
      x: 0.8, y: yy + 0.42, w: 4.0, h: 0.42,
      fontSize: 12, color: C.gray,
      align: "left", valign: "middle", margin: 0,
    });
  });

  // 右侧：三大核心能力
  s.addText("三大核心能力", {
    x: 5.4, y: 1.1, w: 4.1, h: 0.4,
    fontSize: 15, bold: true, color: C.brand,
    align: "left", valign: "middle", margin: 0,
  });

  const caps = [
    { icon: "🖊", label: "白板画图", color: C.brand },
    { icon: "📷", label: "摄像头 PiP", color: C.mint },
    { icon: "🎬", label: "录制 → MP4", color: C.coral },
  ];
  caps.forEach((cap, i) => {
    const yy = 1.65 + i * 1.1;
    s.addShape(pres.shapes.RECTANGLE, {
      x: 5.4, y: yy, w: 4.1, h: 0.9,
      fill: { color: C.white },
      line: { color: C.lightGray, width: 1 },
      shadow: { type: "outer", color: "000000", blur: 8, offset: 2, angle: 135, opacity: 0.07 },
    });
    s.addShape(pres.shapes.OVAL, {
      x: 5.55, y: yy + 0.2, w: 0.5, h: 0.5,
      fill: { color: cap.color, transparency: 85 },
      line: { color: cap.color },
    });
    s.addText(cap.icon, {
      x: 5.55, y: yy + 0.2, w: 0.5, h: 0.5,
      fontSize: 17, align: "center", valign: "middle", margin: 0,
    });
    s.addText(cap.label, {
      x: 6.18, y: yy + 0.22, w: 3.1, h: 0.46,
      fontSize: 16, bold: true, color: C.dark,
      align: "left", valign: "middle", margin: 0,
    });
  });

  // 底部链接
  s.addText("完全免费 · 打开即用 · 数据不上传", {
    x: 0.6, y: 5.15, w: 8.8, h: 0.35,
    fontSize: 12, color: C.gray, italic: true,
    align: "center", valign: "middle", margin: 0,
  });
}

// ===== SLIDE 3: 第一步 — 打开白板 =====
{
  const s = pres.addSlide();
  s.background = { color: C.white };

  // 步骤编号背景
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 1.15,
    fill: { color: C.brand }, line: { color: C.brand },
  });
  s.addText("Step 1", {
    x: 0.5, y: 0.1, w: 1.4, h: 0.35,
    fontSize: 13, bold: true, color: C.accent,
    align: "left", valign: "middle", margin: 0,
  });
  s.addText("打开白板，开始作画", {
    x: 0.5, y: 0.42, w: 9, h: 0.6,
    fontSize: 30, bold: true, color: C.white,
    align: "left", valign: "middle", margin: 0,
  });

  // 左侧操作卡片
  const steps = [
    { num: "1", text: "浏览器打开链接：\nhttps://20260314221416.vercel.app" },
    { num: "2", text: "屏幕中央就是白板\n默认白色背景 16:9" },
    { num: "3", text: "左上角工具栏选择工具\n点击或拖拽开始画图" },
  ];
  steps.forEach((step, i) => {
    const yy = 1.4 + i * 1.1;
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.5, y: yy, w: 4.4, h: 0.88,
      fill: { color: C.light },
      line: { color: C.lightGray, width: 1 },
    });
    // 数字圆圈
    s.addShape(pres.shapes.OVAL, {
      x: 0.65, y: yy + 0.19, w: 0.5, h: 0.5,
      fill: { color: C.brand }, line: { color: C.brand },
    });
    s.addText(step.num, {
      x: 0.65, y: yy + 0.19, w: 0.5, h: 0.5,
      fontSize: 14, bold: true, color: C.white,
      align: "center", valign: "middle", margin: 0,
    });
    s.addText(step.text, {
      x: 1.28, y: yy + 0.06, w: 3.5, h: 0.76,
      fontSize: 13, color: C.dark,
      align: "left", valign: "middle", margin: 0,
    });
  });

  // 右侧工具说明
  s.addText("工具箱一览", {
    x: 5.3, y: 1.35, w: 4.2, h: 0.4,
    fontSize: 16, bold: true, color: C.brand,
    align: "left", valign: "middle", margin: 0,
  });

  const tools = [
    { icon: "↖", name: "选择", desc: "选中/移动/删除元素" },
    { icon: "✏", name: "画笔", desc: "手绘风格自由曲线" },
    { icon: "→", name: "箭头/直线", desc: "标注说明用" },
    { icon: "□", name: "矩形/椭圆/菱形", desc: "几何图形" },
    { icon: "T", name: "文字", desc: "点击画布输入文字" },
    { icon: "🖼", name: "插入图片", desc: "上传或粘贴截图" },
  ];
  tools.forEach((t, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 5.3 + col * 2.15;
    const y = 1.85 + row * 1.0;
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 1.95, h: 0.8,
      fill: { color: C.white },
      line: { color: C.lightGray, width: 1 },
      shadow: { type: "outer", color: "000000", blur: 6, offset: 2, angle: 135, opacity: 0.08 },
    });
    s.addText(t.icon, {
      x: x + 0.08, y: y + 0.08, w: 0.4, h: 0.4,
      fontSize: 16, align: "center", valign: "middle", margin: 0,
    });
    s.addText(t.name, {
      x: x + 0.08, y: y + 0.45, w: 1.8, h: 0.28,
      fontSize: 11, bold: true, color: C.dark,
      align: "left", valign: "bottom", margin: 0,
    });
  });

  // 小提示
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 5.05, w: 9, h: 0.42,
    fill: { color: C.accent, transparency: 75 },
    line: { color: C.accent },
  });
  s.addText("💡 快捷键：P=画笔  A=箭头  R=矩形  T=文字  E=橡皮  Ctrl+Z=撤销", {
    x: 0.6, y: 5.05, w: 8.8, h: 0.42,
    fontSize: 12, color: C.dark, bold: true,
    align: "center", valign: "middle", margin: 0,
  });
}

// ===== SLIDE 4: 第二步 — 开摄像头 =====
{
  const s = pres.addSlide();
  s.background = { color: C.white };

  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 1.15,
    fill: { color: C.mint }, line: { color: C.mint },
  });
  s.addText("Step 2", {
    x: 0.5, y: 0.1, w: 1.4, h: 0.35,
    fontSize: 13, bold: true, color: C.white,
    align: "left", valign: "middle", margin: 0,
  });
  s.addText("开启摄像头 — 边讲边露脸", {
    x: 0.5, y: 0.42, w: 9, h: 0.6,
    fontSize: 30, bold: true, color: C.white,
    align: "left", valign: "middle", margin: 0,
  });

  // 步骤说明
  const steps = [
    { num: "1", title: "右上角「设置」按钮", desc: "点击顶栏右侧的齿轮图标打开设置面板" },
    { num: "2", title: "选择摄像头大小", desc: "小 / 中 / 大，或直接在画面上拖拽调整" },
    { num: "3", title: "圆形摄像头出现在右下角", desc: "可以用鼠标拖动到你喜欢的位置" },
    { num: "4", title: "拖拽右下角 handle 改变大小", desc: "鼠标悬停在摄像头上，右下角出现调整手柄" },
  ];

  steps.forEach((step, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.5 + col * 4.8;
    const y = 1.4 + row * 1.5;

    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 4.4, h: 1.28,
      fill: { color: C.light },
      line: { color: C.lightGray, width: 1 },
      shadow: { type: "outer", color: "000000", blur: 6, offset: 2, angle: 135, opacity: 0.07 },
    });
    s.addShape(pres.shapes.OVAL, {
      x: x + 0.18, y: y + 0.38, w: 0.52, h: 0.52,
      fill: { color: C.mint }, line: { color: C.mint },
    });
    s.addText(step.num, {
      x: x + 0.18, y: y + 0.38, w: 0.52, h: 0.52,
      fontSize: 16, bold: true, color: C.white,
      align: "center", valign: "middle", margin: 0,
    });
    s.addText(step.title, {
      x: x + 0.85, y: y + 0.1, w: 3.4, h: 0.4,
      fontSize: 14, bold: true, color: C.dark,
      align: "left", valign: "middle", margin: 0,
    });
    s.addText(step.desc, {
      x: x + 0.85, y: y + 0.52, w: 3.4, h: 0.66,
      fontSize: 12, color: C.gray,
      align: "left", valign: "top", margin: 0,
    });
  });

  // 提示条
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 5.05, w: 9, h: 0.42,
    fill: { color: C.mint, transparency: 80 },
    line: { color: C.mint },
  });
  s.addText("💡 摄像头画面录制时会自动合成到视频里 — 不用额外操作", {
    x: 0.6, y: 5.05, w: 8.8, h: 0.42,
    fontSize: 12, color: C.dark, bold: true,
    align: "center", valign: "middle", margin: 0,
  });
}

// ===== SLIDE 5: 第三步 — 录制和导出 =====
{
  const s = pres.addSlide();
  s.background = { color: C.white };

  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 1.15,
    fill: { color: C.coral }, line: { color: C.coral },
  });
  s.addText("Step 3", {
    x: 0.5, y: 0.1, w: 1.4, h: 0.35,
    fontSize: 13, bold: true, color: C.white,
    align: "left", valign: "middle", margin: 0,
  });
  s.addText("一键录制，直接导出 MP4", {
    x: 0.5, y: 0.42, w: 9, h: 0.6,
    fontSize: 30, bold: true, color: C.white,
    align: "left", valign: "middle", margin: 0,
  });

  // 流程图：3个大卡片
  const cards = [
    {
      color: C.brand,
      num: "1",
      title: "点「开始录制」",
      desc: "右上角红色按钮\n倒计时 3 秒后开始\n计时器实时显示",
    },
    {
      color: C.mint,
      num: "2",
      title: "正常讲课 / 操作",
      desc: "在白板上画图\n摄像头同步录制\n说完话随时停止",
    },
    {
      color: C.coral,
      num: "3",
      title: "停止 → 下载 MP4",
      desc: "点「停止录制」\n浏览器自动下载\n文件名含时间戳",
    },
  ];

  cards.forEach((card, i) => {
    const x = 0.5 + i * 3.05;
    // 顶部数字
    s.addShape(pres.shapes.OVAL, {
      x: x + 1.05, y: 1.3, w: 0.65, h: 0.65,
      fill: { color: card.color }, line: { color: card.color },
    });
    s.addText(card.num, {
      x: x + 1.05, y: 1.3, w: 0.65, h: 0.65,
      fontSize: 18, bold: true, color: C.white,
      align: "center", valign: "middle", margin: 0,
    });
    // 卡片
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 2.1, w: 2.85, h: 2.5,
      fill: { color: C.white },
      line: { color: card.color, width: 2 },
      shadow: { type: "outer", color: "000000", blur: 8, offset: 2, angle: 135, opacity: 0.09 },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 2.1, w: 2.85, h: 0.55,
      fill: { color: card.color, transparency: 85 },
      line: { color: card.color, transparency: 85 },
    });
    s.addText(card.title, {
      x: x + 0.12, y: 2.1, w: 2.62, h: 0.55,
      fontSize: 15, bold: true, color: card.color,
      align: "center", valign: "middle", margin: 0,
    });
    s.addText(card.desc, {
      x: x + 0.15, y: 2.72, w: 2.58, h: 1.78,
      fontSize: 13, color: C.dark,
      align: "center", valign: "middle", margin: 0,
    });

    // 箭头连接（前两个卡片之后）
    if (i < 2) {
      s.addShape(pres.shapes.LINE, {
        x: x + 2.85, y: 3.35, w: 0.2, h: 0,
        line: { color: C.gray, width: 2 },
      });
      s.addText("▶", {
        x: x + 2.88, y: 3.2, w: 0.2, h: 0.3,
        fontSize: 12, color: C.gray,
        align: "center", valign: "middle", margin: 0,
      });
    }
  });

  // 底部提示
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 5.05, w: 9, h: 0.42,
    fill: { color: C.coral, transparency: 80 },
    line: { color: C.coral },
  });
  s.addText("💡 全程本地处理，视频文件不会上传到任何服务器，完全隐私", {
    x: 0.6, y: 5.05, w: 8.8, h: 0.42,
    fontSize: 12, color: C.dark, bold: true,
    align: "center", valign: "middle", margin: 0,
  });
}

// ===== SLIDE 6: 进阶技巧 =====
{
  const s = pres.addSlide();
  s.background = { color: C.light };

  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.08,
    fill: { color: C.brand }, line: { color: C.brand },
  });

  s.addText("进阶技巧", {
    x: 0.6, y: 0.2, w: 8.8, h: 0.65,
    fontSize: 32, bold: true, color: C.dark,
    align: "left", valign: "middle", margin: 0,
  });
  s.addText("掌握这些，效率翻倍", {
    x: 0.6, y: 0.85, w: 8.8, h: 0.35,
    fontSize: 14, color: C.gray,
    align: "left", valign: "middle", margin: 0,
  });

  const tips = [
    {
      color: C.brand,
      icon: "📐",
      title: "多页幻灯片",
      desc: "左侧栏点击「+ 新增 Slide」\n每页独立内容，录制时连续",
    },
    {
      color: C.mint,
      icon: "↩",
      title: "撤销 / 重做",
      desc: "Ctrl+Z 撤销上一步\n不小心画错也不怕",
    },
    {
      color: C.coral,
      icon: "🎨",
      title: "自定义背景色",
      desc: "设置 → 当前 Slide 背景色\n白/米色/深色/淡蓝/自定义",
    },
    {
      color: C.accent,
      icon: "📏",
      title: "画布比例",
      desc: "设置 → 16:9 / 9:16 / 3:4 / 1:1\n对应不同平台投稿",
    },
    {
      color: C.purple2,
      icon: "🖱",
      title: "鼠标高亮",
      desc: "设置里开启 → 录制时\n光标附近有高亮圈，便于演示",
    },
    {
      color: "E67E22",
      icon: "✍",
      title: "手绘风格",
      desc: "设置里开启/关闭 → 线条\n自由曲线更有手写感",
    },
  ];

  tips.forEach((tip, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.5 + col * 3.05;
    const y = 1.4 + row * 1.7;

    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 2.85, h: 1.5,
      fill: { color: C.white },
      line: { color: C.lightGray, width: 1 },
      shadow: { type: "outer", color: "000000", blur: 6, offset: 2, angle: 135, opacity: 0.07 },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 0.06, h: 1.5,
      fill: { color: tip.color }, line: { color: tip.color },
    });
    s.addText(tip.icon, {
      x: x + 0.18, y: y + 0.1, w: 0.55, h: 0.5,
      fontSize: 22, align: "center", valign: "middle", margin: 0,
    });
    s.addText(tip.title, {
      x: x + 0.78, y: y + 0.1, w: 2.0, h: 0.4,
      fontSize: 14, bold: true, color: C.dark,
      align: "left", valign: "middle", margin: 0,
    });
    s.addText(tip.desc, {
      x: x + 0.18, y: y + 0.62, w: 2.55, h: 0.8,
      fontSize: 11, color: C.gray,
      align: "left", valign: "top", margin: 0,
    });
  });
}

// ===== SLIDE 7: 常见问题 Q&A =====
{
  const s = pres.addSlide();
  s.background = { color: C.white };

  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.08,
    fill: { color: C.brand }, line: { color: C.brand },
  });

  s.addText("常见问题 Q&A", {
    x: 0.6, y: 0.2, w: 8.8, h: 0.65,
    fontSize: 32, bold: true, color: C.dark,
    align: "left", valign: "middle", margin: 0,
  });

  const qas = [
    {
      q: "Q: 需要注册账号吗？",
      a: "完全不用，打开链接就能用，没有任何门槛。",
    },
    {
      q: "Q: 录制的视频会上传到服务器吗？",
      a: "不会，全程在你的浏览器里处理，数据不离开你的电脑。",
    },
    {
      q: "Q: 摄像头窗口能调整位置和大小吗？",
      a: "可以！直接拖拽移动位置；鼠标悬停后，右下角出现调整手柄，拖拽即可改变大小。",
    },
    {
      q: "Q: 支持手机使用吗？",
      a: "以 PC/Mac 浏览器为主，手机端功能受限，建议电脑使用。",
    },
    {
      q: "Q: 导出的格式是什么？",
      a: "自动导出 MP4，可直接上传到微信、视频号、B站等平台。",
    },
    {
      q: "Q: 我能多个页面录制吗？",
      a: "可以！录制过程中可以切换 Slide，所有内容会连续录进同一个视频。",
    },
  ];

  qas.forEach((qa, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.5 + col * 4.8;
    const y = 1.1 + row * 1.4;

    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 4.4, h: 1.2,
      fill: { color: C.light },
      line: { color: C.lightGray, width: 1 },
    });
    s.addText(qa.q, {
      x: x + 0.18, y: y + 0.06, w: 4.0, h: 0.36,
      fontSize: 13, bold: true, color: C.brand,
      align: "left", valign: "middle", margin: 0,
    });
    s.addText(qa.a, {
      x: x + 0.18, y: y + 0.44, w: 4.0, h: 0.7,
      fontSize: 12, color: C.dark,
      align: "left", valign: "top", margin: 0,
    });
  });
}

// ===== SLIDE 8: 结尾 =====
{
  const s = pres.addSlide();
  s.background = { color: C.dark };

  // 品牌色顶条
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.08,
    fill: { color: C.brand }, line: { color: C.brand },
  });

  // 大标题
  s.addText("开始你的第一个录制吧！", {
    x: 0.7, y: 0.9, w: 8.6, h: 0.9,
    fontSize: 38, bold: true, color: C.white,
    align: "center", valign: "middle", margin: 0,
  });

  s.addText("免费 · 无需安装 · 打开即用", {
    x: 0.7, y: 1.9, w: 8.6, h: 0.45,
    fontSize: 18, color: C.purple2,
    align: "center", valign: "middle", margin: 0,
  });

  // 左侧：文字信息区
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 2.35, w: 5.8, h: 0.7,
    fill: { color: C.brand },
    line: { color: C.brand },
    shadow: { type: "outer", color: "000000", blur: 12, offset: 3, angle: 135, opacity: 0.4 },
  });
  s.addText("👉 https://20260314221416.vercel.app", {
    x: 0.5, y: 2.35, w: 5.8, h: 0.7,
    fontSize: 14, bold: true, color: C.white,
    align: "center", valign: "middle", margin: 0,
  });

  // 小字说明
  s.addText("手机扫码即可直接打开使用，无需安装任何 App", {
    x: 0.5, y: 3.18, w: 5.8, h: 0.35,
    fontSize: 12, color: C.gray,
    align: "center", valign: "middle", margin: 0,
  });

  // 三个总结点
  const points = [
    { icon: "🖊", text: "白板画图\n自由创作" },
    { icon: "📷", text: "摄像头露脸\n圆形 PiP" },
    { icon: "🎬", text: "一键录制\n直接 MP4" },
  ];
  points.forEach((pt, i) => {
    const x = 0.6 + i * 2.0;
    s.addShape(pres.shapes.OVAL, {
      x, y: 3.72, w: 0.6, h: 0.6,
      fill: { color: C.brand },
      line: { color: C.brand },
    });
    s.addText(pt.icon, {
      x, y: 3.72, w: 0.6, h: 0.6,
      fontSize: 18, align: "center", valign: "middle", margin: 0,
    });
    s.addText(pt.text, {
      x: x - 0.35, y: 4.4, w: 1.3, h: 0.6,
      fontSize: 11, color: C.white,
      align: "center", valign: "middle", margin: 0,
    });
  });

  // 右侧：二维码
  // 白色圆角背景卡片
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 6.8, y: 2.0, w: 2.7, h: 3.0,
    fill: { color: C.white },
    line: { color: C.lightGray, width: 1 },
    rectRadius: 0.15,
    shadow: { type: "outer", color: "000000", blur: 16, offset: 4, angle: 135, opacity: 0.18 },
  });

  // 二维码图片
  s.addImage({
    path: "./qrcode.png",
    x: 6.98, y: 2.12, w: 2.34, h: 2.34,
  });

  // 扫码提示文字
  s.addText("扫码立即体验", {
    x: 6.8, y: 4.5, w: 2.7, h: 0.38,
    fontSize: 13, bold: true, color: C.brand,
    align: "center", valign: "middle", margin: 0,
  });

  // 作者
  s.addText("Made with ❤ by 王吉林  ·  Powered by WorkBuddy AI", {
    x: 0.5, y: 5.22, w: 8.6, h: 0.3,
    fontSize: 11, color: C.gray, italic: true,
    align: "center", valign: "middle", margin: 0,
  });
}

// ===== WRITE FILE =====
pres
  .writeFile({ fileName: "EasyRecord_教程.pptx" })
  .then(() => console.log("✅ EasyRecord_教程.pptx 生成成功"))
  .catch((e) => { console.error("❌ 生成失败:", e); process.exit(1); });
