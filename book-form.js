(() => {
const DEFAULT_CAL_LINK = 'https://cal.com/jason-fung-zndb6x';
const calContainer = document.getElementById('cal-inline-embed');
const calWrap = document.getElementById('cal-embed-wrap');
const calLoading = document.getElementById('cal-loading');
const calendarStep = document.getElementById('booking-calendar-step');
const questionnaire = document.getElementById('booking-questionnaire');
const questionnaireStatus = document.getElementById('booking-questionnaire-status');
const questionnaireSubmit = questionnaire?.querySelector('.booking-questionnaire__submit');
const configuredCalLink = calContainer?.dataset.calLink || document.body.dataset.calLink || DEFAULT_CAL_LINK;
let calEmbedLoaded = false;

const getCalLink = (value) => {
  if (!value || value === 'replace-with-provided-cal-link') {
    return '';
  }

  try {
    const url = new URL(value);
    return url.pathname.replace(/^\/+/, '').replace(/\/+$/, '');
  } catch (_error) {
    return value.replace(/^\/+/, '').replace(/\/+$/, '');
  }
};

const setCalendarLoaded = () => {
  if (calWrap) {
    calWrap.setAttribute('aria-busy', 'false');
    calWrap.classList.add('is-loaded');
  }
  if (calLoading) {
    calLoading.hidden = true;
  }
};

const showCalendarFallback = () => {
  if (calWrap) {
    calWrap.setAttribute('aria-busy', 'false');
    calWrap.classList.add('has-error');
  }
  if (calLoading) {
    calLoading.textContent = 'The booking calendar could not load. Please use the email fallback below.';
  }
};

const watchForCalendarFrame = () => {
  if (!calContainer) {
    return;
  }

  const bindFrameLoad = (frame) => {
    setCalendarLoaded();
    frame.addEventListener('load', setCalendarLoaded, { once: true });
  };
  const existingFrame = calContainer.querySelector('iframe');

  if (existingFrame) {
    bindFrameLoad(existingFrame);
    return;
  }

  const observer = new MutationObserver(() => {
    const frame = calContainer.querySelector('iframe');
    if (frame) {
      bindFrameLoad(frame);
      observer.disconnect();
    }
  });

  observer.observe(calContainer, { childList: true, subtree: true });
};

const getQuestionnaireConfig = () => {
  if (!questionnaire) {
    return {};
  }

  const data = new FormData(questionnaire);
  const config = {};

  data.forEach((value, key) => {
    const answer = String(value).trim();
    if (!answer) {
      return;
    }

    config[key] = answer;
    config[`metadata[${key}]`] = answer;
  });

  config['metadata[booking_kind]'] = questionnaire.dataset.bookingKind || 'booking';
  return config;
};

const getLeadSubject = () => {
  const kind = questionnaire?.dataset.bookingKind || 'booking';
  return kind === 'partner'
    ? 'New partner call lead - Jason Fung Studio'
    : 'New Growth Sprint lead - Jason Fung Studio';
};

const getLeadPayload = () => {
  const data = new FormData(questionnaire);

  data.set('access_key', questionnaire.dataset.web3formsKey || '');
  data.set('subject', getLeadSubject());
  data.set('from_name', 'Jason Fung Studio booking form');
  data.set('booking_kind', questionnaire.dataset.bookingKind || 'booking');
  data.set('page_url', window.location.href);

  return data;
};

const setQuestionnaireStatus = (message, isError = false) => {
  if (!questionnaireStatus) {
    return;
  }

  questionnaireStatus.textContent = message;
  questionnaireStatus.classList.toggle('is-error', isError);
};

const setQuestionnaireSubmitting = (isSubmitting) => {
  if (!questionnaireSubmit) {
    return;
  }

  questionnaireSubmit.disabled = isSubmitting;
  questionnaireSubmit.firstChild.nodeValue = isSubmitting ? 'Saving lead... ' : 'Continue to calendar ';
};

const submitLead = async () => {
  const accessKey = questionnaire?.dataset.web3formsKey || '';

  if (!accessKey || accessKey === 'replace-with-web3forms-access-key') {
    throw new Error('Add your Web3Forms access key before this form can send leads.');
  }

  const response = await fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    body: getLeadPayload(),
  });
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || 'The lead could not be saved.');
  }
};

const revealCalendar = () => {
  if (calendarStep) {
    calendarStep.hidden = false;
  }
  if (questionnaire) {
    questionnaire.hidden = true;
  }
};

const loadCalEmbed = (prefillConfig = {}) => {
  if (calEmbedLoaded) {
    return;
  }

  const calLink = getCalLink(configuredCalLink);

  if (!calContainer || !calLink) {
    showCalendarFallback();
    return;
  }

  watchForCalendarFrame();

  (function (C, A, L) {
    const p = function (a, ar) {
      a.q.push(ar);
    };
    const d = C.document;
    C.Cal = C.Cal || function () {
      const cal = C.Cal;
      const ar = arguments;
      if (!cal.loaded) {
        cal.ns = {};
        cal.q = cal.q || [];
        const s = d.createElement('script');
        s.src = A;
        s.async = true;
        s.onerror = showCalendarFallback;
        d.head.appendChild(s);
        cal.loaded = true;
      }
      if (ar[0] === L) {
        const api = function () {
          p(api, arguments);
        };
        const namespace = ar[1];
        api.q = api.q || [];
        if (typeof namespace === 'string') {
          cal.ns[namespace] = cal.ns[namespace] || api;
          p(cal.ns[namespace], ar);
          p(cal, ['initNamespace', namespace]);
        } else {
          p(cal, ar);
        }
        return;
      }
      p(cal, ar);
    };
  }(window, 'https://app.cal.com/embed/embed.js', 'init'));

  Cal('init', { origin: 'https://app.cal.com' });
  Cal('inline', {
    elementOrSelector: '#cal-inline-embed',
    calLink,
    config: {
      layout: 'month_view',
      theme: 'dark',
      ...prefillConfig,
    },
  });
  Cal('ui', {
    theme: 'dark',
    layout: 'month_view',
    hideEventTypeDetails: false,
  });

  window.setTimeout(() => {
    if (calWrap && calWrap.getAttribute('aria-busy') === 'true') {
      showCalendarFallback();
    }
  }, 15000);

  calEmbedLoaded = true;
};

if (questionnaire) {
  questionnaire.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!questionnaire.reportValidity()) {
      return;
    }

    setQuestionnaireSubmitting(true);
    setQuestionnaireStatus('Saving your details before opening the calendar...');

    try {
      await submitLead();
      document.dispatchEvent(new CustomEvent('booking_questionnaire_submitted', {
        detail: {
          bookingKind: questionnaire.dataset.bookingKind || 'client',
        },
      }));
      setQuestionnaireStatus('');
      revealCalendar();
      loadCalEmbed(getQuestionnaireConfig());
      calendarStep?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      setQuestionnaireStatus(error.message || 'Something went wrong. Please try again.', true);
    } finally {
      setQuestionnaireSubmitting(false);
    }
  });
} else {
  revealCalendar();
  loadCalEmbed();
}
})();
