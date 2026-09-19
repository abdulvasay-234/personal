const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector("#site-nav");
const pixelCanvas = document.querySelector(".hero-pixels");
const hero = document.querySelector(".hero");
const pixelContext = pixelCanvas.getContext("2d");
const cursorGlow = document.querySelector(".cursor-glow");
const siteHeader = document.querySelector(".site-header");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const experienceDino = document.querySelector("#experience .event-dino");
let dinoFrame = null;
let previousDinoX = null;

function updateDinoScroll() {
  dinoFrame = null;
  const bounds = experienceDino.parentElement.getBoundingClientRect();
  const travel = Math.max(0, bounds.width - experienceDino.offsetWidth - experienceDino.offsetLeft * 2);
  const progress = Math.max(0, Math.min(1, (window.innerHeight - bounds.top) / Math.max(1, window.innerHeight - siteHeader.offsetHeight)));
  const x = prefersReducedMotion.matches ? 0 : progress * travel;
  if (x === previousDinoX) return;
  if (previousDinoX !== null && Math.abs(x - previousDinoX) > 0.1) {
    experienceDino.classList.toggle("faces-left", x < previousDinoX);
  }
  const step = prefersReducedMotion.matches ? 0 : Math.floor(x / 10) % 2;
  experienceDino.style.transform = `translate3d(${x}px, 0, 0)`;
  experienceDino.style.setProperty("--dino-bob", `${-step * 2}px`);
  experienceDino.style.setProperty("--dino-front", `${-step * 2}px`);
  experienceDino.style.setProperty("--dino-back", `${prefersReducedMotion.matches ? 0 : -(1 - step) * 2}px`);
  previousDinoX = x;
}

function scheduleDinoScroll() {
  if (dinoFrame === null) dinoFrame = window.requestAnimationFrame(updateDinoScroll);
}
window.addEventListener("scroll", scheduleDinoScroll, { passive: true });
window.addEventListener("resize", scheduleDinoScroll);
window.addEventListener("load", scheduleDinoScroll);
prefersReducedMotion.addEventListener("change", scheduleDinoScroll);
updateDinoScroll();
const contributionPalette = [
  "rgba(31, 35, 32, 0.075)",
  "rgba(25, 79, 43, 0.11)",
  "rgba(20, 112, 48, 0.17)",
  "rgba(35, 156, 61, 0.25)",
  "rgba(57, 211, 83, 0.38)",
];

let contributionCells = [];
let contributionColumns = 0;
let contributionRows = 0;
let contributionAnimationFrame = null;
let contributionStep = 13;

function contributionLevel(column, row) {
  const signal = (column * 29 + row * 47 + (column % 11) * (row + 3) * 7) % 100;
  const wave = Math.round((Math.sin(column * 0.36 + row * 0.7) + 1) * 9);
  const score = (signal + wave) % 100;
  if (score > 96) return 4;
  if (score > 88) return 3;
  if (score > 76) return 2;
  if (score > 58) return 1;
  return 0;
}

function resizeContributionGrid() {
  const bounds = pixelCanvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const isCompact = window.matchMedia("(max-width: 760px)").matches;
  const cellSize = isCompact ? 5 : 7;
  const gap = isCompact ? 5 : 6;
  const step = cellSize + gap;
  contributionStep = step;

  pixelCanvas.width = Math.ceil(bounds.width * ratio);
  pixelCanvas.height = Math.ceil(bounds.height * ratio);
  pixelContext.setTransform(ratio, 0, 0, ratio, 0, 0);

  contributionColumns = Math.ceil(bounds.width / step) + 1;
  contributionRows = Math.ceil(bounds.height / step) + 1;
  contributionCells = [];

  for (let row = 0; row < contributionRows; row += 1) {
    for (let column = 0; column < contributionColumns; column += 1) {
      contributionCells.push({
        column,
        row,
        level: contributionLevel(column, row),
        glow: 0,
        cellSize,
        gap,
      });
    }
  }

  drawContributionGrid();
}

function drawContributionGrid() {
  const bounds = pixelCanvas.getBoundingClientRect();
  pixelContext.clearRect(0, 0, bounds.width, bounds.height);
  drawSnakeRadiance();

  pixelContext.save();
  pixelContext.globalAlpha = 0.22;
  contributionCells.forEach((cell) => {
    const step = cell.cellSize + cell.gap;
    const x = cell.column * step;
    const y = cell.row * step;

    pixelContext.fillStyle = cell.glow > 0
      ? `rgba(46, 190, 72, ${0.42 + cell.glow * 0.5})`
      : contributionPalette[cell.level];
    pixelContext.beginPath();
    pixelContext.roundRect(x, y, cell.cellSize, cell.cellSize, Math.max(1.5, cell.cellSize * 0.24));
    pixelContext.fill();

  });
  pixelContext.restore();
}

// A quiet cursor-led snake on the existing contribution grid.
const snakePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
const snake = { body: [], food: null, target: null, active: false, opacity: 0, length: 12, lastStep: 0, lastFrame: 0, travel: 0, rendered: [], trail: [] };

function drawSnakeRadiance() {
  pixelContext.save();
  snake.trail.forEach(point => {
    const x = (point.column + 0.3) * contributionStep;
    const y = (point.row + 0.3) * contributionStep;
    const radius = contributionStep * 3.5;
    const glow = pixelContext.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, `rgba(66,197,83,${0.045 * point.life * snake.opacity})`);
    glow.addColorStop(0.45, `rgba(66,197,83,${0.018 * point.life * snake.opacity})`);
    glow.addColorStop(1, "rgba(66,197,83,0)");
    pixelContext.fillStyle = glow;
    pixelContext.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  });
  pixelContext.restore();
}

function spawnSnakeFood() {
  const bounds = pixelCanvas.getBoundingClientRect();
  const blocked = [...hero.querySelectorAll(".hero-copy, .hero-profile")].map(el => el.getBoundingClientRect());
  const candidates = contributionCells.filter(cell => {
    const x = bounds.left + cell.column * contributionStep;
    const y = bounds.top + cell.row * contributionStep;
    return x > 20 && x < window.innerWidth - 20 && y > Math.max(bounds.top + 30, siteHeader.getBoundingClientRect().bottom + 20)
      && y < Math.min(bounds.bottom - 25, window.innerHeight - 20)
      && !blocked.some(rect => x > rect.left - 16 && x < rect.right + 16 && y > rect.top - 16 && y < rect.bottom + 16)
      && !snake.body.some(part => part.column === cell.column && part.row === cell.row);
  });
  const cell = candidates[Math.floor(Math.random() * candidates.length)];
  snake.food = cell ? { column: cell.column, row: cell.row } : null;
}

function drawSnake(now) {
  const paint = (part, color, size) => {
    pixelContext.fillStyle = color;
    pixelContext.beginPath();
    pixelContext.roundRect(part.column * contributionStep, part.row * contributionStep, size, size, 2);
    pixelContext.fill();
  };
  pixelContext.save();
  pixelContext.globalAlpha = snake.opacity;
  const points = snake.rendered.map(part => ({
    x: (part.column + 0.35) * contributionStep,
    y: (part.row + 0.35) * contributionStep,
  }));
  // Separate square scales preserve the contribution-grid look.
  for (let index = points.length - 1; index >= 0; index--) {
    const point = points[index];
    const taper = Math.min(1, (points.length - index) / 5);
    const size = 5 + 6 * taper;
    pixelContext.fillStyle = index % 2 ? "#238636" : "#2c9b42";
    pixelContext.beginPath();
    pixelContext.roundRect(point.x - size / 2, point.y - size / 2, size, size, 1.5);
    pixelContext.fill();
    pixelContext.fillStyle = "rgba(145,227,151,.28)";
    pixelContext.fillRect(point.x - size / 2 + 2, point.y - size / 2 + 2, Math.max(2, size - 4), 2);
  }
  if (points.length) {
    const head = points[0];
    const neck = points[1] || { x: head.x - 1, y: head.y };
    const angle = Math.atan2(head.y - neck.y, head.x - neck.x);
    pixelContext.save();
    pixelContext.translate(head.x, head.y);
    pixelContext.rotate(angle);
    pixelContext.fillStyle = "#2c9b42";
    pixelContext.beginPath();
    pixelContext.ellipse(1, 0, 7.5, 6, 0, 0, Math.PI * 2);
    pixelContext.fill();
    for (const side of [-1, 1]) {
      pixelContext.fillStyle = "#edf5dc";
      pixelContext.beginPath();
      pixelContext.arc(3, side * 3.3, 2, 0, Math.PI * 2);
      pixelContext.fill();
      pixelContext.fillStyle = "#14251a";
      pixelContext.beginPath();
      pixelContext.arc(3.7, side * 3.3, 1, 0, Math.PI * 2);
      pixelContext.fill();
    }
    pixelContext.restore();
  }
  if (snake.food) {
    pixelContext.globalAlpha = snake.opacity * (0.94 + Math.sin(now / 220) * 0.06);
    paint(snake.food, "#0b4f20", contributionStep - 1);
  }
  pixelContext.restore();
}

function animateSnake(now) {
  contributionAnimationFrame = null;
  const elapsed = snake.lastFrame ? Math.min(50, now - snake.lastFrame) : 16;
  snake.lastFrame = now;
  snake.opacity = snake.active ? Math.min(1, snake.opacity + elapsed / 220) : Math.max(0, snake.opacity - elapsed / 380);
  if (snake.active && snake.target && snake.body.length) {
    const distance = Math.abs(snake.target.column - snake.body[0].column)
      + Math.abs(snake.target.row - snake.body[0].row);
    // Accelerate with cursor distance, retaining cell-by-cell food detection.
    snake.travel = distance ? snake.travel + elapsed * (30 + distance * 18) / 1000 : 0;
    const steps = Math.min(distance, Math.floor(snake.travel));
    snake.travel -= steps;
    for (let step = 0; step < steps; step += 1) {
    const head = snake.body[0];
    const dx = snake.target.column - head.column;
    const dy = snake.target.row - head.row;
    if (dx || dy) {
      const next = { ...head };
      if (Math.abs(dx) >= Math.abs(dy)) next.column += Math.sign(dx);
      else next.row += Math.sign(dy);
      snake.body.unshift(next);
      if (snake.food && next.column === snake.food.column && next.row === snake.food.row) {
        snake.length = Math.min(28, snake.length + 2);
        spawnSnakeFood();
      }
      snake.body.length = Math.min(snake.body.length, snake.length);
    }
    }
  }
  // Time-based easing keeps every segment moving smoothly between grid steps.
  const blend = 1 - Math.exp(-elapsed / 18);
  snake.rendered = snake.body.map((part, index) => {
    const previous = snake.rendered[index] || snake.rendered[snake.rendered.length - 1] || part;
    return {
      column: previous.column + (part.column - previous.column) * blend,
      row: previous.row + (part.row - previous.row) * blend,
    };
  });
  snake.trail = snake.trail.filter(point => (point.life -= elapsed / 650) > 0);
  contributionCells.forEach(cell => { cell.glow *= Math.exp(-elapsed / 200); });
  const tip = snake.rendered[0];
  const last = snake.trail[snake.trail.length - 1];
  if (snake.active && tip && (!last || Math.hypot(tip.column - last.column, tip.row - last.row) > 0.4)) {
    snake.trail.push({ ...tip, life: 1 });
    if (snake.trail.length > 48) snake.trail.shift();
    for (let row = Math.max(0, Math.floor(tip.row) - 3); row <= Math.min(contributionRows - 1, Math.ceil(tip.row) + 3); row++) {
      for (let column = Math.max(0, Math.floor(tip.column) - 3); column <= Math.min(contributionColumns - 1, Math.ceil(tip.column) + 3); column++) {
        const cell = contributionCells[row * contributionColumns + column];
        const strength = Math.max(0, 1 - Math.hypot(column - tip.column, row - tip.row) / 3.5);
        cell.glow = Math.max(cell.glow, strength * 0.55);
      }
    }
  }
  drawContributionGrid();
  drawSnake(now);
  if (snake.active || snake.opacity > 0) contributionAnimationFrame = requestAnimationFrame(animateSnake);
  else { snake.body = []; snake.food = null; hero.classList.remove("snake-active"); }
}

function steerSnake(event) {
  if (!snakePointer.matches || prefersReducedMotion.matches || event.pointerType === "touch") return;
  const bounds = pixelCanvas.getBoundingClientRect();
  snake.target = {
    column: Math.max(0, Math.min(contributionColumns - 2, Math.floor((event.clientX - bounds.left) / contributionStep))),
    row: Math.max(0, Math.min(contributionRows - 2, Math.floor((event.clientY - bounds.top) / contributionStep))),
  };
  if (!snake.active) {
    snake.active = true;
    snake.length = 12;
    snake.body = Array.from({ length: 12 }, (_, index) => ({ column: Math.max(0, snake.target.column - index), row: snake.target.row }));
    snake.rendered = snake.body.map(part => ({ ...part }));
    snake.lastFrame = 0;
    snake.travel = 0;
    snake.lastStep = performance.now();
    spawnSnakeFood();
    hero.classList.add("snake-active");
  }
  if (contributionAnimationFrame === null) contributionAnimationFrame = requestAnimationFrame(animateSnake);
}

function stopSnake(immediate = false) {
  snake.active = false;
  if (immediate) {
    cancelAnimationFrame(contributionAnimationFrame);
    contributionAnimationFrame = null;
    snake.opacity = 0;
    snake.trail = [];
    contributionCells.forEach(cell => { cell.glow = 0; });
    snake.body = [];
    snake.food = null;
    hero.classList.remove("snake-active");
    drawContributionGrid();
  }
}
resizeContributionGrid();
window.addEventListener("resize", () => { stopSnake(true); resizeContributionGrid(); });
hero.addEventListener("pointermove", steerSnake);
hero.addEventListener("pointerleave", () => stopSnake());
window.addEventListener("blur", () => stopSnake(true));
window.addEventListener("scroll", () => stopSnake(true), { passive: true });
prefersReducedMotion.addEventListener("change", () => stopSnake(true));
snakePointer.addEventListener("change", () => stopSnake(true));
document.addEventListener("visibilitychange", () => { if (document.hidden) stopSnake(true); });
const heroVisibilityObserver = new IntersectionObserver(([entry]) => {
  if (!entry.isIntersecting) stopSnake(true);
});
heroVisibilityObserver.observe(hero);

if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
  let cursorX = -40;
  let cursorY = -40;
  let glowX = -40;
  let glowY = -40;
  let cursorFrame = null;
  let cursorRadius = 4;

  function renderCursorGlow() {
    cursorFrame = null;
    glowX += (cursorX - glowX) * 0.22;
    glowY += (cursorY - glowY) * 0.22;
    cursorGlow.style.transform = `translate3d(${glowX - cursorRadius}px, ${glowY - cursorRadius}px, 0)`;
    if (Math.abs(cursorX - glowX) > 0.1 || Math.abs(cursorY - glowY) > 0.1) {
      cursorFrame = window.requestAnimationFrame(renderCursorGlow);
    }
  }

  document.addEventListener("pointermove", (event) => {
    cursorX = event.clientX;
    cursorY = event.clientY;
    cursorGlow.classList.add("is-visible");
    cursorGlow.classList.toggle("is-interactive", Boolean(event.target.closest("a, button")));
    cursorRadius = event.target.closest("a, button") ? 6 : 4;
    if (cursorFrame === null) cursorFrame = window.requestAnimationFrame(renderCursorGlow);
  });
  document.documentElement.addEventListener("mouseleave", () => {
    cursorGlow.classList.remove("is-visible");
    window.cancelAnimationFrame(cursorFrame);
    cursorFrame = null;
  });
}

menuButton.addEventListener("click", () => {
  const isOpen = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!isOpen));
  navigation.classList.toggle("is-open", !isOpen);
  document.body.style.overflow = isOpen ? "" : "hidden";
});

navigation.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    menuButton.setAttribute("aria-expanded", "false");
    navigation.classList.remove("is-open");
    document.body.style.overflow = "";
  });
});

function scrollToSection(target, hash) {
  const headerOffset = hash === "#top" ? 0 : siteHeader.offsetHeight;
  const destinationY = Math.max(0, target.getBoundingClientRect().top + window.scrollY - headerOffset);
  window.scrollTo({
    top: destinationY,
    behavior: prefersReducedMotion.matches ? "instant" : "smooth",
  });
}

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const hash = link.getAttribute("href");
    const target = hash ? document.querySelector(hash) : null;
    if (!target) return;

    event.preventDefault();
    window.history.pushState(null, "", hash);
    scrollToSection(target, hash);
  });
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1 },
);

document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));
document.querySelector("#year").textContent = new Date().getFullYear();

// One shared skill directory: desktop tabs and mobile accordion.
const skillsSection = document.querySelector(".skills-showcase");
if (skillsSection) {
  const mobileSkills = window.matchMedia("(max-width: 760px)");
  const directory = skillsSection.querySelector(".skills-directory");
  const groups = [...directory.querySelectorAll(".skill-group")];
  const navigation = document.createElement("div");
  navigation.className = "skills-navigation";
  navigation.setAttribute("role", "tablist");
  navigation.setAttribute("aria-label", "Skill disciplines");
  navigation.setAttribute("aria-orientation", "vertical");
  directory.before(navigation);
  let selected = 0;
  const controls = groups.map((group, index) => {
    const heading = group.querySelector("h4");
    const copy = group.querySelector(".skill-group-copy");
    const list = group.querySelector("ul");
    const tab = document.createElement("button");
    tab.type = "button";
    tab.id = "skill-tab-" + index;
    tab.className = "skills-tab";
    tab.textContent = heading.textContent;
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-controls", "skill-panel-" + index);
    navigation.append(tab);
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.id = "skill-toggle-" + index;
    toggle.className = "skill-toggle";
    toggle.textContent = heading.textContent;
    toggle.setAttribute("aria-controls", "skill-list-" + index);
    heading.replaceChildren(toggle);
    group.id = "skill-panel-" + index;
    list.id = "skill-list-" + index;
    group.querySelectorAll("i").forEach((icon) => {
      icon.setAttribute("aria-hidden", "true");
      if (icon.classList.contains("fa-sparkles")) {
        icon.classList.replace("fa-sparkles", "fa-wand-magic-sparkles");
      }
    });
    const eyebrow = document.createElement("p");
    eyebrow.className = "skill-eyebrow";
    eyebrow.textContent = heading.textContent;
    copy.prepend(eyebrow);
    tab.addEventListener("click", () => { selected = index; renderSkills(); });
    toggle.addEventListener("click", () => {
      if (!mobileSkills.matches) return;
      selected = selected === index ? -1 : index;
      renderSkills();
    });
    tab.addEventListener("keydown", (event) => {
      let next = index;
      if (event.key === "ArrowDown") next = (index + 1) % groups.length;
      else if (event.key === "ArrowUp") next = (index + groups.length - 1) % groups.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = groups.length - 1;
      else return;
      event.preventDefault();
      selected = next;
      renderSkills();
      controls[next].tab.focus();
    });
    return { tab, toggle, list };
  });
  function renderSkills() {
    const mobile = mobileSkills.matches;
    if (!mobile && selected < 0) selected = 0;
    navigation.hidden = mobile;
    groups.forEach((group, index) => {
      const active = index === selected;
      const { tab, toggle, list } = controls[index];
      group.hidden = !mobile && !active;
      group.classList.toggle("is-active", active);
      group.setAttribute("role", mobile ? "region" : "tabpanel");
      group.setAttribute("aria-labelledby", (mobile ? "skill-toggle-" : "skill-tab-") + index);
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      toggle.disabled = !mobile;
      toggle.setAttribute("aria-expanded", String(active));
      list.hidden = !active;
    });
  }
  const hint = document.createElement("p");
  hint.className = "skills-nav-hint";
  hint.textContent = "Choose a discipline to explore.";
  navigation.after(hint);
  skillsSection.classList.add("skills-interactive");
  mobileSkills.addEventListener("change", renderSkills);
  renderSkills();
}

const statsObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    statsObserver.unobserve(entry.target);
    const counters = entry.target.querySelectorAll("[data-count]");
    const started = performance.now();
    function count(now) {
      const progress = prefersReducedMotion.matches ? 1 : Math.min(1, (now - started) / 1200);
      const eased = 1 - (1 - progress) ** 3;
      counters.forEach((counter) => {
        counter.textContent = Math.round(Number(counter.dataset.count) * eased).toLocaleString("en-US");
      });
      if (progress < 1) window.requestAnimationFrame(count);
    }
    window.requestAnimationFrame(count);
  });
}, { threshold: 0.25 });
statsObserver.observe(document.querySelector(".stats-grid"));

// The cat wanders only while its section is visible.
const projectCat = document.querySelector('.project-cat');
if (projectCat) {
  let catFrame = null;
  let catVisible = false;
  let catX = 0;
  let catTarget = 0;
  let catLastTime = 0;
  let catPauseUntil = 0;
  let catNapIn = 8000 + Math.random() * 10000;
  let catSleepRemaining = 0;
  const catTravel = () => Math.max(0, projectCat.parentElement.clientWidth - projectCat.offsetWidth - 2 * parseFloat(getComputedStyle(projectCat).right));

  function walkCat(now) {
    catFrame = null;
    if (!catVisible || prefersReducedMotion.matches || document.hidden) return;
    const elapsed = catLastTime ? Math.min(50, now - catLastTime) : 0;
    catLastTime = now;
    const travel = catTravel();
    catX = Math.min(catX, travel);
    catTarget = Math.min(catTarget, travel);
    if (catSleepRemaining > 0) {
      catSleepRemaining -= elapsed;
      projectCat.style.transform = `translateX(${-catX}px)`;
      if (catSleepRemaining <= 0) {
        projectCat.classList.remove('is-sleeping');
        catNapIn = 18000 + Math.random() * 18000;
        catPauseUntil = now + 700;
      }
      catFrame = requestAnimationFrame(walkCat);
      return;
    }
    catNapIn -= elapsed;
    if (catNapIn <= 0) {
      catSleepRemaining = 4500 + Math.random() * 3500;
      projectCat.classList.remove('is-walking');
      projectCat.classList.add('is-sleeping');
      catFrame = requestAnimationFrame(walkCat);
      return;
    }
    if (now >= catPauseUntil) {
      if (Math.abs(catTarget - catX) < 1) {
        catTarget = Math.random() * travel;
        catPauseUntil = now + 1800 + Math.random() * 3200;
        projectCat.classList.remove('is-walking');
      } else {
        const direction = Math.sign(catTarget - catX);
        catX += direction * Math.min(Math.abs(catTarget - catX), elapsed * 0.018);
        projectCat.classList.toggle('faces-left', direction > 0);
        projectCat.classList.add('is-walking');
      }
    }
    projectCat.style.transform = `translateX(${-catX}px)`;
    catFrame = requestAnimationFrame(walkCat);
  }
  function syncCatMotion() {
    cancelAnimationFrame(catFrame);
    catFrame = null;
    catLastTime = 0;
    projectCat.classList.remove('is-walking');
    if (catVisible && !prefersReducedMotion.matches && !document.hidden) catFrame = requestAnimationFrame(walkCat);
  }
  new IntersectionObserver(([entry]) => {
    catVisible = entry.isIntersecting;
    syncCatMotion();
  }, { rootMargin: '80px' }).observe(projectCat.parentElement);
  prefersReducedMotion.addEventListener('change', syncCatMotion);
  document.addEventListener('visibilitychange', syncCatMotion);
}

// Load just one external website, and only after an intentional interaction.
const projectPreviewSizer = new ResizeObserver(entries => {
  entries.forEach(entry => entry.target.style.setProperty('--preview-scale', entry.contentRect.width / 1100));
});
let activeProjectPreview = null;
document.querySelectorAll('.project-web-preview').forEach(card => {
  const preview = card.querySelector('.project-preview-window');
  const frame = preview.querySelector('iframe');
  const caption = card.querySelector('.project-preview-caption');
  let hoverTimer;
  projectPreviewSizer.observe(preview);
  const reset = () => {
    card.classList.remove('preview-ready', 'preview-loading');
    frame.removeAttribute('src');
    caption.textContent = 'Hover or tap to preview';
  };
  const load = () => {
    if (activeProjectPreview?.card === card) return;
    activeProjectPreview?.reset();
    activeProjectPreview = { card, reset };
    card.classList.add('preview-loading');
    caption.textContent = 'Loading website…';
    frame.src = frame.dataset.previewSrc;
  };
  frame.addEventListener('load', () => {
    if (!frame.hasAttribute('src') || activeProjectPreview?.card !== card) return;
    card.classList.remove('preview-loading');
    card.classList.add('preview-ready');
    caption.textContent = 'Website preview';
  });
  card.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse') hoverTimer = setTimeout(load, 250);
  });
  card.addEventListener('pointerleave', () => clearTimeout(hoverTimer));
  card.addEventListener('focus', load);
  card.addEventListener('click', load);
  card.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); load(); }
  });
});


// Switch the selected experience in the compact folio.
(() => {
const root = document.getElementById('compact-experience');
if (!root) return;
const data = [
['Developer ecosystem','HackUnion','Connecting builders through practical learning, collaboration, partnerships, and opportunities to ship.','Developer experience · Programs · Partnerships','hackunion'],
['Technical education','Lords Skill Academy','Connecting technical training with developer communities, hands-on projects, and career readiness.','Technical training · Community · Mentorship','lords-skill-academy'],
['Open-source education','LIET × GitHub','Helping students learn version control, collaborate on GitHub, and contribute to open source.','GitHub · Version control · Open source','lords-github'],
['Campus builder program','OpenBuild Week','Bringing campus activations, hands-on learning, mentors, and building opportunities together.','Program design · Campus activation · Mentorship','openbuildweek'],
['Community leadership','GitHub Campus Expert','Building technical communities through developer education, CodeWave Hub, and HackPrix.','GitHub · Developer education · Community','github-campus-expert']
];
const buttons = root.querySelectorAll('button');
buttons.forEach(button => button.addEventListener('click', () => {
const index = Number(button.dataset.i), entry = data[index];
['category','title','description','focus'].forEach((key,i) => root.querySelector('#folio-'+key).textContent = entry[i]);
root.querySelector('#folio-count').textContent = '0'+(index+1)+' / 05';
root.querySelector('#folio-link').href = 'experience/'+entry[4]+'.html';
buttons.forEach(item => item.setAttribute('aria-pressed',String(item === button)));
}));
})();
