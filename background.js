const CACHE_NAME = 'video-downloads';
const CACHE_KEY = 'https://video-cache.local/current';

async function ensureOffscreenDocument() {
    const offscreenUrl = chrome.runtime.getURL('offscreen.html');
    const contexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [offscreenUrl]
    });
    if (contexts.length === 0) {
        await chrome.offscreen.createDocument({
            url: offscreenUrl,
            reasons: ['BLOBS'],
            justification: 'Create blob URL for video download'
        });
    }
}

async function cleanupCache() {
    try {
        const cache = await caches.open(CACHE_NAME);
        await cache.delete(CACHE_KEY);
    } catch (e) {
        // Ignore cleanup errors
    }
}

function extractFilename(videoUrl) {
    try {
        const url = new URL(videoUrl);
        const parts = url.pathname.split('/');
        const hash = parts[parts.length - 1];
        return hash || 'video.mp4';
    } catch {
        return 'video.mp4';
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'blobUrlReady') {
        if (request.error) {
            console.error('[Moodle DL] Offscreen error:', request.error);
            return false;
        }

        const filename = request.filename || 'video.mp4';
        chrome.downloads.download({
            url: request.url,
            filename: filename,
            saveAs: true
        }).then(downloadId => {
            console.log('[Moodle DL] Download started, ID:', downloadId);
        }).catch(err => {
            console.error('[Moodle DL] Download failed:', err);
        });
        return false;
    }
    
    if (request.action === 'downloadVideo') {
        const { videoUrl } = request;
        const filename = extractFilename(videoUrl);
        console.log('[Moodle DL] Fetching:', videoUrl);
        
        fetch(videoUrl, {
            headers: { 'Referer': 'https://moodle.bgu.ac.il/' }
        })
            .then(response => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.blob();
            })
            .then(async blob => {
                console.log('[Moodle DL] Got blob:', (blob.size / 1024 / 1024).toFixed(1), 'MB');
                
                const cache = await caches.open(CACHE_NAME);
                await cache.put(CACHE_KEY, new Response(blob));
                
                await ensureOffscreenDocument();
                
                chrome.runtime.sendMessage({
                    action: 'downloadFromCache',
                    filename: filename
                });
                
                sendResponse({ success: true });
            })
            .catch(err => {
                console.error('[Moodle DL] Error:', err);
                cleanupCache();
                sendResponse({ success: false, error: err.message });
            });
        
        return true;
    }
});
