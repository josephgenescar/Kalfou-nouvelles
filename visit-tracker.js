(function trackPageView() {
  const visitKey = `kalfou-visit:${window.location.pathname}${window.location.search}`;
  if (sessionStorage.getItem(visitKey)) return;
  sessionStorage.setItem(visitKey, '1');

  fetch('/api/track-visit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      path: `${window.location.pathname}${window.location.search}`,
      referrer: document.referrer
    }),
    keepalive: true
  }).catch(() => {});
})();
