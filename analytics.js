const GA_MEASUREMENT_ID = 'G-3W5FPCSZQQ';
const META_PIXEL_ID = '1987381435535989';

const analyticsIsConfigured = /^G-[A-Z0-9]+$/.test(GA_MEASUREMENT_ID)
  && GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX';

const metaPixelIsConfigured = /^\d+$/.test(META_PIXEL_ID);

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

const sendMetaEvent = (eventName, parameters = {}, options = {}) => {
  if (typeof window.fbq !== 'function') {
    return;
  }

  const command = options.custom ? 'trackCustom' : 'track';
  const eventOptions = options.eventId ? { eventID: options.eventId } : undefined;
  window.fbq(command, eventName, parameters, eventOptions);
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

if (metaPixelIsConfigured) {
  if (typeof window.fbq !== 'function') {
    const fbq = function fbq() {
      if (fbq.callMethod) {
        fbq.callMethod.apply(fbq, arguments);
      } else {
        fbq.queue.push(arguments);
      }
    };

    window.fbq = fbq;
    if (!window._fbq) window._fbq = fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];

    const pixelScript = document.createElement('script');
    pixelScript.async = true;
    pixelScript.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(pixelScript);
  }

  window.fbq('init', META_PIXEL_ID);
  window.fbq('track', 'PageView');
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
  sendMetaEvent('Lead', {
    content_name: event.detail?.bookingKind || 'client'
  });
});

document.addEventListener('growth_operator_assessment_started', (event) => {
  sendAnalyticsEvent('assessment_started', {
    flow_variant: event.detail?.flow_variant || 'growth_operator_funnel'
  });
});

document.addEventListener('growth_operator_assessment_step_viewed', (event) => {
  sendAnalyticsEvent('assessment_step_viewed', {
    flow_variant: 'growth_operator_funnel',
    question_key: `step_${Number(event.detail?.step) || 1}`
  });
});

document.addEventListener('growth_operator_assessment_answered', (event) => {
  sendAnalyticsEvent('assessment_answered', {
    flow_variant: 'growth_operator_funnel',
    question_key: `step_${Number(event.detail?.step) || 1}`
  });
});

document.addEventListener('growth_operator_assessment_cta_clicked', (event) => {
  sendAnalyticsEvent('assessment_cta_click', {
    flow_variant: 'growth_operator_funnel',
    button_text: event.detail?.label || 'See if we are a fit'
  });
});

document.addEventListener('growth_operator_reservation_cta_clicked', (event) => {
  sendAnalyticsEvent('reservation_cta_click', {
    flow_variant: 'growth_operator_funnel',
    button_text: event.detail?.label || 'See If You Qualify',
    button_location: event.detail?.location || 'page'
  });
});

document.addEventListener('growth_operator_reservation_started', (event) => {
  sendAnalyticsEvent('reservation_started', {
    flow_variant: event.detail?.flow_variant || 'growth_operator_funnel',
    visitor_timezone: event.detail?.timezone || 'not_set'
  });
});

document.addEventListener('growth_operator_lead_captured', (event) => {
  sendAnalyticsEvent('generate_lead', {
    lead_type: 'growth_operator',
    flow_variant: event.detail?.flow_variant || 'growth_operator_funnel',
    campaign_source: event.detail?.campaign_source || 'direct'
  });
  sendMetaEvent('Lead', {
    content_name: 'growth_operator_fit_call'
  });
});

document.addEventListener('growth_operator_lead_capture_failed', () => {
  sendAnalyticsEvent('lead_capture_error', {
    lead_type: 'growth_operator',
    flow_variant: 'growth_operator_funnel'
  });
});

document.addEventListener('growth_operator_reservation_confirmed', (event) => {
  sendAnalyticsEvent('appointment_booked', {
    lead_type: 'growth_operator',
    flow_variant: 'growth_operator_funnel',
    visitor_timezone: event.detail?.timezone || 'not_set'
  });
  sendMetaEvent('Schedule', {
    content_name: 'growth_operator_fit_call'
  });
});

document.addEventListener('shopify_growth_apply_opened', (event) => {
  sendAnalyticsEvent('quick_apply_open', {
    button_location: event.detail?.location || 'unknown'
  });
  sendMetaEvent('ApplyOpened', {
    button_location: event.detail?.location || 'unknown'
  }, { custom: true });
});

document.addEventListener('shopify_growth_recommendation_viewed', (event) => {
  sendAnalyticsEvent('quick_apply_recommendation_view', serviceParameters(event.detail));
});

document.addEventListener('shopify_growth_apply_submitted', (event) => {
  const leadId = event.detail?.leadId || 'not_set';
  sendAnalyticsEvent('generate_lead', {
    lead_type: 'shopify_growth',
    lead_id: leadId,
    ...serviceParameters(event.detail)
  });
  sendMetaEvent('Lead', {
    content_name: 'shopify_growth',
    ...serviceParameters(event.detail)
  }, { eventId: leadId });
});

document.addEventListener('shopify_growth_checkout_started', (event) => {
  const leadId = event.detail?.leadId || 'not_set';
  sendAnalyticsEvent('begin_checkout', {
    lead_id: leadId,
    value: Number(event.detail?.total) || 0,
    ...serviceParameters(event.detail)
  });
  sendMetaEvent('InitiateCheckout', {
    value: Number(event.detail?.total) || 0,
    currency: 'USD',
    content_category: 'shopify_growth_services',
    content_ids: Array.isArray(event.detail?.services) ? event.detail.services : [],
    num_items: Array.isArray(event.detail?.services) ? event.detail.services.length : 0
  }, { eventId: `${leadId}-checkout` });
});

document.addEventListener('shopify_growth_onboarding_submitted', (event) => {
  sendAnalyticsEvent('onboarding_complete', {
    lead_id: event.detail?.leadId || 'not_set',
    ...serviceParameters(event.detail)
  });
  sendMetaEvent('OnboardingComplete', {
    ...serviceParameters(event.detail)
  }, { custom: true, eventId: `${event.detail?.leadId || 'not_set'}-onboarding` });
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
