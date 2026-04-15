const LOG_PREFIX = '[Moodle DL] ';

const STORAGE_KEY = 'extensionEnabled';

let enabled = true;

function log(...args) {
    console.log(LOG_PREFIX, ...args);
}

async function checkEnabled() {
    try {
        const result = await chrome.storage.local.get(STORAGE_KEY);
        enabled = result[STORAGE_KEY] !== false;
        log('Extension enabled:', enabled);
    } catch (e) {
        enabled = true;
    }
}

chrome.storage.onChanged.addListener((changes, area) => {
    if (changes[STORAGE_KEY]) {
        enabled = changes[STORAGE_KEY].newValue !== false;
        log('Extension state changed:', enabled);
        if (enabled) {
            init();
        } else {
            removeButtons();
        }
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'stateChanged') {
        enabled = message.enabled;
        log('Received state change:', enabled);
        if (enabled) {
            init();
        } else {
            removeButtons();
        }
    }

    if (message.action === 'getVideoInfo') {
        const videoPlayer = document.getElementById('my-player');
        if (!videoPlayer) {
            sendResponse({ isVideoPage: false });
            return;
        }

        let videoUrl = null;
        const sources = videoPlayer.querySelectorAll('source');
        for (const source of sources) {
            const src = source.getAttribute('src') || source.src;
            if (isValidVideoUrl(src)) {
                videoUrl = src;
                break;
            }
        }
        if (!videoUrl && videoPlayer.src && isValidVideoUrl(videoPlayer.src)) {
            videoUrl = videoPlayer.src;
        }

        sendResponse({ isVideoPage: true, videoUrl: videoUrl });
        return true;
    }

    if (message.action === 'downloadVideoFromPopup') {
        if (!enabled) {
            sendResponse({ success: false, error: 'Extension disabled' });
            return true;
        }

        const videoUrl = message.videoUrl;
        if (!videoUrl) {
            sendResponse({ success: false, error: 'No video URL' });
            return true;
        }

        chrome.runtime.sendMessage({
            action: 'downloadVideo',
            videoUrl: videoUrl
        }, (response) => {
            if (chrome.runtime.lastError) {
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
                return;
            }
            sendResponse(response || { success: false });
        });
        return true;
    }
});

function getVideoLinks() {
    return [...document.querySelectorAll('a[href*="viewvideo.php"]')]
        .filter(a => a.href.includes('moodle.bgu.ac.il'));
}

function isValidVideoUrl(url) {
    if (!url || typeof url !== 'string') return false;
    return url.includes('.mp4')
        && !url.includes('mini')
        && !url.includes('thumb')
        && !url.includes('.png')
        && !url.includes('.jpg');
}

function waitForVideoSrc(popup, timeout = 5000) {
    return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = timeout / 500;

        function check() {
            try {
                const sources = popup.document.querySelectorAll('#my-player source');
                for (const source of sources) {
                    const src = source.getAttribute('src') || source.src;
                    if (isValidVideoUrl(src)) { resolve(src); return; }
                }
                const video = popup.document.querySelector('#my-player video');
                if (isValidVideoUrl(video?.src)) { resolve(video.src); return; }
            } catch (e) { /* cross-origin or closed */ }

            if (attempts++ < maxAttempts) {
                setTimeout(check, 500);
            } else {
                resolve(null);
            }
        }

        setTimeout(check, 1500);
    });
}

/* ── Styles ─────────────────────────────────────────── */

function injectStyles() {
    if (document.getElementById('mdl-dl-styles')) return;

    const style = document.createElement('style');
    style.id = 'mdl-dl-styles';
    style.textContent = `
        .mdl-dl-link {
            display: inline;
            margin-right: 6px;
            color: #0a7da4;
            cursor: pointer;
            font-size: 12px;
            font-family: sans-serif;
            text-decoration: underline;
            text-decoration-style: dotted;
            position: relative;
            white-space: nowrap;
        }
        .mdl-dl-link:hover { color: #065a75; }
        .mdl-dl-link.mdl-dl-busy {
            color: #888;
            pointer-events: none;
        }
        .mdl-dl-link.mdl-dl-done {
            color: #2e7d32;
            text-decoration: none;
        }
        .mdl-dl-link.mdl-dl-fail {
            color: #c62828;
            text-decoration: none;
        }

        .mdl-dl-tip {
            position: absolute;
            bottom: calc(100% + 6px);
            left: 50%;
            transform: translateX(-50%);
            background: #333;
            color: #fff;
            font-size: 11px;
            padding: 4px 10px;
            border-radius: 4px;
            white-space: nowrap;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.15s ease;
            z-index: 1000;
        }
        .mdl-dl-tip::after {
            content: '';
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            border: 5px solid transparent;
            border-top-color: #333;
        }
        .mdl-dl-tip.mdl-dl-tip-visible { opacity: 1; }

        .mdl-dl-tip-bar {
            display: block;
            height: 2px;
            margin-top: 3px;
            border-radius: 1px;
            background: #555;
            overflow: hidden;
        }
        .mdl-dl-tip-bar-fill {
            display: block;
            height: 100%;
            width: 0%;
            background: #4fc3f7;
            transition: width 0.3s ease;
            border-radius: 1px;
        }

        /* ── Video Player Button Styles ─────────────────── */
        .mdl-player-buttons {
            display: flex;
            padding: 12px 0;
            gap: 8px;
        }

        .mdl-download-btn {
            background-color: #F28C20;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 14px;
            font-family: sans-serif;
            font-weight: 500;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            transition: all 0.2s ease;
            position: relative;
            overflow: hidden;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }

        .mdl-download-btn:hover:not(:disabled) {
            background-color: #D97A1A;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
            transform: translateY(-1px);
        }

        .mdl-download-btn:active:not(:disabled) {
            transform: translateY(0);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .mdl-download-btn:disabled {
            cursor: not-allowed;
            background-color: #D97A1A;
        }

        .mdl-download-btn.mdl-download-success {
            background-color: #2e7d32;
        }

        .mdl-download-btn.mdl-download-error {
            background-color: #c62828;
        }

        /* Progress bar inside button */
        .mdl-download-btn::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            height: 2px;
            width: 0%;
            background-color: rgba(255, 255, 255, 0.4);
            transition: width 0.3s ease;
        }

        .mdl-download-btn.mdl-download-progress::after {
            width: var(--progress, 0%);
        }

        /* Table-specific button styling */
        .mdl-download-table-btn {
            padding: 6px 12px;
            font-size: 13px;
            white-space: nowrap;
        }

        /* Table cell styling */
        .mdl-dl-button-cell {
            text-align: center;
            padding: 8px !important;
        }
    `;
    document.head.appendChild(style);
}

/* ── Download Button (for video player) ────────────── */

function createDownloadButton(videoUrl) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mdl-download-btn';
    button.textContent = '↓ Download Video';

    let progressInterval = null;

    function setState(state, text, percent) {
        button.disabled = state !== 'idle';
        button.className = 'mdl-download-btn';

        switch (state) {
            case 'idle':
                if (progressInterval) clearInterval(progressInterval);
                progressInterval = null;
                button.textContent = '↓ Download Video';
                button.disabled = false;
                break;
            case 'opening':
                button.classList.add('mdl-download-progress');
                button.textContent = '⊙ Opening...';
                button.style.setProperty('--progress', '10%');
                break;
            case 'fetching':
                button.classList.add('mdl-download-progress');
                const pct = Math.round(percent || 0);
                button.textContent = `↓ ${pct}%`;
                button.style.setProperty('--progress', `${pct}%`);
                break;
            case 'saving':
                button.classList.add('mdl-download-progress');
                button.textContent = '↓ Saving...';
                button.style.setProperty('--progress', '95%');
                break;
            case 'success':
                if (progressInterval) clearInterval(progressInterval);
                progressInterval = null;
                button.classList.add('mdl-download-success', 'mdl-download-progress');
                button.textContent = '✓ Saved';
                button.style.setProperty('--progress', '100%');
                break;
            case 'error':
                if (progressInterval) clearInterval(progressInterval);
                progressInterval = null;
                button.classList.add('mdl-download-error');
                button.textContent = '✗ Failed';
                button.style.setProperty('--progress', '0%');
                break;
        }
    }

    button.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (button.disabled) return;

        // Check if videoUrl is already a direct video URL (ends with .mp4, etc.)
        const isDirectVideoUrl = /\.(mp4|webm|ogg|m3u8)$/i.test(videoUrl);

        if (isDirectVideoUrl) {
            // Direct download path - video URL is already available
            log('Direct video URL, starting download:', videoUrl);

            let progress = 25;
            setState('fetching', '', progress);

            progressInterval = setInterval(() => {
                if (progress < 85) {
                    progress += Math.random() * 5;
                    setState('fetching', '', progress);
                }
            }, 500);

            chrome.runtime.sendMessage({
                action: 'downloadVideo',
                videoUrl: videoUrl
            }, (response) => {
                if (progressInterval) clearInterval(progressInterval);
                progressInterval = null;

                if (chrome.runtime.lastError) {
                    log('Message error:', chrome.runtime.lastError.message);
                    setState('error');
                    setTimeout(() => setState('idle'), 4000);
                    return;
                }

                if (response?.success) {
                    setState('saving');
                    setTimeout(() => {
                        setState('success');
                        setTimeout(() => setState('idle'), 4000);
                    }, 1000);
                } else {
                    setState('error');
                    setTimeout(() => setState('idle'), 4000);
                }
            });
        } else {
            // Popup path - need to extract video from viewvideo.php page
            setState('opening');

            let popup;
            try {
                popup = window.open(videoUrl);
            } catch (err) {
                log('Popup blocked:', err);
                setState('error');
                setTimeout(() => setState('idle'), 4000);
                return;
            }

            if (!popup) {
                setState('error');
                setTimeout(() => setState('idle'), 4000);
                return;
            }

            popup.onload = async () => {
                const src = await waitForVideoSrc(popup);
                popup.close();

                if (!src || !isValidVideoUrl(src)) {
                    setState('error');
                    setTimeout(() => setState('idle'), 4000);
                    return;
                }

                log('Found video:', src);

                let progress = 25;
                setState('fetching', '', progress);

                progressInterval = setInterval(() => {
                    if (progress < 85) {
                        progress += Math.random() * 5;
                        setState('fetching', '', progress);
                    }
                }, 500);

                chrome.runtime.sendMessage({
                    action: 'downloadVideo',
                    videoUrl: src
                }, (response) => {
                    if (progressInterval) clearInterval(progressInterval);
                    progressInterval = null;

                    if (chrome.runtime.lastError) {
                        log('Message error:', chrome.runtime.lastError.message);
                        setState('error');
                        setTimeout(() => setState('idle'), 4000);
                        return;
                    }

                    if (response?.success) {
                        setState('saving');
                        setTimeout(() => {
                            setState('success');
                            setTimeout(() => setState('idle'), 4000);
                        }, 1000);
                    } else {
                        setState('error');
                        setTimeout(() => setState('idle'), 4000);
                    }
                });
            };
        }
    };

    return button;
}

/* ── Download Link ──────────────────────────────────── */

function createDownloadLink(videoUrl) {
    const link = document.createElement('span');
    link.className = 'mdl-dl-link';
    link.textContent = '\u2193 Save video';

    const tip = document.createElement('span');
    tip.className = 'mdl-dl-tip';
    link.appendChild(tip);

    let progressInterval = null;

    function showTip(text, percent) {
        const bar = percent !== undefined
            ? `<span class="mdl-dl-tip-bar"><span class="mdl-dl-tip-bar-fill" style="width:${percent}%"></span></span>`
            : '';
        tip.innerHTML = text + bar;
        tip.classList.add('mdl-dl-tip-visible');
    }

    function hideTip() {
        tip.classList.remove('mdl-dl-tip-visible');
    }

    function cleanup() {
        if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
        }
    }

    function setState(state, text, percent) {
        link.className = 'mdl-dl-link';

        switch (state) {
            case 'idle':
                cleanup();
                link.textContent = '\u2193 Save video';
                link.appendChild(tip);
                hideTip();
                break;
            case 'opening':
                link.classList.add('mdl-dl-busy');
                link.textContent = '\u25CC Opening\u2026';
                link.appendChild(tip);
                showTip(text || 'Opening video page\u2026', 10);
                break;
            case 'fetching':
                link.classList.add('mdl-dl-busy');
                link.textContent = `\u2193 ${Math.round(percent || 0)}%`;
                link.appendChild(tip);
                showTip(text || 'Downloading video\u2026', percent);
                break;
            case 'saving':
                link.classList.add('mdl-dl-busy');
                link.textContent = '\u2193 Saving\u2026';
                link.appendChild(tip);
                showTip('Saving to disk\u2026', 95);
                break;
            case 'success':
                cleanup();
                link.classList.add('mdl-dl-done');
                link.textContent = '\u2713 Saved';
                link.appendChild(tip);
                showTip('Download complete!', 100);
                break;
            case 'error':
                cleanup();
                link.classList.add('mdl-dl-fail');
                link.textContent = '\u2717 Failed';
                link.appendChild(tip);
                showTip(text || 'Download failed', 0);
                break;
        }
    }

    /* Hover tooltip */
    link.onmouseenter = () => {
        if (!link.classList.contains('mdl-dl-busy')
            && !link.classList.contains('mdl-dl-done')
            && !link.classList.contains('mdl-dl-fail')) {
            showTip('Click to download');
        }
    };
    link.onmouseleave = () => {
        if (!link.classList.contains('mdl-dl-busy')
            && !link.classList.contains('mdl-dl-done')
            && !link.classList.contains('mdl-dl-fail')) {
            hideTip();
        }
    };

    /* Click handler */
    link.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (link.classList.contains('mdl-dl-busy')) return;

        setState('opening');

        let popup;
        try {
            popup = window.open(videoUrl);
        } catch (err) {
            log('Popup blocked:', err);
            setState('error', 'Popup blocked');
            setTimeout(() => setState('idle'), 4000);
            return;
        }

        if (!popup) {
            setState('error', 'Popup blocked');
            setTimeout(() => setState('idle'), 4000);
            return;
        }

        popup.onload = async () => {
            setState('opening', 'Finding video source\u2026');

            const src = await waitForVideoSrc(popup);
            popup.close();

            if (!src || !isValidVideoUrl(src)) {
                setState('error', 'Video not found');
                setTimeout(() => setState('idle'), 4000);
                return;
            }

            log('Found video:', src);

            let progress = 25;
            setState('fetching', 'Downloading video\u2026', progress);

            progressInterval = setInterval(() => {
                if (progress < 85) {
                    progress += Math.random() * 5;
                    setState('fetching', 'Downloading video\u2026', progress);
                }
            }, 500);

            chrome.runtime.sendMessage({
                action: 'downloadVideo',
                videoUrl: src
            }, (response) => {
                cleanup();

                if (chrome.runtime.lastError) {
                    log('Message error:', chrome.runtime.lastError.message);
                    setState('error', 'Extension error');
                    setTimeout(() => setState('idle'), 4000);
                    return;
                }

                if (response?.success) {
                    setState('saving');
                    setTimeout(() => {
                        setState('success');
                        setTimeout(() => setState('idle'), 4000);
                    }, 1000);
                } else {
                    setState('error', response?.error || 'Download failed');
                    setTimeout(() => setState('idle'), 4000);
                }
            });
        };
    };

    return link;
}

/* ── Download Table Button (for video list page) ──── */

function createDownloadTableButton(videoUrl) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mdl-download-btn mdl-download-table-btn';
    button.textContent = '↓ Download';

    let progressInterval = null;

    function setState(state, percent) {
        button.disabled = state !== 'idle';
        button.className = 'mdl-download-btn mdl-download-table-btn';

        switch (state) {
            case 'idle':
                if (progressInterval) clearInterval(progressInterval);
                progressInterval = null;
                button.textContent = '↓ Download';
                button.disabled = false;
                break;
            case 'opening':
                button.classList.add('mdl-download-progress');
                button.textContent = '⊙ Opening...';
                button.style.setProperty('--progress', '10%');
                break;
            case 'fetching':
                button.classList.add('mdl-download-progress');
                const pct = Math.round(percent || 0);
                button.textContent = `↓ ${pct}%`;
                button.style.setProperty('--progress', `${pct}%`);
                break;
            case 'saving':
                button.classList.add('mdl-download-progress');
                button.textContent = '↓ Saving...';
                button.style.setProperty('--progress', '95%');
                break;
            case 'success':
                if (progressInterval) clearInterval(progressInterval);
                progressInterval = null;
                button.classList.add('mdl-download-success', 'mdl-download-progress');
                button.textContent = '✓ Saved';
                button.style.setProperty('--progress', '100%');
                break;
            case 'error':
                if (progressInterval) clearInterval(progressInterval);
                progressInterval = null;
                button.classList.add('mdl-download-error');
                button.textContent = '✗ Failed';
                button.style.setProperty('--progress', '0%');
                break;
        }
    }

    button.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (button.disabled) return;

        setState('opening');

        let popup;
        try {
            popup = window.open(videoUrl);
        } catch (err) {
            log('Popup blocked:', err);
            setState('error');
            setTimeout(() => setState('idle'), 4000);
            return;
        }

        if (!popup) {
            setState('error');
            setTimeout(() => setState('idle'), 4000);
            return;
        }

        popup.onload = async () => {
            const src = await waitForVideoSrc(popup);
            popup.close();

            if (!src || !isValidVideoUrl(src)) {
                setState('error');
                setTimeout(() => setState('idle'), 4000);
                return;
            }

            log('Found video:', src);

            let progress = 25;
            setState('fetching', progress);

            progressInterval = setInterval(() => {
                if (progress < 85) {
                    progress += Math.random() * 5;
                    setState('fetching', progress);
                }
            }, 500);

            chrome.runtime.sendMessage({
                action: 'downloadVideo',
                videoUrl: src
            }, (response) => {
                if (progressInterval) clearInterval(progressInterval);
                progressInterval = null;

                if (chrome.runtime.lastError) {
                    log('Message error:', chrome.runtime.lastError.message);
                    setState('error');
                    setTimeout(() => setState('idle'), 4000);
                    return;
                }

                if (response?.success) {
                    setState('saving');
                    setTimeout(() => {
                        setState('success');
                        setTimeout(() => setState('idle'), 4000);
                    }, 1000);
                } else {
                    setState('error');
                    setTimeout(() => setState('idle'), 4000);
                }
            });
        };
    };

    return button;
}

/* ── Init ───────────────────────────────────────────── */

function addVideoPlayerButton() {
    const videoPlayer = document.getElementById('my-player');
    if (!videoPlayer) return;

    // Check if button already added
    if (document.querySelector('.mdl-player-buttons')) return;

    injectStyles();

    // Extract the video URL from the video element - prioritize direct video URLs
    let videoUrl = null;
    
    // Try to get from source tags (direct video URLs are preferred)
    const sources = videoPlayer.querySelectorAll('source');
    for (const source of sources) {
        const src = source.getAttribute('src') || source.src;
        if (isValidVideoUrl(src)) {
            videoUrl = src;
            log('Found direct video URL from source:', videoUrl);
            break;
        }
    }

    // Try to get from video.src attribute
    if (!videoUrl && videoPlayer.src && isValidVideoUrl(videoPlayer.src)) {
        videoUrl = videoPlayer.src;
        log('Found direct video URL from video.src:', videoUrl);
    }

    // Fallback: try to find a video link on the page (viewvideo.php page)
    if (!videoUrl) {
        const videoLinks = getVideoLinks();
        if (videoLinks.length > 0) {
            videoUrl = videoLinks[0].href;
            log('Using viewvideo.php link:', videoUrl);
        }
    }

    if (!videoUrl) {
        log('No video URL found for player button');
        return;
    }

    // Create container and button
    const container = document.createElement('div');
    container.className = 'mdl-player-buttons';
    
    const button = createDownloadButton(videoUrl);
    container.appendChild(button);

    // Insert after video player
    videoPlayer.parentNode.insertBefore(container, videoPlayer.nextSibling);

    log('Added download button to video player');
}

function addDownloadButtons() {
    injectStyles();

    const links = getVideoLinks();
    log('Found', links.length, 'video links');

    links.forEach(link => {
        const row = link.closest('tr');
        if (!row) return;

        // Check if button already exists
        if (row.querySelector('.mdl-dl-button-cell')) return;

        // Create a new table cell for the button
        const buttonCell = document.createElement('td');
        buttonCell.className = 'cell c2 mdl-dl-button-cell';
        
        // Create the download button
        const dlButton = createDownloadTableButton(link.href);
        buttonCell.appendChild(dlButton);

        // Insert after the last existing cell
        row.appendChild(buttonCell);
    });
}

// Initialize extension
async function init() {
    await checkEnabled();
    if (!enabled) {
        log('Extension is disabled');
        return;
    }
    addDownloadButtons();
    addVideoPlayerButton();
}

function removeButtons() {
    document.querySelectorAll('.mdl-dl-link, .mdl-player-buttons, .mdl-dl-button-cell').forEach(el => el.remove());
    log('Removed download buttons');
}

init().then(() => {
    setTimeout(init, 1000);
});
