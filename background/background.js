// Background script for Infodemic Fighter extension
// Handles initialization and communication with content scripts

// Initialize extension when installed or updated
chrome.runtime.onInstalled.addListener(() => {
  // Set default settings
  chrome.storage.local.set({
    settings: {
      enabled: true,
      showBiasIndicator: true,
      showReliabilityIndicator: true,
      colorScheme: 'default'
    }
  });
  
  console.log('Infodemic Fighter extension installed');
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CHECK_URL') {
    // Process faster with direct response
    const testBiasData = {
      name: extractDomainForDisplay(message.url),
      bias: getRandomBias(),
      reliability: getRandomReliability()
    };
    
    sendResponse({ biasData: testBiasData });
    return true; 
  }
  
  // Other message handlers...
});

// Function to check URL against bias database
async function checkUrlBias(url) {
  try {
    // Extract domain from URL
    const domain = new URL(url).hostname.replace('www.', '');
    
    // Get bias database from storage or fetch if not available
    const biasData = await getBiasDatabase();
    
    // Check if domain exists in database
    if (biasData[domain]) {
      return biasData[domain];
    }
    
    // Check for parent domain match
    const domainParts = domain.split('.');
    if (domainParts.length > 2) {
      const parentDomain = domainParts.slice(domainParts.length - 2).join('.');
      if (biasData[parentDomain]) {
        return biasData[parentDomain];
      }
    }
    
    // Return unknown if not found
    return {
      bias: 'unknown',
      reliability: 'unknown',
      name: domain
    };
  } catch (error) {
    console.error('Error checking URL bias:', error);
    return {
      bias: 'unknown',
      reliability: 'unknown',
      name: 'unknown'
    };
  }
}

// Function to get bias database
async function getBiasDatabase() {
  return new Promise((resolve) => {
    // Check if database is in storage
    chrome.storage.local.get(['biasDatabase', 'lastUpdated'], (result) => {
      // If database exists and was updated in the last 24 hours, use it
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;
      
      if (result.biasDatabase && result.lastUpdated && (now - result.lastUpdated < oneDayMs)) {
        resolve(result.biasDatabase);
      } else {
        // Otherwise fetch from local data file
        fetch(chrome.runtime.getURL('data/media-bias-data.json'))
          .then(response => response.json())
          .then(data => {
            // Store in local storage for future use
            chrome.storage.local.set({
              biasDatabase: data.mediaBiasData,  // Note: accessing the mediaBiasData property
              lastUpdated: now
            });
            resolve(data.mediaBiasData);  // Access mediaBiasData property
          })
          .catch(error => {
            console.error('Error fetching bias database:', error);
            // Return empty database if fetch fails
            resolve({});
          });
      }
    });
  });
}

// Helper function to extract domain for display
function extractDomainForDisplay(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch (error) {
    console.error('Error extracting domain:', error);
    return 'unknown';
  }
}

// Helper function to get random bias
function getRandomBias() {
  const biases = ['left', 'center', 'right'];
  return biases[Math.floor(Math.random() * biases.length)];
}

// Helper function to get random reliability
function getRandomReliability() {
  const reliabilities = ['low', 'medium', 'high'];
  return reliabilities[Math.floor(Math.random() * reliabilities.length)];
}
