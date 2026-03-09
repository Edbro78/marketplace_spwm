/**
 * SPWM Marketplace — GSAP 3 + ScrollTrigger + fullscreen + stock chart + glowing effect
 */

/* ----- Fullscreen ----- */
(function fullscreen() {
  'use strict';
  var btn = document.getElementById('fullscreen-btn');
  if (!btn) return;
  var doc = document.documentElement;
  function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
  }
  function requestFs() {
    if (doc.requestFullscreen) doc.requestFullscreen();
    else if (doc.webkitRequestFullscreen) doc.webkitRequestFullscreen();
    else if (doc.msRequestFullscreen) doc.msRequestFullscreen();
  }
  function exitFs() {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    else if (document.msExitFullscreen) document.msExitFullscreen();
  }
  function toggleFs() {
    if (isFullscreen()) exitFs();
    else requestFs();
  }
  function updateIcon() {
    var fs = isFullscreen();
    var exp = btn.querySelector('.fullscreen-expand');
    var ext = btn.querySelector('.fullscreen-exit');
    if (exp) exp.style.display = fs ? 'none' : 'block';
    if (ext) ext.style.display = fs ? 'block' : 'none';
  }
  btn.addEventListener('click', toggleFs);
  document.addEventListener('fullscreenchange', updateIcon);
  document.addEventListener('webkitfullscreenchange', updateIcon);
  document.addEventListener('msfullscreenchange', updateIcon);
  document.addEventListener('click', function tryOnce(e) {
    if (e.target.closest('#fullscreen-btn')) return;
    if (!isFullscreen()) requestFs();
  }, { once: true });
})();

/* ----- Hero stock chart ----- */
(function stockChart() {
  'use strict';
  var canvas = document.getElementById('hero-stock-chart');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var w, h, animationId, offset = 0;
  var speed = 0.004, barCount = 90;

  function noise(seed) {
    var x = Math.sin(seed * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }
  function smoothNoise(t, freq) {
    var i = Math.floor(t * freq);
    var f = t * freq - i;
    return noise(i) + f * (noise(i + 1) - noise(i));
  }
  function fractalNoise(t, octaves) {
    var v = 0, amp = 1, f = 1;
    for (var i = 0; i < octaves; i++) {
      v += smoothNoise(t * f, 4) * amp;
      amp *= 0.5;
      f *= 2;
    }
    return v;
  }
  function roundRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
  function resize() {
    w = canvas.width = canvas.offsetWidth;
    h = canvas.height = canvas.offsetHeight;
  }
  function drawChart() {
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    var chartH = h * 0.35, baseline = h - h * 0.12, chartW = w + 100;
    var barGap = 3, barWidth = Math.max(2, (chartW / barCount) - barGap);
    var radius = Math.min(2, barWidth * 0.4);
    var fillColor = 'rgba(99, 102, 241, 0.2)';
    var strokeColor = 'rgba(99, 102, 241, 0.4)';
    var phase = offset * 0.3, baseX = -offset * 80;

    for (var i = 0; i < barCount; i++) {
      var t = (i / (barCount - 1)) * 2.5 + phase;
      var n1 = fractalNoise(t, 4);
      var n2 = fractalNoise(t * 2.1 + 100, 3);
      var n3 = fractalNoise(t * 0.6 + 50, 2);
      var heightFactor = 0.15 + n1 * 0.5 + n2 * 0.25 + n3 * 0.15;
      var barHeight = Math.max(6, chartH * Math.abs(heightFactor));
      var x = baseX + (i / (barCount - 1)) * chartW;
      var y = baseline - barHeight;
      roundRect(x, y, barWidth, barHeight, radius);
      ctx.fillStyle = fillColor;
      ctx.fill();
      roundRect(x, y, barWidth, barHeight, radius);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    offset += speed;
    if (offset > 1) offset = 0;
    animationId = requestAnimationFrame(drawChart);
  }
  function init() {
    resize();
    window.addEventListener('resize', resize);
    drawChart();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ----- Glowing effect on portal cards ----- */
(function glowingEffect() {
  'use strict';
  var spread = 40, inactiveZone = 0.01, proximity = 64, borderWidth = 2, lerpSpeed = 0.12;
  var wrappers = [];
  var lastPos = { x: 0, y: 0 };
  var rafId = null;

  function getCenter(el) {
    var r = el.getBoundingClientRect();
    return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.5 };
  }
  function lerpAngle(current, target) {
    var diff = ((target - current + 180) % 360) - 180;
    return current + diff * lerpSpeed;
  }
  function updateGlow(wrapper, x, y) {
    var glow = wrapper.querySelector('.portal-card-glow');
    if (!glow) return;
    var rect = wrapper.getBoundingClientRect();
    var center = getCenter(wrapper);
    var dist = Math.hypot(x - center.x, y - center.y);
    var inactiveRadius = 0.5 * Math.min(rect.width, rect.height) * inactiveZone;
    if (dist < inactiveRadius) {
      glow.style.setProperty('--active', '0');
      return;
    }
    var inProximity = x >= rect.left - proximity && x <= rect.right + proximity && y >= rect.top - proximity && y <= rect.bottom + proximity;
    glow.style.setProperty('--active', inProximity ? '1' : '0');
    if (!inProximity) return;
    var targetAngle = (180 * Math.atan2(y - center.y, x - center.x)) / Math.PI + 90;
    var current = parseFloat(glow.style.getPropertyValue('--start')) || 0;
    glow.style.setProperty('--start', String(lerpAngle(current, targetAngle)));
  }
  function tick() {
    wrappers.forEach(function (w) { updateGlow(w, lastPos.x, lastPos.y); });
    rafId = requestAnimationFrame(tick);
  }
  function onMove(e) {
    if (e && (e.x != null || e.clientX != null)) {
      lastPos.x = e.x != null ? e.x : e.clientX;
      lastPos.y = e.y != null ? e.y : e.clientY;
    }
  }
  function init() {
    wrappers = Array.prototype.slice.call(document.querySelectorAll('.portal-card-wrapper'));
    wrappers.forEach(function (wrapper) {
      var glow = wrapper.querySelector('.portal-card-glow');
      if (glow) {
        glow.style.setProperty('--spread', String(spread));
        glow.style.setProperty('--glow-border-width', borderWidth + 'px');
      }
    });
    document.body.addEventListener('pointermove', onMove, { passive: true });
    rafId = requestAnimationFrame(tick);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ----- GSAP + ScrollTrigger ----- */
(function () {
  'use strict';

  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  /* ----- Scroll progress bar ----- */
  const scrollProgress = document.getElementById('scroll-progress');
  if (scrollProgress) {
    window.addEventListener('scroll', function () {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0;
      scrollProgress.style.width = pct + '%';
    });
  }

  /* ----- Hero: word-by-word title reveal ----- */
  const heroTitle = document.querySelector('.hero-title');
  if (heroTitle && heroTitle.textContent) {
    const text = heroTitle.textContent.trim();
    const words = text.split(/\s+/);
    heroTitle.innerHTML = words.map(function (w) {
      return '<span class="hero-title-word">' + w + '</span>';
    }).join(' ');
    const wordEls = heroTitle.querySelectorAll('.hero-title-word');
    gsap.set(wordEls, { opacity: 0, y: 24 });
    gsap.to(wordEls, {
      opacity: 1,
      y: 0,
      duration: 0.6,
      stagger: 0.08,
      ease: 'power3.out',
      delay: 0.5
    });
  }

  /* ----- Hero: overline, sub, CTA stagger + overline line-draw ----- */
  const heroContent = document.querySelector('.hero-content');
  const heroOverline = document.querySelector('.hero-overline');
  if (heroContent) {
    const els = heroContent.querySelectorAll('.hero-overline, .hero-sub, .btn-master');
    gsap.set(els, { opacity: 0, y: 36 });
    gsap.to(els, {
      opacity: 1,
      y: 0,
      duration: 0.85,
      stagger: 0.14,
      ease: 'power3.out',
      delay: 0.3,
      onComplete: function () {
        if (heroOverline) heroOverline.classList.add('hero-overline-visible');
      }
    });
  }

  const scrollHint = document.querySelector('.hero-scroll-hint');
  if (scrollHint) {
    gsap.set(scrollHint, { opacity: 0, y: 8 });
    gsap.to(scrollHint, { opacity: 1, y: 0, duration: 0.9, delay: 1.5, ease: 'power2.out' });
  }

  /* ----- Hero title: 3D tilt following mouse ----- */
  const heroSection = document.querySelector('.hero');
  const heroTitleWrap = document.querySelector('.hero-title-wrap');
  if (heroSection && heroTitleWrap) {
    const words = heroTitleWrap.querySelectorAll('.hero-title-word');
    heroSection.addEventListener('mousemove', function (e) {
      const rect = heroSection.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      words.forEach(function (word, i) {
        const factor = 1 + (i - words.length / 2) * 0.15;
        gsap.to(word, {
          rotateY: x * 12 * factor,
          rotateX: -y * 8 * factor,
          duration: 0.35,
          ease: 'power2.out'
        });
      });
    });
    heroSection.addEventListener('mouseleave', function () {
      gsap.to(words, { rotateY: 0, rotateX: 0, duration: 0.6, ease: 'power2.out' });
    });
  }

  /* ----- CTA: magnetic hover (slight pull toward cursor) ----- */
  const btnMaster = document.querySelector('.btn-master');
  if (btnMaster) {
    btnMaster.addEventListener('mousemove', function (e) {
      const rect = btnMaster.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      gsap.to(btnMaster, {
        x: x * 8,
        y: y * 6,
        duration: 0.25,
        ease: 'power2.out'
      });
    });
    btnMaster.addEventListener('mouseleave', function () {
      gsap.to(btnMaster, { x: 0, y: 0, duration: 0.4, ease: 'power2.out' });
    });
  }

  /* ----- Hero background: zoom on load + parallax on scroll ----- */
  const heroBg = document.querySelector('.hero-bg');
  if (heroBg) {
    gsap.fromTo(heroBg, { scale: 1.12 }, { scale: 1, duration: 2.2, ease: 'power2.out' });
    gsap.to(heroBg, {
      yPercent: 22,
      ease: 'none',
      scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: 'bottom top',
        scrub: 1.8
      }
    });
  }

  /* ----- Portals background: samme lekke effekt (zoom + parallax) ----- */
  const portalsBg = document.querySelector('.portals-bg');
  if (portalsBg) {
    gsap.fromTo(portalsBg, { scale: 1.1 }, {
      scale: 1,
      duration: 2,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: '.portals',
        start: 'top 85%',
        end: 'top 30%',
        toggleActions: 'play none none reverse'
      }
    });
    gsap.to(portalsBg, {
      yPercent: 15,
      ease: 'none',
      scrollTrigger: {
        trigger: '.portals',
        start: 'top top',
        end: 'bottom top',
        scrub: 1.5
      }
    });
  }

  /* ----- Section scroll reveal: 3D tilt + scale + shadow (scrub) ----- */
  document.querySelectorAll('.section-reveal').forEach(function (section) {
    gsap.fromTo(section, {
      opacity: 0.88,
      scale: 0.97,
      rotateX: 6,
      filter: 'blur(2px)'
    }, {
      opacity: 1,
      scale: 1,
      rotateX: 0,
      filter: 'blur(0px)',
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top 92%',
        end: 'top 35%',
        scrub: 1.2
      }
    });
  });

  /* ----- Portals section: header stagger ----- */
  const portalsHeader = document.querySelector('.portals-header');
  if (portalsHeader) {
    const headerEls = portalsHeader.querySelectorAll('.portals-title, .portals-sub');
    gsap.set(headerEls, { opacity: 0, y: 36 });
    ScrollTrigger.create({
      trigger: '.portals',
      start: 'top 82%',
      onEnter: function () {
        gsap.to(headerEls, {
          opacity: 1,
          y: 0,
          duration: 0.75,
          stagger: 0.14,
          ease: 'power3.out'
        });
      }
    });
  }

  /* ----- Portal cards: parallax tilt + stagger with scale + rotation ----- */
  const portalCards = document.querySelectorAll('.portal-card');
  portalCards.forEach(function (card, i) {
    gsap.set(card, { opacity: 0, y: 64, scale: 0.94 });
    ScrollTrigger.create({
      trigger: card,
      start: 'top 88%',
      onEnter: function () {
        gsap.to(card, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.85,
          delay: i * 0.14,
          ease: 'back.out(1.1)'
        });
      }
    });

    card.addEventListener('mouseenter', function () {
      card.dataset.tiltActive = '1';
      gsap.to(card, { y: -6, duration: 0.4, ease: 'power2.out' });
    });
    card.addEventListener('mouseleave', function () {
      card.dataset.tiltActive = '0';
      gsap.to(card, {
        rotateX: 0,
        rotateY: 0,
        y: 0,
        duration: 0.5,
        ease: 'power2.out'
      });
    });
    card.addEventListener('mousemove', function (e) {
      if (card.dataset.tiltActive !== '1') return;
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      gsap.to(card, {
        rotateX: -y * 14,
        rotateY: x * 14,
        y: -6,
        duration: 0.2,
        ease: 'power2.out'
      });
    });
  });

  /* ----- Card 1 (Kinetic Entry): Enter arrow + background zoom ----- */
  const card1 = document.querySelector('.portal-card-1');
  if (card1) {
    const enterEl = card1.querySelector('.portal-card-enter');
    const card1Bg = card1.querySelector('.portal-card-bg');
    if (enterEl) {
      card1.addEventListener('mouseenter', function () {
        gsap.fromTo(enterEl, { x: -32, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, ease: 'none' });
      });
      card1.addEventListener('mouseleave', function () {
        gsap.to(enterEl, { x: -32, opacity: 0, duration: 0.25 });
      });
    }
    if (card1Bg) {
      card1.addEventListener('mouseenter', function () {
        gsap.to(card1Bg, { scale: 1.14, duration: 1.5, ease: 'power2.out' });
      });
      card1.addEventListener('mouseleave', function () {
        gsap.to(card1Bg, { scale: 1, duration: 0.9, ease: 'power2.inOut' });
      });
    }
  }

  /* ----- Card 3 (Geometric Lock): 3D SVG + idle rotation + mouse follow ----- */
  const card3 = document.querySelector('.portal-card-3');
  const geoShape = document.querySelector('.portal-card-3 .geo-svg');
  const geoInner = document.querySelector('.portal-card-3 .geo-shape-inner');
  const geoDot = document.querySelector('.portal-card-3 .geo-shape-dot');
  if (card3 && geoShape) {
    var idleTween = gsap.to(geoShape, {
      rotation: 360,
      duration: 24,
      ease: 'none',
      repeat: -1
    });
    card3.addEventListener('mouseenter', function () {
      idleTween.pause();
    });
    card3.addEventListener('mousemove', function (e) {
      const rect = card3.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      gsap.to(geoShape, {
        rotationY: x * 36,
        rotationX: -y * 36,
        duration: 0.2,
        ease: 'power2.out'
      });
      if (geoInner) gsap.to(geoInner, { rotation: -x * 20, duration: 0.25, ease: 'power2.out' });
      if (geoDot) gsap.to(geoDot, { scale: 1.3, opacity: 1, duration: 0.2 });
    });
    card3.addEventListener('mouseleave', function () {
      gsap.to(geoShape, { rotationY: 0, rotationX: 0, duration: 0.7, ease: 'power2.out' });
      if (geoInner) gsap.to(geoInner, { rotation: 0, duration: 0.5 });
      if (geoDot) gsap.to(geoDot, { scale: 1, opacity: 0.6, duration: 0.3 });
      idleTween.restart();
    });
  }

  /* ----- Philosophy: stagger + decorative line draw + scroll breath ----- */
  const filosofiSection = document.querySelector('.filosofi');
  const filosofiInner = document.querySelector('.filosofi-inner');
  if (filosofiSection && filosofiInner) {
    const filosofiEls = filosofiSection.querySelectorAll('.filosofi-title, .filosofi-sub, .manifesto-before, .manifesto-after');
    gsap.set(filosofiEls, { opacity: 0, y: 32 });
    ScrollTrigger.create({
      trigger: filosofiSection,
      start: 'top 78%',
      onEnter: function () {
        filosofiInner.classList.add('filosofi-line-visible');
        gsap.to(filosofiEls, {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.12,
          ease: 'power3.out'
        });
      }
    });
    gsap.fromTo(filosofiSection, { opacity: 0.96 }, {
      opacity: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: filosofiSection,
        start: 'top 65%',
        end: 'bottom 35%',
        scrub: 1.2
      }
    });
  }

  /* ----- Protocol stack: stagger + left line fill + number pop ----- */
  const stackItems = document.querySelectorAll('.stack-item');
  stackItems.forEach(function (item, i) {
    const line = item.querySelector('.stack-line');
    const num = item.querySelector('.stack-num');
    gsap.set(item, { opacity: 0, x: -28 });
    gsap.set(num, { scale: 0.5, opacity: 0 });
    ScrollTrigger.create({
      trigger: item,
      start: 'top 86%',
      onEnter: function () {
        item.classList.add('stack-line-visible');
        gsap.to(item, {
          opacity: 1,
          x: 0,
          duration: 0.6,
          delay: i * 0.12,
          ease: 'power3.out'
        });
        gsap.to(num, {
          scale: 1,
          opacity: 1,
          duration: 0.5,
          delay: i * 0.12 + 0.1,
          ease: 'back.out(1.4)'
        });
      }
    });
  });

  const protokollSection = document.querySelector('.protokoll');
  if (protokollSection) {
    gsap.fromTo(protokollSection, { opacity: 0.96 }, {
      opacity: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: protokollSection,
        start: 'top 72%',
        end: 'bottom 28%',
        scrub: 1
      }
    });
  }

  /* ----- Footer: stagger + subtle fade ----- */
  const footer = document.querySelector('.footer');
  if (footer) {
    const footerParas = footer.querySelectorAll('p');
    gsap.set(footerParas, { opacity: 0, y: 20 });
    ScrollTrigger.create({
      trigger: footer,
      start: 'top 88%',
      onEnter: function () {
        gsap.to(footerParas, {
          opacity: 1,
          y: 0,
          duration: 0.55,
          stagger: 0.12,
          ease: 'power2.out'
        });
      }
    });
  }

  /* ----- Navbar: reveal on load + scroll state ----- */
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    gsap.fromTo(navbar, { y: -100, opacity: 0 }, { y: 0, opacity: 1, duration: 0.65, delay: 0.1, ease: 'power3.out' });
    ScrollTrigger.create({
      trigger: 'body',
      start: 'top top',
      end: 'max',
      onUpdate: function (self) {
        navbar.classList.toggle('navbar-scrolled', self.scroll() > 80);
      }
    });
  }

  /* ----- Portals section: divider line scale in ----- */
  const portalsSection = document.querySelector('.portals');
  if (portalsSection) {
    const grid = portalsSection.querySelector('.portals-grid');
    if (grid) {
      gsap.fromTo(grid, { opacity: 0.9 }, {
        opacity: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: portalsSection,
          start: 'top 50%',
          end: 'bottom 50%',
          scrub: 0.8
        }
      });
    }
  }
})();
