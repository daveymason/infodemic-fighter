// Constants for tab IDs
const TAB_SETTINGS_ID = 'tab-settings';
const TAB_ABOUT_ID = 'tab-about';

// Constants for content IDs
const CONTENT_SETTINGS_ID = 'content-settings';
const CONTENT_ABOUT_ID = 'content-about';

// DOM elements
let settingsTab, aboutTab;
let settingsContent, aboutContent;
let enabledCheckbox, showBiasCheckbox, showReliabilityCheckbox, darkModeCheckbox;
let sonarApiKeyInput, saveSonarApiKeyButton; // Added for Sonar API Key

// Initialize the popup
document.addEventListener('DOMContentLoaded', () => {
  // Get tab elements
  settingsTab = document.getElementById(TAB_SETTINGS_ID);
  aboutTab = document.getElementById(TAB_ABOUT_ID);

  // Get content elements
  settingsContent = document.getElementById(CONTENT_SETTINGS_ID);
  aboutContent = document.getElementById(CONTENT_ABOUT_ID);

  // Get settings checkboxes
  enabledCheckbox = document.getElementById('enabled');
  showBiasCheckbox = document.getElementById('showBiasIndicator');
  showReliabilityCheckbox = document.getElementById('showReliabilityIndicator');
  darkModeCheckbox = document.getElementById('darkMode');

  // Get Sonar API Key elements
  sonarApiKeyInput = document.getElementById('sonarApiKey');
  saveSonarApiKeyButton = document.getElementById('saveSonarApiKey');

  // Add event listeners for tab switching
  if (settingsTab && aboutTab && settingsContent && aboutContent) {
    settingsTab.addEventListener('click', () => switchTab(settingsTab, settingsContent));
    aboutTab.addEventListener('click', () => switchTab(aboutTab, aboutContent));
  }

  // Load current settings and API Key
  loadSettings();
  loadSonarApiKey(); // Load Sonar API Key

  // Add event listeners for settings changes
  if (enabledCheckbox) {
    enabledCheckbox.addEventListener('change', () => updateSetting('enabled', enabledCheckbox.checked));
  }
  if (showBiasCheckbox) {
    showBiasCheckbox.addEventListener('change', () => updateSetting('showBiasIndicator', showBiasCheckbox.checked));
  }
  if (showReliabilityCheckbox) {
    showReliabilityCheckbox.addEventListener('change', () => updateSetting('showReliabilityIndicator', showReliabilityCheckbox.checked));
  }
  if (darkModeCheckbox) {
    darkModeCheckbox.addEventListener('change', () => {
      updateSetting('darkMode', darkModeCheckbox.checked);
      applyTheme(darkModeCheckbox.checked); // Apply theme immediately
    });
  }

  // Add event listener for saving Sonar API Key
  if (saveSonarApiKeyButton) {
    saveSonarApiKeyButton.addEventListener('click', saveSonarApiKey);
  }
});

// Function to switch tabs
function switchTab(activeTab, activeContent) {
  // Deactivate all tabs and content
  [settingsTab, aboutTab].forEach(tab => tab.classList.remove('active'));
  [settingsContent, aboutContent].forEach(content => content.classList.remove('active'));

  // Activate the selected tab and content
  activeTab.classList.add('active');
  activeContent.classList.add('active');
}

// Function to load settings from storage
function loadSettings() {
  chrome.storage.local.get(['settings'], (result) => {
    if (result.settings) {
      const { enabled, showBiasIndicator, showReliabilityIndicator, darkMode } = result.settings;
      
      if (enabledCheckbox) enabledCheckbox.checked = enabled !== undefined ? enabled : true;
      if (showBiasCheckbox) showBiasCheckbox.checked = showBiasIndicator !== undefined ? showBiasIndicator : true;
      if (showReliabilityCheckbox) showReliabilityCheckbox.checked = showReliabilityIndicator !== undefined ? showReliabilityIndicator : true;
      if (darkModeCheckbox) darkModeCheckbox.checked = darkMode || false;
      
      // Apply the theme based on loaded settings
      applyTheme(darkModeCheckbox ? darkModeCheckbox.checked : false);
    } else {
      // Default settings if none are stored
      if (enabledCheckbox) enabledCheckbox.checked = true;
      if (showBiasCheckbox) showBiasCheckbox.checked = true;
      if (showReliabilityCheckbox) showReliabilityCheckbox.checked = true;
      if (darkModeCheckbox) darkModeCheckbox.checked = false;
      applyTheme(false); // Apply default light theme
    }
  });
}

// Function to update a specific setting
function updateSetting(key, value) {
  chrome.storage.local.get(['settings'], (result) => {
    const currentSettings = result.settings || {};
    const newSettings = { ...currentSettings, [key]: value };
    chrome.storage.local.set({ settings: newSettings });
  });
}

// Function to apply the theme (dark/light mode)
function applyTheme(isDarkMode) {
  document.body.classList.toggle('dark-mode', isDarkMode);
}

// Function to load Sonar API Key from storage
function loadSonarApiKey() {
  if (sonarApiKeyInput) { // Check if the input field exists
    chrome.storage.local.get(['sonarApiKey'], (result) => {
      if (result.sonarApiKey) {
        sonarApiKeyInput.value = result.sonarApiKey;
      }
    });
  }
}

// Function to save Sonar API Key to storage
function saveSonarApiKey() {
  if (sonarApiKeyInput && saveSonarApiKeyButton) { // Check if elements exist
    const apiKey = sonarApiKeyInput.value.trim();
    if (apiKey) {
      const originalButtonText = saveSonarApiKeyButton.textContent;
      chrome.storage.local.set({ sonarApiKey: apiKey }, () => {
        // Visual feedback: Change button text temporarily
        saveSonarApiKeyButton.textContent = 'Saved!';
        setTimeout(() => {
          saveSonarApiKeyButton.textContent = originalButtonText;
        }, 2000); // Revert after 2 seconds
      });
    }
  }
}
