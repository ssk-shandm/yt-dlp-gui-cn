import type zh from '../zh-CN/updates'

const messages: typeof zh = {
  checking: 'Checking GitHub Releases…',
  latest: 'You are on the latest stable version.',
  waitingForTasks: 'Found v{version}. It will be installed after the current download or parsing task finishes.',
  downloadingInstaller: 'Downloading the v{version} installer…',
  downloadingProgress: 'Downloading the update installer…',
  noInstaller: 'Found v{version}, but this release has no Windows installer.',
  installerStarted: 'The installer has started. The app will close and restart after installation finishes.',
  autoDisabled: 'Automatic updates are off. Check and install manually when needed.',
  autoDisabledSkipped: 'Automatic updates are off, so this update was not downloaded or installed.',
  browserPreview: 'Installing updates is not supported in the browser preview. Use the desktop app.',
  prefReadError: 'Could not read local preferences. Automatic updates are on by default.',
  prefSaveError: 'Could not save local preferences. This choice only applies to the current session.',
  rateLimited: 'The GitHub API request was rate-limited. Please try again later.',
  noRelease: 'No release has been published on GitHub yet.',
  httpFailed: 'Update check failed (HTTP {status}).',
  timeout: 'Could not reach GitHub to check for updates: the request timed out.',
  networkFailed: 'Could not reach GitHub to check for updates. Check your network or system proxy settings.',
  noInstallerAsset: 'This release has no Windows NSIS installer for automatic installation.',
  initFailed: 'The update service failed to initialize: {error}',
  releaseVersionInvalid: 'The latest release has an invalid version number.',
  sha256Missing: 'This release is missing the installer SHA-256, so automatic installation was stopped. Verify it on the releases page and install manually.',
  sha256Invalid: 'The installer SHA-256 format is invalid, so automatic installation was stopped.',
}

export default messages
