/**
 * DataKlicks Hub - registrations backend (Google Apps Script).
 *
 * Lives inside a Google Sheet owned by DataKlicks Hub. The website posts each
 * registration here; this script saves it as a row, emails the registrant (with
 * a summary of everything they have registered for) and emails the admin.
 * Setting a row's Status to "Paid" emails the registrant a payment confirmation.
 *
 * Setup: see backend/README.md
 */

var CONFIG = {
  ADMIN_EMAIL: 'dataklickshub@gmail.com',
  FROM_NAME: 'DataKlicks Hub',
  WHATSAPP_NUMBER: '2348065371750',
  WHATSAPP_DISPLAY: '+234 806 537 1750',
  BANK: { bank: 'WEMA BANK', name: 'DATAKLICKS HUB', number: '0125900780' },
  SHEET: 'Registrations',
  TIMEZONE: 'Africa/Lagos',
  MAX_PER_EMAIL_PER_HOUR: 5,
  MAX_EMAILS_PER_DAY: 90, // Gmail allows 100 recipients/day on a free account

  // Prices live here (not in the browser) so a visitor cannot change what they owe.
  // Add a joinLink (e.g. a Google Meet URL) when you have one; it is added to the
  // payment-confirmed email.
  COURSES: {
    'ai-class': {
      title: 'Create Smarter with AI - One-Day Live Class',
      amount: 20000,
      when: 'Fri, Oct 9, 2026 at 7:00 PM WAT',
      where: 'Google Meet',
      joinLink: ''
    },
    'data-analytics-ai': {
      title: 'Data Analytics & AI',
      amount: 400000,
      when: '3 months',
      where: 'Virtual',
      joinLink: ''
    },
    'sql': {
      title: 'SQL for Data Analysis',
      amount: 250000,
      when: '5 weeks',
      where: 'Online',
      joinLink: ''
    },
    'ai-automation': {
      title: 'AI Automation & Agentic AI',
      amount: 200000,
      when: '4 weeks',
      where: 'Hybrid',
      joinLink: ''
    }
  }
};

var HEADERS = ['Timestamp', 'Reg ID', 'Name', 'Email', 'Phone', 'Country', 'Course',
  'Amount (NGN)', 'Status', 'Paid at', 'Source', 'Page', 'Notes'];
var COL = { TS: 1, ID: 2, NAME: 3, EMAIL: 4, PHONE: 5, COUNTRY: 6, COURSE: 7,
  AMOUNT: 8, STATUS: 9, PAIDAT: 10, SOURCE: 11, PAGE: 12, NOTES: 13 };

/* ---------- Web app entry points ---------- */

function doPost(e) {
  var out;
  try {
    var data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    out = handleRegistration_(data);
  } catch (err) {
    console.error(err);
    out = { ok: false, error: 'Something went wrong. Please try again or message us on WhatsApp.' };
  }
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

// Health check only. Never returns registration data.
function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, service: 'DataKlicks Hub registrations' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ---------- Registration ---------- */

function handleRegistration_(d) {
  if (d && d.website) { return { ok: true, ignored: true }; } // honeypot: bots fill this in

  var v = validate_(d || {});
  if (v.error) { return { ok: false, error: v.error }; }
  var course = CONFIG.COURSES[v.courseId];

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = getSheet_();
    var rows = readRows_(sh);
    var now = new Date();

    var recent = rows.filter(function (r) {
      return r.email === v.email && (now - r.timestamp) < 3600 * 1000;
    }).length;
    if (recent >= CONFIG.MAX_PER_EMAIL_PER_HOUR) {
      return { ok: false, error: 'Too many attempts. Please try again in a little while.' };
    }

    var existing = rows.filter(function (r) {
      return r.email === v.email && r.course === course.title && r.status !== 'Cancelled';
    })[0];

    if (existing) {
      return { ok: true, duplicate: true, status: existing.status, regId: existing.regId,
        amount: course.amount, emailed: false };
    }

    var regId = 'DK-' + Utilities.getUuid().replace(/-/g, '').slice(0, 6).toUpperCase();
    sh.appendRow([now, regId, v.name, v.email, v.phone, v.country, course.title,
      course.amount, 'Pending', '', v.source, v.page, '']);
    rows = readRows_(sh);

    var mine = rows.filter(function (r) { return r.email === v.email; });
    var emailed = sendMail_({
      to: v.email,
      subject: 'Registration received - ' + course.title,
      html: registrationEmailHtml_(v, course, regId, mine)
    });
    sendMail_({
      to: CONFIG.ADMIN_EMAIL,
      subject: 'New registration: ' + v.name + ' - ' + course.title,
      html: adminEmailHtml_(v, course, regId)
    });

    return { ok: true, duplicate: false, regId: regId, amount: course.amount, emailed: emailed };
  } finally {
    lock.releaseLock();
  }
}

function validate_(d) {
  function str(x, max) { return String(x == null ? '' : x).trim().slice(0, max); }

  var name = clean_(str(d.name, 100));
  if (name.length < 2) { return { error: 'Please enter your full name.' }; }

  var email = str(d.email, 120).toLowerCase();
  if (!/^[a-z0-9][a-z0-9._%+\-]*@[a-z0-9.\-]+\.[a-z]{2,}$/.test(email)) {
    return { error: 'Please enter a valid email address.' };
  }

  var phone = str(d.phone, 25);
  if (!/^\+?[0-9][0-9 ()\-]{6,24}$/.test(phone)) {
    return { error: 'Please enter a valid phone number.' };
  }

  var country = clean_(str(d.country, 60));
  if (country.length < 2) { return { error: 'Please enter your country.' }; }

  var courseId = str(d.course, 40);
  if (!Object.prototype.hasOwnProperty.call(CONFIG.COURSES, courseId)) {
    return { error: 'That course is not available for registration.' };
  }

  if (d.consent !== true) { return { error: 'Please accept the privacy notice to continue.' }; }

  return {
    name: name, email: email, phone: phone, country: country, courseId: courseId,
    source: clean_(str(d.source, 200)), page: clean_(str(d.page, 120))
  };
}

// Strip leading characters that spreadsheets treat as formulas.
function clean_(s) {
  return String(s).replace(/[\r\n\t]+/g, ' ').replace(/^[=+\-@\s]+/, '').trim();
}

/* ---------- Payment confirmed (installable edit trigger) ---------- */

function onStatusEdit(e) {
  if (!e || !e.range) { return; }
  var sh = e.range.getSheet();
  if (sh.getName() !== CONFIG.SHEET) { return; }
  if (e.range.getColumn() !== COL.STATUS || e.range.getRow() < 2 || e.range.getNumRows() !== 1) { return; }
  if (String(e.value || '').trim() !== 'Paid') { return; }

  var rowNum = e.range.getRow();
  var row = sh.getRange(rowNum, 1, 1, HEADERS.length).getValues()[0];
  if (row[COL.PAIDAT - 1]) { return; } // already confirmed once

  sh.getRange(rowNum, COL.PAIDAT).setValue(new Date());

  var email = String(row[COL.EMAIL - 1]).trim().toLowerCase();
  var rows = readRows_(sh).filter(function (r) { return r.email === email; });
  var courseTitle = row[COL.COURSE - 1];
  var course = findCourseByTitle_(courseTitle) || { title: courseTitle, amount: row[COL.AMOUNT - 1], when: '', where: '', joinLink: '' };

  sendMail_({
    to: email,
    subject: 'Payment confirmed - ' + course.title,
    html: paymentConfirmedHtml_(String(row[COL.NAME - 1]), course, String(row[COL.ID - 1]), rows)
  });
}

function findCourseByTitle_(title) {
  for (var id in CONFIG.COURSES) {
    if (CONFIG.COURSES[id].title === title) { return CONFIG.COURSES[id]; }
  }
  return null;
}

/* ---------- Sheet helpers ---------- */

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(CONFIG.SHEET);
  if (!sh) { sh = ss.insertSheet(CONFIG.SHEET); }
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    // Plain text so names/phones/notes can never be read as formulas.
    sh.getRange('C2:G').setNumberFormat('@');
    sh.getRange('K2:M').setNumberFormat('@');
    sh.getRange(2, COL.STATUS, 1000, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(['Pending', 'Paid', 'Cancelled'], true).build());
  }
  return sh;
}

function readRows_(sh) {
  var last = sh.getLastRow();
  if (last < 2) { return []; }
  var vals = sh.getRange(2, 1, last - 1, HEADERS.length).getValues();
  return vals.map(function (r) {
    return {
      timestamp: r[0] instanceof Date ? r[0] : new Date(r[0]),
      regId: String(r[1]),
      name: String(r[2]),
      email: String(r[3]).trim().toLowerCase(),
      course: String(r[6]),
      amount: r[7],
      status: String(r[8] || 'Pending'),
      paidAt: r[9]
    };
  }).filter(function (r) { return r.email; });
}

/* ---------- Email ---------- */

function sendMail_(m) {
  var props = PropertiesService.getScriptProperties();
  var key = 'emails_' + Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyyMMdd');
  var sent = Number(props.getProperty(key) || 0);
  if (sent >= CONFIG.MAX_EMAILS_PER_DAY) { return false; }
  try {
    MailApp.sendEmail({
      to: m.to,
      subject: m.subject,
      htmlBody: m.html,
      body: 'Please view this email in an HTML-capable mail app. Questions? WhatsApp ' + CONFIG.WHATSAPP_DISPLAY,
      name: CONFIG.FROM_NAME,
      replyTo: CONFIG.ADMIN_EMAIL
    });
    props.setProperty(key, String(sent + 1));
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}

function esc_(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function naira_(n) {
  return 'NGN ' + String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function shell_(heading, inner) {
  return '<div style="background:#F4F7FF;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#0B1220;">' +
    '<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #E2E8F0;">' +
    '<div style="background:#2346D3;color:#fff;padding:20px 24px;font-size:18px;font-weight:bold;">DataKlicks Hub</div>' +
    '<div style="padding:24px;line-height:1.6;font-size:15px;">' +
    '<h2 style="margin:0 0 12px;font-size:20px;color:#0B1220;">' + esc_(heading) + '</h2>' + inner +
    '<p style="margin:24px 0 0;color:#475569;font-size:13px;">Questions? Reply to this email or WhatsApp us on ' +
    '<a href="https://wa.me/' + CONFIG.WHATSAPP_NUMBER + '" style="color:#2346D3;">' + CONFIG.WHATSAPP_DISPLAY + '</a>.</p>' +
    '</div></div></div>';
}

function summaryTable_(rows) {
  if (!rows.length) { return ''; }
  var tr = rows.map(function (r) {
    var when = Utilities.formatDate(r.timestamp, CONFIG.TIMEZONE, 'd MMM yyyy');
    var color = r.status === 'Paid' ? '#059669' : (r.status === 'Cancelled' ? '#94A3B8' : '#B45309');
    return '<tr>' +
      '<td style="padding:8px;border-bottom:1px solid #E2E8F0;">' + esc_(r.course) + '</td>' +
      '<td style="padding:8px;border-bottom:1px solid #E2E8F0;white-space:nowrap;">' + esc_(when) + '</td>' +
      '<td style="padding:8px;border-bottom:1px solid #E2E8F0;white-space:nowrap;">' + esc_(naira_(r.amount)) + '</td>' +
      '<td style="padding:8px;border-bottom:1px solid #E2E8F0;font-weight:bold;color:' + color + ';">' + esc_(r.status) + '</td>' +
      '</tr>';
  }).join('');
  return '<h3 style="margin:24px 0 8px;font-size:16px;">Your registrations with DataKlicks Hub</h3>' +
    '<table style="width:100%;border-collapse:collapse;font-size:14px;">' +
    '<tr style="text-align:left;color:#475569;"><th style="padding:8px;">Course</th><th style="padding:8px;">Date</th>' +
    '<th style="padding:8px;">Fee</th><th style="padding:8px;">Status</th></tr>' + tr + '</table>';
}

function detailsBlock_(course) {
  var lines = [];
  if (course.when) { lines.push('<b>When:</b> ' + esc_(course.when)); }
  if (course.where) { lines.push('<b>Where:</b> ' + esc_(course.where)); }
  lines.push('<b>Fee:</b> ' + esc_(naira_(course.amount)));
  return '<p style="margin:0 0 12px;">' + lines.join('<br>') + '</p>';
}

function firstName_(name) { return String(name).split(' ')[0] || 'there'; }

function registrationEmailHtml_(v, course, regId, mine) {
  var wa = 'https://wa.me/' + CONFIG.WHATSAPP_NUMBER + '?text=' + encodeURIComponent(
    'Hello DataKlicks Hub, I have made payment for ' + course.title + '. Reg ID: ' + regId + '. Name: ' + v.name + '. Attaching my receipt.');
  var inner =
    '<p>Hi ' + esc_(firstName_(v.name)) + ',</p>' +
    '<p>Thank you for registering for <b>' + esc_(course.title) + '</b>. Your registration ID is <b>' + esc_(regId) + '</b>.</p>' +
    detailsBlock_(course) +
    '<div style="background:#F4F7FF;border-radius:8px;padding:16px;margin:16px 0;">' +
    '<b>To secure your place, pay ' + esc_(naira_(course.amount)) + ' to:</b><br>' +
    'Bank: ' + esc_(CONFIG.BANK.bank) + '<br>Account name: ' + esc_(CONFIG.BANK.name) + '<br>' +
    'Account number: <b>' + esc_(CONFIG.BANK.number) + '</b></div>' +
    '<p>Then send your payment receipt on WhatsApp so we can confirm your slot:</p>' +
    '<p><a href="' + wa + '" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold;">Send receipt on WhatsApp</a></p>' +
    summaryTable_(mine);
  return shell_('Registration received', inner);
}

function paymentConfirmedHtml_(name, course, regId, rows) {
  var join = course.joinLink
    ? '<p><a href="' + esc_(course.joinLink) + '" style="display:inline-block;background:#2346D3;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold;">Join link</a></p>'
    : '<p>We will send you the joining details before the start.</p>';
  var inner =
    '<p>Hi ' + esc_(firstName_(name)) + ',</p>' +
    '<p>We have confirmed your payment for <b>' + esc_(course.title) + '</b> (ref <b>' + esc_(regId) + '</b>). Your place is secured.</p>' +
    detailsBlock_(course) + join + summaryTable_(rows);
  return shell_('Payment confirmed', inner);
}

function adminEmailHtml_(v, course, regId) {
  var inner =
    '<p><b>' + esc_(v.name) + '</b> registered for <b>' + esc_(course.title) + '</b> (' + esc_(regId) + ').</p>' +
    '<p>Email: ' + esc_(v.email) + '<br>Phone: ' + esc_(v.phone) + '<br>Country: ' + esc_(v.country) +
    '<br>Fee: ' + esc_(naira_(course.amount)) + '<br>Source: ' + esc_(v.source || 'direct') + '</p>' +
    '<p>When their receipt arrives, set Status to <b>Paid</b> in the sheet and they will be emailed automatically.</p>' +
    '<p><a href="' + esc_(SpreadsheetApp.getActiveSpreadsheet().getUrl()) + '">Open the registrations sheet</a></p>';
  return shell_('New registration', inner);
}

/* ---------- One-time setup (run once from the Apps Script editor) ---------- */

function setup() {
  var sh = getSheet_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var dash = ss.getSheetByName('Dashboard') || ss.insertSheet('Dashboard');
  dash.clear();
  dash.getRange('A1').setValue('DataKlicks Hub - registrations dashboard').setFontWeight('bold').setFontSize(14);
  var R = CONFIG.SHEET + '!';
  var stats = [
    ['Total registrations', '=COUNTA(' + R + 'B2:B)'],
    ['Paid', '=COUNTIF(' + R + 'I2:I,"Paid")'],
    ['Pending payment', '=COUNTIF(' + R + 'I2:I,"Pending")'],
    ['Revenue confirmed (NGN)', '=SUMIF(' + R + 'I2:I,"Paid",' + R + 'H2:H)'],
    ['Awaiting payment (NGN)', '=SUMIF(' + R + 'I2:I,"Pending",' + R + 'H2:H)']
  ];
  for (var i = 0; i < stats.length; i++) {
    dash.getRange(3 + i, 1).setValue(stats[i][0]).setFontWeight('bold');
    dash.getRange(3 + i, 2).setFormula(stats[i][1]);
  }
  dash.getRange('A10').setValue('Registrations by course').setFontWeight('bold');
  dash.getRange('A11').setFormula('=IFERROR(QUERY(' + R + 'G2:G,"select Col1, count(Col1) where Col1 is not null group by Col1 order by count(Col1) desc label count(Col1) \'Registrations\'",0),"No registrations yet")');
  dash.getRange('D10').setValue('Registrations by country').setFontWeight('bold');
  dash.getRange('D11').setFormula('=IFERROR(QUERY(' + R + 'F2:F,"select Col1, count(Col1) where Col1 is not null group by Col1 order by count(Col1) desc label count(Col1) \'Registrations\'",0),"No registrations yet")');
  dash.getRange('G10').setValue('Registrations by source').setFontWeight('bold');
  dash.getRange('G11').setFormula('=IFERROR(QUERY(' + R + 'K2:K,"select Col1, count(Col1) where Col1 is not null group by Col1 order by count(Col1) desc label count(Col1) \'Registrations\'",0),"No registrations yet")');
  dash.setColumnWidth(1, 260);

  var have = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'onStatusEdit'; });
  if (!have) {
    ScriptApp.newTrigger('onStatusEdit').forSpreadsheet(ss).onEdit().create();
  }

  MailApp.sendEmail({
    to: CONFIG.ADMIN_EMAIL,
    subject: 'DataKlicks Hub registrations: setup complete',
    body: 'Setup finished. The Registrations sheet, Dashboard tab and the Paid-status email trigger are ready.'
  });
}
