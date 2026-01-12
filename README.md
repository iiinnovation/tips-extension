# Tips - Smart Content Clipper

<p align="center">
  <img src="icons/icon128.png" alt="Tips Logo" width="128" height="128">
</p>

<p align="center">
  <strong>选中文字，一键保存为 Markdown</strong><br>
  <em>Select text, save as Markdown with one shortcut</em>
</p>

<p align="center">
  <a href="#功能特性">功能</a> •
  <a href="#安装方法">安装</a> •
  <a href="#使用方法">使用</a> •
  <a href="#隐私说明">隐私</a> •
  <a href="#许可证">许可证</a>
</p>

---

## 功能特性

### 🚀 一键保存
选中任意网页文字，按 `Option+S` (Mac) 或 `Alt+S` (Windows) 立即保存。无需点击，无需弹窗。

### 📝 智能 Markdown 转换
自动将 HTML 转换为干净的 Markdown，保留：
- 代码块（带语法高亮标识）
- 链接和 URL
- 粗体、斜体等格式
- 列表和引用

### 🏷️ 标签管理
- 所有内容默认保存到「快速收集」
- 自定义标签分类整理
- 按标签、日期、来源筛选

### 🔍 全文搜索
跨内容、标签、来源即时搜索，快速定位所需内容。

### 💡 今日回顾
每天打开扩展时随机展示一条收藏，帮你回顾遗忘的内容，解决「收藏即遗忘」问题。

### 📤 导出功能
一键导出全部内容为 Markdown 文件，带完整的 frontmatter（来源、日期、标签）。

### 🌓 自动主题
跟随系统亮色/暗色模式，自动切换界面主题。

### 🔒 本地存储
所有数据存储在浏览器本地，不上传任何服务器，无需注册账号。

---

## 安装方法

### 方式一：开发者模式安装

1. 下载本仓库代码（点击 Code → Download ZIP）

2. 解压到任意文件夹

3. 打开 Chrome，访问 `chrome://extensions/`

4. 开启右上角 **开发者模式**

5. 点击 **加载已解压的扩展程序**，选择解压后的文件夹

### 方式二：Chrome 商店安装

即将上线...

---

## 使用方法

### 保存内容

1. 在任意网页选中想保存的文字
2. 按快捷键：
   - **Mac**: `Option + S`
   - **Windows/Linux**: `Alt + S`
3. 看到 ✓ 提示即保存成功

### 管理内容

点击浏览器工具栏的 Tips 图标，可以：

| 操作 | 说明 |
|------|------|
| 搜索 | 在顶部搜索框输入关键词 |
| 筛选 | 点击「今天」「本周」或标签按钮 |
| 查看详情 | 点击任意卡片 |
| 编辑标签 | 在详情页点击「编辑标签」 |
| 复制内容 | 在详情页点击「复制内容」 |
| 导出 | 点击右上角导出按钮 |
| 设置 | 点击右上角齿轮按钮 |

### 自动清理

扩展会自动清理超过 90 天的旧内容（可在设置中调整）。

---

## 项目结构

```
tips/
├── manifest.json           # 扩展配置
├── background.js           # 后台服务
├── content/
│   ├── content.js          # 内容脚本（快捷键监听）
│   ├── content.css         # Toast 通知样式
│   └── html-to-md.js       # HTML 转 Markdown
├── popup/
│   ├── popup.html          # 弹窗页面
│   ├── popup.js            # 弹窗逻辑
│   └── popup.css           # 弹窗样式
├── icons/                  # 扩展图标
├── privacy.html            # 隐私政策
├── STORE_LISTING.md        # 商店上架信息
├── LICENSE                 # MIT 许可证
└── README.md               # 本文件
```

---

## 权限说明

| 权限 | 用途 |
|------|------|
| `storage` | 本地存储收藏内容 |
| `unlimitedStorage` | 突破 5MB 存储限制 |
| `activeTab` | 获取当前页面信息 |
| `clipboardWrite` | 支持复制功能 |
| `alarms` | 定时自动清理 |

---

## 隐私说明

- ✅ 所有数据存储在本地浏览器
- ✅ 不收集任何用户信息
- ✅ 不发送数据到外部服务器
- ✅ 无需注册账号
- ✅ 无广告、无追踪

详见 [隐私政策](privacy.html)

---

## 开发

```bash
# 克隆仓库
git clone https://github.com/iinnovation/tips-extension.git

# 在 Chrome 中加载
# 1. 打开 chrome://extensions/
# 2. 开启开发者模式
# 3. 加载已解压的扩展程序 → 选择项目文件夹
```

---

## 许可证

[MIT License](LICENSE) © 2025 iinnovation

---

<p align="center">
  如果觉得有用，欢迎 ⭐ Star 支持！
</p>
