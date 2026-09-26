# DataKlicks Hub — Corporate Website

Premium, responsive corporate website for **DataKlicks Hub** — a Nigerian technology, education and business solutions company. Built from the PRD `DATAKLICKS HUB PRD.docx`.

**Tagline:** Raising the Top 1% Tech Giants in Africa.

## What's inside

Static site (HTML + CSS + JS, no build step) in [`site/`](./site):

| Page | Path |
| --- | --- |
| Home | [`site/index.html`](./site/index.html) |
| Courses | [`site/courses.html`](./site/courses.html) |
| About Us | [`site/about.html`](./site/about.html) |
| Blog | [`site/blog.html`](./site/blog.html) |
| Contact | [`site/contact.html`](./site/contact.html) |

Shared styles in `site/css/styles.css`, JS in `site/js/main.js`.

## Brand

- Royal Blue `#2346D3`
- Midnight Navy `#0B1220`
- Soft Blue-White `#F4F7FF`
- Manrope headings + Inter body (Google Fonts)

## WhatsApp

Every page carries a floating WhatsApp CTA (bottom-right) and inline WhatsApp actions on the Home, Courses, About and Contact pages. The Contact-form submission composes an enquiry message and opens `wa.me/2348065371750` with it prefilled.

## Local preview

```bash
powershell -File serve.ps1
```

Then open http://localhost:8123.

## Deployment

Deployed on Vercel as a static site — no build command, `site/` as the output directory.
