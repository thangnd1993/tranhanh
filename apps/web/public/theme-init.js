// Runs before first paint; it never changes Angular-owned markup.
(() => {
  try {
    const preference = localStorage.getItem('tranhanh.theme');
    if (preference === 'light' || preference === 'dark') {
      document.documentElement.dataset.theme = preference;
    }
  } catch {
    // CSS follows the operating system when storage is unavailable.
  }
})();
