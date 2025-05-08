// Background script for Infodemic Fighter extension
// Handles initialization and communication with content scripts

// Load the bias database on extension startup
let biasDatabase = {};

// Load the bias database
fetch(chrome.runtime.getURL('data/media-bias-data.json'))
  .then(response => response.json())
  .then(data => {
    biasDatabase = data.mediaBiasData;
    console.log('Bias database loaded with', Object.keys(biasDatabase).length, 'entries');
  })
  .catch(error => {
    console.error('Error loading bias database:', error);
  });

// Create context menu items when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  // Set default settings
  chrome.storage.local.get('settings', (result) => {
    if (!result.settings) {
      const defaultSettings = {
        enabled: true,
        showBiasIndicator: true,
        showReliabilityIndicator: true,
        darkMode: false
      };
      
      chrome.storage.local.set({ settings: defaultSettings });
      console.log('Infodemic Fighter installed with default settings');
    } else {
      console.log('Infodemic Fighter extension installed with existing settings');
    }
  });

  // Clear existing context menu items to avoid duplicates
  chrome.contextMenus.removeAll(() => {
    // Create parent menu for Infodemic Fighter
    chrome.contextMenus.create({
      id: "infodemicFighterMenu",
      title: "Infodemic Fighter",
      contexts: ["link"]
    });
    
    // Simplified menu options - only 2 distinct actions
    chrome.contextMenus.create({
      id: "visualizeBias",
      parentId: "infodemicFighterMenu",
      title: "Visualize Bias",
      contexts: ["link"]
    });
    
    chrome.contextMenus.create({
      id: "findAlternativeSources",
      parentId: "infodemicFighterMenu",
      title: "Find Alternative Sources",
      contexts: ["link"]
    });
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  // Skip processing for chrome:// URLs which cannot receive messages
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.includes('chrome.google.com/webstore')) {
    console.log("Cannot process context menu on Chrome internal pages");
    return;
  }
  
  const url = info.linkUrl;
  console.log("Context menu: Selected action:", info.menuItemId, "for URL:", url);
  
  // Check the URL for bias data first
  const biasData = checkUrlBiasSync(url);
  
  // Choose action based on menu selection
  try {
    switch(info.menuItemId) {
      case "visualizeBias":
        showCombinedBiasVisualization(tab.id, url, biasData);
        break;
      case "findAlternativeSources":
        showAlternativeSources(tab.id, url, biasData);
        break;
    }
  } catch (error) {
    console.error("Error processing context menu action:", error);
  }
});

// Function to show the new combined bias visualization
function showCombinedBiasVisualization(tabId, url, biasData) {
  chrome.storage.local.get(['settings'], (result) => {
    const popupHTML = createCombinedBiasVisualization(biasData, result.settings);
    sendPopupToContentScript(tabId, popupHTML);
  });
}

// Create combined bias visualization (merging source analysis and data visualization)
function createCombinedBiasVisualization(biasData, settings) {
  const theme = settings?.darkMode ? 'dark-mode' : 'light-mode';
  const styles = getPopupStyles(theme) + `
    .bias-spectrum-container {
      margin-bottom: var(--size-md);
    }
    
    .bias-spectrum {
      position: relative;
      height: 40px;
      background: linear-gradient(to right, var(--color-blue-pill), #78D1FF, var(--data-center), #C76363, var(--color-red-pill));
      border-radius: var(--radius-lg);
      margin-bottom: var(--size-xs);
      overflow: hidden;
    }
    
    .spectrum-marker {
      position: absolute;
      width: 16px;
      height: 16px;
      background: white;
      border: 2px solid black;
      border-radius: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      box-shadow: var(--shadow-md);
      z-index: 2;
      transition: left var(--transition-normal) var(--ease-out);
    }
    
    .spectrum-labels {
      display: flex;
      justify-content: space-between;
      margin-top: var(--size-xs);
      font-size: 13px;
      color: var(--text-secondary);
    }
    
    .example-sources {
      display: flex;
      justify-content: space-between;
      margin: var(--size-sm) 0;
      position: relative;
      height: 24px;
    }
    
    .example-source {
      position: absolute;
      font-size: 11px;
      transform: translateX(-50%);
      color: var(--text-secondary);
      transition: transform var(--transition-fast) var(--ease-bounce);
    }
    
    .example-source:hover {
      transform: translateX(-50%) translateY(-2px);
      color: var(--text-primary);
    }
    
    .history-items {
      margin-top: var(--size-sm);
    }
    
    .history-item {
      padding: var(--size-sm);
      margin-bottom: var(--size-xs);
      border-radius: var(--radius-md);
      background-color: var(--bg-elevated);
      border: 1px solid var(--border-color);
      transition: transform var(--transition-fast) var(--ease-out);
    }
    
    .history-item:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-sm);
    }
    
    .history-type {
      font-weight: var(--font-weight-medium);
      margin-bottom: 4px;
    }
    
    .history-text {
      font-size: 13px;
      color: var(--text-secondary);
    }
    
    .spectrum-endpoints {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: var(--text-secondary);
      margin-top: 2px;
    }
    
    .endpoint-left {
      color: var(--color-blue-pill);
      font-weight: var(--font-weight-medium);
    }
    
    .endpoint-right {
      color: var(--color-red-pill);
      font-weight: var(--font-weight-medium);
    }
    
    .reliability-dots {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin: var(--size-xs) 0;
    }
    
    .reliability-dot {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      display: inline-block;
      transition: transform var(--transition-fast) var(--ease-bounce);
    }
    
    .reliability-dot:hover {
      transform: scale(1.2);
    }
    
    .reliability-dot.filled {
      background-color: currentColor;
    }
    
    .reliability-dot.empty {
      border: 2px solid currentColor;
      background-color: transparent;
    }
    
    .section-divider {
      height: 1px;
      background-color: var(--border-color);
      margin: var(--size-md) 0;
    }
  `;
  
  // Calculate position based on bias - for left-right political spectrum
  // Left is on the left side, Right is on the right side
  let position;
  switch(biasData.bias) {
    case 'left': position = 10; break;
    case 'lean-left': position = 30; break;
    case 'center': position = 50; break;
    case 'lean-right': position = 70; break;
    case 'right': position = 90; break;
    default: position = 50;
  }
  
  // Example sources across the spectrum for comparison
  const examples = [
    { name: "MSNBC", bias: "left", position: 10 },
    { name: "NYT", bias: "lean-left", position: 30 },
    { name: "Reuters", bias: "center", position: 50 },
    { name: "WSJ", bias: "lean-right", position: 70 },
    { name: "Fox News", bias: "right", position: 90 }
  ];
  
  // Generate example HTML
  let examplesHTML = '';
  examples.forEach(example => {
    examplesHTML += `
      <div class="example-source" style="left: ${example.position}%;">
        ${example.name}
      </div>
    `;
  });
  
  // Get bias description
  let biasDescription = '';
  switch(biasData.bias) {
    case 'left':
      biasDescription = 'This source typically presents news from a progressive/liberal perspective. It may prioritize topics like social justice, climate change, and economic equality.';
      break;
    case 'lean-left':
      biasDescription = 'This source has a moderate liberal bias in reporting and topic selection, though may attempt to follow traditional journalistic standards.';
      break;
    case 'center':
      biasDescription = 'This source aims to present balanced coverage with minimal bias in either direction. It likely covers a wide range of perspectives.';
      break;
    case 'lean-right':
      biasDescription = 'This source has a moderate conservative bias in reporting and topic selection, though may attempt to follow traditional journalistic standards.';
      break;
    case 'right':
      biasDescription = 'This source typically presents news from a conservative perspective. It may prioritize topics like traditional values, national security, and free markets.';
      break;
    default:
      biasDescription = 'We have limited information about this source\'s political leaning. Consider researching the publisher\'s background.';
  }
  
  // Get reliability indicators
  let reliabilityHTML = '';
  let reliabilityDescription = '';
  
  const reliabilityColor = getReliabilityColor(biasData.reliability);
  
  switch(biasData.reliability) {
    case 'high':
      reliabilityHTML = `
        <div class="reliability-dot filled" style="color: ${reliabilityColor}"></div>
        <div class="reliability-dot filled" style="color: ${reliabilityColor}"></div>
        <div class="reliability-dot filled" style="color: ${reliabilityColor}"></div>
      `;
      reliabilityDescription = 'This source demonstrates strong factual reporting, proper sourcing, and minimal failed fact checks.';
      break;
    case 'medium':
      reliabilityHTML = `
        <div class="reliability-dot filled" style="color: ${reliabilityColor}"></div>
        <div class="reliability-dot filled" style="color: ${reliabilityColor}"></div>
        <div class="reliability-dot empty" style="color: ${reliabilityColor}"></div>
      `;
      reliabilityDescription = 'This source generally reports factually but may occasionally publish misleading or unverified claims.';
      break;
    case 'low':
      reliabilityHTML = `
        <div class="reliability-dot filled" style="color: ${reliabilityColor}"></div>
        <div class="reliability-dot empty" style="color: ${reliabilityColor}"></div>
        <div class="reliability-dot empty" style="color: ${reliabilityColor}"></div>
      `;
      reliabilityDescription = 'This source has a history of publishing misleading, unverified, or false information.';
      break;
    default:
      reliabilityHTML = `
        <div class="reliability-dot empty" style="color: ${reliabilityColor}"></div>
        <div class="reliability-dot empty" style="color: ${reliabilityColor}"></div>
        <div class="reliability-dot empty" style="color: ${reliabilityColor}"></div>
      `;
      reliabilityDescription = 'Limited information available about this source\'s reliability.';
  }
  
  // Generate cognitive insight based on bias and reliability
  let cognitiveInsight = '';
  let cognitiveEmoji = '';
  
  if (biasData.bias !== 'unknown') {
    if (biasData.reliability === 'high') {
      cognitiveEmoji = '🧠';
      cognitiveInsight = 'This source may have a political orientation, but its high reliability indicates a commitment to factual reporting. Selective emphasis on certain topics is more likely than direct misinformation.';
    } else if (biasData.reliability === 'medium') {
      cognitiveEmoji = '🔍';
      cognitiveInsight = 'Be aware of how this source\'s political orientation may affect framing and context. Verify key claims with other high-reliability sources from different perspectives.';
    } else if (biasData.reliability === 'low') {
      cognitiveEmoji = '⚠️';
      cognitiveInsight = 'Exercise caution with this source. Its low reliability combined with a clear political orientation increases the risk of exposure to misinformation or heavily slanted narratives.';
    }
  } else if (biasData.reliability !== 'unknown') {
    cognitiveEmoji = '❓';
    cognitiveInsight = 'This source\'s reliability metrics provide useful context, but we don\'t have sufficient data on its political orientation. Consider how its coverage might align with different ideological positions.';
  } else {
    cognitiveEmoji = '📚';
    cognitiveInsight = 'Limited data is available for this source. Consider researching its ownership, funding sources, and editorial positions to better understand potential biases.';
  }
  
  // Get the bias color
  const biasColor = getBiasColor(biasData.bias);
  
  const html = `
    <div id="infodemic-container" class="${theme}">
      <style>${styles}</style>
      <div class="infodemic-popup" id="infodemic-popup">
        <div class="infodemic-header">
          <div class="infodemic-title">
            <span class="icon-data"></span>
            Visualize Bias
          </div>
          <button class="infodemic-close" id="infodemic-close">✕</button>
        </div>
        <div class="infodemic-content">
          <div class="infodemic-source-name">${biasData.name}</div>
          
          <!-- Bias Spectrum Visualization -->
          <div class="bias-spectrum-container">
            <div class="section-title">Political Orientation</div>
            <div class="bias-spectrum">
              <div class="spectrum-marker" style="left: ${position}%;"></div>
            </div>
            
            <div class="spectrum-endpoints">
              <div class="endpoint-left">Progressive</div>
              <div class="endpoint-right">Conservative</div>
            </div>
            
            <div class="spectrum-labels">
              <div class="spectrum-label">Left</div>
              <div class="spectrum-label">Center-Left</div>
              <div class="spectrum-label">Center</div>
              <div class="spectrum-label">Center-Right</div>
              <div class="spectrum-label">Right</div>
            </div>
            
            <div class="example-sources">
              ${examplesHTML}
            </div>
            
            <div class="infodemic-badge-container">
              <span class="infodemic-badge" style="background-color: ${biasColor}">
                ${formatBiasLabel(biasData.bias)}
              </span>
            </div>
            
            <div class="section-description">
              ${biasDescription}
            </div>
          </div>
          
          <div class="section-divider"></div>
          
          <!-- Reliability Information -->
          <div class="section-title">Factual Reporting</div>
          <div class="reliability-dots">
            ${reliabilityHTML}
          </div>
          
          <div class="infodemic-badge-container">
            <span class="infodemic-badge" style="background-color: ${reliabilityColor}">
              ${formatReliabilityLabel(biasData.reliability)} Reliability
            </span>
          </div>
          
          <div class="section-description">
            ${reliabilityDescription}
          </div>
          
          <div class="cognitive-insight">
            <strong><span class="emoji-icon">${cognitiveEmoji}</span> Cognitive Impact:</strong> ${cognitiveInsight}
          </div>
        </div>
        <div class="infodemic-footer">
          <div>Infodemic Fighter</div>
          <div>v0.1.0</div>
        </div>
      </div>
    </div>
  `;
  
  return html;
}

// Function to show comprehensive source analysis (combines bias and reliability)
function showSourceAnalysis(tabId, url, biasData) {
  chrome.storage.local.get(['settings'], (result) => {
    const popupHTML = createSourceAnalysisPopup(biasData, result.settings);
    sendPopupToContentScript(tabId, popupHTML);
  });
}

// Function to show data visualization (combines bias spectrum and factual history)
function showDataVisualization(tabId, url, biasData) {
  chrome.storage.local.get(['settings'], (result) => {
    const popupHTML = createDataVisualizationPopup(biasData, result.settings);
    sendPopupToContentScript(tabId, popupHTML);
  });
}

// Function to suggest alternative sources from across the spectrum
function showAlternativeSources(tabId, url, biasData) {
  // Find alternative sources with different biases but high reliability
  const alternatives = findAlternativeSources(biasData.bias);
  
  chrome.storage.local.get(['settings'], (result) => {
    const popupHTML = createAlternativeSourcesPopup(biasData, alternatives, result.settings);
    sendPopupToContentScript(tabId, popupHTML);
  });
}

// Helper function to send popup to content script
function sendPopupToContentScript(tabId, popupHTML) {
  // Simply use try/catch with the regular sendMessage
  try {
    chrome.tabs.sendMessage(tabId, {
      type: 'SHOW_BIAS_POPUP',
      html: popupHTML
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.log("Content script not available on this page. This is normal on non-search pages.");
        // The user is likely on a page where our content script isn't loaded
        // This happens when right-clicking on non-search engine pages
      }
    });
  } catch (error) {
    console.error("Error sending message:", error);
  }
}

// Create comprehensive source analysis popup (combines bias and reliability)
function createSourceAnalysisPopup(biasData, settings) {
  const theme = settings?.darkMode ? 'dark-mode' : 'light-mode';
  const styles = getPopupStyles(theme);
  
  // Get colors based on data
  const biasColor = getBiasColor(biasData.bias);
  const reliabilityColor = getReliabilityColor(biasData.reliability);
  
  // Get reliability indicators
  let reliabilityIcons = '';
  let reliabilityDescription = '';
  
  switch(biasData.reliability) {
    case 'high':
      reliabilityIcons = '✓ ✓ ✓';
      reliabilityDescription = 'This source demonstrates strong factual reporting, proper sourcing, and minimal failed fact checks.';
      break;
    case 'medium':
      reliabilityIcons = '✓ ✓ ○';
      reliabilityDescription = 'This source generally reports factually but may occasionally publish misleading or unverified claims.';
      break;
    case 'low':
      reliabilityIcons = '✓ ○ ○';
      reliabilityDescription = 'This source has a history of publishing misleading, unverified, or false information.';
      break;
    default:
      reliabilityIcons = '? ? ?';
      reliabilityDescription = 'Limited information available about this source\'s reliability.';
  }
  
  // Get bias description
  let biasDescription = '';
  switch(biasData.bias) {
    case 'left':
      biasDescription = 'This source typically presents news from a progressive/liberal perspective. It may prioritize topics like social justice, climate change, and economic equality.';
      break;
    case 'lean-left':
      biasDescription = 'This source has a moderate liberal bias in reporting and topic selection, though may attempt to follow traditional journalistic standards.';
      break;
    case 'center':
      biasDescription = 'This source aims to present balanced coverage with minimal bias in either direction. It likely covers a wide range of perspectives.';
      break;
    case 'lean-right':
      biasDescription = 'This source has a moderate conservative bias in reporting and topic selection, though may attempt to follow traditional journalistic standards.';
      break;
    case 'right':
      biasDescription = 'This source typically presents news from a conservative perspective. It may prioritize topics like traditional values, national security, and free markets.';
      break;
    default:
      biasDescription = 'We have limited information about this source\'s political leaning. Consider researching the publisher\'s background.';
  }
  
  const html = `
    <div id="infodemic-container">
      <style>${styles}</style>
      <div class="infodemic-popup" id="infodemic-popup">
        <div class="infodemic-header">
          <div class="infodemic-title">
            <span class="icon-microscope"></span>
            Source Analysis
          </div>
          <button class="infodemic-close" id="infodemic-close">✕</button>
        </div>
        <div class="infodemic-content">
          <div class="infodemic-source-name">${biasData.name}</div>
          
          <!-- Bias Section -->
          <div class="infodemic-section">
            <div class="section-title">Political Orientation</div>
            <div class="infodemic-bias-meter">
              <div class="infodemic-bias-scale">
                <div class="scale-marker left">Left</div>
                <div class="scale-marker center">Center</div>
                <div class="scale-marker right">Right</div>
                <div class="scale-position" style="left: ${getBiasPosition(biasData.bias)}%"></div>
              </div>
            </div>
            
            <div class="infodemic-badge-container">
              <span class="infodemic-badge" style="background-color: ${biasColor}">
                ${formatBiasLabel(biasData.bias)}
              </span>
            </div>
            
            <div class="section-description">
              ${biasDescription}
            </div>
          </div>
          
          <!-- Reliability Section -->
          <div class="infodemic-section">
            <div class="section-title">Factual Reporting</div>
            <div class="infodemic-reliability-meter">
              <div class="reliability-score" style="color: ${reliabilityColor}">
                ${reliabilityIcons}
              </div>
              <div class="reliability-label">
                <span class="infodemic-badge" style="background-color: ${reliabilityColor}">
                  ${formatReliabilityLabel(biasData.reliability)} Reliability
                </span>
              </div>
            </div>
            
            <div class="section-description">
              ${reliabilityDescription}
            </div>
          </div>
          
        </div>
        <div class="infodemic-footer">
          <div>Infodemic Fighter</div>
          <div>v0.1.0</div>
        </div>
      </div>
    </div>
  `;
  
  return html;
}

// Create data visualization popup (combines bias spectrum and factual history)
function createDataVisualizationPopup(biasData, settings) {
  const theme = settings?.darkMode ? 'dark-mode' : 'light-mode';
  const styles = getPopupStyles(theme) + `
    .visualization-container {
      margin: 20px 0;
    }
    .bias-spectrum {
      position: relative;
      height: 40px;
      background: linear-gradient(to right, var(--color-blue-pill), #78D1FF, var(--data-center), #C76363, var(--color-red-pill));
      border-radius: 4px;
      margin-bottom: 10px;
    }
    .spectrum-marker {
      position: absolute;
      width: 12px;
      height: 12px;
      background: white;
      border: 2px solid black;
      border-radius: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
    }
    .spectrum-labels {
      display: flex;
      justify-content: space-between;
      margin-top: 4px;
      font-size: 12px;
      color: var(--text-secondary);
    }
    .example-sources {
      display: flex;
      justify-content: space-between;
      margin: 15px 0;
      position: relative;
      height: 24px;
    }
    .example-source {
      position: absolute;
      font-size: 11px;
      transform: translateX(-50%);
    }
    .history-items {
      margin-top: 15px;
    }
    .history-item {
      padding: 8px;
      margin-bottom: 6px;
      border-radius: 4px;
      background-color: var(--bg-elevated);
      border: 1px solid var(--border-color);
    }
    .history-type {
      font-weight: var(--font-weight-medium);
      margin-bottom: 4px;
    }
    .history-text {
      font-size: 13px;
      color: var(--text-secondary);
    }
  `;
  
  // Calculate position based on bias
  const position = getBiasPosition(biasData.bias);
  
  // Example sources across the spectrum for comparison
  const examples = [
    { name: "Jacobin", bias: "left", position: 10 },
    { name: "NYT", bias: "lean-left", position: 30 },
    { name: "AP/Reuters", bias: "center", position: 50 },
    { name: "WSJ", bias: "lean-right", position: 70 },
    { name: "Fox News", bias: "right", position: 90 }
  ];
  
  // Generate example HTML
  let examplesHTML = '';
  examples.forEach(example => {
    examplesHTML += `
      <div class="example-source" style="left: ${example.position}%;">
        ${example.name}
      </div>
    `;
  });
  
  // Generate factual reporting history items
  let historyItems = '';
  
  switch(biasData.reliability) {
    case 'high':
      historyItems = `
        <div class="history-item">
          <div class="history-type" style="color: var(--reliability-high);">✓ Strong Sourcing</div>
          <div class="history-text">Consistently cites primary sources and provides links to raw data.</div>
        </div>
        <div class="history-item">
          <div class="history-type" style="color: var(--reliability-high);">✓ Fact Checking</div>
          <div class="history-text">Employs dedicated fact-checkers and verifies information before publishing.</div>
        </div>
        <div class="history-item">
          <div class="history-type" style="color: var(--reliability-high);">✓ Correction Policy</div>
          <div class="history-text">Transparently corrects errors with editor's notes and updates.</div>
        </div>
      `;
      break;
    case 'medium':
      historyItems = `
        <div class="history-item">
          <div class="history-type" style="color: var(--reliability-medium);">⚠ Mixed Sourcing</div>
          <div class="history-text">Generally cites sources but occasionally relies on secondary reporting.</div>
        </div>
        <div class="history-item">
          <div class="history-type" style="color: var(--reliability-medium);">⚠ Occasional Errors</div>
          <div class="history-text">Has published some unverified claims that required later correction.</div>
        </div>
        <div class="history-item">
          <div class="history-type" style="color: var(--reliability-high);">✓ Basic Fact Checking</div>
          <div class="history-text">Attempts to verify major claims but may miss nuanced details.</div>
        </div>
      `;
      break;
    case 'low':
      historyItems = `
        <div class="history-item">
          <div class="history-type" style="color: var(--reliability-low);">✗ Poor Sourcing</div>
          <div class="history-text">Frequently fails to cite sources or relies on questionable information.</div>
        </div>
        <div class="history-item">
          <div class="history-type" style="color: var(--reliability-low);">✗ Failed Fact Checks</div>
          <div class="history-text">Has a history of publishing false or misleading information.</div>
        </div>
        <div class="history-item">
          <div class="history-type" style="color: var(--reliability-low);">✗ Lack of Corrections</div>
          <div class="history-text">Rarely acknowledges or corrects factual errors when identified.</div>
        </div>
      `;
      break;
    default:
      historyItems = `
        <div class="history-item">
          <div class="history-type" style="color: var(--neutral-500);">? Limited Information</div>
          <div class="history-text">We have insufficient data about this source's factual reporting history.</div>
        </div>
      `;
  }
  
  const html = `
    <div id="infodemic-container">
      <style>${styles}</style>
      <div class="infodemic-popup" id="infodemic-popup" style="min-height: 420px">
        <div class="infodemic-header">
          <div class="infodemic-title">
            <span class="icon-data"></span>
            Data Visualization
          </div>
          <button class="infodemic-close" id="infodemic-close">✕</button>
        </div>
        <div class="infodemic-content">
          <div class="infodemic-source-name">${biasData.name}</div>
          
          <!-- Bias Spectrum Visualization -->
          <div class="infodemic-section">
            <div class="section-title">Political Orientation Spectrum</div>
            <div class="visualization-container">
              <div class="bias-spectrum">
                <div class="spectrum-marker" style="left: ${position}%;"></div>
              </div>
              
              <div class="spectrum-labels">
                <div class="spectrum-label">Left</div>
                <div class="spectrum-label">Center-Left</div>
                <div class="spectrum-label">Center</div>
                <div class="spectrum-label">Center-Right</div>
                <div class="spectrum-label">Right</div>
              </div>
              
              <div class="example-sources">
                ${examplesHTML}
              </div>
            </div>
          </div>
          
          <!-- Factual Reporting History -->
          <div class="infodemic-section">
            <div class="section-title">Factual Reporting Patterns</div>
            <div class="infodemic-badge-container">
              <span class="infodemic-badge" style="background-color: ${getReliabilityColor(biasData.reliability)}">
                ${formatReliabilityLabel(biasData.reliability)} Reliability
              </span>
            </div>
            
            <div class="history-items">
              ${historyItems}
            </div>
          </div>
        </div>
        <div class="infodemic-footer">
          <div>Infodemic Fighter</div>
          <div>v0.1.0</div>
        </div>
      </div>
    </div>
  `;
  
  return html;
}

// Create alternative sources popup
function createAlternativeSourcesPopup(biasData, alternatives, settings) {
  const theme = settings?.darkMode ? 'dark-mode' : 'light-mode';
  const styles = getPopupStyles(theme) + `
    .alternatives-list {
      margin-top: 12px;
    }
    .alternative-source {
      display: flex;
      justify-content: space-between;
      padding: 8px;
      margin-bottom: 8px;
      border-radius: 8px;
      background-color: var(--bg-elevated);
      border: 1px solid var(--border-color);
      transition: transform 0.15s ease;
    }
    .alternative-source:hover {
      transform: translateY(-2px);
    }
    .alternative-name {
      font-weight: 500;
    }
    .alternative-bias {
      font-size: 12px;
      padding: 2px 8px;
      border-radius: 10px;
      color: white;
    }
    
    .cognitive-insight {
      background-color: var(--bg-elevated);
      border-radius: 8px;
      padding: 12px;
      margin-top: 16px;
      line-height: 1.4;
      font-size: 14px;
      border-left: 3px solid var(--accent-primary);
      color: var(--text-secondary);
      border: 1px solid var(--border-color);
    }
    
    .cognitive-insight strong {
      color: var(--text-primary);
    }
    
    .emoji-icon {
      margin-right: 5px;
    }
  `;
  
  // Create alternative sources HTML
  let alternativesHTML = '';
  
  if (alternatives.length > 0) {
    alternatives.forEach(alt => {
      let biasColor;
      switch(alt.bias) {
        case 'left': biasColor = '#46C2FF'; break; // Blue for left
        case 'lean-left': biasColor = '#78D1FF'; break;
        case 'center': biasColor = '#82c91e'; break;
        case 'lean-right': biasColor = '#C76363'; break;
        case 'right': biasColor = '#A52A2A'; break; // Red for right
        default: biasColor = '#999999';
      }
      
      alternativesHTML += `
        <div class="alternative-source">
          <div class="alternative-name">${alt.name}</div>
          <div class="alternative-bias" style="background-color: ${biasColor}">
            ${formatBiasLabel(alt.bias)}
          </div>
        </div>
      `;
    });
  } else {
    alternativesHTML = '<div class="no-alternatives">No alternatives found for this topic.</div>';
  }
  
  const html = `
    <div id="infodemic-container" class="${theme}">
      <style>${styles}</style>
      <div class="infodemic-popup" id="infodemic-popup">
        <div class="infodemic-header">
          <div class="infodemic-title">
            <span class="icon-analysis"></span>
            Alternative Sources
          </div>
          <button class="infodemic-close" id="infodemic-close">✕</button>
        </div>
        <div class="infodemic-content">
          <div class="infodemic-source-name">${biasData.name}</div>
          <div class="infodemic-current">
            <span class="current-label">Current Source:</span>
            <span class="infodemic-badge" style="background-color: ${getBiasColor(biasData.bias)}">
              ${formatBiasLabel(biasData.bias)}
            </span>
            <span class="infodemic-badge" style="background-color: ${getReliabilityColor(biasData.reliability)}">
              ${formatReliabilityLabel(biasData.reliability)} Reliability
            </span>
          </div>
          
          <div class="section-title">Balance Your Perspective</div>
          <div class="section-description">
            Explore these reliable sources with different viewpoints:
          </div>
          
          <div class="alternatives-list">
            ${alternativesHTML}
          </div>
          
          <div class="cognitive-insight">
            <strong><span class="emoji-icon">🧩</span> Cognitive Insight:</strong> Reading across the political spectrum helps build a more complete understanding of complex issues and reduces confirmation bias.
          </div>
        </div>
        <div class="infodemic-footer">
          <div>Infodemic Fighter</div>
          <div>v0.1.0</div>
        </div>
      </div>
    </div>
  `;
  
  return html;
}

// Get shared popup styles matching the main extension popup style
function getPopupStyles(theme) {
  return `
    #infodemic-container {
      position: fixed;
      z-index: 10000;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-family: var(--font-family-base, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif);
    }
    
    .infodemic-popup {
      background: var(--bg-elevated);
      color: var(--text-primary);
      border-radius: 8px;
      box-shadow: 0 4px 25px rgba(0, 0, 0, 0.3);
      width: 450px;
      max-height: 90vh;
      overflow: auto;
      animation: infodemicFadeIn 0.3s ease-out;
      border: 1px solid var(--border-color);
    }
    
    @keyframes infodemicFadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .infodemic-header {
      background: linear-gradient(135deg, var(--color-red-pill), var(--color-blue-pill));
      color: white;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .infodemic-title {
      font-size: 16px;
      font-weight: 500;
      display: flex;
      align-items: center;
      color: white;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    }
    
    .infodemic-title .icon-microscope::before,
    .infodemic-title .icon-data::before,
    .infodemic-title .icon-lab::before,
    .infodemic-title .icon-analysis::before {
      content: "";
      display: inline-block;
      width: 18px;
      height: 18px;
      background-color: white;
      mask-size: contain;
      mask-repeat: no-repeat;
      mask-position: center;
      margin-right: 8px;
    }
    
    .infodemic-title .icon-microscope::before {
      mask-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18h8"></path><path d="M3 22h18"></path><path d="M14 22a2 2 0 0 1-2-2"></path><path d="M10 22a2 2 0 0 0 2-2"></path><path d="M10 14v4"></path><path d="M13 14h-3"></path><circle cx="12" cy="9" r="2"></circle><path d="M12 3v4"></path><path d="M10 7.25c.69.13 1.3.25 2 .25s1.31-.12 2-.25"></path><path d="M15 11.15l2.5 2.35"></path></svg>');
    }
    
    .infodemic-title .icon-data::before {
      mask-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="9" y1="9" x2="9" y2="15"></line><line x1="15" y1="9" x2="15" y2="15"></line><line x1="9" y1="15" x2="15" y2="15"></line><line x1="9" y1="9" x2="15" y2="9"></line><path d="M9 9v6l3 -4l3 4v-6"></path></svg>');
    }
    
    .infodemic-title .icon-analysis::before {
      mask-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h20"></path><path d="M5 20v-6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6"></path><path d="M5 14l7-7 7 7"></path><path d="M12 4v3"></path></svg>');
    }
    
    .infodemic-close {
      background: none;
      border: none;
      color: white;
      font-size: 16px;
      cursor: pointer;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      transition: background-color 0.15s;
    }
    
    .infodemic-close:hover {
      background-color: rgba(255, 255, 255, 0.2);
    }
    
    .infodemic-content {
      padding: 16px;
      border-bottom: 1px solid var(--border-color);
    }
    
    .infodemic-source-name {
      font-size: 18px;
      font-weight: 500;
      margin-bottom: 16px;
      word-break: break-word;
    }
    
    .infodemic-section {
      margin-bottom: 16px;
      padding: 12px;
      background-color: var(--bg-surface);
      border-radius: 8px;
      border: 1px solid var(--border-color);
    }
    
    .section-title {
      font-weight: 600;
      margin-bottom: 10px;
      font-size: 15px;
      color: var(--text-primary);
    }
    
    .section-description {
      font-size: 14px;
      line-height: 1.4;
      margin-top: 8px;
      color: var(--text-secondary);
    }
    
    .infodemic-badge-container {
      display: flex;
      justify-content: center;
      margin: 10px 0;
    }
    
    .infodemic-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 500;
      color: white;
      display: inline-block;
    }
    
    .infodemic-tip {
      font-size: 13px;
      line-height: 1.5;
      margin: 16px 0 0 0;
      padding: 12px;
      border-radius: 8px;
      background-color: var(--bg-surface);
      color: var(--text-secondary);
      border: 1px solid var(--border-color);
    }
    
    .infodemic-tip strong {
      color: var(--text-primary);
    }
    
    .infodemic-current {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    
    .current-label {
      color: var(--text-secondary);
      font-size: 14px;
    }
    
    .infodemic-description {
      font-size: 14px;
      line-height: 1.4;
      margin: 12px 0;
      color: var(--text-secondary);
    }
    
    .alternatives-list {
      margin-top: 16px;
    }
    
    .no-alternatives {
      padding: 12px;
      text-align: center;
      color: var(--text-secondary);
      background-color: var(--bg-surface);
      border-radius: 6px;
      border: 1px solid var(--border-color);
    }
    
    .infodemic-footer {
      padding: 12px 16px;
      background-color: var(--bg-surface);
      font-size: 12px;
      color: var(--text-secondary);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  `;
}

// Find alternative sources with different biases but high reliability
function findAlternativeSources(sourceBias) {
  const alternatives = [];
  const biasLevels = ['left', 'lean-left', 'center', 'lean-right', 'right'];
  
  // Skip the exact same bias (we want alternatives with different perspectives)
  const otherBiases = biasLevels.filter(bias => bias !== sourceBias);
  
  // Find one source from each other bias level that has high reliability
  for (const bias of otherBiases) {
    for (const domain in biasDatabase) {
      const data = biasDatabase[domain];
      if (data.bias === bias && data.reliability === 'high') {
        alternatives.push({
          name: data.name,
          bias: data.bias,
          reliability: data.reliability
        });
        break; // Only take one from each bias level
      }
    }
  }
  
  // If we don't have enough high reliability sources, add some medium ones
  if (alternatives.length < 4) {
    for (const bias of otherBiases) {
      if (!alternatives.some(alt => alt.bias === bias)) {
        for (const domain in biasDatabase) {
          const data = biasDatabase[domain];
          if (data.bias === bias && data.reliability === 'medium') {
            alternatives.push({
              name: data.name,
              bias: data.bias,
              reliability: data.reliability
            });
            break;
          }
        }
      }
    }
  }
  
  return alternatives;
}

// Helper functions
function getBiasPosition(bias) {
  switch(bias) {
    case 'left': return 10;
    case 'lean-left': return 30;
    case 'center': return 50;
    case 'lean-right': return 70;
    case 'right': return 90;
    default: return 50;
  }
}

function getBiasColor(bias) {
  switch(bias) {
    case 'left': return '#46C2FF'; // Blue for left
    case 'lean-left': return '#78D1FF'; // Lighter blue
    case 'center': return '#82c91e'; // Green for center
    case 'lean-right': return '#C76363'; // Lighter red
    case 'right': return '#A52A2A'; // Red for right
    default: return '#999999';
  }
}

function getReliabilityColor(reliability) {
  switch(reliability) {
    case 'high': return '#4CAF50';
    case 'medium': return '#FF9800';
    case 'low': return '#F44336';
    default: return '#999999';
  }
}

// Format bias label for display
function formatBiasLabel(bias) {
  switch(bias) {
    case 'left': return 'Left';
    case 'lean-left': return 'Lean Left';
    case 'center': return 'Center';
    case 'lean-right': return 'Lean Right';
    case 'right': return 'Right';
    default: return 'Unknown';
  }
}

// Format reliability label for display
function formatReliabilityLabel(reliability) {
  switch(reliability) {
    case 'high': return 'High';
    case 'medium': return 'Medium';
    case 'low': return 'Low';
    default: return 'Unknown';
  }
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background received message:", message);
  
  if (message.type === 'GET_SETTINGS') {
    // Return settings to content script
    chrome.storage.local.get(['settings'], (result) => {
      console.log("Sending settings:", result.settings || {});
      sendResponse({ settings: result.settings || {} });
    });
    return true; // Required for async response
  }
  
  if (message.type === 'CHECK_URL') {
    const url = message.url;
    console.log("Checking URL for bias:", url);
    
    const biasData = checkUrlBiasSync(url);
    console.log("Bias data for URL:", biasData);
    
    sendResponse({ biasData: biasData });
    return true; // Important for async response
  }
  
  if (message.type === 'CHECK_SOURCE') {
    const source = message.source;
    console.log("Checking source text for bias:", source);
    
    const biasData = checkSourceText(source);
    console.log("Bias data for source text:", biasData);
    
    sendResponse({ biasData: biasData });
    return true;
  }
});

// Enhanced function to check URL bias from the loaded database
function checkUrlBiasSync(url) {
  try {
    console.log('Checking URL for bias:', url);
    
    // Extract domain from URL
    const domain = extractDomainFromUrl(url);
    if (!domain) return getUnknownBiasData(url);
    
    console.log('Extracted domain:', domain);
    
    // DIRECT DOMAIN MATCHING APPROACH
    
    // Try direct domain match
    if (biasDatabase[domain]) {
      console.log('Found direct match for domain:', domain);
      return biasDatabase[domain];
    }
    
    // Try without www prefix
    const domainWithoutWww = domain.replace(/^www\./, '');
    if (biasDatabase[domainWithoutWww]) {
      console.log('Found match after removing www for domain:', domain);
      return biasDatabase[domainWithoutWww];
    }
    
    // AGGRESSIVE MATCHING APPROACH
    
    // Check if any known domain is contained in this domain
    for (const knownDomain in biasDatabase) {
      // Skip very short domains to prevent false positives
      if (knownDomain.length < 5) continue;
      
      if (domain.includes(knownDomain) || domainWithoutWww.includes(knownDomain)) {
        console.log('Found domain match through inclusion:', knownDomain);
        return biasDatabase[knownDomain];
      }
    }
    
    // Check if this is a subdomain of any known domain
    for (const knownDomain in biasDatabase) {
      // Extract main part of domain (e.g., "nytimes.com" from "subdomain.nytimes.com")
      const mainPart = extractMainDomainPart(domain);
      if (mainPart === knownDomain) {
        console.log('Found subdomain match:', domain, 'of', knownDomain);
        return biasDatabase[knownDomain];
      }
    }
    
    // SPECIAL CASE HANDLING
    
    // Handle special cases for common domains
    if (domain.includes('apnews') || domain.includes('ap.org')) {
      console.log('Special case: AP News domain');
      return {
        bias: 'center',
        reliability: 'high',
        name: 'Associated Press'
      };
    }
    
    if (domain.includes('reuters')) {
      console.log('Special case: Reuters domain');
      return {
        bias: 'center',
        reliability: 'high',
        name: 'Reuters'
      };
    }
    
    if (domain.includes('nytimes') || domain.includes('nyti.ms')) {
      console.log('Special case: New York Times domain');
      return {
        bias: 'lean-left',
        reliability: 'high',
        name: 'New York Times'
      };
    }
    
    if (domain.includes('washingtonpost') || domain.includes('wapo')) {
      console.log('Special case: Washington Post domain');
      return {
        bias: 'lean-left',
        reliability: 'high',
        name: 'Washington Post'
      };
    }
    
    if (domain.includes('foxnews') || domain.includes('foxbusiness')) {
      console.log('Special case: Fox News domain');
      return {
        bias: 'right',
        reliability: 'medium',
        name: 'Fox News'
      };
    }
    
    if (domain.includes('cnn')) {
      console.log('Special case: CNN domain');
      return {
        bias: 'lean-left',
        reliability: 'medium',
        name: 'CNN'
      };
    }
    
    // Return unknown if not found
    return getUnknownBiasData(domain);
  } catch (error) {
    console.error('Error checking URL bias:', error);
    return getUnknownBiasData(url);
  }
}

// Extract main part of a domain (e.g. "example.com" from "subdomain.example.com")
function extractMainDomainPart(domain) {
  const parts = domain.split('.');
  if (parts.length <= 2) return domain;
  
  // Handle special TLDs like .co.uk
  const specialTlds = ['co.uk', 'com.au', 'co.nz', 'co.jp', 'co.in', 'org.uk'];
  const lastTwoParts = parts.slice(-2).join('.');
  
  if (specialTlds.includes(lastTwoParts)) {
    return parts.slice(-3).join('.');
  }
  
  return parts.slice(-2).join('.');
}

// Extract base domain (e.g., 'apnews.com' from 'hub.apnews.com')
function extractBaseDomain(domain) {
  const parts = domain.split('.');
  if (parts.length <= 2) return domain;
  
  // Handle special cases like co.uk
  const secondLevelDomains = ['co.uk', 'com.au', 'co.nz', 'org.uk'];
  const lastTwo = parts.slice(-2).join('.');
  
  if (secondLevelDomains.includes(lastTwo)) {
    return parts.slice(-3).join('.');
  }
  
  return parts.slice(-2).join('.');
}

// Try to extract publisher name from URL
function extractPublisherFromUrl(url) {
  try {
    const urlObj = new URL(url);
    
    // Check for common patterns in URL path
    const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
    
    // Look for hub/topic indicators
    const hubIndices = pathParts.findIndex(part => 
      part === 'hub' || part === 'topic' || part === 'section' || 
      part === 'news' || part === 'tag'
    );
    
    if (hubIndices !== -1 && pathParts.length > hubIndices + 1) {
      return pathParts[hubIndices + 1].replace(/-/g, ' ');
    }
    
    return null;
  } catch (e) {
    console.error('Error extracting publisher from URL:', e);
    return null;
  }
}

// Check source text against bias database - for AP News and other text-based matching
function checkSourceText(sourceText) {
  sourceText = sourceText.toLowerCase();
  
  // Special cases for common media outlets
  if (sourceText.includes('ap ') || sourceText.includes('associated press')) {
    console.log('Found AP News via source text');
    return {
      bias: 'center',
      reliability: 'high',
      name: 'Associated Press'
    };
  }
  
  if (sourceText.includes('reuters')) {
    console.log('Found Reuters via source text');
    return {
      bias: 'center',
      reliability: 'high',
      name: 'Reuters'
    };
  }
  
  // Try direct name match
  for (const domain in biasDatabase) {
    const name = biasDatabase[domain].name.toLowerCase();
    if (sourceText.includes(name) || name.includes(sourceText)) {
      console.log(`Found name match: ${name} in source: ${sourceText}`);
      return biasDatabase[domain];
    }
  }
  
  // Try domain-based match
  for (const domain in biasDatabase) {
    const domainWithoutTld = domain.replace(/\.\w+$/, '').toLowerCase();
    if (sourceText.includes(domainWithoutTld)) {
      console.log(`Found domain match: ${domainWithoutTld} in source: ${sourceText}`);
      return biasDatabase[domain];
    }
  }
  
  return getUnknownBiasData(sourceText);
}

// Check if domain is a political campaign site
function isCampaignSite(domain) {
  const campaignKeywords = ['trump', 'biden', 'harris', 'democrat', 'republican', 'campaign'];
  return campaignKeywords.some(keyword => domain.includes(keyword));
}

// Get bias data for political campaign sites
function getCampaignBiasData(domain) {
  if (domain.includes('trump') || domain.includes('republican')) {
    return {
      bias: 'right',
      reliability: 'medium',
      name: domain.includes('trump') ? 'Trump Campaign Site' : 'Republican Campaign Site'
    };
  } else if (domain.includes('biden') || domain.includes('harris') || domain.includes('democrat')) {
    return {
      bias: 'left',
      reliability: 'medium',
      name: domain.includes('biden') ? 'Biden Campaign Site' : 
            domain.includes('harris') ? 'Harris Campaign Site' : 'Democratic Campaign Site'
    };
  }
  return getUnknownBiasData(domain);
}

// Extract publication info from news aggregators like Google News
function extractFromAggregator(url, domain) {
  try {
    // Google News format: https://news.google.com/articles/[ID]?source=PUBLICATION_NAME
    if (domain.includes('news.google.com')) {
      const urlObj = new URL(url);
      const sourceParam = urlObj.searchParams.get('source');
      if (sourceParam) {
        for (const knownDomain in biasDatabase) {
          if (sourceParam.toLowerCase().includes(knownDomain.replace('.com', '').toLowerCase())) {
            return biasDatabase[knownDomain];
          }
        }
      }
    }
    
    // Check if URL contains publication name in path
    for (const knownDomain in biasDatabase) {
      const publicationName = biasDatabase[knownDomain].name.toLowerCase().replace(/\s+/g, '');
      if (url.toLowerCase().includes('/' + publicationName + '/') || 
          url.toLowerCase().includes('source=' + publicationName)) {
        return biasDatabase[knownDomain];
      }
    }
  } catch (e) {
    console.error('Error extracting from aggregator:', e);
  }
  return null;
}

// Helper function to extract domain from URL
function extractDomainFromUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    console.error('Invalid URL:', url);
    return null;
  }
}

// Helper function to extract parent domain
function extractParentDomain(domain) {
  const parts = domain.split('.');
  if (parts.length <= 2) return null;
  return parts.slice(1).join('.');
}

// Helper function for unknown bias data
function getUnknownBiasData(url) {
  let name = url;
  try {
    const urlObj = new URL(url);
    name = urlObj.hostname.replace(/^www\./, '');
  } catch (e) {
    // Use the URL as is
  }
  
  return {
    bias: 'unknown',
    reliability: 'unknown',
    name: name
  };
}
