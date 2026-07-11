const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#site-nav');

if (menuButton && navigation) {
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!open));
    navigation.classList.toggle('is-open', !open);
    document.body.classList.toggle('menu-open', !open);
  });

  navigation.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
    menuButton.setAttribute('aria-expanded', 'false');
    navigation.classList.remove('is-open');
    document.body.classList.remove('menu-open');
  }));
}

const CAL_LINK = 'https://cal.com/jason-fung-zndb6x';
const calContainer = document.getElementById('cal-inline-embed');
const calWrap = document.getElementById('cal-embed-wrap');
const calLoading = document.getElementById('cal-loading');

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

const loadCalEmbed = () => {
  const calLink = getCalLink(CAL_LINK);

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
};

loadCalEmbed();
