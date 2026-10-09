import type zh from '../../zh-CN/codes/core'

const en: typeof zh = {
  task: {
    analyzing: 'Fetching video information',
    analyzed: 'Link analysis complete',
    started: 'Task started',
    completed: 'Task completed',
    cancelled: 'Task cancelled',
    timeout: 'Task timed out. Check your network and try again.',
  },
  log: {
    started: 'Started: {detail}',
    completed: '{detail} completed',
  },
  kind: {
    analyze: 'Link analysis',
    quick: 'Quick download',
    format: 'Format download',
    combined: 'Combined audio and video download',
    subtitle: 'Subtitle download',
    thumbnail: 'Thumbnail download',
    description: 'Description download',
    sites: 'Supported sites',
  },
  settings: {
    pathNotAbsolute: 'The download directory must be an absolute path.',
    pathInvalid: 'The download directory contains invalid characters.',
    directoryCreateFailed: 'Could not create the download directory: {detail}',
    saveFailed: 'Could not save settings: {detail}',
    lockUnavailable: 'Settings are temporarily unavailable.',
    concurrentFragmentsRange: 'Concurrent fragments must be between 1 and 16.',
    retriesInvalid: 'Retries must be an integer from 0 to 100, or infinite.',
  },
  url: {
    invalid: 'Enter a valid video URL.',
    unsupportedScheme: 'Only HTTP or HTTPS video links are supported.',
    credentials: 'Video links cannot contain a username or password.',
  },
  proxy: {
    invalid: 'Enter a local proxy address, such as http://127.0.0.1:7890 or socks5://127.0.0.1:1080.',
    initFailed: 'Could not initialize the local proxy.',
  },
  input: {
    invalidFormatId: 'Invalid format ID.',
    invalidSubtitleLanguage: 'Invalid subtitle language.',
  },
  download: {
    unsupportedContainer: 'Unsupported container format.',
  },
  process: {
    lockUnavailable: 'Task state is temporarily unavailable.',
    closing: 'The app is closing.',
    tooManyTasks: 'Up to 4 tasks can run at once. Wait or cancel an existing task.',
    taskNotFound: 'The task has already finished or does not exist.',
    toolDirectoryFailed: 'Could not determine the tools directory: {detail}',
    toolDirectoryUnknown: 'Could not determine the app directory.',
    readFailed: 'Could not read yt-dlp output: {detail}',
    outputTooLarge: 'Metadata output exceeds the 16 MB limit.',
    spawnFailed: 'Could not start yt-dlp: {detail}',
    stdoutUnavailable: 'Could not read standard output.',
    stderrUnavailable: 'Could not read error output.',
    waitFailed: 'Waiting for yt-dlp to finish failed: {detail}',
    failed: 'yt-dlp failed. See the terminal log for details.',
  },
  metadata: {
    parseFailed: 'Could not parse video information JSON: {detail}',
  },
}

export default en
