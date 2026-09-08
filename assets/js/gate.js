/* ═══════════════════════════════════════════════════════════════════════
   Password gate.

   A courtesy lock, not security. GitHub Pages serves static files with no
   server to check anything, so the markup, the stylesheet and every photo
   remain fetchable by direct URL whatever this script does. It keeps the
   prototype from being stumbled upon; it does not keep it secret.

   The password is stored as a SHA-256 digest purely so the word itself is
   not sitting in plain sight in the source. Unlocking is remembered in
   localStorage, so switching prototypes never asks again.
   ═══════════════════════════════════════════════════════════════════════ */
(() => {
  const DIGEST = '90a3eb9597a1ff5705b4bb64f6c75441907c65102cf5341c19b8cdcc312a621c';

  /* Mark the prototype currently being viewed. */
  const here = document.documentElement.dataset.variant;
  document.querySelectorAll('.testbar__link').forEach(a =>
    a.classList.toggle('is-active', a.dataset.v === here));

  const form  = document.getElementById('gate-form');
  const input = document.getElementById('gate-input');
  const error = document.getElementById('gate-error');
  if (!form) return;

  const sha256 = async text => {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (await sha256(input.value.trim().toLowerCase()) === DIGEST) {
      localStorage.setItem('ai-unlocked', 'yes');
      document.documentElement.classList.remove('locked');
      dispatchEvent(new Event('resize'));      // let the accordion re-measure
    } else {
      error.hidden = false;
      input.value = '';
      input.focus();
    }
  });
})();
