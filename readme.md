# yt-dlp GUI 中文版

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)
![Vue](https://img.shields.io/badge/Vue-3.0+-green.svg)

这是一个基于 **Python Eel** 和 **Vue 3** 构建的跨平台桌面应用程序，为 `yt-dlp` 提供了一个友好的中文图形化界面。

## ✨ 核心功能

### 📊 链接分析
- 快速获取视频详细信息
- 实时预览视频封面
- 显示所有可用格式和分辨率
- 提供字幕列表查询

### ⬇️ 灵活下载
- **快速下载**：一键下载最高质量版本
- **自定义格式**：从表格中选择具体分辨率、编码格式进行下载
- **组合下载**：分别选择视频流和音频流，自动合成完整视频
- **字幕支持**：支持下载多语言字幕

### 🎬 媒体处理
- 自动合并视频和音频流（基于 FFmpeg）
- 获取并保存视频封面
- 下载视频元数据和简介

### 💻 实时反馈
- 内置终端界面，实时显示所有操作日志
- 完整的错误提示和操作指导
- 进度提示和下载状态监控

---

## 🚀 快速开始

### 方案 1：直接使用 EXE（推荐新手）

无需任何配置，最简单快速的方式：

1. **下载可执行文件**
   - 进入 [Releases 页面](https://github.com/ssk-shandm/yt-dlp-gui-cn/releases)
   - 下载最新版本的 `yt-dlp-gui-cn.exe`

2. **运行程序**
   - 双击 `.exe` 文件即可启动
   - 无需安装任何依赖

### 方案 2：使用 Docker（推荐开发者）

通过 Docker 快速部署，适合所有操作系统：

#### 前置要求
- 安装 [Docker](https://docs.docker.com/get-docker/)
- 安装 [Docker Compose](https://docs.docker.com/compose/install/)

#### 快速启动

```bash
# 1. 克隆仓库
git clone https://github.com/ssk-shandm/yt-dlp-gui-cn.git
cd yt-dlp-gui-cn

# 2. 启动容器
docker-compose up -d

# 3. 访问应用
# Web 版本: http://localhost:8080
# 本地应用会自动启动
```

#### Docker 配置说明

项目包含 `Dockerfile` 和 `docker-compose.yml`：

```yaml
version: '3.8'
services:
  yt-dlp-gui:
    build: .
    ports:
      - “8080:8080”
    volumes:
      - ./downloads:/app/downloads
      - ./config:/app/config
    environment:
      - DOWNLOAD_PATH=/app/downloads
      - FFMPEG_PATH=/app/bin/ffmpeg
```

**卷挂载说明：**
- `./downloads`：视频下载目录
- `./config`：应用配置目录

**环境变量：**
- `DOWNLOAD_PATH`：设置下载目录路径
- `FFMPEG_PATH`：FFmpeg 可执行文件路径

#### 查看日志

```bash
docker-compose logs -f yt-dlp-gui
```

#### 停止容器

```bash
docker-compose down
```

### 方案 3：从源码开发运行

适合希望修改代码和贡献的开发者。

#### 环境要求

- **Python 3.8+**
- **Node.js 14+** 和 **pnpm**
- **FFmpeg**：用于视频音频合并

#### 安装步骤

1. **克隆仓库**
   ```bash
   git clone https://github.com/ssk-shandm/yt-dlp-gui-cn.git
   cd yt-dlp-gui-cn
   ```

2. **配置 FFmpeg**
   - 从 [FFmpeg 官网](https://ffmpeg.org/download.html) 下载
   - 在项目根目录创建 `bin` 文件夹
   - 将 `ffmpeg.exe`、`ffplay.exe`、`ffprobe.exe` 放入 `bin` 文件夹

3. **安装 Python 依赖**
   ```bash
   # 建议使用虚拟环境
   python -m venv venv
   
   # 激活虚拟环境
   # Windows:
   venv\Scripts\activate
   # Linux/Mac:
   source venv/bin/activate
   
   # 安装依赖
   pip install eel ansi2html yt-dlp
   ```

4. **构建前端**
   ```bash
   cd frontend
   pnpm install
   pnpm run build
   cd ..
   ```

5. **运行应用**
   ```bash
   python main.py
   ```

---

## 📦 项目打包

如修改了代码，可生成自己的 `.exe` 文件。

### 打包前检查清单

- ✅ `frontend/dist` 文件夹已更新
- ✅ `bin` 文件夹中包含 FFmpeg 三个可执行文件
- ✅ 所有依赖已安装

### 打包步骤

```bash
# 1. 安装 PyInstaller
pip install pyinstaller

# 2. 执行打包命令
pyinstaller --noconfirm --onefile --windowed ^
  --name “yt-dlp-gui-cn” ^
  --add-data “frontend/dist;frontend/dist” ^
  --add-data “bin;bin” ^
  --icon “icon.ico” ^
  main.py

# 3. 找到生成的 EXE
# 输出路径: dist/yt-dlp-gui-cn.exe
```

打包后的文件大小约 100-150MB（包含 FFmpeg）。

---

## 🏗️ 项目结构

```
yt-dlp-gui-cn/
├── main.py                    # 后端主文件（Python Eel）
├── frontend/                  # 前端源代码
│   ├── src/
│   │   ├── pages/            # 页面组件
│   │   ├── components/       # 可复用组件
│   │   ├── stores/           # Pinia 状态管理
│   │   └── router/           # Vue Router 配置
│   ├── dist/                 # 构建输出（打包时使用）
│   └── package.json
├── bin/                       # FFmpeg 可执行文件目录
├── Dockerfile                 # Docker 镜像定义
├── docker-compose.yml         # Docker 编排配置
└── icon.ico                   # 应用图标
```

---

## 🛠️ 技术栈

| 层级 | 技术 |
|-----|------|
| **后端** | Python, Eel, yt-dlp, FFmpeg |
| **前端** | Vue 3, TypeScript, Vite, Pinia |
| **UI 框架** | TDesign, Arco Design |
| **容器化** | Docker, Docker Compose |

---

## 📋 支持的网站

该应用基于 `yt-dlp` 构建，支持 **1000+** 个视频网站，包括：

- YouTube
- 抖音、B站、小红书
- Netflix、Disney+
- Instagram、TikTok
- Twitch、Dailymotion
- 等等...

查看完整列表：[yt-dlp 支持的网站](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md)

---

## ⚙️ 配置选项

### 下载设置

| 选项 | 说明 | 默认值 |
|-----|------|--------|
| 下载目录 | 视频保存路径 | `~/Downloads` |
| 重试次数 | 网络失败重试次数 | 5 次 |
| 代理设置 | HTTP/HTTPS 代理 | 无 |

### 下载境外视频

如需下载被地域限制的视频：
- 使用 VPN 或代理软件
- 在系统全局代理设置中配置
- 应用会自动使用系统代理

---

## 🐛 故障排除

### 问题：分析失败或无法获取格式信息

**解决方案：**
1. 确保网络连接正常
2. 更新 yt-dlp：`pip install --upgrade yt-dlp`
3. 查看终端输出获取详细错误信息

### 问题：下载速度慢

**解决方案：**
1. 检查网络连接
2. 尝试使用代理加速
3. 下载较低分辨率的视频

### 问题：音视频合成失败

**解决方案：**
1. 确认 FFmpeg 已正确安装
2. 检查 `bin` 文件夹中是否有三个 FFmpeg 文件
3. 重启应用后重试

### Docker 相关问题

**无法连接到 Docker 守护进程：**
```bash
# Windows - 确保 Docker Desktop 正在运行
# Linux - 添加用户到 docker 组
sudo usermod -aG docker $USER
```

---

## 🔧 开发指南

### 前端开发

```bash
cd frontend

# 安装依赖
pnpm install

# 启动开发服务器（热重载）
pnpm run dev

# 类型检查
pnpm run type-check

# 代码格式化
pnpm run format

# 生产构建
pnpm run build
```

### 后端开发

修改 `main.py` 后无需重启，Eel 会自动重新加载前端。

### 关键 Python 函数

| 函数 | 说明 |
|------|------|
| `analyze_url(url)` | 分析链接获取格式信息 |
| `run_ytdlp(url, retry)` | 快速下载 |
| `download_specific_format()` | 下载指定格式 |
| `download_cover_page()` | 下载封面 |
| `select_download_directory()` | 选择下载目录 |

---

## 🤝 贡献指南

欢迎提交 Pull Request 或报告问题！

### 提交流程

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/AmazingFeature`
3. 提交更改：`git commit -m 'Add AmazingFeature'`
4. 推送到分支：`git push origin feature/AmazingFeature`
5. 提交 Pull Request

### 代码规范

- 前端：遵循 Vue 3 最佳实践，使用 Composition API
- 后端：遵循 PEP 8 Python 代码规范
- 提交信息：使用清晰、描述性的中文或英文

---

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

---

## 📞 联系与支持

- 🐛 **报告问题**：[GitHub Issues](https://github.com/ssk-shandm/yt-dlp-gui-cn/issues)
- 💬 **讨论功能**：[GitHub Discussions](https://github.com/ssk-shandm/yt-dlp-gui-cn/discussions)
- ⭐ **喜欢本项目**？请给个 Star！

---

## 🙏 致谢

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - 强大的视频下载工具
- [Python Eel](https://github.com/ChrisKnott/Eel) - 桌面应用框架
- [Vue 3](https://vuejs.org/) - 前端框架
- [TDesign](https://tdesign.tencent.com/) - UI 组件库

---

## 📝 更新日志

### v1.0.0 (2025-08-26)
- ✨ 发布首个版本
- 🎨 优化 UI 交互体验
- 🐳 添加 Docker 支持
- 📚 完善文档说明
- 🔧 改进格式筛选功能

---

祝您使用愉快！🎉