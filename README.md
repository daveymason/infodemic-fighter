# Infodemic Fighter

A Chrome extension that helps users navigate the "infodemic" by providing visual indicators of political bias and reliability for search results.

![Infodemic Fighter Logo](assets/icons/icon128.svg)

## The Problem: Information Overload and Bias

In today's digital landscape, we face what the World Health Organization has termed an "infodemic" - an overabundance of information, both accurate and inaccurate, that makes it difficult for people to find trustworthy sources and reliable guidance when they need it.

According to the WHO:

> "An infodemic refers to a large increase in the volume of information associated with a specific topic, whose growth can occur exponentially in a short period of time due to a specific incident, such as the COVID-19 pandemic. In this situation, misinformation and rumors appear, along with manipulation of information with doubtful intent."

This problem is compounded by the increasing polarization of news sources and the tendency of search algorithms to create filter bubbles that reinforce existing beliefs.

## The Solution: Infodemic Fighter

Infodemic Fighter is a lightweight Chrome extension that:

1. Automatically detects when you're viewing search results on Google, Bing, or DuckDuckGo
2. Analyzes each search result to determine its political leaning and reliability
3. Adds subtle, minimalist visual indicators next to each result
4. Provides more detailed information on hover

The extension helps users become more aware of the potential biases in the information they consume, enabling them to make more informed decisions about which sources to trust.

## Features

- **Political Bias Detection**: Identifies where sources fall on the political spectrum (Left, Lean Left, Center, Lean Right, Right)
- **Right-Click Menu**: Check any link's bias with our context menu
- **Visual Indicators**: Clean, unobtrusive markers that don't distract from search experience
- **Privacy-Focused**: All processing happens locally - no data sent to external servers
- **Customizable**: Choose what indicators to display and adjust visual preferences

## Installation

### From Chrome Web Store (Coming Soon)

1. Visit the Chrome Web Store page for Infodemic Fighter
2. Click "Add to Chrome"
3. Confirm the installation when prompted

### Manual Installation (Developer Mode)

1. Download or clone this repository to your local machine
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" using the toggle in the top-right corner
4. Click "Load unpacked" and select the directory containing the extension files
5. The extension should now be installed and active

## Usage

1. After installation, the Infodemic Fighter icon will appear in your browser toolbar
2. Perform a search on Google, Bing, or DuckDuckGo
3. Notice the small indicators that appear next to each search result
4. Right click on a link and press "Check for bias"
5. Click the extension icon to access settings and customize your experience

## Settings

- **Enable/Disable**: Turn the extension on or off
- **Show Political Bias**: Toggle the display of political bias indicators
- **Show Reliability**: Toggle the display of reliability indicators
- **Color Scheme**: Choose between Default, Colorblind-friendly, or Monochrome

## Technical Implementation

Infodemic Fighter is built using modern web technologies:

- **Manifest V3**: Uses the latest Chrome extension manifest format
- **Vue.js**: Frontend components built with Vue.js for reactivity and maintainability
- **Golden Ratio**: All design elements follow the golden ratio (1:1.618) for aesthetic harmony
- **FontAwesome 6**: Latest FontAwesome icons for clear visual feedback
- **Content Scripts**: Dynamically analyzes and modifies search result pages
- **Background Service Worker**: Handles database management and communication
- **Local Storage**: Caches bias data for improved performance

The bias detection algorithm uses a multi-tiered approach:
1. Direct domain matching against our curated database
2. Parent domain matching for subdomains
3. Domain variant checking for different TLDs
4. Caching for performance optimization

## Privacy

Infodemic Fighter respects your privacy:

- No data is sent to external servers
- All processing happens locally in your browser
- No personal information is collected
- No browsing history is tracked or stored

## Sources

Our bias and reliability ratings are based on methodologies from established organizations like AllSides, Media Bias/Fact Check, and Ad Fontes Media.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- World Health Organization for their research on infodemics
- AllSides, Media Bias/Fact Check, and Ad Fontes Media for their media bias research methodologies
- FontAwesome for their excellent icon library
- Vue.js team for their fantastic framework


