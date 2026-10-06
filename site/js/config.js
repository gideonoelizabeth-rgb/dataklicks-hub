// Registration settings shared by the training page and course enrolment pages.
// The prices shown here are for display only. The real prices are set in
// backend/Code.gs, so a visitor cannot change what they owe.
window.DK = {
  // Paste the Google Apps Script Web App URL here (see backend/README.md).
  // While this is empty, registrations are NOT saved and the pages fall back
  // to sending the details to WhatsApp.
  endpoint: '',

  whatsapp: '2348065371750',
  whatsappDisplay: '+234 806 537 1750',
  bank: { bank: 'WEMA BANK', name: 'DATAKLICKS HUB', number: '0125900780' },

  courses: {
    'ai-class': {
      title: 'Create Smarter with AI — One-Day Live Class',
      amount: 20000,
      meta: 'Fri, Oct 9, 2026 · 7:00 PM WAT · Google Meet'
    },
    'data-analytics-ai': {
      title: 'Data Analytics & AI',
      amount: 400000,
      meta: '3 months · Virtual'
    },
    'sql': {
      title: 'SQL for Data Analysis',
      amount: 250000,
      meta: '5 weeks · Online'
    },
    'ai-automation': {
      title: 'AI Automation & Agentic AI',
      amount: 200000,
      meta: '4 weeks · Hybrid'
    }
  }
};
