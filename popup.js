const toggle = document.getElementById('toggle');
const status = document.getElementById('status');
const downloadBtn = document.getElementById('downloadBtn');
const downloadText = document.getElementById('downloadText');
const downloadStatus = document.getElementById('downloadStatus');

const STORAGE_KEY = 'extensionEnabled';

let currentTabId = null;
let currentVideoUrl = null;

async function loadState() {
    try {
        const result = await chrome.storage.local.get(STORAGE_KEY);
        const isEnabled = result[STORAGE_KEY] !== false;
        toggle.checked = isEnabled;
        status.textContent = isEnabled ? 'Extension is active' : 'Extension is disabled';
    } catch (e) {
        toggle.checked = true;
        status.textContent = 'Extension is active';
    }
}

async function checkVideoPage() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTabId = tab.id;

    try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getVideoInfo' });
        if (response?.isVideoPage && response.videoUrl) {
            currentVideoUrl = response.videoUrl;
            downloadBtn.classList.remove('disabled');
            downloadBtn.disabled = false;
            downloadText.textContent = 'Download This Video';
        } else {
            currentVideoUrl = null;
            downloadBtn.classList.add('disabled');
            downloadBtn.disabled = true;
            downloadText.textContent = 'Not on video page';
        }
    } catch (e) {
        currentVideoUrl = null;
        downloadBtn.classList.add('disabled');
        downloadBtn.disabled = true;
        downloadText.textContent = 'Not on video page';
    }
}

toggle.addEventListener('change', async () => {
    const isEnabled = toggle.checked;
    status.textContent = isEnabled ? 'Extension is active' : 'Extension is disabled';
    try {
        await chrome.storage.local.set({ [STORAGE_KEY]: isEnabled });
        const tabs = await chrome.tabs.query({ url: '*://moodle.bgu.ac.il/*' });
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { action: 'stateChanged', enabled: isEnabled }).catch(() => {});
        });
    } catch (e) {}
});

downloadBtn.addEventListener('click', () => {
    if (!currentVideoUrl) return;

    downloadBtn.disabled = true;
    downloadText.textContent = 'Downloading...';
    downloadStatus.textContent = 'Starting download...';

    chrome.tabs.sendMessage(currentTabId, {
        action: 'downloadVideoFromPopup',
        videoUrl: currentVideoUrl
    }, (response) => {
        if (chrome.runtime.lastError) {
            downloadBtn.disabled = false;
            downloadText.textContent = 'Download This Video';
            downloadStatus.textContent = 'Error: ' + chrome.runtime.lastError.message;
            return;
        }

        if (response?.success) {
            downloadStatus.textContent = 'Download started!';
            setTimeout(() => {
                downloadBtn.disabled = false;
                downloadText.textContent = 'Download This Video';
                downloadStatus.textContent = '';
            }, 3000);
        } else {
            downloadBtn.disabled = false;
            downloadText.textContent = 'Download This Video';
            downloadStatus.textContent = 'Download failed';
        }
    });
});

loadState().then(checkVideoPage);