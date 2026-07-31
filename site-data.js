const projects = [
  { id: 'creatives', category: 'Creatives', title: 'Creatives', description: 'Scroll-stopping visuals, campaign assets,<br>and brand moments designed to make<br>the product feel worth buying.', beforeImage: 'assets/projects/ads-poor-creative.png', beforeAlt: 'Before example of a cluttered product creative', image: 'assets/projects/beauty-water-wide.png', imageAlt: 'After cosmetics in gold packaging on rippling blue water' },
  { id: 'shopify-design', category: 'Shopify Design', title: 'Shopify Design', description: 'Premium store pages, product journeys,<br>and conversion-focused layouts built<br>to make buying feel obvious.', beforeImage: 'assets/projects/shopify-design-bad.png', beforeAlt: 'Before example of a cluttered Shopify homepage design', image: 'assets/projects/shopify-design-good.png', imageAlt: 'After example of a clean premium Shopify homepage design', fit: 'contain' },
  { id: 'product', category: 'Product', title: 'Product', description: 'Sharper offers, bundles, product positioning,<br>and page structure that helps customers<br>understand why it matters.', beforeImage: 'assets/projects/product-design-bad.png', beforeAlt: 'Before example of a basic hoodie product presentation', image: 'assets/projects/product-design-good.png', imageAlt: 'After example of a premium hoodie product presentation' },
  { id: 'ads', category: 'Ads', title: 'Ads', description: 'Ad concepts, testing angles, hooks,<br>and creative direction built for brands<br>that need better reasons to click.', beforeImage: 'assets/projects/ads-design-bad.png', beforeAlt: 'Before example of a low-performing social ad presence', image: 'assets/projects/ads-design-good.png', imageAlt: 'After example of a premium ads, email, and SMS growth system' }
];

const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#site-nav');
if (menuButton && navigation) {
  const setMenuOpen = (open) => {
    menuButton.setAttribute('aria-expanded', String(open));
    navigation.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
  };

  menuButton.addEventListener('click', () => {
    setMenuOpen(menuButton.getAttribute('aria-expanded') !== 'true');
  });
  navigation.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenuOpen(false)));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setMenuOpen(false);
  });
}

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!prefersReducedMotion) {
  requestAnimationFrame(() => document.body.classList.add('is-loaded'));
  const revealSections = document.querySelectorAll('.section-reveal:not(.section-reveal--hero)');
  if (revealSections.length) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in-view');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealSections.forEach((section) => revealObserver.observe(section));
  }
} else {
  document.body.classList.add('is-loaded');
  document.querySelectorAll('.section-reveal').forEach((section) => section.classList.add('is-in-view'));
}

let activeIndex = 0;
const tabs = [...document.querySelectorAll('.work-tab')];
const workTabs = document.querySelector('.work-tabs');
const caseImage = document.querySelector('[data-case-image]');
const workSection = caseImage?.closest('.section-reveal--work, .work-section') || document.querySelector('.work-section');
const caseImageEl = document.querySelector('[data-case-image-img]');
const caseBeforeImageEl = document.querySelector('[data-case-before-img]');
const beforeAfterRange = document.querySelector('[data-before-after-range]');
const tabDuration = 5000;
let tabTimerFrame = 0;
let tabTimerStartedAt = 0;
let tabTimerPaused = false;
const setBeforeAfterReveal = (value) => {
  if (!caseImage) return;
  const reveal = Math.max(0, Math.min(Number(value) || 0, 100));
  caseImage.style.setProperty('--reveal', `${reveal}%`);
  if (beforeAfterRange) beforeAfterRange.value = String(reveal);
};
const setWorkBackground = (image) => {
  if (workSection) workSection.style.setProperty('--work-bg-image', `url("${image}")`);
};
const setTabProgress = (progress) => {
  if (workTabs) workTabs.style.setProperty('--tab-progress', `${Math.min(progress, 1) * 100}%`);
};
const stopTabTimer = () => {
  window.cancelAnimationFrame(tabTimerFrame);
  tabTimerFrame = 0;
  setTabProgress(0);
};
const renderProject = (index, options = {}) => {
  activeIndex = (index + projects.length) % projects.length;
  const project = projects[activeIndex];
  const updateContent = () => {
    document.querySelector('[data-case-category]').textContent = project.category;
    document.querySelector('[data-case-title]').textContent = project.title;
    document.querySelector('[data-case-description]').innerHTML = project.description;
    document.querySelector('[data-case-number]').textContent = `0${activeIndex + 1} / 04`;
    if (caseImageEl) {
      caseImageEl.src = project.image;
      caseImageEl.alt = project.imageAlt;
    }
    if (caseBeforeImageEl) {
      caseBeforeImageEl.src = project.beforeImage;
      caseBeforeImageEl.alt = project.beforeAlt;
    }
    setBeforeAfterReveal(50);
    setWorkBackground(project.image);
    if (caseImage) caseImage.classList.toggle('case-image--contain', project.fit === 'contain');
    document.querySelector('[data-case-image-label]').textContent = project.title;
    tabs.forEach((tab, tabIndex) => {
      const selected = tabIndex === activeIndex;
      tab.classList.toggle('is-active', selected);
      tab.setAttribute('aria-selected', String(selected));
    });
    if (caseImage) caseImage.classList.remove('is-switching');
  };
  if (!options.keepTimer) restartTabTimer();
  if (!prefersReducedMotion && caseImage && caseImageEl) {
    caseImage.classList.add('is-switching');
    window.setTimeout(updateContent, 220);
  } else {
    updateContent();
  }
};
const tickTabTimer = (timestamp) => {
  if (tabTimerPaused) return;
  if (!tabTimerStartedAt) tabTimerStartedAt = timestamp;
  const progress = (timestamp - tabTimerStartedAt) / tabDuration;
  setTabProgress(progress);
  if (progress >= 1) {
    renderProject(activeIndex + 1, { keepTimer: true });
    tabTimerStartedAt = timestamp;
    setTabProgress(0);
  }
  tabTimerFrame = window.requestAnimationFrame(tickTabTimer);
};
const startTabTimer = () => {
  if (prefersReducedMotion || tabTimerFrame || !workTabs || tabs.length < 2) return;
  tabTimerPaused = false;
  workTabs.classList.add('is-auto-playing');
  tabTimerStartedAt = 0;
  tabTimerFrame = window.requestAnimationFrame(tickTabTimer);
};
const restartTabTimer = () => {
  if (prefersReducedMotion || tabTimerPaused) return;
  stopTabTimer();
  startTabTimer();
};

tabs.forEach((tab, index) => tab.addEventListener('click', () => renderProject(index)));
document.querySelectorAll('[data-direction]').forEach((button) => button.addEventListener('click', () => {
  renderProject(activeIndex + (button.dataset.direction === 'next' ? 1 : -1));
}));
if (beforeAfterRange) {
  beforeAfterRange.addEventListener('input', (event) => setBeforeAfterReveal(event.target.value));
  setBeforeAfterReveal(beforeAfterRange.value);
}

if (!prefersReducedMotion && workTabs && tabs.length > 1) {
  if ('IntersectionObserver' in window && workSection) {
    const tabTimerObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        tabTimerPaused = !entry.isIntersecting;
        if (entry.isIntersecting) {
          startTabTimer();
        } else {
          stopTabTimer();
        }
      });
    }, { threshold: 0.35 });
    tabTimerObserver.observe(workSection);
  } else {
    startTabTimer();
  }
}
