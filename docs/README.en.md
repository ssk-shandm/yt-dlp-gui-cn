[简体中文](README.md) | **English**

# Project Documentation

This directory keeps the valid documentation for the current **Vue 3 + Tauri 2 / Rust** version. The old Python/Eel, Docker, migration records and one-off update plans are no longer kept as project documentation.

For the project overview, features and quick start, see the [root README](../readme.en.md).

## Development and build

| Document | Purpose |
| --- | --- |
| [Development guide](DEVELOPMENT.en.md) | Environment setup, starting development, common commands, project file maintenance rules and settings |
| [Architecture and IPC](ARCHITECTURE.en.md) | Module boundaries, command and event protocol, process management and security |
| [Windows / NSIS build](BUILD.en.md) | Tool preparation, installer configuration, isolated test builds, release process |

## Testing and release

| Document | Purpose |
| --- | --- |
| [Testing and acceptance](TESTING.en.md) | Automated commands, verification records by run, manual checklists and out-of-scope items |
| [Release notes template](RELEASE_TEMPLATE.en.md) | User-facing release note format; excludes internal verification records |
| [Changelog](CHANGELOG.en.md) | Changes, fixes and known limitations for the current version |

## Licensing and deployment

| Document | Purpose |
| --- | --- |
| [Third-party tools and licenses](THIRD_PARTY.en.md) | Upstream sources, licenses and distribution notes; release notes do not list hashes |
| [License materials directory](../licenses/README.md) | Licenses, source notes and GUI dependency notices distributed with the installer |

## Suggested reading order

- **Starting development**: Development guide → Architecture and IPC.
- **Building the installer**: Windows / NSIS build → Third-party tools and licenses → Testing and acceptance.
- **Bulk deployment**: Windows / NSIS build build.
- **License review**: Third-party tools and licenses → [License review checklist](../licenses/RELEASE-CHECKLIST.md).
- **Understanding version changes**: Changelog → Testing and acceptance.

The old implementation is no longer kept in the current working tree; to view historical source, use the Git tags or commit history. For the rules that govern this directory, see the [Development guide](DEVELOPMENT.en.md#project-file-maintenance).
