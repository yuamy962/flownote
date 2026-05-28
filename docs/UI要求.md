好，方向明确：学生用户 + 高端简洁 + 工具产品。我的设计方向是：深色基底、冷白字体、金属光泽点缀、极简排版——像苹果和 Linear 的结合，让学生用起来有质感但不花哨。
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation-duration: 0.25s;
    animation-timing-function: cubic-bezier(0.19, 1, 0.22, 1);
  }
VvisualizeVvisualize show_widget五个页面都可以点击切换查看，设计方向总结如下：
视觉风格：深色精炼（Dark Refined）
背景用 5 层深色（#0a0a0c → #2c2c36），不是纯黑，带轻微暖调，避免廉价感。唯一的彩色点缀是金属金（#c8b87a），用在 logo、高亮按钮、时间戳、推荐标签上——克制但有辨识度。
字体：DM Sans + Noto Sans SC

DM Sans 负责标题和界面元素，字重 300（纤细）配合高端感
Noto Sans SC 保证中文正文的阅读舒适度
DM Mono 专用于时间戳、代码、数字数据，形成视觉节奏

三个核心差异化点：

状态标签用颜色区分转录通道（绿=字幕 / 蓝=GPU / 灰=CPU），信息一眼看清
定价卡片把「⚠ CPU 慢速」和「× 本地上传」的差距直观呈现，形成自然升级动力
结果页左右分栏，转录原文时间戳直接对应右侧笔记，符合学生边看边记的习惯