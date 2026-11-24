---
status: active
date: 2026-04-16
subject: 2026-04-16.file-protocol-security
topics: [security, clipboard, localStorage, secure-context]
research: []
memory: []
---

## Goal

Fix security issues preventing clipboard functionality from working when the app is opened via `file://` protocol, and improve error handling for Secure Context requirements.

## Scope

**In scope:**
- Add clipboard fallback using `execCommand('copy')` for non-secure contexts
- Detect insecure context and show helpful message to users
- Document recommended local development method

**Out of scope:**
- Service worker implementation
- HTTPS/localhost deployment changes
- CSP header configuration for GitHub Pages
- Cross-device sync of localStorage data

## Affected files

- `app.js` — Add `copyToClipboard()` helper with fallback
- `index.html` — (Optional) Add warning banner for file:// users
- `browse.html` — Apply same clipboard fix if it has copy functionality
- `README.md` — Document `npx serve` as recommended local dev method

## Implementation steps

1. **Add clipboard fallback helper** in `app.js`:
   ```javascript
   function copyToClipboard(text) {
     if (navigator.clipboard && window.isSecureContext) {
       return navigator.clipboard.writeText(text);
     }
     // Fallback for file:// and non-secure contexts
     const ta = document.createElement('textarea');
     ta.value = text;
     ta.style.position = 'fixed';
     ta.style.opacity = '0';
     document.body.appendChild(ta);
     ta.focus();
     ta.select();
     try { document.execCommand('copy'); } catch (e) {}
     document.body.removeChild(ta);
     return Promise.resolve();
   }
   ```

2. **Replace clipboard calls** in `copyText()` and `copyLink()`:
   - Change `navigator.clipboard.writeText(...)` to `copyToClipboard(...)`
   - Remove `.catch()` fallback in favor of the helper

3. **Add insecure context detection** (optional UX improvement):
   ```javascript
   if (!window.isSecureContext) {
     showToast('For full features, serve via HTTP: npx serve .');
   }
   ```

4. **Check `browse.html`** for duplicate clipboard code to fix

5. **Update README.md** with local dev server recommendation

## Verification

1. Open `index.html` directly via file:// — clipboard should work
2. Run via `npx serve .` — clipboard should work
3. Check browser console — no errors in either mode
4. Run `chezmoi apply` if this is a chezmoi-managed repo

## Subject folder created

`.context/2026-04-16.file-protocol-security/`

## Recommended next step

Run `b-build` to implement the clipboard fallback and README updates.
