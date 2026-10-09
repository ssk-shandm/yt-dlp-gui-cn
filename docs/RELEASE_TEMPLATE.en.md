[简体中文](RELEASE_TEMPLATE.md) | **English**

# v<version> — <main theme of this release>

<Summarize in one or two sentences the main value this release brings to users.>

## What's new

- **<change title>**: <describe the user-visible feature added, improved or fixed.>
- **<change title>**: <describe another actual change; delete entries that do not apply.>

## Download and install

On this page, under **Assets**, download `<installer file name>`, run the installer and follow the prompts to complete the installation. Existing users can also check for updates on the About page.

On first launch, the installer guides you through downloading yt-dlp, FFmpeg and ffprobe and installing them to the local `bin/` folder. You do not need to install Python, Node.js or Rust separately. The full-build tools can be downloaded again from the About page.

## Notes for use

- Only **Windows x64** is supported.
- <Describe, as applicable, the installer signing status, any SmartScreen warning and notes on the download source.>
- If WebView2 is missing, the installer may download the runtime over the network; this package is not a fully offline installer.
- Automatic updates apply only to installed NSIS builds; development and portable builds will not replace the program automatically.
- Download and process only content you are entitled to access, and comply with the terms of the target websites.

## File information

| Item | Details |
| --- | --- |
| Installer | `<installer file name>` |
| Platform | Windows x64 |
| Size | <bytes> bytes (about <MiB> MiB) |

Release notes no longer record the installer hash. Please download from this project's GitHub Release page and confirm that the release asset name matches the version.
