document.querySelectorAll('.pandaii-scroll').forEach((scroller) => {
  const slides = [...scroller.querySelectorAll('figure')];
  let dots = [];

  if (slides.length > 1) {
    const dotsWrap = document.createElement('div');
    dotsWrap.className = 'scroll-dots';
    dotsWrap.setAttribute('aria-label', 'Image position');

    dots = slides.map((slide, index) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'scroll-dot';
      dot.setAttribute('aria-label', `Show image ${index + 1}`);
      dot.addEventListener('click', () => {
        scroller.scrollTo({
          left: slide.offsetLeft - scroller.offsetLeft,
          behavior: 'smooth',
        });
      });
      dotsWrap.appendChild(dot);
      return dot;
    });

    scroller.insertAdjacentElement('afterend', dotsWrap);
  }

  const setActiveDot = () => {
    if (!dots.length) return;
    const scrollerCenter = scroller.scrollLeft + scroller.clientWidth / 2;
    let activeIndex = 0;
    let closestDistance = Infinity;

    slides.forEach((slide, index) => {
      const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
      const distance = Math.abs(slideCenter - scrollerCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        activeIndex = index;
      }
    });

    dots.forEach((dot, index) => {
      const active = index === activeIndex;
      dot.classList.toggle('is-active', active);
      dot.setAttribute('aria-current', active ? 'true' : 'false');
    });
  };

  let isDragging = false;
  let startX = 0;
  let scrollLeft = 0;
  let scrollFrame = 0;

  const stopDragging = () => {
    isDragging = false;
    scroller.classList.remove('is-dragging');
  };

  scroller.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse') return;
    if (event.button !== 0) return;
    isDragging = true;
    startX = event.clientX;
    scrollLeft = scroller.scrollLeft;
    scroller.classList.add('is-dragging');
    scroller.setPointerCapture(event.pointerId);
  });

  scroller.addEventListener('pointermove', (event) => {
    if (!isDragging) return;
    event.preventDefault();
    scroller.scrollLeft = scrollLeft - (event.clientX - startX);
  });

  scroller.addEventListener('pointerup', stopDragging);
  scroller.addEventListener('pointercancel', stopDragging);
  scroller.addEventListener('lostpointercapture', stopDragging);
  scroller.addEventListener('scroll', () => {
    window.cancelAnimationFrame(scrollFrame);
    scrollFrame = window.requestAnimationFrame(setActiveDot);
  }, { passive: true });

  window.addEventListener('resize', setActiveDot, { passive: true });
  setActiveDot();
});

document.querySelectorAll('.comparison-slider').forEach((slider) => {
  const range = slider.querySelector('.comparison-slider__range');
  if (!range) return;

  const setReveal = () => {
    const value = Math.max(0, Math.min(Number(range.value) || 0, 100));
    slider.style.setProperty('--reveal', `${value}%`);
  };

  range.addEventListener('input', setReveal);
  setReveal();
});
