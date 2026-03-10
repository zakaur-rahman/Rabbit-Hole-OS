# Cognode Desktop Update System

## Architecture Overview
The Cognode Desktop Update System is a custom, modular update engine built purely on standard Node APIs within Electron to avoid heavy third-party framework (like `electron-updater`) lock-in, enabling fine-grained control over progress UI and installation behaviors.

### Modules:
1. **UpdateEngine**: Orchestrates the entire lifecycle. Listens to events, initiates checks manually or on intervals (every 6 hours).
2. **ReleaseService**: Communicates with the GitHub Releases API (`https://api.github.com/repos/zakaur-rahman/Rabbit-Hole-OS/releases`). Parses tags, filters by channel (stable, beta, nightly), and extracts version semantic text.
3. **UpdateChecker**: Compares the app's current semantic version against the fetched GitHub release version.
4. **UpdateDownloader**: Uses Electron's native `net.request` and standard filesystem Streams to download the standalone NSIS executable directly to the `userData` directory. Supports partial resuming (byte Ranges), pausing, canceling, and emits upload speed and percentage automatically.
5. **UpdateInstaller**: Spawns the downloaded NSIS executable with the `/S` flag for atomic quiet installation. Force-closes tracking instances so Windows avoids locked binary errors.

### UI Experience
- **Update Modal**: The main entry point in the application (Next.js frontend). Continuously monitors `window.electron.updater.onStateChanged`. When an update is detected, it renders the modal, exposing options to Download, Pause, Resume, or Cancel. Gives the user contextual buttons based on state. 
- **Settings Modal Integration**: In the `Updates` tab of user settings, the user can manually check for an update and select their preferred Release Channel (`stable`, `beta`, `nightly`).
- **Changelogs**: To avoid bundling markdown parsers in the desktop client and to maintain a live web presence, the update metadata links back directly to `https://cognode.tech/changelog?version=X`.

## Release Workflow / CI CD
Releases are automatically parsed by the `ReleaseService` directly from GitHub tags.
1. When semantic-release or the standard GitHub Release Workflow creates a release in this repository.
2. Ensure you have Windows binaries (.exe usually built by `electron-builder` `nsis` target) attached to those releases in GitHub.
3. The Updater looks for `v1.2.3` standard tags, verifies if it's a prerelease depending on the channel selection, parses the `browser_download_url` for the executable, and begins stream processing it locally.

## File Breakdown
- `apps/desktop/electron/updater/*`: Core architecture logic
- `apps/desktop/electron/services/releaseService.ts`: GitHub API fetch logic
- `apps/frontend/components/updater/*`: Modals and progress bars 
- `apps/frontend/types/updateTypes.ts`: Cross-platform shared TypeScript interfaces
- `apps/web/app/changelog/page.tsx`: Live renderer for release markdown logs.
