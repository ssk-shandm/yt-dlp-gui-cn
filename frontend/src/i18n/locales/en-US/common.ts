import type common from '../zh-CN/common'

const messages: typeof common = {
  appName: 'GrabMeta',
  switchLanguageLabel: '中文',
  switchLanguageTitle: 'Switch to 中文',
  workspace: 'Workspace',
  mainNav: 'Main navigation',
  pageContent: 'Page content',
  beginnerGuide: 'Beginner guide',
  toolMissing: 'No usable download tool is installed yet. Install one before analyzing or downloading.',
  installTools: 'Install tools',
  terminalBanner: 'GrabMeta v{version} — Tauri desktop app',
  pages: {
    links: {
      title: 'Video Link',
      eyebrow: 'Get Started',
      description: 'Start from one link to analyze the video and get the best quality.',
    },
    content: {
      title: 'Custom Options',
      eyebrow: 'Custom Download',
      description: 'Choose video, audio and subtitles to get exactly what you need.',
    },
    downloads: {
      title: 'Downloads',
      eyebrow: 'Task Management',
      description: 'Review the download tasks and completion status for this session.',
    },
    terminal: {
      title: 'Terminal',
      eyebrow: 'Run Logs',
      description: 'Watch tool output in real time to find problems during analysis and download.',
    },
    about: {
      title: 'About',
      eyebrow: 'Project Info',
      description: 'Learn about the app, open-source licenses and project details.',
    },
  },
  proxy: {
    formLabel: 'Local VPN / proxy settings',
    title: 'Local VPN / Proxy',
    intro: 'Start your VPN client first, then enter the local HTTP / SOCKS5 proxy address it provides. This setting does not install or start a VPN, and does not change the system proxy.',
    enableLabel: 'Enable local VPN / proxy',
    enable: 'Enable',
    urlLabel: 'Local proxy address',
    saving: 'Saving…',
    save: 'Save proxy settings',
    examples: 'Examples: http://127.0.0.1:7890 or socks5://127.0.0.1:1080. Use the port from your client. Only local addresses (localhost / loopback IP) are accepted; addresses with a username or password are not supported.',
    scope: 'Saved settings apply to newly started link analysis, video / subtitle / thumbnail downloads, tool downloads and app updates. Running tasks are not affected. Turn this off to restore the original system / environment network settings. If your client only offers TUN mode, you do not need this option.',
    saved: 'Saved. New requests will use the local proxy. Make sure your VPN client is running.',
    disabled: 'Local proxy override turned off. Original network settings restored.',
  },
  desktop: {
    failed: 'Operation failed',
    previewOnly: 'Browser preview only. Run npm run desktop:dev to start the desktop app.',
    ready: 'Tauri desktop app is ready. Download folder: {path}',
    concurrency: 'Media fragment concurrency: {count}. No download speed limit is set. Direct links, site restrictions and proxy routes still affect actual speed.',
    unavailable: 'Desktop service unavailable',
    analyzeDone: 'Analysis complete',
    analyzeDefault: 'Video information retrieved',
    chooseDirectory: 'Choose download folder',
    settingsNotReady: 'Settings are not initialized yet',
    proxyPreviewOnly: 'Local VPN / proxy settings cannot be saved in browser preview. Use the desktop app.',
    operationHint: 'Notice',
    invalidSubtitle: 'Invalid URL or language code',
    externalLinkBlocked: 'This link is not in the allowed project links list.',
  },
}

export default messages
