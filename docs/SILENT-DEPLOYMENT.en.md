[简体中文](SILENT-DEPLOYMENT.md) | **English**

# Silent deployment notice and confirmation

Intended for: deployers who install yt-dlp GUI in bulk with `/S` or another silent or passive method. Before distributing the installer, the deployer must read this document and complete the confirmation record at the end.

## Installed content

- The installer is an NSIS per-user installation. It does not bundle yt-dlp, FFmpeg, or ffprobe. On first use, the user downloads the tools from upstream sources to `bin/` on the local machine.
- The GUI itself is distributed under the project's MIT license. `licenses/gui/INSTALLER-NOTICE.txt` contains the MIT text and Microsoft's official WebView2 end-user terms, and the installer ships the same content.

## WebView2 Runtime

- When the target machine lacks the WebView2 Runtime, the installer silently runs Microsoft's official downloadBootstrapper, which downloads and installs from Microsoft over the network. This process **requires network access**. This installer does not include a complete offline runtime.
- The Runtime is a shared component maintained and automatically updated independently by Microsoft. Uninstalling the GUI does not remove it.
- If Microsoft Defender SmartScreen is enabled, it may send information to Microsoft. Privacy statement: https://aka.ms/privacy ; SmartScreen description: https://learn.microsoft.com/en-us/microsoft-edge/privacy-whitepaper#smartscreen . WebView2 itself may also collect usage information under Microsoft's terms.

## Impact of silent installation

- `/S` does not display the NSIS license page, so the installing person does not see the notice above. This document is intended to take the place of that display; the deployer should complete reading it before distribution.
- The deployer is responsible for arranging notice and consent for the endpoints it manages. This project does not obtain user consent on the deployer's behalf.

## Deployment confirmation record

Until this record is fully completed and signed, this silent deployment must not be considered to have completed the notice requirement.

| Item | Content |
|---|---|
| Deployer (organization / department) | |
| Owner | |
| Installer version | 2.0.1 |
| Target endpoint scope | |
| Confirmed the above notice and consented to silent installation of the WebView2 Runtime | Yes |
| Confirmation date | 2026-10-09 |
| Signature | |
