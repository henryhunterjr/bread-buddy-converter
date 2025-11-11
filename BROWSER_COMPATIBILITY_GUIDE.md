# Browser Compatibility Guide - Bread Buddy Converter

## Known Compatibility Considerations

### PDF Generation (jsPDF)
**Potential Issues:**
- Font rendering may differ slightly between browsers
- Some browsers may open PDF in new tab vs. downloading
- PDF file size may vary by browser

**Current Implementation:**
- Using `jsPDF` with UTF-8 safe text cleaning
- ASCII-only characters to prevent encoding issues
- Should work consistently across all modern browsers

**If PDF issues arise:**
- Check console for jsPDF errors
- Verify download attribute on anchor tag
- Test with smaller recipes first

---

### File Upload (Image/PDF)
**Potential Issues:**
- Mobile Safari: Opens camera vs. photo library
- Android: Different file picker UI
- Large files may timeout on slow connections

**Current Implementation:**
- Accept: `.jpg,.jpeg,.png,.pdf`
- Max file size: 20MB (limited by Tesseract.js)
- OCR via Tesseract.js (client-side)

**If upload issues arise:**
- Check CORS policies (shouldn't be issue for local files)
- Verify file type detection
- Test with smaller images first

---

### LocalStorage / IndexedDB (Saved Recipes)
**Potential Issues:**
- Safari: 50MB quota (may be less in private mode)
- Firefox: Prompts user for storage permission
- Mobile browsers: May clear storage aggressively

**Current Implementation:**
- Using `localStorage` for saved recipes
- JSON stringified recipe data
- No server-side persistence

**If storage issues arise:**
- Check browser storage limits
- Verify not in private/incognito mode
- Consider adding storage quota check

---

### CSS & Layout
**Potential Issues:**
- Safari: `backdrop-filter` support (used in modals)
- Mobile: `100vh` viewport height issues
- Flexbox/Grid: Should be fine (well supported)

**Current Implementation:**
- Tailwind CSS (excellent cross-browser support)
- Responsive design with breakpoints
- Backdrop blur on modals/cards

**If layout issues arise:**
- Check for Safari-specific CSS bugs
- Test viewport units on mobile
- Verify flexbox/grid fallbacks

---

### JavaScript Features
**Potential Issues:**
- Older browsers: ES6+ features
- Mobile Safari: Date handling differences
- Firefox: IndexedDB transaction timing

**Current Implementation:**
- React 18 + TypeScript
- Vite build (modern browser target)
- No polyfills currently included

**If JS errors arise:**
- Check browser version (target: last 2 versions)
- Look for unsupported ES6+ features
- Consider adding polyfills for older browsers

---

## Common Browser-Specific Fixes

### Safari-Specific

**Issue**: Backdrop blur not working
```css
/* Add fallback */
background: rgba(255, 255, 255, 0.8);
backdrop-filter: blur(10px);
-webkit-backdrop-filter: blur(10px); /* Safari prefix */
```

**Issue**: 100vh viewport height
```css
/* Use dynamic viewport height */
min-height: 100vh;
min-height: 100dvh; /* Dynamic viewport height */
```

**Issue**: IndexedDB quota
```javascript
// Check quota before saving
if (navigator.storage && navigator.storage.estimate) {
  const estimate = await navigator.storage.estimate();
  const percentUsed = (estimate.usage / estimate.quota) * 100;
  console.log(`Storage used: ${percentUsed.toFixed(2)}%`);
}
```

---

### Firefox-Specific

**Issue**: PDF fonts rendering differently
- Check font embedding in jsPDF
- Verify font fallbacks
- May need custom font configuration

**Issue**: File upload button styling
```css
/* Firefox needs specific styling */
input[type="file"] {
  /* Custom styling may not apply in Firefox */
}
```

---

### Mobile-Specific

**Issue**: Touch events not working
```javascript
// Add touch event listeners
element.addEventListener('touchstart', handleTouch, { passive: true });
```

**Issue**: Fixed positioning on mobile
```css
/* Fixed elements may scroll with page on mobile */
position: fixed;
/* Consider using position: sticky instead */
```

**Issue**: File download on mobile
- Mobile browsers may open PDF in new tab instead of downloading
- Consider adding "Share" functionality for mobile
- Use native share API if available

---

## Browser Support Matrix

### Desktop Browsers
| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Text Paste | ✓ | ✓ | ✓ | ✓ |
| Image Upload | ✓ | ✓ | ✓ | ✓ |
| PDF Generation | ✓ | ✓ | ⚠️ | ✓ |
| LocalStorage | ✓ | ✓ | ⚠️ | ✓ |
| Backdrop Filter | ✓ | ✓ | ⚠️ | ✓ |

✓ = Full support  
⚠️ = Partial support or quirks  
✗ = Not supported

### Mobile Browsers
| Feature | Chrome (Android) | Safari (iOS) |
|---------|------------------|--------------|
| Text Paste | ✓ | ✓ |
| Camera Upload | ✓ | ✓ |
| Gallery Upload | ✓ | ✓ |
| PDF Download | ⚠️ | ⚠️ |
| LocalStorage | ✓ | ⚠️ |
| Responsive UI | ✓ | ✓ |

⚠️ Mobile: PDF may open in viewer instead of downloading

---

## Debugging Tips

### Chrome DevTools
```
F12 → Console → Check for errors
F12 → Network → Check API calls
F12 → Application → Check localStorage
```

### Firefox DevTools
```
F12 → Console → Check for errors
F12 → Storage → Check localStorage
```

### Safari DevTools
```
Develop → Show Web Inspector
Develop → [Device] → For mobile testing
```

### Mobile Debugging
```
Chrome Android: chrome://inspect from desktop
Safari iOS: Safari > Develop > [Device Name]
```

---

## Fallback Strategies

### If PDF generation fails:
1. Show error message with copy-to-clipboard option
2. Offer plain text export
3. Email recipe option (future feature)

### If OCR fails:
1. Fallback to manual entry
2. Show clear error message
3. Suggest better photo quality

### If localStorage is full:
1. Show warning before saving
2. Offer to delete old recipes
3. Export recipes before clearing

---

## Testing Automation (Future)

Consider adding automated browser testing:

**Playwright** (recommended):
```bash
npm install -D @playwright/test
# Test across Chrome, Firefox, Safari
```

**Cypress**:
```bash
npm install -D cypress
# E2E testing in browser
```

For now, manual testing with this checklist is sufficient for beta launch.
