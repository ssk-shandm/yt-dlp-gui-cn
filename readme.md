# yt-dlp-gui-cn

这是一个基于 **Python Eel** 和 **Vue 3** 构建的桌面应用程序，它是`yt-dlp`的中文化图形化界面。

## 📥 快速上手 (推荐给所有用户)

您无需安装 Python 或配置任何复杂环境。对绝大多数用户来说，最简单的方式是直接下载打包好的程序。

1.  **前往Releases页面**：
    * **➡️ [点击这里进入下载页面](https://github.com/ssk-shandm/yt-dlp-gui-cn/releases)**

2.  **下载 .exe 文件**：
    * 在最新版本的 "Assets" 区域，找到名为 `yt-dlp-gui-cn.exe` 的文件并下载它。

3.  **直接运行**：
    * 下载完成后，双击 `.exe` 文件即可启动程序，无需安装。

---

## ✨ 主要功能

-   **链接分析**: 只需粘贴链接，即可获取视频的详细信息，包括封面预览、所有可用格式和字幕列表。
-   **快速下载**: 一键下载默认最高质量的视频和音频。
-   **自定义格式下载**:
    -   **独立格式下载**: 在可用格式列表中，自由选择任意分辨率、编码或码率的视频或音频进行下载。
    -   **DIY 合成下载**: 分别选择纯视频流和纯音频流，应用程序会自动将它们合并成一个完整的视频文件。
-   **字幕和元数据**:
    -   **字幕下载**: 下载指定语言的可用字幕。
    -   **封面和简介**: 单独下载视频封面和文字简介。
-   **实时终端**: 内置一个终端界面，实时显示 `yt-dlp` 的所有输出日志，让下载过程完全透明。

## 👨‍💻 开发者指南

以下内容适用于希望修改代码、贡献项目或从源码自行构建的用户。

### 环境要求

-   **Python 3.x**
-   **Node.js 和 npm/yarn/pnpm**
-   **FFmpeg**: 本项目需要 FFmpeg 来合并独立的视频和音频文件。
    1.  请从 [FFmpeg 官网](https://ffmpeg.org/download.html) 下载。
    2.  下载后，请在项目根目录（与 `main.py` 同级）下**自行创建一个 `bin` 文件夹**。
    3.  将解压后得到的 `ffmpeg.exe`、`ffplay.exe`、`ffprobe.exe` 文件放置在您刚刚创建的 `bin` 文件夹内。

### 从源码运行

1.  **克隆仓库**
    ```bash
    git clone https://github.com/ssk-shandm/yt-dlp-gui-cn.git
    cd yt-dlp-gui-cn
    ```

2.  **安装 Python 依赖**
    ```bash
    # 建议在虚拟环境中安装
    pip install eel ansi2html
    ```

3.  **安装并构建前端**
    ```bash
    # 根据你的项目结构，进入前端源码目录
    pnpm install
    pnpm run build
    ```

4.  **运行应用**
    回到项目根目录，运行主 Python 文件。
    ```bash
    python main.py
    ```

### 📦 如何打包成 EXE 文件

如果你修改了代码，可以按照以下步骤生成自己的 `.exe` 文件。

1.  **安装 PyInstaller**:
    ```bash
    pip install pyinstaller
    ```

2.  **确保 FFmpeg 已就位**: 运行打包前，**必须** 确保您已经按照 “环境要求” 中的说明，在项目根目录下创建了 `bin` 文件夹并放入了 `ffmpeg.exe`。PyInstaller 会将它一起打包进去。

3.  **确保前端已构建**: 运行打包前，**必须** 确保 `frontend/dist` 文件夹是最新的。

4.  **执行打包命令**: 在项目根目录运行：
    ```bash
    pyinstaller --noconfirm --onefile --windowed --name "yt-dlp-gui-cn" ^
    --add-data "frontend/dist;frontend/dist" ^
    --add-data "bin;bin" ^
    main.py
    ```

5.  **找到你的 EXE 文件**: 可执行文件位于 `dist/yt-dlp-gui-cn.exe`。

## 🛠️ 技术栈

-   **后端**: Python, Eel, yt-dlp
-   **前端**: Vue 3, TypeScript, Pinia, Vue Router, TDesign, Arco Design