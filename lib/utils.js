// Utility functions for Infodemic Fighter extension

/**
 * Extract domain from a URL
 * @param {string} url - The URL to extract domain from
 * @returns {string} The domain name
 */
function extractDomain(url) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname.replace('www.', '');
  } catch (error) {
    console.error('Error extracting domain:', error);
    return '';
  }
}

/**
 * Format bias label for display
 * @param {string} bias - The bias value
 * @returns {string} Formatted bias label
 */
function formatBiasLabel(bias) {
  switch (bias) {
    case 'left': return 'Left';
    case 'lean-left': return 'Lean Left';
    case 'center': return 'Center';
    case 'lean-right': return 'Lean Right';
    case 'right': return 'Right';
    default: return 'Unknown';
  }
}

/**
 * Format reliability label for display
 * @param {string} reliability - The reliability value
 * @returns {string} Formatted reliability label
 */
function formatReliabilityLabel(reliability) {
  switch (reliability) {
    case 'high': return 'High';
    case 'medium': return 'Medium';
    case 'low': return 'Low';
    default: return 'Unknown';
  }
}

/**
 * Debounce function to limit how often a function is called
 * @param {Function} func - Function to debounce
 * @param {number} wait - Milliseconds to wait
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

/**
 * Get bias color class based on bias value
 * @param {string} bias - The bias value
 * @returns {string} CSS class for the bias
 */
function getBiasColorClass(bias) {
  switch (bias) {
    case 'left': return 'bias-left';
    case 'lean-left': return 'bias-lean-left';
    case 'center': return 'bias-center';
    case 'lean-right': return 'bias-lean-right';
    case 'right': return 'bias-right';
    default: return 'bias-unknown';
  }
}

/**
 * Get reliability icon class based on reliability value
 * @param {string} reliability - The reliability value
 * @returns {string} FontAwesome icon class
 */
function getReliabilityIconClass(reliability) {
  switch (reliability) {
    case 'high': return 'fa-check-circle';
    case 'medium': return 'fa-info-circle';
    case 'low': return 'fa-exclamation-triangle';
    default: return 'fa-question-circle';
  }
}
