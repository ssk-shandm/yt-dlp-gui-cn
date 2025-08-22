import eel
import subprocess
import locale
from ansi2html import Ansi2HTMLConverter
import os
import tkinter as tk
from tkinter import filedialog
import json
import sys

eel.init("./frontend/dist")


def get_bin_directory():
    """
    获取包含 ffmpeg.exe 的 bin 目录的路径
    """
    if getattr(sys, "frozen", False):
        base_path = sys._MEIPASS
    else:
        base_path = os.path.abspath(".")

    bin_path = os.path.join(base_path, "bin")
    return bin_path


# 启动时就获取路径，并存入全局变量
# 全局变量
bin_dir = get_bin_directory()
download_path = os.path.join(os.path.expanduser("~"), "Downloads")  # 默认下载目录
frontend_ready_flag = False


@eel.expose
def frontend_is_ready():
    """
    准备信号
    """
    global frontend_ready_flag
    frontend_ready_flag = True
    print("Frontend is ready.")


@eel.expose
def analyze_url(url):
    """
    一次性运行 yt-dlp --dump-json,获取所有需要的信息
    调用前端的函数来更新UI和Store。
    formatStore
    """
    print(f"开始全面分析 URL: {url}")
    try:
        command = ["yt-dlp", "--list-subs", "--dump-json", "--no-warnings", url]
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            encoding=locale.getpreferredencoding(),
            errors="ignore",
            check=True,
        )
        print("完整指令:", result)
        if not result.stdout:
            eel.update_terminal_output(
                "<br><b style='color:orange;'>未返回任何视频信息</b><br>"
            )
            return

        # 解析JSON
        video_info = None
        for line in result.stdout.strip().split("\n"):
            try:
                video_info = json.loads(line)
                if video_info:
                    break
            except json.JSONDecodeError:
                continue
        if not video_info:
            eel.update_terminal_output(
                "<br><b style='color:red;'>错误: 无法解析视频信息JSON</b><br>"
            )
            return

        # 发送封面URL
        thumbnail_url = video_info.get("thumbnail")
        if thumbnail_url:
            eel.receive_thumbnail_url(thumbnail_url)
            eel.update_terminal_output(
                f"<br><b>成功获取到封面链接:</b> {thumbnail_url}<br>"
            )

        # 处理并发送字幕列表
        subtitles_data = []
        if "subtitles" in video_info and video_info["subtitles"]:
            for lang_code, formats in video_info["subtitles"].items():
                format_strings = [file["ext"] for file in formats]
                subtitles_data.append(
                    {
                        "language": lang_code,
                        "formats": ", ".join(sorted(list(set(format_strings)))),
                    }
                )
        eel.receive_subtitle_list(subtitles_data)
        eel.update_terminal_output(
            f"<br><b>分析完成：找到 {len(subtitles_data)} 种语言的字幕。</b><br>"
        )

        # 处理并发送视频与音频列表
        # 计算视频大小
        def format_bytes(size):
            if size is None:
                return "N/A"
            power, n, labels = 1024, 0, {0: "", 1: "K", 2: "M", 3: "G", 4: "T"}
            while size > power and n < len(labels) - 1:
                size /= power
                n += 1
            return f"{size:.2f} {labels[n]}B"

        format_data = []
        if "formats" in video_info and video_info["formats"]:
            for f in video_info["formats"]:
                format_data.append(
                    {
                        "id": f.get("format_id"),
                        "ext": f.get("ext"),
                        "resolution": f.get("resolution"),
                        "fps": f.get("fps"),
                        "vcodec": f.get("vcodec", "none"),
                        "vbr": f"~{f.get('vbr')}kbps" if f.get("vbr") else None,
                        "acodec": f.get("acodec", "none"),
                        "abr": f"~{f.get('abr')}kbps" if f.get("abr") else None,
                        "filesize": format_bytes(
                            f.get("filesize") or f.get("filesize_approx")
                        ),
                        "tbr": f"~{f.get('tbr')}kbps" if f.get("tbr") else None,
                    }
                )
        eel.receive_format_list(format_data)
        eel.update_terminal_output(
            f"<br><b>分析完成：找到 {len(format_data)} 种可用格式。</b><br>"
        )

    except subprocess.CalledProcessError as e:
        error_message = e.stderr or e.stdout
        eel.update_terminal_output(
            f"<br><b style='color:red;'>分析失败: {error_message}</b><br>"
        )
        eel.receive_subtitle_list([])
        eel.receive_format_list([])
    except Exception as e:
        eel.update_terminal_output(
            f"<br><b style='color:red;'>分析时发生未知错误: {e}</b><br>"
        )
        eel.receive_subtitle_list([])
        eel.receive_format_list([])


@eel.expose
def run_ytdlp(url, retry):
    try:
        conv = Ansi2HTMLConverter()
        command = [
            "yt-dlp",
            "--ffmpeg-location",
            bin_dir,
            "-P",
            download_path,
            "--progress",
        ]
        if retry != "重试次数" and retry != 10:
            command.extend(["--retries", str(retry)])
        elif retry == "infinite":
            command.extend(["--retries", "infinite"])
        command.append(url)
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding=locale.getpreferredencoding(),
            errors="ignore",
            bufsize=1,
        )
        for line in iter(process.stdout.readline, ""):
            if not line:
                break
            eel.update_terminal_output(conv.convert(line, full=False))
            eel.sleep(0.01)
        process.wait()
        eel.update_terminal_output("<br><b>下载任务已完成或出错。</b><br>")
        return {"status": "success", "message": "快速下载已完成！"}
    except Exception as e:
        eel.update_terminal_output(
            f"<br><b style='color:red;'>执行下载时出错: {e}</b><br>"
        )
        return {"status": "error", "message": f"下载时发生错误: {e}"}


@eel.expose
def select_download_directory():
    """
    选择下载目录
    """
    root = None
    try:
        global download_path
        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        selected_path = filedialog.askdirectory()
        if selected_path:
            download_path = selected_path
            eel.receive_download_path(selected_path)
    except Exception as e:
        print(f"Error in select_download_directory: {e}")
    finally:
        if root:
            root.destroy()


@eel.expose
def download_cover_page(url):
    """
    下载封面
    """
    try:
        print(f"下载封面请求, URL: {url}")
        conv = Ansi2HTMLConverter()
        command = [
            "yt-dlp",
            "-P",
            download_path,
            "--write-all-thumbnails",
            "--skip-download",
            url,
        ]
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding=locale.getpreferredencoding(),
            errors="ignore",
            bufsize=1,
        )
        for line in iter(process.stdout.readline, ""):
            if not line:
                break
            eel.update_terminal_output(conv.convert(line, full=False))
            eel.sleep(0.01)
        process.wait()
        eel.update_terminal_output("<br><b>封面下载任务已完成或出错。</b><br>")
    except Exception as e:
        eel.update_terminal_output(
            f"<br><b style='color:red;'>下载封面时出错: {e}</b><br>"
        )


@eel.expose
def list_all_suppost_website():
    """
    罗列所有支持的网站源
    """
    try:
        print(f"罗列支持的网站...")
        conv = Ansi2HTMLConverter()
        command = ["yt-dlp", "--list-extractors"]
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding=locale.getpreferredencoding(),
            errors="ignore",
            bufsize=1,
        )
        for line in iter(process.stdout.readline, ""):
            if not line:
                break
            eel.update_terminal_output(conv.convert(line, full=False))
            eel.sleep(0.01)
    except Exception as e:
        eel.update_terminal_output(
            f"<br><b style='color:red;'>罗列支持网站时出错: {e}</b><br>"
        )


@eel.expose
def download_video_introduction(url):
    """
    下载视频描述或简介
    """
    try:
        print(f"下载视频描述或简介,URL: {url}")
        conv = Ansi2HTMLConverter()
        command = [
            "yt-dlp",
            "--write-description",
            "--skip-download",
            "-P",
            download_path,
            url,
        ]
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding=locale.getpreferredencoding(),
            errors="ignore",
            bufsize=1,
        )
        for line in iter(process.stdout.readline, ""):
            if not line:
                break
            eel.update_terminal_output(conv.convert(line, full=False))
            eel.sleep(0.01)
        process.wait()
        eel.update_terminal_output("<br><b>视频简介下载完成或出错。</b><br>")
    except Exception as e:
        eel.update_terminal_output(
            f"<br><b style='color:red;'>下载视频简介时出错: {e}</b><br>"
        )


@eel.expose
def download_specific_subtitle(url, lang_code):
    """
    下载指定的字幕
    """
    try:
        command = [
            "yt-dlp",
            "--write-sub",
            "--sub-langs",
            lang_code,
            "--skip-download",
            "-P",
            download_path,
            url,
        ]
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            encoding=locale.getpreferredencoding(),
            errors="ignore",
            check=True,
        )
        eel.update_terminal_output(f"<br><b>{lang_code} 字幕下载成功。</b><br>")
        return {"status": "success", "message": f"{lang_code} 字幕已下载到指定目录。"}
    except subprocess.CalledProcessError as e:
        error_message = e.stderr or e.stdout
        eel.update_terminal_output(
            f"<br><b style='color:red;'>下载字幕 {lang_code} 失败: {error_message}</b><br>"
        )
        return {"status": "error", "message": f"下载失败: {error_message}"}
    except Exception as e:
        eel.update_terminal_output(
            f"<br><b style='color:red;'>下载字幕 {lang_code} 时发生未知错误: {e}</b><br>"
        )
        return {"status": "error", "message": f"未知错误: {e}"}


@eel.expose
def download_specific_format(url, format_id):
    """
    下载指定格式的视频或音频
    """
    try:
        conv = Ansi2HTMLConverter()
        command = [
            "yt-dlp",
            "--ffmpeg-location",
            bin_dir,
            "-f",
            format_id,
            "-P",
            download_path,
            "--progress",
            url,
        ]
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding=locale.getpreferredencoding(),
            errors="ignore",
            bufsize=1,
        )
        for line in iter(process.stdout.readline, ""):
            if not line:
                break
            eel.update_terminal_output(conv.convert(line, full=False))
            eel.sleep(0.01)
        process.wait()
        eel.update_terminal_output("<br><b>下载任务已完成或出错。</b><br>")
        return {"status": "success", "message": "下载已完成"}
    except Exception as e:
        eel.update_terminal_output(f"<br><b style='color:red;'>下载出错: {e}</b><br>")
        return {"status": "error", "message": f"下载错误"}


@eel.expose
def download_diy_format(url, video_id, audio_id, container_format):
    """
    diy视频和音频质量合成下载
    """
    try:
        conv = Ansi2HTMLConverter()
        command = [
            "yt-dlp",
            "--ffmpeg-location",
            bin_dir,
            "-f",
            f"{video_id}+{audio_id}",
            "--merge-output-format",
            container_format,
            "-P",
            download_path,
            "--progress",
            url,
        ]
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding=locale.getpreferredencoding(),
            errors="ignore",
            bufsize=1,
        )
        for line in iter(process.stdout.readline, ""):
            if not line:
                break
            eel.update_terminal_output(conv.convert(line, full=False))
            eel.sleep(0.01)
        process.wait()
        eel.update_terminal_output("<br><b>DIY下载任务已完成或出错。</b><br>")
        return {"status": "success", "message": "DIY下载完成！"}
    except Exception as e:
        eel.update_terminal_output(
            f"<br><b style='color:red;'>DIY下载时出错: {e}</b><br>"
        )
        return {"status": "error", "message": "DIY下载时发生错误"}


try:
    print("正在启动应用...")
    eel.start("index.html", mode="edge", size=(1280, 720))
except Exception as e:
    print(f"启动或运行 Eel 应用时发生致命错误: {e}")