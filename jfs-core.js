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

if (metaPixelIsConfigured && !window.jfsMetaPixelBaseLoaded) {
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
  window.jfsMetaPixelBaseLoaded = true;
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

document.addEventListener('shopify_growth_apply_opened', (event) => {
  sendAnalyticsEvent('quick_apply_open', {
    button_location: event.detail?.location || 'unknown'
  });
  sendMetaEvent('ApplyOpened', {
    button_location: event.detail?.location || 'unknown'
  }, { custom: true });
});

document.addEventListener('shopify_growth_assessment_started', (event) => {
  sendAnalyticsEvent('assessment_started', {
    flow_variant: event.detail?.flowVariant || 'unknown',
    start_source: event.detail?.source || 'unknown'
  });
});

document.addEventListener('shopify_growth_step_viewed', (event) => {
  sendAnalyticsEvent('assessment_step_viewed', {
    flow_variant: event.detail?.flowVariant || 'unknown',
    question_key: event.detail?.questionKey || 'unknown',
    question_number: Number(event.detail?.questionNumber) || 0,
    total_questions: Number(event.detail?.totalQuestions) || 0
  });
});

document.addEventListener('shopify_growth_answered', (event) => {
  sendAnalyticsEvent('assessment_answered', {
    flow_variant: event.detail?.flowVariant || 'unknown',
    question_key: event.detail?.questionKey || 'unknown',
    question_number: Number(event.detail?.questionNumber) || 0,
    answer_value: event.detail?.answerValue || 'not_set',
    price_impact: Number(event.detail?.priceImpact) || 0,
    currency: 'USD'
  });
});

document.addEventListener('shopify_growth_assessment_abandoned', (event) => {
  sendAnalyticsEvent('assessment_abandoned', {
    flow_variant: event.detail?.flowVariant || 'unknown',
    last_question_key: event.detail?.questionKey || 'unknown',
    last_question_number: Number(event.detail?.questionNumber) || 0,
    answered_count: Number(event.detail?.answeredCount) || 0,
    completion_percent: Number(event.detail?.completionPercent) || 0
  });
});

document.addEventListener('shopify_growth_service_changed', (event) => {
  sendAnalyticsEvent('recommendation_service_changed', {
    flow_variant: event.detail?.flowVariant || 'unknown',
    service_key: event.detail?.serviceKey || 'unknown',
    selected: event.detail?.selected ? 1 : 0,
    weekly_total: Number(event.detail?.total) || 0,
    currency: 'USD'
  });
});

document.addEventListener('shopify_growth_recommendation_viewed', (event) => {
  sendAnalyticsEvent('quick_apply_recommendation_view', {
    flow_variant: event.detail?.flowVariant || 'unknown',
    ...serviceParameters(event.detail)
  });
});

document.addEventListener('shopify_growth_partial_lead_saved', (event) => {
  sendAnalyticsEvent('partial_lead_saved', {
    flow_variant: event.detail?.flowVariant || 'unknown',
    ...serviceParameters(event.detail)
  });
});

document.addEventListener('shopify_growth_apply_submitted', (event) => {
  const leadId = event.detail?.leadId || 'not_set';
  sendAnalyticsEvent('generate_lead', {
    lead_type: 'shopify_growth',
    lead_id: leadId,
    flow_variant: event.detail?.flowVariant || 'unknown',
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
    flow_variant: event.detail?.flowVariant || 'unknown',
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
