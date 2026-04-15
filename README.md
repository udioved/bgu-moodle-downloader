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

## Technical Details

### Architecture

The extension uses Chrome's Manifest V3 with the following components:

1. **Content Script** (`content.js`)
   - Injected into Moodle pages
   - Scans for video links (`viewvideo.php` URLs and direct `.mp4` sources)
   - Adds download buttons to video players and table rows
   - Communicates with background script for downloads

2. **Background Script** (`background.js`)
   - Service worker handling video fetching
   - Uses Chrome Downloads API
   - Implements caching via Cache API for large files
   - Fetches videos with proper Referer headers to bypass server restrictions

3. **Popup** (`popup.html` + `popup.js`)
   - On/off toggle UI
   - Instant state sync via Chrome Storage API
   - Broadcasts state changes to all content scripts

4. **Offscreen Document** (`offscreen.html` + `offscreen.js`)
   - Creates blob URLs from cached video data
   - Required for Manifest V3 downloads

5. **Network Rules** (`rules.json`)
   - Uses declarativeNetRequest to modify Referer headers
   - Allows video fetches from cloudfront.net

### How Downloads Work

1. User clicks download button
2. Content script extracts video URL from `<video>` element or `<source>` tags
3. Background script fetches video with `Referer: https://moodle.bgu.ac.il/`
4. Video is cached in browser Cache API
5. Offscreen document creates a blob URL
6. Chrome Downloads API saves the file

### Technologies Used

- **Chrome Extensions API** (Manifest V3)
- **Chrome Downloads API** - File saving
- **Cache API** - Video caching
- **Offscreen Documents** - Blob URL creation
- **declarativeNetRequest** - Header modification
- **Chrome Storage API** - State persistence
- **Web Navigation API** - Tab communication

### Files

- `manifest.json` - Extension configuration
- `content.js` - Page injection script
- `background.js` - Service worker for downloads
- `popup.html/js` - Toggle popup UI
- `offscreen.html/js` - Blob URL handling
- `rules.json` - Network request rules