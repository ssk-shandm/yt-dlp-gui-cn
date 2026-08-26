# 使用官方Python运行时作为基础镜像
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    ffmpeg \
    git \
    wget \
    curl \
    xvfb \
    x11-utils \
    && rm -rf /var/lib/apt/lists/*

# 安装Node.js和pnpm（用于前端构建）
RUN apt-get update && apt-get install -y nodejs npm \
    && npm install -g pnpm \
    && rm -rf /var/lib/apt/lists/*

# 复制项目文件
COPY . /app/

# 设置Python环境变量
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1

# 安装Python依赖
RUN pip install --upgrade pip && \
    pip install eel ansi2html yt-dlp

# 构建前端
RUN cd /app/frontend && \
    pnpm install && \
    pnpm run build && \
    cd /app

# 创建下载目录
RUN mkdir -p /app/downloads /app/config

# 设置环境变量
ENV DOWNLOAD_PATH=/app/downloads
ENV CONFIG_PATH=/app/config

# 暴露端口
EXPOSE 8080 8000

# 启动应用
CMD ["python", "main.py"]
