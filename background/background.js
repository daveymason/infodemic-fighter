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
        colorScheme: 'default'
      };
      
      chrome.storage.local.set({ settings: defaultSettings });
      console.log('Infodemic Fighter installed with default settings');
    } else {
      console.log('Infodemic Fighter extension installed with existing settings');
    }
  });

  // Create context menu item for links
  chrome.contextMenus.create({
    id: "checkBias",
    title: "Check for Media Bias",
    contexts: ["link"]
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "checkBias") {
    const url = info.linkUrl;
    console.log("Context menu: Checking URL for bias:", url);
    
    // Check the URL for bias
    const biasData = checkUrlBiasSync(url);
    
    // Show the results in a popup
    showBiasPopup(tab.id, info.frameId, info.linkUrl, biasData);
  }
});

// Enhanced function to create a more visually appealing popup
function createEnhancedBiasPopup(biasData, settings) {
  // Default to 'purple' theme if settings are not available
  const theme = settings?.theme || 'purple';
  
  // Get theme-specific colors
  let headerBg, textColor, bgColor, borderColor;
  
  // Apply theme colors based on user preference
  if (theme === 'red') {
    headerBg = 'linear-gradient(to right, #AA0000, #772222)';
    textColor = '#333333';
    bgColor = '#FFFFFF';
    borderColor = '#DDDDDD';
  } else if (theme === 'blue') {
    headerBg = 'linear-gradient(to right, #2244BB, #0055AA)';
    textColor = '#333333';
    bgColor = '#FFFFFF';
    borderColor = '#DDDDDD';
  } else if (theme === 'purple') {
    headerBg = 'linear-gradient(to right, #441166, #662288)';
    textColor = '#f0f0f0';
    bgColor = '#2D0B42';
    borderColor = 'rgba(255, 255, 255, 0.1)';
  }
  
  // Get bias icon
  let biasIcon, reliabilityIcon;
  
  switch(biasData.bias) {
    case 'left':
      biasIcon = '&#8592;'; // Left arrow
      break;
    case 'lean-left':
      biasIcon = '&#8592;&#8592;'; // Double left arrow
      break;
    case 'center':
      biasIcon = '&#8596;'; // Left-right arrow
      break;
    case 'lean-right':
      biasIcon = '&#8594;&#8594;'; // Double right arrow
      break;
    case 'right':
      biasIcon = '&#8594;'; // Right arrow
      break;
    default:
      biasIcon = '?';
  }
  
  switch(biasData.reliability) {
    case 'high':
      reliabilityIcon = '&#9733;&#9733;&#9733;'; // Three stars
      break;
    case 'medium':
      reliabilityIcon = '&#9733;&#9733;&#9734;'; // Two stars
      break;
    case 'low':
      reliabilityIcon = '&#9733;&#9734;&#9734;'; // One star
      break;
    default:
      reliabilityIcon = '?';
  }
  
  // Generate CSS styles for the popup with theme specific colors
  const styles = `
    #infodemic-container {
      position: fixed;
      z-index: 10000;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
    
    .infodemic-popup {
      background: ${bgColor};
      color: ${textColor};
      border-radius: 8px;
      box-shadow: 0 4px 25px rgba(0, 0, 0, 0.3);
      width: 320px;
      font-family: 'Segoe UI', Arial, sans-serif;
      overflow: hidden;
      animation: infodemicFadeIn 0.3s ease-out;
    }
    
    @keyframes infodemicFadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .infodemic-header {
      background: ${headerBg};
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
    }
    
    .infodemic-title-icon {
      margin-right: 8px;
      font-size: 16px;
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
    }
    
    .infodemic-content {
      padding: 16px;
      border-bottom: 1px solid ${borderColor};
    }
    
    .infodemic-source-name {
      font-size: 18px;
      font-weight: 500;
      margin-bottom: 16px;
      word-break: break-word;
    }
    
    .infodemic-metrics {
      display: flex;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    
    .infodemic-metric {
      flex: 1;
      padding: 8px;
      border-radius: 8px;
      background-color: ${theme === 'purple' ? 'rgba(255, 255, 255, 0.1)' : '#f5f5f5'};
      margin: 0 4px;
    }
    
    .infodemic-metric-title {
      font-size: 12px;
      color: ${theme === 'purple' ? '#ccc' : '#666'};
      margin-bottom: 4px;
    }
    
    .infodemic-metric-value {
      display: flex;
      align-items: center;
    }
    
    .infodemic-badge {
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 500;
      color: white;
    }
    
    .infodemic-footer {
      padding: 12px 16px;
      background: ${theme === 'purple' ? 'rgba(0, 0, 0, 0.2)' : '#f5f5f5'};
      font-size: 12px;
      color: ${theme === 'purple' ? '#aaa' : '#666'};
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  `;
  
  // Get colors for bias and reliability badges
  let biasColor, reliabilityColor;
  
  switch(biasData.bias) {
    case 'left': biasColor = '#0000FF'; break;
    case 'lean-left': biasColor = '#6495ED'; break;
    case 'center': biasColor = '#808080'; break;
    case 'lean-right': biasColor = '#FFA500'; break;
    case 'right': biasColor = '#FF0000'; break;
    default: biasColor = '#999999';
  }
  
  switch(biasData.reliability) {
    case 'high': reliabilityColor = '#4CAF50'; break;
    case 'medium': reliabilityColor = '#FF9800'; break;
    case 'low': reliabilityColor = '#F44336'; break;
    default: reliabilityColor = '#999999';
  }
  
  // Create HTML for popup
  const html = `
    <div id="infodemic-container">
      <style>${styles}</style>
      <div class="infodemic-popup" id="infodemic-popup">
        <div class="infodemic-header">
          <div class="infodemic-title">
            <span class="infodemic-title-icon">🔍</span>
            Infodemic Fighter Analysis
          </div>
          <button class="infodemic-close" id="infodemic-close">✕</button>
        </div>
        <div class="infodemic-content">
          <div class="infodemic-source-name">${biasData.name}</div>
          <div class="infodemic-metrics">
            <div class="infodemic-metric">
              <div class="infodemic-metric-title">Political Bias</div>
              <div class="infodemic-metric-value">
                <span class="infodemic-badge" style="background-color: ${biasColor}">
                  ${formatBiasLabel(biasData.bias)}
                </span>
              </div>
            </div>
            <div class="infodemic-metric">
              <div class="infodemic-metric-title">Reliability</div>
              <div class="infodemic-metric-value">
                <span class="infodemic-badge" style="background-color: ${reliabilityColor}">
                  ${formatReliabilityLabel(biasData.reliability)}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="infodemic-footer">
          <div>Powered by Infodemic Fighter</div>
          <div>v0.1.0</div>
        </div>
      </div>
    </div>
  `;
  
  return html;
}

// Update the showBiasPopup function to use the enhanced popup
function showBiasPopup(tabId, frameId, url, biasData) {
  chrome.storage.local.get(['settings'], (result) => {
    const popupHTML = createEnhancedBiasPopup(biasData, result.settings);
    
    // Inject the popup into the page
    chrome.scripting.executeScript({
      target: { tabId: tabId, frameIds: [frameId] },
      func: injectEnhancedPopup,
      args: [popupHTML],
    });
  });
}

// Function that will be injected into the page
function injectEnhancedPopup(popupHTML) {
  // Remove any existing popup
  const existingPopup = document.getElementById('infodemic-container');
  if (existingPopup) {
    existingPopup.remove();
  }
  
  // Create the popup
  const container = document.createElement('div');
  container.innerHTML = popupHTML;
  document.body.appendChild(container.firstElementChild);
  
  // Add event listener for close button
  document.getElementById('infodemic-close').addEventListener('click', () => {
    document.getElementById('infodemic-container').remove();
  });
  
  // Auto close after 10 seconds
  setTimeout(() => {
    const popup = document.getElementById('infodemic-container');
    if (popup) popup.remove();
  }, 10000);
}

// Format bias label for display
function formatBiasLabel(bias) {
  switch(bias) {
    case 'left': return 'Left';
    case 'lean-left': return 'Center-Left';
    case 'center': return 'Center';
    case 'lean-right': return 'Center-Right';
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
