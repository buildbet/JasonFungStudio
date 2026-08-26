const GA_MEASUREMENT_ID = 'G-FFKLXDL68E';

const analyticsIsConfigured = /^G-[A-Z0-9]+$/.test(GA_MEASUREMENT_ID)
  && GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX';

if (analyticsIsConfigured) {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    allow_google_signals: false,
    anonymize_ip: true
  });

  const analyticsScript = document.createElement('script');
  analyticsScript.async = true;
  analyticsScript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
  document.head.appendChild(analyticsScript);
}

document.addEventListener('click', (event) => {
  const bookLink = event.target.closest('a[href]');
  if (!bookLink) {
    return;
  }

  const destination = new URL(bookLink.href, window.location.href);
  const isBookingLink = /\/book\.html$/.test(destination.pathname)
    || /\/partner-call\.html$/.test(destination.pathname);

  if (!isBookingLink || typeof window.gtag !== 'function') {
    return;
  }

  window.gtag('event', 'book_button_click', {
    button_location: bookLink.className || 'link',
    button_text: bookLink.textContent.trim().replace(/\s+/g, ' '),
    page_path: window.location.pathname,
    transport_type: 'beacon'
  });
});

document.addEventListener('booking_questionnaire_submitted', (event) => {
  if (typeof window.gtag !== 'function') {
    return;
  }

  window.gtag('event', 'generate_lead', {
    lead_type: event.detail?.bookingKind || 'client',
    page_path: window.location.pathname,
    transport_type: 'beacon'
  });
});

document.addEventListener('shopify_growth_apply_submitted', (event) => {
  if (typeof window.gtag !== 'function') {
    return;
  }

  window.gtag('event', 'generate_lead', {
    lead_type: 'shopify_growth',
    selected_plan: event.detail?.plan || 'not_set',
    lead_id: event.detail?.leadId || 'not_set',
    page_path: window.location.pathname,
    transport_type: 'beacon'
  });
});

document.addEventListener('shopify_growth_onboarding_submitted', (event) => {
  if (typeof window.gtag !== 'function') {
    return;
  }

  window.gtag('event', 'onboarding_complete', {
    selected_plan: event.detail?.plan || 'not_set',
    lead_id: event.detail?.leadId || 'not_set',
    page_path: window.location.pathname,
    transport_type: 'beacon'
  });
});

if (/\/shopify-growth-success\.html$/.test(window.location.pathname)
    && typeof window.gtag === 'function') {
  window.gtag('event', 'purchase_complete', {
    page_path: window.location.pathname,
    transport_type: 'beacon'
  });
}
