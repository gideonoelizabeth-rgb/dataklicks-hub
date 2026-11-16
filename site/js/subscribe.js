// Optional email signup (resources and blog pages).
// The signup box stays hidden unless the registration system says it can save signups,
// so a visitor is never told "thank you" for an address that was not saved.
(function () {
  var box = document.getElementById('subscribeBox');
  var form = document.getElementById('subscribeForm');
  var DK = window.DK || {};
  if (!box || !form || !DK.endpoint || typeof fetch === 'undefined') return;

  var msg = form.querySelector('.subscribe-msg');
  var btn = form.querySelector('button[type="submit"]');

  function say(text, ok) {
    msg.textContent = text;
    msg.className = 'subscribe-msg ' + (ok ? 'ok' : 'err');
  }

  fetch(DK.endpoint)
    .then(function (r) { return r.json(); })
    .then(function (j) {
      if (j && j.ok && j.features && j.features.indexOf('newsletter') > -1) box.hidden = false;
    })
    .catch(function () {});

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var d = new FormData(form);
    var email = String(d.get('email') || '').trim();
    if (!email) { say('Please enter your email address.', false); return; }
    if (!form.querySelector('[name="consent"]').checked) { say('Please tick the box to agree to receive emails.', false); return; }

    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 20000) : null;
    btn.disabled = true; say('Saving…', true);

    // text/plain keeps this a "simple" request (no CORS preflight), as the registration form does.
    fetch(DK.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        type: 'subscribe',
        email: email,
        firstName: String(d.get('firstName') || '').trim(),
        consent: true,
        website: String(d.get('website') || ''),
        page: location.pathname
      }),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) { return r.json(); })
      .then(function (j) {
        if (timer) clearTimeout(timer);
        btn.disabled = false;
        if (j && j.ok) {
          say('Thank you for subscribing to DataKlicks Hub. Look out for practical insights, learning resources and updates from our community.', true);
          form.reset();
        } else {
          say((j && j.error) || 'Something went wrong. Please try again.', false);
        }
      })
      .catch(function () {
        if (timer) clearTimeout(timer);
        btn.disabled = false;
        say('We could not save your sign-up just now. Please try again, or message us on WhatsApp.', false);
      });
  });
})();
