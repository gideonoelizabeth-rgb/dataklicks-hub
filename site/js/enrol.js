// Shared registration flow. Used by the training page and enrol.html.
(function () {
  var DK = window.DK;

  function fmt(n) { return '₦' + Number(n).toLocaleString('en-NG'); }

  // Where this visitor came from (campaign tags or referring site), saved with the registration.
  function sourceInfo() {
    var p = new URLSearchParams(location.search), parts = [];
    ['utm_source', 'utm_medium', 'utm_campaign'].forEach(function (k) {
      if (p.get(k)) parts.push(k.replace('utm_', '') + '=' + p.get(k));
    });
    if (!parts.length && document.referrer) {
      try {
        var h = new URL(document.referrer).hostname;
        if (h && h !== location.hostname) parts.push('referrer=' + h);
      } catch (e) {}
    }
    return parts.length ? parts.join(' ') : 'direct';
  }

  // Resolves to one of:
  //   { ok:true, saved:true, regId, duplicate, emailed }  saved by the backend
  //   { ok:true, saved:false }                            backend not set up, or the network failed
  //   { ok:false, error }                                 the backend rejected the details
  function submit(payload) {
    if (!DK.endpoint) return Promise.resolve({ ok: true, saved: false, reason: 'not-configured' });

    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 25000) : null;

    // text/plain keeps this a "simple" request, so the browser sends no CORS preflight
    // (Google Apps Script web apps cannot answer one).
    return fetch(DK.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) { return res.json(); })
      .then(function (json) {
        if (timer) clearTimeout(timer);
        if (json && json.ok) { json.saved = true; return json; }
        return { ok: false, error: (json && json.error) || 'Please check your details and try again.' };
      })
      .catch(function () {
        if (timer) clearTimeout(timer);
        // The request may still have reached the backend; we just could not read the reply.
        return { ok: true, saved: false, reason: 'network' };
      });
  }

  // Wires up a registration form + payment card. opts: { courseId, form, errorBox, paymentCard, greeting, notice, receiptLink }
  function wire(opts) {
    var course = DK.courses[opts.courseId];
    var form = opts.form;
    var btn = form.querySelector('button[type="submit"]');
    var hint = form.querySelector('.form-hint');
    if (hint && !DK.endpoint) hint.textContent = 'Your details go straight to our team on WhatsApp.';

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      opts.errorBox.classList.remove('show');
      if (!form.checkValidity()) { form.reportValidity(); return; }

      var d = new FormData(form);
      var name = String(d.get('name') || '').trim();
      var email = String(d.get('email') || '').trim();
      var phone = String(d.get('phone') || '').trim();
      var country = String(d.get('country') || '').trim();

      var payload = {
        name: name, email: email, phone: phone, country: country,
        course: opts.courseId,
        consent: !!form.querySelector('[name="consent"]').checked,
        website: String(d.get('website') || ''),
        source: sourceInfo(),
        page: location.pathname
      };

      var label = btn.textContent;
      btn.disabled = true; btn.textContent = 'Registering…';

      submit(payload).then(function (res) {
        if (!res.ok) {
          btn.disabled = false; btn.textContent = label;
          opts.errorBox.textContent = res.error;
          opts.errorBox.classList.add('show');
          return;
        }

        var first = name.split(' ')[0] || 'there';
        var ref = res.regId ? ' Reg ID: ' + res.regId + '.' : '';
        var msg = 'Hello DataKlicks Hub, I have made payment for ' + course.title + '.' + ref +
          ' Name: ' + name + '. Email: ' + email + '. Phone: ' + phone + '. Attaching my receipt.';
        opts.receiptLink.href = 'https://wa.me/' + DK.whatsapp + '?text=' + encodeURIComponent(msg);
        opts.greeting.textContent = res.duplicate
          ? 'Welcome back, ' + first + '. You are already registered.'
          : 'Thank you, ' + first + '. Please complete payment.';

        var note;
        if (res.reason === 'not-configured') {
          // Backend not set up yet: send the registration to the team over WhatsApp, as before.
          var tm = 'New registration — ' + course.title + '\nName: ' + name + '\nEmail: ' + email +
            '\nCountry: ' + country + '\nPhone: ' + phone + '\nAwaiting payment of ' + fmt(course.amount) +
            ' to ' + DK.bank.bank + ' · ' + DK.bank.name + ' · ' + DK.bank.number + '.';
          var teamUrl = 'https://wa.me/' + DK.whatsapp + '?text=' + encodeURIComponent(tm);
          window.open(teamUrl, '_blank', 'noopener');
          note = 'Your registration message is ready in WhatsApp. Tap <strong>Send</strong> so our team receives it. ' +
            'Did not open? <a href="' + teamUrl + '" target="_blank" rel="noopener">Send it from here</a>.';
        } else if (res.saved && res.duplicate) {
          note = 'We already have your registration for this course' + (res.status === 'Paid' ? ' and your payment is confirmed.' : '. Payment details are below.');
        } else if (res.saved && res.emailed) {
          note = 'Your registration is saved. We have emailed the payment details and a summary to <strong data-email></strong>.';
        } else if (res.saved) {
          note = 'Your registration is saved. If you do not receive an email, the payment details below are all you need.';
        } else {
          var fb = 'https://wa.me/' + DK.whatsapp + '?text=' + encodeURIComponent(
            'Hello DataKlicks Hub, I would like to register for ' + course.title + '. Name: ' + name +
            '. Email: ' + email + '. Phone: ' + phone + '. Country: ' + country + '.');
          note = 'We could not confirm that your registration was saved automatically. To be safe, ' +
            '<a href="' + fb + '" target="_blank" rel="noopener">send your details to us on WhatsApp</a>.';
        }
        opts.notice.innerHTML = note;
        var slot = opts.notice.querySelector('[data-email]');
        if (slot) slot.textContent = email;
        opts.notice.hidden = false;

        opts.paymentCard.classList.add('visible');
        var regCard = form.closest('.register-card');
        if (regCard) { regCard.style.opacity = '0.55'; regCard.style.pointerEvents = 'none'; }
        btn.textContent = '✓ Registered';
        setTimeout(function () { opts.paymentCard.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
      });
    });
  }

  // Copy-to-clipboard buttons
  function wireCopy() {
    document.querySelectorAll('.copy-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        var text = b.dataset.copy;
        var done = function () {
          var old = b.textContent; b.textContent = 'Copied ✓'; b.classList.add('copied');
          setTimeout(function () { b.textContent = old; b.classList.remove('copied'); }, 1800);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, done);
        } else {
          var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); } catch (e) {}
          document.body.removeChild(ta); done();
        }
      });
    });
  }

  window.DKEnrol = { fmt: fmt, submit: submit, wire: wire, wireCopy: wireCopy };
})();
