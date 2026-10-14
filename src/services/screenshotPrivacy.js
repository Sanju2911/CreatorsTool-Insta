// Opt-in local screenshot redaction. This changes only the presentation, never
// stored records or auth. The DOM still contains identities: export images only.
if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('screenshotPrivacy') === '1') {
  const style = document.createElement('style');
  style.textContent = `
    .screenshot-private-text { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; background: #cbd5e1 !important; border-radius: 4px !important; }
    .screenshot-private-photo { visibility: hidden !important; }
    #navbar-profile-btn .navbar-profile-name, .avatar-placeholder { color: transparent !important; }
  `;
  document.head.appendChild(style);
  const identities = new Set();
  const redact = () => {
    for (const el of document.querySelectorAll('#navbar-profile-btn, .top-dashboard-section h2')) {
      const value = el.textContent.trim();
      if (value.length > 2) {
        identities.add(value.toLowerCase());
        // Account display names often contain a personal name before a separator.
        identities.add(value.split(/[|]/)[0].trim().toLowerCase());
      }
    }
    for (const link of document.querySelectorAll('a[href*="instagram.com/"]')) {
      const match = link.href.match(/instagram\.com\/([^/?#]+)/);
      if (match && !['p', 'reel', 'reels'].includes(match[1])) identities.add(match[1].toLowerCase());
    }
    for (const el of document.querySelectorAll('img[alt], [title]')) {
      const value = el.tagName === 'IMG' ? el.alt : el.title;
      if (value && /avatar|profile|author/i.test(el.className || '')) identities.add(value.toLowerCase());
    }
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent || ['SCRIPT', 'STYLE'].includes(parent.tagName)) continue;
      const value = node.textContent.trim().toLowerCase();
      if (!value) continue;
      if (/@[a-z0-9_.-]+|instagram\.com\//i.test(value) ||
          [...identities].some(identity => identity.length > 2 && value.includes(identity))) {
        parent.classList.add('screenshot-private-text');
      }
    }
    for (const img of document.images) {
      const rect = img.getBoundingClientRect();
      const isAvatar = (rect.width > 0 && rect.height > 0 && rect.width <= 160 && rect.height <= 160) || img.closest('#navbar-profile-btn');
      img.classList.toggle('screenshot-private-photo', Boolean(isAvatar));
    }
    for (const field of document.querySelectorAll('input, textarea')) {
      if (field.type === 'password' || /@[a-z0-9_.-]+/i.test(field.value) ||
          [...identities].some(identity => field.value.toLowerCase().includes(identity))) {
        field.classList.add('screenshot-private-text');
      }
    }
    for (const el of document.querySelectorAll('.top-dashboard-section div')) {
      if (!el.children.length && /^[A-Z?]$/.test(el.textContent.trim())) {
        el.classList.add('screenshot-private-text');
      }
    }
    // Remove identity tooltips and accessible labels from small creator badges
    // visually, while keeping reference content and layout intact.
    for (const el of document.querySelectorAll('[title]')) {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 70 && rect.height <= 70 && [...identities].some(value => el.title.toLowerCase().includes(value))) {
        el.classList.add('screenshot-private-photo');
      }
    }
  };
  new MutationObserver(redact).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  window.addEventListener('load', redact);
}
