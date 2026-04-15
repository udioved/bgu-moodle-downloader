# Moodle Video Downloader

Chrome extension for downloading lecture videos from Moodle BGU.

## Features

- Download videos directly from Moodle video player
- Add download buttons to video list pages
- On/off toggle to enable/disable the extension
- Real-time toggle updates - no page refresh needed
- Progress indicators during download

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the extension folder

## Usage

### Enable/Disable

Click the extension icon in Chrome to open the popup. Use the toggle to enable or disable the extension. Changes apply immediately to all open Moodle tabs.

### Download from Video Player

When viewing a video on Moodle, a "Download Video" button appears below the player.

### Download from Video List

In the video list page, a "Download" button appears in each row.

## How It Works

1. **Content Script** (`content.js`): Injected into Moodle pages, scans for video links and adds download buttons

2. **Background Script** (`background.js`): Handles video fetching and downloading via Chrome's Downloads API

3. **Popup** (`popup.html` + `popup.js`): Provides on/off toggle with instant state sync to all tabs

4. **Offscreen Document** (`offscreen.html` + `offscreen.js`): Creates blob URLs for video downloads

The extension fetches videos through the background script using proper Referer headers to bypass access restrictions, then saves them to your default download folder.

## Files

- `manifest.json` - Extension configuration
- `content.js` - Page injection script
- `background.js` - Service worker for downloads
- `popup.html/js` - Toggle popup UI
- `offscreen.html/js` - Blob URL handling
- `rules.json` - Network request rules