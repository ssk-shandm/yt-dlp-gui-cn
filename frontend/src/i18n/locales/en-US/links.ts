import type zh from '../zh-CN/links'

const messages: typeof zh = {
  eyebrow: 'Video cover',
  status: {
    fetching: 'Fetching info',
    fetched: 'Cover ready',
    waiting: 'Waiting for analysis',
  },
  preview: {
    ariaPreview: 'Preview video cover',
    alt: 'Video cover preview',
    enlarge: 'Enlarge',
  },
  empty: {
    analyzing: 'Analyzing video…',
    failed: 'Cover could not be loaded',
    none: 'No video cover',
    analyzingHint: 'Reading the cover, formats and subtitles',
    failedHint: 'Video info can still be used for downloads. Check your network and try again.',
    noneHint: 'The cover will appear here after you paste a link and analyze it.',
  },
  form: {
    label: 'Video link',
    placeholder: 'Paste a video link, e.g. https://…',
    analyzing: 'Analyzing…',
    analyze: 'Analyze link',
    hint: 'Press Enter to analyze · After analysis, choose formats on the "Content Processing" page',
  },
  quick: {
    title: 'Best quality in one click',
    description: 'Automatically picks the best video and audio. No setup needed.',
    button: 'Quick download',
  },
  notice: {
    title: 'Notice',
    pasteFirst: 'Paste a video link first',
    invalidUrl: 'Enter a valid URL',
    analyzing: 'Analyzing',
    analyzingDesc: 'Fetching video info, please wait...',
    downloadFirst: 'Analyze the link before downloading',
    downloadStarted: 'Download started',
    downloadStartedDesc: 'The download task has started. Check the terminal output.',
  },
}

export default messages
