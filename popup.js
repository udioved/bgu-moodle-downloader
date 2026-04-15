const toggle = document.getElementById('toggle');
const status = document.getElementById('status');

const STORAGE_KEY = 'extensionEnabled';

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

toggle.addEventListener('change', async () => {
    const isEnabled = toggle.checked;
    status.textContent = isEnabled ? 'Extension is active' : 'Extension is disabled';
    try {
        await chrome.storage.local.set({ [STORAGE_KEY]: isEnabled });
        // Notify all tabs to update immediately
        const tabs = await chrome.tabs.query({ url: '*://moodle.bgu.ac.il/*' });
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { action: 'stateChanged', enabled: isEnabled }).catch(() => {});
        });
    } catch (e) {}
});

loadState();