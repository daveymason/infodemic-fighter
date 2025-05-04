// DOM elements for settings
const enabledToggle = document.getElementById('enabled');
const biasToggle = document.getElementById('showBiasIndicator');
const reliabilityToggle = document.getElementById('showReliabilityIndicator');

// Theme radio buttons
const themeRadios = document.querySelectorAll('input[name="theme"]');
const themeRed = document.getElementById('theme-red');
const themeBlue = document.getElementById('theme-blue');
const themePurple = document.getElementById('theme-purple');

// DOM elements for tabs
const tabSettings = document.getElementById('tab-settings');
const tabAbout = document.getElementById('tab-about');
const contentSettings = document.getElementById('content-settings');
const contentAbout = document.getElementById('content-about');

// Header element that changes with theme
const header = document.getElementById('header');

// Theme application - also changes header style to match theme
function applyTheme(theme) {
  const body = document.body;
  body.classList.forEach(cls => {
    if (cls.startsWith('theme-')) body.classList.remove(cls);
  });
  body.classList.add(`theme-${theme}`);
  
  // Update the header style based on theme
  if (header) {
    if (theme === 'red') {
      header.style.background = 'linear-gradient(to right, var(--color-red-pill), #772222)';
    } else if (theme === 'blue') {
      header.style.background = 'linear-gradient(to right, #2244BB, var(--color-blue-pill))';
    } else if (theme === 'purple') {
      header.style.background = 'linear-gradient(to right, #441166, #662288)';
    }
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
    
    // Apply theme settings - default to purple if not set
    const currentTheme = s.theme || 'purple';
    document.getElementById(`theme-${currentTheme}`).checked = true;
    applyTheme(currentTheme);
  });
});

// Save settings when changed
function saveSettings() {
  // Find the selected theme
  let selectedTheme = 'purple'; // Default to purple
  themeRadios.forEach(radio => {
    if (radio.checked) {
      selectedTheme = radio.value;
    }
  });
  
  const settings = {
    enabled: enabledToggle.checked,
    showBiasIndicator: biasToggle.checked,
    showReliabilityIndicator: reliabilityToggle.checked,
    theme: selectedTheme
  };
  
  console.log('Saving settings:', settings);
  chrome.storage.local.set({ settings }, () => {
    console.log('Settings saved');
    applyTheme(settings.theme);
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

// Generic listener assignment for toggle switches
[enabledToggle, biasToggle, reliabilityToggle].forEach(el => 
  el && el.addEventListener('change', saveSettings)
);

// Theme radio buttons listener
themeRadios.forEach(radio => 
  radio.addEventListener('change', () => {
    saveSettings();
  })
);

// Tab event listeners
tabSettings.addEventListener('click', () => switchTab('settings'));
tabAbout.addEventListener('click', () => switchTab('about'));
