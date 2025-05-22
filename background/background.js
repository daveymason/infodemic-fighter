// --- Globals and Constants ---
const BIAS_DATA_URL = 'https://raw.githubusercontent.com/plotly/dash-world-news-app/master/bias_data.json';
let biasDatabase = {}; // To store the bias data

// --- Initialization ---

// Load bias data when the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  console.log("Infodemic Fighter Extension Installed/Updated.");
  loadBiasData();
  createContextMenu();
});

// Create context menu items
function createContextMenu() {
  chrome.contextMenus.removeAll(() => { // Remove existing items to prevent duplicates
    chrome.contextMenus.create({
      id: "infodemicFighterMenu",
      title: "Infodemic Fighter",
      contexts: ["link", "page"] 
    });

    chrome.contextMenus.create({
      id: "visualizeBias",
      parentId: "infodemicFighterMenu",
      title: "Visualize Source Bias",
      contexts: ["link"]
    });

    chrome.contextMenus.create({
      id: "findAlternativeSources",
      parentId: "infodemicFighterMenu",
      title: "Find Alternative Sources",
      contexts: ["link"]
    });

    chrome.contextMenus.create({
      id: "followTheMoney",
      parentId: "infodemicFighterMenu",
      title: "Follow The Money",
      contexts: ["link"]
    });
  });
}

// --- Bias Data Handling ---

// Function to load bias data from the remote JSON file
async function loadBiasData() {
  try {
    const response = await fetch(BIAS_DATA_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    biasDatabase = await response.json();
    console.log("Bias data loaded successfully:", Object.keys(biasDatabase).length, "sources.");
  } catch (error) {
    console.error("Failed to load bias data:", error);
    // Consider implementing a retry mechanism or fallback
  }
}

// Function to check URL bias synchronously (assuming biasDatabase is populated)
function checkUrlBiasSync(url) {
  if (!url) return null;
  const domain = extractDomainFromUrl(url);
  return biasDatabase[domain] || null;
}

// Function to extract domain from a URL
function extractDomainFromUrl(url) {
  if (!url) return null;
  try {
    const fullDomain = new URL(url).hostname;
    // Remove "www." if present
    return fullDomain.startsWith('www.') ? fullDomain.substring(4) : fullDomain;
  } catch (error) {
    console.warn("Invalid URL for domain extraction:", url, error);
    return null;
  }
}

// --- Context Menu Click Handler ---
chrome.contextMenus.onClicked.addListener((info, tab) => {
  // Skip processing for chrome:// URLs and other restricted pages
  if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.includes('chrome.google.com/webstore') || tab.url.startsWith('about:')) {
    console.log("Cannot process context menu on Chrome internal or restricted pages.");
    return; 
  }
  
  // For "visualizeBias" and "findAlternativeSources", the primary URL is info.linkUrl
  // For "followTheMoney", the primary URL is also info.linkUrl
  const targetUrl = info.linkUrl; 
  
  console.log("Context menu: Action:", info.menuItemId, "Target URL:", targetUrl);
  
  // This bias check is primarily for the other menu items, but harmless to keep
  const biasData = targetUrl ? checkUrlBiasSync(targetUrl) : null;
  
  try {
    switch(info.menuItemId) {
      case "visualizeBias":
        if (targetUrl) {
          showCombinedBiasVisualization(tab.id, targetUrl, biasData);
        } else {
          alert("No link URL found for bias visualization.");
        }
        break;
      case "findAlternativeSources":
        if (targetUrl) {
          showAlternativeSources(tab.id, targetUrl, biasData);
        } else {
          alert("No link URL found to find alternative sources.");
        }
        break;
      case "followTheMoney":
        chrome.storage.local.get(['sonarApiKey'], (result) => {
          const sonarApiKey = result.sonarApiKey;

          if (!sonarApiKey || sonarApiKey.trim() === "") {
            alert("Sonar API key is not set. Please add it in the extension settings.");
            // Optionally, open the popup or options page
            // chrome.runtime.openOptionsPage(); 
            return;
          }

          if (!info.linkUrl || !isValidHttpUrl(info.linkUrl)) {
            console.error("Follow The Money: Invalid or missing link URL.", info.linkUrl);
            alert("Invalid URL provided. Please ensure it's a valid HTTP/HTTPS web link.");
            return;
          }
          
          const queryUrl = info.linkUrl; // Use the link URL from the context menu item

          fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + sonarApiKey,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              model: "sonar-medium-online",
              messages: [
                { role: "system", content: "Be precise and concise. Provide only the names of organizations or individuals who are primary funding sources. If you cannot find specific funding information, state 'Funding information not found.' and nothing else." },
                { role: "user", content: `Who funds the organization that publishes content on ${queryUrl}? Focus on primary financial backers.` }
              ]
            })
          })
          .then(response => {
            if (!response.ok) {
              return response.json().then(errorData => {
                console.error("API Error Response:", errorData);
                throw new Error(`API Error: ${errorData.error?.message || response.statusText || response.status}`);
              }).catch(() => {
                // Fallback if response.json() fails or not a JSON response
                throw new Error(`API request failed with status ${response.status} (${response.statusText})`);
              });
            }
            return response.json();
          })
          .then(data => {
            console.log("Perplexity API Response for " + queryUrl + ":", data); // Log full response
            if (data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
              const fundingInfo = data.choices[0].message.content.trim();
              alert(`Funding Information for ${queryUrl}:\n\n${fundingInfo}`);
            } else {
              alert(`Funding information not found or API returned an unexpected response for ${queryUrl}.`);
              console.warn("Unexpected API response structure for " + queryUrl + ":", data);
            }
          })
          .catch(error => {
            console.error("Failed to fetch funding information for " + queryUrl + ":", error);
            alert(`Failed to fetch funding information: ${error.message}`);
          });
        });
        break;
    }
  } catch (error) {
    console.error("Error processing context menu action for " + info.menuItemId + ":", error);
    alert(`An unexpected error occurred: ${error.message}`); 
  }
});

// --- Helper Functions (examples, assuming they exist or are needed by other parts) ---

function isValidHttpUrl(string) {
  if (!string) return false; // Handle null, undefined, or empty strings
  let url;
  try {
    url = new URL(string);
  } catch (_) {
    return false;  
  }
  return url.protocol === "http:" || url.protocol === "https:";
}

// Example: Function to show combined bias visualization (simplified)
function showCombinedBiasVisualization(tabId, url, biasData) {
  console.log("showCombinedBiasVisualization called for", url, "Bias:", biasData);
  const biasVisHtml = createCombinedBiasVisualization(biasData, url);
  chrome.tabs.sendMessage(tabId, { action: "showBiasModal", htmlContent: biasVisHtml, styles: getPopupStyles() });
}

// Example: Function to create HTML for bias visualization (simplified)
function createCombinedBiasVisualization(biasData, sourceUrl) {
  // ... (implementation as provided in previous contexts) ...
  return `<div>Visualization for ${sourceUrl} - Bias: ${biasData ? biasData.bias : 'N/A'}</div>`;
}

// Example: Function to get popup styles (simplified)
function getPopupStyles() {
  // ... (implementation as provided in previous contexts) ...
  return { /* some styles */ };
}

// Example: Function for finding alternative sources (simplified)
function showAlternativeSources(tabId, url, biasData) {
  console.log("showAlternativeSources called for", url, "Bias:", biasData);
  // ... (logic to find alternatives) ...
  chrome.tabs.sendMessage(tabId, { action: "showAlternativeSourcesModal", htmlContent: `<div>Alternative sources for ${url}</div>`, styles: getPopupStyles() });
}

// Listener for messages from content scripts or popup (if any)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getBiasDataForUrl") {
    const bias = checkUrlBiasSync(message.url);
    sendResponse({ bias: bias ? bias.bias : "N/A", accuracy: bias ? bias.accuracy : "N/A" });
    return true; // Indicates asynchronous response
  }
  // Handle other messages if necessary
});

console.log("Background script loaded and listeners attached.");
