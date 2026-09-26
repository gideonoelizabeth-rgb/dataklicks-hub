// DataKlicks Hub - Main JS

// Mobile menu toggle
const menuToggle = document.querySelector('.menu-toggle');
const navList = document.querySelector('.nav-list');
if (menuToggle && navList) {
  menuToggle.addEventListener('click', () => {
    const open = navList.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', open);
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.site-header')) navList.classList.remove('open');
  });
}

// Highlight current nav
(() => {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-list a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === path || (path === '' && href === 'index.html') || (path === 'index.html' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
})();

// Animated counters
const counters = document.querySelectorAll('[data-count]');
const animateCount = (el) => {
  const target = parseFloat(el.dataset.count);
  const suffix = el.dataset.suffix || '';
  const prefix = el.dataset.prefix || '';
  const duration = 1600;
  const start = performance.now();
  const startVal = 0;
  const step = (now) => {
    const elapsed = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - elapsed, 3);
    const current = Math.floor(startVal + (target - startVal) * eased);
    el.textContent = `${prefix}${current.toLocaleString()}${suffix}`;
    if (elapsed < 1) requestAnimationFrame(step);
    else el.textContent = `${prefix}${target.toLocaleString()}${suffix}`;
  };
  requestAnimationFrame(step);
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      if (el.hasAttribute('data-count') && !el.dataset.animated) {
        el.dataset.animated = 'true';
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          animateCount(el);
        } else {
          const suffix = el.dataset.suffix || '';
          const prefix = el.dataset.prefix || '';
          el.textContent = `${prefix}${parseFloat(el.dataset.count).toLocaleString()}${suffix}`;
        }
      }
      if (el.classList.contains('fade-in')) {
        el.classList.add('visible');
      }
    }
  });
}, { threshold: 0.2 });

counters.forEach(c => observer.observe(c));
document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// Course filters (courses page)
const courseSearch = document.getElementById('courseSearch');
const courseCategory = document.getElementById('courseCategory');
const courseLevel = document.getElementById('courseLevel');
const courseCards = document.querySelectorAll('[data-course]');

const filterCourses = () => {
  const q = (courseSearch?.value || '').toLowerCase();
  const cat = courseCategory?.value || 'all';
  const lvl = courseLevel?.value || 'all';
  let visible = 0;
  courseCards.forEach(card => {
    const title = (card.dataset.title || '').toLowerCase();
    const category = card.dataset.category || '';
    const level = card.dataset.level || '';
    const matchesQ = !q || title.includes(q);
    const matchesCat = cat === 'all' || category === cat;
    const matchesLvl = lvl === 'all' || level === lvl;
    const show = matchesQ && matchesCat && matchesLvl;
    card.style.display = show ? '' : 'none';
    if (show) visible++;
  });
  const noResults = document.getElementById('noResults');
  if (noResults) noResults.style.display = visible === 0 ? 'block' : 'none';
};

[courseSearch, courseCategory, courseLevel].forEach(el => {
  if (el) el.addEventListener('input', filterCourses);
});

// Contact form
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(contactForm);
    const name = data.get('name') || 'Enquiry';
    const email = data.get('email') || '';
    const type = data.get('enquiry_type') || 'General enquiry';
    const message = data.get('message') || '';
    const org = data.get('organization') || '';

    // Compose a WhatsApp message as the primary delivery channel
    const wa = `Hello DataKlicks Hub,%0A%0A*Enquiry type:* ${encodeURIComponent(type)}%0A*Name:* ${encodeURIComponent(name)}%0A*Email:* ${encodeURIComponent(email)}${org ? `%0A*Organization:* ${encodeURIComponent(org)}` : ''}%0A%0A${encodeURIComponent(message)}`;
    const waUrl = `https://wa.me/2348065371750?text=${wa}`;

    // Show success
    const success = document.getElementById('formSuccess');
    if (success) {
      success.classList.add('show');
      success.innerHTML = `Thanks, ${name.split(' ')[0]}. Your enquiry is ready — opening WhatsApp to send it to our team. If it doesn't open automatically, <a href="${waUrl}" target="_blank" rel="noopener">click here</a>.`;
    }
    // Open WhatsApp
    window.open(waUrl, '_blank', 'noopener');
    contactForm.reset();
  });
}

// Newsletter form
const newsletterForm = document.getElementById('newsletterForm');
if (newsletterForm) {
  newsletterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const success = newsletterForm.querySelector('.form-success');
    if (success) {
      success.classList.add('show');
      success.textContent = 'Thank you for subscribing to DataKlicks Hub. Look out for practical insights, learning resources and updates from our community.';
    }
    newsletterForm.reset();
  });
}

// Current year in footer
const yearEls = document.querySelectorAll('[data-year]');
yearEls.forEach(el => el.textContent = new Date().getFullYear());
