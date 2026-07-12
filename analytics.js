const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX';

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
  const bookLink = event.target.closest('a[href="book.html"]');
  if (!bookLink || typeof window.gtag !== 'function') {
    return;
  }

  window.gtag('event', 'book_button_click', {
    button_location: bookLink.className || 'link',
    button_text: bookLink.textContent.trim().replace(/\s+/g, ' '),
    page_path: window.location.pathname,
    transport_type: 'beacon'
  });
});
