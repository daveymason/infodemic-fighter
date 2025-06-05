# Infodemic Fighter

A lightweight Chrome extension that adds subtle bias and reliability indicators to search results on Google, Bing, and DuckDuckGo. **Received a Perplexity Power-Up** - uses the Sonar API to "Follow the Money", giving users the ability to research who funds media sources.

## Quick Start

**Install from Chrome Web Store**: https://chromewebstore.google.com/detail/infodemic-fighter/ebcmohgfdgkadgokpmoaeneeebnfkfbo

**For developers**: Enable Developer Mode in `chrome://extensions/`, click "Load unpacked", and select the extension folder.

## Features

- **Political Bias**: Marks sites as Left, Lean Left, Center, Lean Right, or Right
- **Reliability**: Rates sources as High, Medium, or Low trustworthiness  
- **Follow the Money**: Research funding sources and ownership via Perplexity AI
- **Context Menu Tools**: Right-click any link to visualize bias, find alternatives, or follow funding
- **Minimalist UI**: Clean design following HCI principles with Light/Dark themes
- **Privacy-Focused**: Local analysis with no user data collection

## Usage

1. Perform a web search on Google, Bing, or DuckDuckGo
2. View bias and reliability icons next to each result
3. Hover icons for quick source information
4. Right-click any link for detailed analysis options

## The Problem We're Solving

Our society today is zombie walking into a problem that we thought only existed during COVID: the "infodemic" - an overabundance of information that makes it difficult to think critically and find trustworthy sources. This creates:

- 🌐 Information overload preventing effective credibility evaluation
- 🔄 Media polarization creating siloed information ecosystems  
- ⚡ Rapid spread of misleading information outpacing fact-checking
- 🔍 Lack of accessible tools for quick source assessment
- 📰 Collapse of traditional quality control mechanisms

## Our Solution

Infodemic Fighter empowers users to make informed decisions by:

- 🏷️ Transparent bias and reliability indicators in search results
- 📊 Political spectrum context with factual reporting quality
- 🖱️ One-click source visualization and analysis
- 🔄 Alternative source suggestions from different perspectives
- 💰 Funding transparency through AI-powered research
- 🧪 Scientific, non-judgmental presentation

## Technical Details

**Data Sources**: Aggregates ratings from Ad Fontes Media, AllSides, Media Bias/Fact Check, and other research organizations covering 2,000+ news sources.

**Privacy**: All analysis runs client-side; no external data transmission except for optional AI features.

**Compatibility**: Chrome 88+, with planned Firefox and Edge support.

## License

MIT License. See [LICENSE](LICENSE) for details.