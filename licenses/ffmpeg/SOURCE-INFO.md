# FFmpeg / ffprobe 源码获取说明

> **历史工具记录；当前 GUI 安装包不包含这些 EXE。历史工具重新分发准备未完成。** 本文是源码线索记录，不是 GPL 书面源码提供承诺，也不是已提供的完整对应源码。仅有 FFmpeg 上游提交和 configure 参数不包含静态依赖的准确版本、源码、补丁、许可通知及必要构建脚本。官方归档未完整下载，未与本地 EXE 比对。如需重新分发这些工具，应完成 licenses/RELEASE-CHECKLIST.md 中的历史工具待办。




历史本地开发目录记录的 `ffmpeg.exe` 和 `ffprobe.exe` 是 Gyan FFmpeg Windows x64 Essentials static build。当前运行时下载使用 BtbN 供应方，这份旧 Gyan 记录不代表实际下载结果。

## 对应构建

- 构建版本：FFmpeg 9.0.2
- 构建日期：2026-09-19
- 构建标识：`9.0.2-essentials_build-www.gyan.dev`
- 构建归档：`ffmpeg-9.0.2-essentials_build.zip`
- 构建归档官方下载地址：<https://github.com/GyanD/codexffmpeg/releases/download/9.0.2/ffmpeg-9.0.2-essentials_build.zip>
- 构建归档 SHA-256：`60f467265b1e312373dbcd92200c2618a74850f98d3d078e94296bb3fa2047ba`
- Gyan 构建页：<https://www.gyan.dev/ffmpeg/builds/>

## 对应源代码

Gyan 在 9.0.2 发布记录中指向以下 FFmpeg 源代码提交：

- FFmpeg 源代码提交：<https://github.com/FFmpeg/FFmpeg/commit/946fcce07b>
- FFmpeg 源代码仓库：<https://github.com/FFmpeg/FFmpeg>

如无法访问网页，可在 FFmpeg 仓库中检出该提交：

```text
git clone https://github.com/FFmpeg/FFmpeg.git
git -C FFmpeg checkout 946fcce07b
```

## 本构建配置

本机 `ffmpeg.exe -buildconf` 报告的配置如下。`ffprobe.exe` 自报相同构建标识；本地文件尚未与该官方归档逐一比对：

```text
--enable-gpl
--enable-version3
--enable-static
--disable-w32threads
--disable-autodetect
--enable-cairo
--enable-fontconfig
--enable-iconv
--enable-gnutls
--enable-libxml2
--enable-gmp
--enable-bzlib
--enable-lzma
--enable-zlib
--enable-libsrt
--enable-libssh
--enable-libzmq
--enable-avisynth
--enable-sdl2
--enable-libwebp
--enable-libx264
--enable-libx265
--enable-libxvid
--enable-libaom
--enable-libopenjpeg
--enable-libvpx
--enable-mediafoundation
--enable-libass
--enable-libfreetype
--enable-libfribidi
--enable-libharfbuzz
--enable-libvidstab
--enable-libvmaf
--enable-libzimg
--enable-amf
--enable-cuda-llvm
--enable-cuvid
--enable-dxva2
--enable-d3d11va
--enable-d3d12va
--enable-ffnvcodec
--enable-libvpl
--enable-nvdec
--enable-nvenc
--enable-vaapi
--enable-openal
--enable-libgme
--enable-libopenmpt
--enable-libopencore-amrwb
--enable-libmp3lame
--enable-libtheora
--enable-libvo-amrwbenc
--enable-libgsm
--enable-libopencore-amrnb
--enable-libopus
--enable-libspeex
--enable-libvorbis
--enable-librubberband
```

> 注：上面的列表按本地工具输出记录。若替换二进制，必须重新运行 `ffmpeg.exe -buildconf` 并更新本文件。若构建供应方对上游源代码、第三方库或构建脚本做了修改，也必须同时提供对应修改后的源码和构建材料；本文件不能替代该义务。

## 许可

该构建启用了 GPL 组件和 version3 组件。本目录保留 `COPYING.LGPLv2.1.txt`、`COPYING.GPLv2.txt` 和 `COPYING.GPLv3.txt` 作为历史参考材料，静态依赖的完整许可和版权通知尚未收集，不能据此认为已完成审核。实际许可应以构建中包含的组件和对应来源为准。
