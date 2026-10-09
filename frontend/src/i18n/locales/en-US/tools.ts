import type zhCN from '../zh-CN/tools'

const messages: typeof zhCN = {
  eyebrow: 'Download tools · from upstream',
  heading: {
    manage: 'Manage download tools',
    setup: 'Set up your download tools',
  },
  intro: 'The app does not bundle third-party EXE files. Choose an FFmpeg build; the program verifies the downloaded files before installing them into the local bin folder.',
  profileLegend: 'Choose tool version',
  profile: {
    basic: {
      title: 'Basic',
      tag: 'Recommended',
      license: 'FFmpeg LGPL static build',
      description: 'For common downloads, merging audio and video, and remuxing. Does not include GPL encoding libraries such as libx264 / libx265.',
      size: 'Smaller · about 200 MB total download and up',
    },
    full: {
      title: 'Full',
      license: 'FFmpeg GPL static build',
      description: 'Adds GPL encoding libraries for users who need more encoding, filter and post-processing options.',
      size: 'More features · about 230 MB total download and up',
    },
  },
  note: 'Both profiles use the same yt-dlp. Sizes change with upstream releases. You can upgrade Basic to Full at any time from the About page. Upstream tools are subject to their own licenses.',
  progressLabel: 'Tool download progress',
  cancelling: 'Cancelling…',
  cancel: 'Cancel install',
  close: 'Close',
  later: 'Install later',
  installing: 'Installing…',
  retry: 'Retry install',
  install: 'Download and install',
  offlineNote: 'The first install needs a network connection. Large files use up to 4 connections; if the connection is slow, cancel and retry. A failed download or cancellation does not replace installed tools. Without tools, videos cannot be parsed or downloaded.',
  remaining: {
    seconds: 'Estimated time left: {n} s',
    minutes: 'Estimated time left: {n} min',
  },
  progress: {
    detail: '{stage}: {percent}% ({downloaded} / {total} MiB)',
  },
  status: {
    reading: 'Reading upstream versions and preparing the download…',
    cancelling: 'Cancelling and cleaning up temporary files…',
    cancelled: 'Tool install cancelled. Existing tools were kept unchanged.',
    failed: 'Install did not succeed. Existing tools were kept unchanged; check your network and try again.',
    installedBasic: 'Basic tools installed successfully.',
    installedFull: 'Full tools installed successfully.',
  },
  errors: {
    browserPreview: 'Tools cannot be downloaded in the browser preview. Please use the desktop app.',
    activeTasks: 'Download or parse tasks are still running. Wait for them to finish before installing tools.',
    incomplete: 'The tool installation result is incomplete. Please try again.',
  },
}

export default messages
