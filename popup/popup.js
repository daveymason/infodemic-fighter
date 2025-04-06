// DOM elements for settings
const enabledToggle = document.getElementById('enabled');
const biasToggle = document.getElementById('showBiasIndicator');
const reliabilityToggle = document.getElementById('showReliabilityIndicator');
const colorSchemeSelect = document.getElementById('colorScheme');

// DOM elements for tabs
const tabSettings = document.getElementById('tab-settings');
const tabAbout = document.getElementById('tab-about');
const contentSettings = document.getElementById('content-settings');
const contentAbout = document.getElementById('content-about');

// Load settings when popup opens
document.addEventListener('DOMContentLoaded', () => {
  console.log('Popup loaded');
  chrome.storage.local.get('settings', (data) => {
    if (data.settings) {
      console.log('Loaded settings:', data.settings);
      enabledToggle.checked = data.settings.enabled;
      biasToggle.checked = data.settings.showBiasIndicator;
      reliabilityToggle.checked = data.settings.showReliabilityIndicator;
      colorSchemeSelect.value = data.settings.colorScheme;
    }
  });
});

// Save settings when changed
function saveSettings() {
  const settings = {
    enabled: enabledToggle.checked,
    showBiasIndicator: biasToggle.checked,
    showReliabilityIndicator: reliabilityToggle.checked,
    colorScheme: colorSchemeSelect.value
  };
  
  console.log('Saving settings:', settings);
  chrome.storage.local.set({ settings }, () => {
    console.log('Settings saved');
  });
}

// Tab switching
function switchTab(tabId) {
  // Hide all tab contents
  contentSettings.classList.remove('active');
  contentAbout.classList.remove('active');
  
  // Remove active class from all tab buttons
  tabSettings.classList.remove('active');
  tabAbout.classList.remove('active');
  
  // Show selected tab content and set tab as active
  if (tabId === 'settings') {
    contentSettings.classList.add('active');
    tabSettings.classList.add('active');
  } else if (tabId === 'about') {
    contentAbout.classList.add('active');
    tabAbout.classList.add('active');
  }
}

// Add event listeners
enabledToggle.addEventListener('change', saveSettings);
biasToggle.addEventListener('change', saveSettings);
reliabilityToggle.addEventListener('change', saveSettings);
colorSchemeSelect.addEventListener('change', saveSettings);

// Tab event listeners
tabSettings.addEventListener('click', () => switchTab('settings'));
tabAbout.addEventListener('click', () => switchTab('about'));
