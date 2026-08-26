# Docker 快速启动指南

本指南帮助您快速使用 Docker 运行 yt-dlp GUI 应用。

## 前置要求

- **Docker Desktop**（Windows/Mac）或 **Docker Engine**（Linux）
- **Docker Compose**（通常已包含在 Docker Desktop 中）

### 安装 Docker

- **Windows/Mac**：[下载 Docker Desktop](https://www.docker.com/products/docker-desktop)
- **Linux**：
  ```bash
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh
  ```

---

## 快速启动

### 1. 克隆/进入项目目录

```bash
git clone https://github.com/ssk-shandm/yt-dlp-gui-cn.git
cd yt-dlp-gui-cn
```

### 2. 启动容器

```bash
docker-compose up -d
```

首次运行会下载镜像并构建，需要 5-10 分钟。

### 3. 访问应用

- **Web 界面**：http://localhost:8080
- **API 端口**：http://localhost:8000

### 4. 查看日志

```bash
docker-compose logs -f yt-dlp-gui
```

### 5. 停止容器

```bash
docker-compose down
```

---

## 使用说明

### 下载文件位置

所有下载的视频默认保存在项目目录的 `downloads` 文件夹中。

```bash
# 项目结构
yt-dlp-gui-cn/
├── docker-compose.yml
├── Dockerfile
├── downloads/          # 视频下载目录
│   └── video_name.mp4
├── config/            # 应用配置目录
└── ...
```

### 修改下载目录

编辑 `docker-compose.yml` 中的卷挂载：

```yaml
volumes:
  - /your/custom/path:/app/downloads  # 改为你的路径
  - ./config:/app/config
```

### 配置环境变量

在 `docker-compose.yml` 中修改 `environment` 部分：

```yaml
environment:
  - DOWNLOAD_PATH=/app/downloads
  - CONFIG_PATH=/app/config
```

---

## 常见问题

### Q: Docker 镜像太大怎么办？

**A:** 镜像包含了 Python、Node.js 和 FFmpeg。正常大小为 800MB-1GB。
- 可使用多阶段构建减少大小（需修改 Dockerfile）
- 使用轻量级基础镜像如 Alpine（某些依赖可能不兼容）

### Q: 无法连接到 Docker 守护进程

**A:** 
- **Windows/Mac**：确保 Docker Desktop 正在运行
- **Linux**：
  ```bash
  sudo systemctl start docker
  # 或添加用户到 docker 组
  sudo usermod -aG docker $USER
  newgrp docker
  ```

### Q: 下载速度慢

**A:** 这是网络问题，不是容器问题。尝试：
- 使用 VPN 或代理
- 在系统中配置代理，容器会继承

### Q: 如何重启容器？

**A:**
```bash
docker-compose restart yt-dlp-gui
```

### Q: 如何完全重建镜像？

**A:**
```bash
docker-compose down
docker-compose up -d --build
```

---

## 在 Linux 上使用 GUI

如在 Linux 上想要图形界面，需要额外配置：

```bash
# 添加 DISPLAY 环境变量
export DISPLAY=:0

# 启动前授予 X11 访问权限
xhost +local:docker

docker-compose up -d
```

---

## 在远程服务器上运行

### 配置反向代理（Nginx）

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 使用 SSH 隧道本地访问

```bash
ssh -L 8080:localhost:8080 user@remote-server
# 然后访问 http://localhost:8080
```

---

## 性能优化

### 限制资源使用

编辑 `docker-compose.yml`：

```yaml
services:
  yt-dlp-gui:
    # ... 其他配置
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 512M
```

### 启用日志轮转

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

---

## 调试技巧

### 进入容器命令行

```bash
docker exec -it yt-dlp-gui-cn /bin/bash
```

### 查看容器详细信息

```bash
docker inspect yt-dlp-gui-cn
```

### 查看实时资源使用

```bash
docker stats yt-dlp-gui-cn
```

### 查看完整日志

```bash
docker logs yt-dlp-gui-cn | head -100  # 最后100行
docker logs --tail 50 yt-dlp-gui-cn    # 最后50行
```

---

## 清理工作

### 删除容器和镜像

```bash
# 停止并删除容器
docker-compose down

# 删除镜像
docker rmi yt-dlp-gui-cn:latest

# 删除所有未使用的镜像
docker image prune -a
```

---

## 获取帮助

- 📖 [Docker 官方文档](https://docs.docker.com/)
- 🐛 [项目 Issues](https://github.com/ssk-shandm/yt-dlp-gui-cn/issues)
- 💬 [项目 Discussions](https://github.com/ssk-shandm/yt-dlp-gui-cn/discussions)
