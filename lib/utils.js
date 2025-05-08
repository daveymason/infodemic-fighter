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
 * Extract parent domain from a domain
 * @param {string} domain - The domain to extract parent from
 * @returns {string|null} The parent domain or null if no parent
 */
function extractParentDomain(domain) {
  // Split domain by dots
  const parts = domain.split('.');
  
  // If domain has less than 3 parts, it's already a parent domain
  if (parts.length < 3) {
    return null;
  }
  
  // Join all parts except the first one
  return parts.slice(1).join('.');
}

/**
 * Generate domain variants to check (simplified version)
 * @param {string} domain - The domain to generate variants for
 * @returns {Array<string>} Array of domain variants
 */
function generateDomainVariants(domain) {
  // Only check parent domain and a few very common TLD variants
  const variants = [];
  
  // Add parent domain if available
  const parentDomain = extractParentDomain(domain);
  if (parentDomain) {
    variants.push(parentDomain);
  }
  
  // Define common equivalent TLD pairs
  const tldPairs = [
    ['.com', '.co.uk'],
    ['.org', '.org.uk'],
    ['.gov', '.gov.uk']
  ];
  
  // Check for TLD variants (only the most common ones)
  for (const [primary, alternate] of tldPairs) {
    if (domain.endsWith(primary)) {
      const baseDomain = domain.slice(0, -primary.length);
      variants.push(baseDomain + alternate);
      break;  // Once we've found a match, no need to check others
    } else if (domain.endsWith(alternate)) {
      const baseDomain = domain.slice(0, -alternate.length);
      variants.push(baseDomain + primary);
      break;  // Once we've found a match, no need to check others
    }
  }
  
  return variants;
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

/**
 * Get unknown bias data object
 * @param {string} domain - Optional domain name
 * @returns {Object} Unknown bias data
 */
function getUnknownBiasData(domain = 'unknown') {
  return {
    bias: 'unknown',
    reliability: 'unknown',
    name: domain
  };
}
