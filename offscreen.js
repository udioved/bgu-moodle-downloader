const CACHE_NAME = 'video-downloads';
const CACHE_KEY = 'https://video-cache.local/current';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'downloadFromCache') {
        caches.open(CACHE_NAME)
            .then(cache => cache.match(CACHE_KEY))
            .then(response => {
                if (!response) throw new Error('No cached video found');
                return response.blob();
            })
            .then(async blob => {
                const url = URL.createObjectURL(blob);
                console.log('[Moodle Offscreen] Blob URL created:', (blob.size / 1024 / 1024).toFixed(1), 'MB');
                
                chrome.runtime.sendMessage({
                    action: 'blobUrlReady',
                    url: url,
                    filename: request.filename || 'video.mp4'
                });
                
                // Clean up cache after blob URL is created
                const cache = await caches.open(CACHE_NAME);
                await cache.delete(CACHE_KEY);
            })
            .catch(err => {
                console.error('[Moodle Offscreen] Error:', err);
                chrome.runtime.sendMessage({
                    action: 'blobUrlReady',
                    error: err.message
                });
            });
        return false;
    }
});
