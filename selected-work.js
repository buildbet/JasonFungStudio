document.querySelectorAll('.pandaii-scroll').forEach((scroller) => {
  const slides = [...scroller.querySelectorAll('figure')];
  let dots = [];

  const getSlideLeft = (slide) => slide.offsetLeft - scroller.offsetLeft;

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
          left: getSlideLeft(slide),
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
    const currentLeft = scroller.scrollLeft;
    let activeIndex = 0;
    let closestDistance = Infinity;

    slides.forEach((slide, index) => {
      const distance = Math.abs(getSlideLeft(slide) - currentLeft);
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
  window.addEventListener('load', setActiveDot, { once: true, passive: true });
});

document.querySelectorAll('.testimonial-carousel').forEach((carousel) => {
  const track = carousel.querySelector('.testimonial-carousel-track');
  const firstSet = carousel.querySelector('.testimonial-carousel-set');
  if (!track || !firstSet) return;

  carousel.classList.add('is-js');

  let cycleWidth = 1;
  let scrollPosition = 0;
  let previousTime = 0;
  let isDragging = false;
  let startX = 0;
  let startScrollLeft = 0;
  let resumeAt = 0;
  const speed = 0.035;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const wrapScroll = () => {
    if (scrollPosition < cycleWidth * 0.5) {
      scrollPosition += cycleWidth;
    } else if (scrollPosition > cycleWidth * 1.5) {
      scrollPosition -= cycleWidth;
    }
    carousel.scrollLeft = scrollPosition;
  };

  const measure = () => {
    const styles = window.getComputedStyle(track);
    const gap = Number.parseFloat(styles.columnGap || styles.gap) || 0;
    cycleWidth = Math.max(firstSet.offsetWidth + gap, 1);
    scrollPosition = cycleWidth;
    carousel.scrollLeft = scrollPosition;
  };

  const animate = (time) => {
    if (!previousTime) previousTime = time;
    const delta = time - previousTime;
    previousTime = time;

    if (!reduceMotion && !isDragging && time >= resumeAt) {
      scrollPosition += delta * speed;
      wrapScroll();
    }

    window.requestAnimationFrame(animate);
  };

  const stopDragging = (event) => {
    if (!isDragging) return;
    isDragging = false;
    resumeAt = performance.now() + 900;
    carousel.classList.remove('is-dragging');
    if (event?.pointerId && carousel.hasPointerCapture(event.pointerId)) {
      carousel.releasePointerCapture(event.pointerId);
    }
  };

  carousel.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse') return;
    if (event.button !== 0) return;
    isDragging = true;
    startX = event.clientX;
    startScrollLeft = carousel.scrollLeft;
    scrollPosition = carousel.scrollLeft;
    carousel.classList.add('is-dragging');
    carousel.setPointerCapture(event.pointerId);
  });

  carousel.addEventListener('pointermove', (event) => {
    if (!isDragging) return;
    event.preventDefault();
    scrollPosition = startScrollLeft - (event.clientX - startX);
    wrapScroll();
  });

  carousel.addEventListener('pointerup', stopDragging);
  carousel.addEventListener('pointercancel', stopDragging);
  carousel.addEventListener('lostpointercapture', stopDragging);
  carousel.addEventListener('scroll', () => {
    scrollPosition = carousel.scrollLeft;
    if (isDragging) wrapScroll();
  }, { passive: true });
  window.addEventListener('resize', measure, { passive: true });
  window.addEventListener('load', measure, { once: true, passive: true });

  measure();
  window.requestAnimationFrame(animate);
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
