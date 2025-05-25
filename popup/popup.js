// DOM elements for settings
const enabledToggle = document.getElementById('enabled');
const biasToggle = document.getElementById('showBiasIndicator');
const reliabilityToggle = document.getElementById('showReliabilityIndicator');
const darkModeToggle = document.getElementById('darkMode');

// DOM elements for tabs
const tabSettings = document.getElementById('tab-settings');
const tabPerplexity = document.getElementById('tab-perplexity');
const tabAbout = document.getElementById('tab-about');
const contentSettings = document.getElementById('content-settings');
const contentPerplexity = document.getElementById('content-perplexity');
const contentAbout = document.getElementById('content-about');

// DOM elements for Perplexity tab
const perplexityApiKeyInput = document.getElementById('perplexity-api-key');
const savePerplexityKeyButton = document.getElementById('save-perplexity-key');

// Apply dark/light mode
function applyTheme(isDarkMode) {
  const body = document.body;
  
  if (isDarkMode) {
    body.classList.add('dark-mode');
  } else {
    body.classList.remove('dark-mode');
  }
}

// Load settings when popup opens
document.addEventListener('DOMContentLoaded', () => {
  console.log('Popup loaded');
  chrome.storage.local.get('settings', (data) => {
    const s = data.settings || {};
    console.log('Loaded settings:', s);
    
    // Apply toggle settings
    enabledToggle.checked = s.enabled ?? true;
    biasToggle.checked = s.showBiasIndicator ?? true;
    reliabilityToggle.checked = s.showReliabilityIndicator ?? true;
    darkModeToggle.checked = s.darkMode ?? false;
    perplexityApiKeyInput.value = s.perplexityApiKey || '';
    
    // Apply dark mode if enabled
    applyTheme(s.darkMode);
  });
});

// Save settings when changed
function saveSettings() {
  const settings = {
    enabled: enabledToggle.checked,
    showBiasIndicator: biasToggle.checked,
    showReliabilityIndicator: reliabilityToggle.checked,
    darkMode: darkModeToggle.checked,
    perplexityApiKey: perplexityApiKeyInput.value
  };
  
  console.log('Saving settings:', settings);
  chrome.storage.local.set({ settings }, () => {
    console.log('Settings saved');
    applyTheme(settings.darkMode);
  });
}

// Tab switching
function switchTab(tabId) {
  // Hide all tab contents
  contentSettings.classList.remove('active');
  contentPerplexity.classList.remove('active');
  contentAbout.classList.remove('active');
  
  // Remove active class from all tab buttons
  tabSettings.classList.remove('active');
  tabPerplexity.classList.remove('active');
  tabAbout.classList.remove('active');
  
  // Show selected tab content and set tab as active
  if (tabId === 'settings') {
    contentSettings.classList.add('active');
    tabSettings.classList.add('active');
  } else if (tabId === 'perplexity') {
    contentPerplexity.classList.add('active');
    tabPerplexity.classList.add('active');
  } else if (tabId === 'about') {
    contentAbout.classList.add('active');
    tabAbout.classList.add('active');
  }
}

// Save Perplexity API Key
function savePerplexityApiKey() {
  const apiKey = perplexityApiKeyInput.value;
  chrome.storage.local.get('settings', (data) => {
    const s = data.settings || {};
    s.perplexityApiKey = apiKey;
    chrome.storage.local.set({ settings: s }, () => {
      console.log('Perplexity API key saved');
    });
  });
}

// Generic listener assignment for toggle switches
[enabledToggle, biasToggle, reliabilityToggle, darkModeToggle].forEach(el => 
  el && el.addEventListener('change', saveSettings)
);

// Tab event listeners
tabSettings.addEventListener('click', () => switchTab('settings'));
tabPerplexity.addEventListener('click', () => switchTab('perplexity'));
tabAbout.addEventListener('click', () => switchTab('about'));

// Perplexity API Key save button listener
savePerplexityKeyButton.addEventListener('click', savePerplexityApiKey);
