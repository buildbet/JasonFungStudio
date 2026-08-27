const GA_MEASUREMENT_ID = 'G-3W5FPCSZQQ';

const analyticsIsConfigured = /^G-[A-Z0-9]+$/.test(GA_MEASUREMENT_ID)
  && GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX';

const sendAnalyticsEvent = (eventName, parameters = {}) => {
  if (typeof window.gtag !== 'function') {
    return;
  }

  window.gtag('event', eventName, {
    ...parameters,
    page_path: window.location.pathname,
    transport_type: 'beacon'
  });
};

const serviceParameters = (detail = {}) => {
  const services = Array.isArray(detail.services) ? detail.services : [];
  const total = Number(detail.total ?? detail.weeklyTotal);

  return {
    selected_services: services.join('|') || 'not_set',
    service_count: services.length,
    weekly_total: Number.isFinite(total) ? total : 0,
    currency: 'USD'
  };
};

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

  if (!isBookingLink) {
    return;
  }

  sendAnalyticsEvent('book_button_click', {
    button_location: bookLink.className || 'link',
    button_text: bookLink.textContent.trim().replace(/\s+/g, ' ')
  });
});

document.addEventListener('booking_questionnaire_submitted', (event) => {
  sendAnalyticsEvent('generate_lead', {
    lead_type: event.detail?.bookingKind || 'client'
  });
});

document.addEventListener('shopify_growth_apply_opened', (event) => {
  sendAnalyticsEvent('quick_apply_open', {
    button_location: event.detail?.location || 'unknown'
  });
});

document.addEventListener('shopify_growth_recommendation_viewed', (event) => {
  sendAnalyticsEvent('quick_apply_recommendation_view', serviceParameters(event.detail));
});

document.addEventListener('shopify_growth_apply_submitted', (event) => {
  sendAnalyticsEvent('generate_lead', {
    lead_type: 'shopify_growth',
    lead_id: event.detail?.leadId || 'not_set',
    ...serviceParameters(event.detail)
  });
});

document.addEventListener('shopify_growth_checkout_started', (event) => {
  sendAnalyticsEvent('begin_checkout', {
    lead_id: event.detail?.leadId || 'not_set',
    value: Number(event.detail?.total) || 0,
    ...serviceParameters(event.detail)
  });
});

document.addEventListener('shopify_growth_onboarding_submitted', (event) => {
  sendAnalyticsEvent('onboarding_complete', {
    lead_id: event.detail?.leadId || 'not_set',
    ...serviceParameters(event.detail)
  });
});

if (/\/shopify-growth-success\.html$/.test(window.location.pathname)) {
  let savedLead = {};
  try {
    savedLead = JSON.parse(localStorage.getItem('jfs_shopify_growth_lead') || '{}');
  } catch (_) {}

  sendAnalyticsEvent('checkout_success_view', {
    lead_id: savedLead.id || 'not_set',
    ...serviceParameters({ services: savedLead.services, total: savedLead.weeklyTotal })
  });
}
