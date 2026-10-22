// Registration settings shared by the training page and course enrolment pages.
// The prices shown here are for display only. The real prices are set in
// backend/Code.gs, so a visitor cannot change what they owe.
window.DK = {
  // Paste the Google Apps Script Web App URL here (see backend/README.md).
  // While this is empty, registrations are NOT saved and the pages fall back
  // to sending the details to WhatsApp.
  endpoint: 'https://script.google.com/macros/s/AKfycbyp3H9XviC3yEpsMRhWCnoHtKRLlxomkgyimpxJjcFX8JJ8Zpt9mjdfbpmRhv_RGbodRw/exec',

  // Shows the "Discount code" box on a registration form that has one. No page has
  // a code box right now (the class that used it has ended). The codes themselves
  // live only in backend/Code.gs.
  discountCodes: false,

  whatsapp: '2348065371750',
  whatsappDisplay: '+234 806 537 1750',
  bank: { bank: 'WEMA BANK', name: 'DATAKLICKS HUB', number: '0125900780' },

  courses: {
    // Free training for 30 sisters. hidden = not listed on the general enrolment page,
    // only reachable from its own registration page.
    'sisters-marketing': {
      title: 'Free Digital Marketing Training for Business Owners',
      amount: 0,
      meta: 'Free · 30 slots',
      hidden: true
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
