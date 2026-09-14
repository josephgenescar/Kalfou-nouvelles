(function trackPageView() {
  const visitorStorageKey = 'kalfou-anonymous-visitor-id';
  let visitorId = localStorage.getItem(visitorStorageKey);
  if (!visitorId && window.crypto?.randomUUID) {
    visitorId = window.crypto.randomUUID();
    localStorage.setItem(visitorStorageKey, visitorId);
  }
  if (!visitorId) return;

  fetch('/api/track-visit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      path: `${window.location.pathname}${window.location.search}`,
      referrer: document.referrer,
      visitorId
    }),
    keepalive: true
  }).catch(() => {});
})();
