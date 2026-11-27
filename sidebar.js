/* Mobile navigation only. No requests are sent to the API. */
(() => {
  const button = document.getElementById('appMenuToggle');
  const sidebar = document.getElementById('appSidebar');
  if (!button || !sidebar) return;
  const narrow = window.matchMedia('(max-width:760px)');
  function setExpanded(expanded) {
    sidebar.classList.toggle('app-collapsed', !expanded);
    button.setAttribute('aria-expanded', String(expanded));
  }
  function syncViewport() { setExpanded(!narrow.matches); }
  button.addEventListener('click', () => setExpanded(button.getAttribute('aria-expanded') !== 'true'));
  if (narrow.addEventListener) narrow.addEventListener('change', syncViewport);
  else narrow.addListener(syncViewport);
  syncViewport();
})();
