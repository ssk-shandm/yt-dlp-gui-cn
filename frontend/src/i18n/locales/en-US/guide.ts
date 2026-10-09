import type zhCN from '../zh-CN/guide'

const messages: typeof zhCN = {
  progress: 'Beginner guide · {current} / {total}',
  skip: 'Skip',
  previous: 'Back',
  next: 'Next',
  finish: 'Finish',
  steps: {
    paste: {
      title: 'Paste a video link',
      description: 'Paste the video page URL here. HTTP and HTTPS video links are supported. This guide only explains the steps; it does not download anything or change settings.',
    },
    analyze: {
      title: 'Analyze link',
      description: 'Click “Analyze link” to read the thumbnail, available quality options, and subtitle information. Enter a video link first; the button is enabled only then.',
    },
    quickDownload: {
      title: 'Quick download',
      description: 'After analysis, click “Quick download” to automatically choose the best video and audio. Before analysis, the button is grey.',
    },
    customPage: {
      title: 'Custom download',
      description: 'To choose a specific quality, audio track, or subtitles, open “Customize”. The next steps cover the download settings there.',
    },
    directory: {
      title: 'Set download folder',
      description: 'Click “Download folder” to choose where files are saved. The current folder is shown below. Check the save location before downloading.',
    },
    retry: {
      title: 'Set retry limit',
      description: 'If a download fails, it retries according to this setting: 3, 5, or 10 times, or unlimited. Beginners should use a limited number to avoid repeated retries.',
    },
    subtitles: {
      title: 'Download subtitles',
      description: 'After analysis, the subtitle list shows available languages and formats. Click “Download” on a row to save that subtitle. An empty list means the link has no available subtitles or analysis is not finished.',
    },
    videoAudio: {
      title: 'Choose video and audio',
      description: 'In DIY download, choose the video quality and audio track separately. Options come from the analyzed video and may be empty if analysis is not finished or there are no separate tracks.',
    },
    container: {
      title: 'Choose output format',
      description: 'Choose the container format for the merged file. Quality and audio are set by the previous step; changing the container does not improve quality.',
    },
    customStart: {
      title: 'Start custom download',
      description: 'After checking the video, audio, and format, click “Download” to start a merged download. This can use a lot of CPU. This guide does not start a download.',
    },
    formatFilter: {
      title: 'Filter available formats',
      description: 'The available formats list can be filtered to video only, audio only, or video with audio. Use the sort control to compare resolution, size, or bitrate, then download the format you need.',
    },
    tasks: {
      title: 'View tasks',
      description: 'In “Downloads”, check running tasks, their completion status, and saved results.',
    },
    logs: {
      title: 'View detailed logs',
      description: 'If something goes wrong, open “Terminal” to see detailed information about analysis and downloads.',
    },
    copyLogs: {
      title: 'Copy logs to troubleshoot',
      description: 'When logs exist, click “Copy logs” to copy the terminal output and find the cause of a failure. Check for private information such as links before sharing. The button is disabled when there are no logs.',
    },
    tools: {
      title: 'Install download tools',
      description: 'Analysis and downloads need tools such as yt-dlp and FFmpeg. On the “About” page, click this button to choose the basic or full edition and install it. The first install needs internet access; this guide does not start the installation.',
    },
    updates: {
      title: 'Check for software updates',
      description: 'Click “Check and install update” to install the latest stable update manually, or turn on automatic checks in the settings above. The app restarts after a successful install, so finish current tasks first.',
    },
  },
}

export default messages
