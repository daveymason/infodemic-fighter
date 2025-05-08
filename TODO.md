# 🎯 Infodemic Fighter: Optimization Roadmap

## 🚀 Immediate Wins (Very Easy)
- [x] ✅ **Optimize Manifest Permissions**
  - Review/remove unnecessary permissions
  - Ensure permissions align with actual functionality
- [x] 🎨 **Update Tooltip Styling**
  - Apply theme colors to tooltips
  - Simple CSS updates to match user's theme
- [x] 🔄 **Move Domain Extraction to utils.js**
  - Consolidate duplicate utility functions
  - Standardize function calls

## 💪 Easy Improvements
- [x] 🌐 **Simplify Domain Variant Logic**
  - Reduce unnecessary variant generation
  - Focus on common TLDs only
- [x] 📋 **Style Context Menu**
  - Apply theme colors to match user preference
  - Basic styling improvements
- [x] 📝 **Consolidate CSS Rules**
  - Remove duplicate styles
  - Organize CSS for better maintainability

## 🛠️ Moderate Changes
- [x] 💾 **Implement Basic Caching**
  - Store processed domains in chrome.storage.local
  - Simple persistence between sessions
- [x] ⭐ **Emphasize Reliability in UI**
  - Update indicator styling to highlight reliability
  - Adjust visual hierarchy of information
- [x] ℹ️ **Add Transparency Info to Context Menu**
  - Include source rating explanation
  - Add reliability emphasis
- [x] 🛠️ **Fix executeScript Error**
  - Update extension to be fully compatible with Manifest V3
  - Address "Cannot read properties of undefined (reading 'executeScript')" error

## 🧩 More Complex Tasks
- [ ] 📦 **Implement Batch Processing**
  - Process search results in groups
  - Reduce individual DOM operations
- [ ] ⏱️ **Improve Debounce Implementation**
  - Optimize event handling
  - Reduce redundant processing
- [x] 🔄 **Add Cache Expiration Logic**
  - Implement 7-day validity for cached data
  - Add refresh mechanism

## 🔬 Most Complex
- [ ] 🔎 **Add "Learn More" Transparency Features**
  - Create information pages for ratings
  - Link from tooltips to transparency data
- [ ] 🏅 **Add Icon Badges for Reliability**
  - Implement badge system for highly reliable/unreliable sources
  - Integrate with extension icon
- [ ] 👁️ **Implement Full IntersectionObserver**
  - Replace MutationObserver with more efficient approach
  - Restructure content processing logic

---
> *"In a world plagued by misinformation, our goal is to provide researchers and critical thinkers with evidence-based tools that enhance media literacy."*


the popup for visualise is still broken and it doesnt have the nice indiavtor either that it used to have, update the to do list. 