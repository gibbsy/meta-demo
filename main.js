const SVGNS = "http://www.w3.org/2000/svg";

function svgEl(tag, attrs, parent) {
  const el = document.createElementNS(SVGNS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(el);
  return el;
}

/* ---------- Build repetitive SVG marks ---------- */

// Rates bar chart: fill width = value / 20% × track. Desktop and mobile only differ in geometry.
const RATES = [
  { name: "Australia", v: 4.4, track: "#f8eb93", fill: "#e8c331" },
  { name: "Brazil", v: 13.7, track: "#b0e7de", fill: "#3ab79a" },
  { name: "Germany", v: 4, track: "#e1b6e4", fill: "#a43cae" },
  { name: "India", v: 12.2, track: "#e4b1a1", fill: "#ae3b35" },
  { name: "United States", v: 9.4, track: "#d9eafa", fill: "#8bc0ee" },
];
const RATE_LAYOUT = {
  desk: { titleFs: 18, titleY: 14, rule: 26.5, ruleW: 470, top: 59, step: 90, labelFs: 16, labelY: 13, barY: 26, barH: 40, track: 440, valFs: 32, valY: 56, maxX: 446, maxFs: 14, maxY: 50 },
  mob: { titleFs: 15, titleY: 12, rule: 23.5, ruleW: 336, top: 39, step: 68, labelFs: 12, labelY: 10, barY: 20, barH: 32, track: 306, valFs: 24, valY: 44, maxX: 309, maxFs: 12, maxY: 39 },
};
document.querySelectorAll("svg.rates").forEach((svg) => {
  const L = RATE_LAYOUT[svg.classList.contains("desk") ? "desk" : "mob"];
  svgEl("text", { class: "txt", x: 0, y: L.titleY, "font-size": L.titleFs, "font-weight": 500, fill: "#222a37" }, svg).textContent = "Rates of young entrepreneurship";
  svgEl("line", { class: "rule", x1: 0, y1: L.rule, x2: L.ruleW, y2: L.rule, stroke: "#000" }, svg);
  RATES.forEach((r, i) => {
    const y = L.top + i * L.step;
    const g = svgEl("g", { class: "rate" }, svg);
    svgEl("text", { class: "txt", x: 0, y: y + L.labelY, "font-size": L.labelFs, fill: "#222a37" }, g).textContent = r.name;
    svgEl("rect", { class: "track", x: 0, y: y + L.barY, width: L.track, height: L.barH, fill: r.track }, g);
    svgEl("rect", { class: "fill", x: 0, y: y + L.barY, width: (r.v / 20) * L.track, height: L.barH, fill: r.fill }, g);
    svgEl("text", { class: "txt max", x: L.maxX, y: y + L.maxY, "font-size": L.maxFs, fill: r.fill }, g).textContent = "20%";
    svgEl("text", { x: 7, y: y + L.valY, "font-size": L.valFs, "font-weight": 700, fill: "#fff", "data-count": r.v, "data-suffix": "%" }, g).textContent = r.v + "%";
  });
});

// Ring grids: data-on lists how many highlighted rings each row starts with
document.querySelectorAll("svg.rings").forEach((svg) => {
  const d = svg.dataset;
  const on = d.on.split(",").map(Number);
  const grid = svg.querySelector(".grid");
  on.forEach((count, row) => {
    for (let col = 0; col < Number(d.cols); col++) {
      svgEl("circle", {
        class: "ring",
        cx: Number(d.cx) + col * d.pitch,
        cy: Number(d.cy) + row * d.pitch,
        r: d.r,
        fill: "none",
        stroke: col < count ? "#c9766b" : "#ace2d7",
        "stroke-width": d.sw,
      }, grid);
    }
  });
});

// Mobile triangles reuse the desktop shapes that are flagged data-m
const mobShapes = document.querySelector(".tri-scroll .shapes");
document.querySelectorAll("svg.tri.desk polygon[data-m]").forEach((p) => mobShapes.appendChild(p.cloneNode()));

// Each triangle sits in a clip the size of its own bounds, so it can slide in from behind its flat edge:
// upright triangles rise from their base, inverted ones drop from their top edge.
let clipId = 0;
document.querySelectorAll("svg.tri polygon.t").forEach((p) => {
  const pts = p.getAttribute("points").trim().split(/\s+/).map((s) => s.split(",").map(Number));
  const ys = pts.map((q) => q[1]);
  const xs = pts.map((q) => q[0]);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const apex = pts.find((q) => pts.filter((o) => Math.abs(o[1] - q[1]) < 0.5).length === 1);
  p.dataset.dir = apex[1] < maxY - 0.5 ? 1 : -1; // 1: base at bottom
  p.dataset.h = maxY - minY;
  const id = `tclip${clipId++}`;
  const cp = svgEl("clipPath", { id, clipPathUnits: "userSpaceOnUse" });
  svgEl("rect", { x: minX - 2, y: minY, width: maxX - minX + 4, height: maxY - minY }, cp);
  const g = svgEl("g", { "clip-path": `url(#${id})` });
  p.ownerSVGElement.insertBefore(cp, p.ownerSVGElement.firstChild);
  p.replaceWith(g);
  g.appendChild(p);
});

// Mobile triangle chart pans horizontally; the pill tracks and drives the scroll position
const scroller = document.querySelector(".tri-scroll");
const drag = document.querySelector(".drag");
const handle = drag.querySelector(".handle");
const maxScroll = () => scroller.scrollWidth - scroller.clientWidth;
const travel = () => drag.clientWidth - handle.offsetWidth - parseFloat(getComputedStyle(drag).paddingLeft) * 2;
const syncHandle = () => { handle.style.transform = `translateX(${(scroller.scrollLeft / (maxScroll() || 1)) * travel()}px)`; };
scroller.addEventListener("scroll", syncHandle, { passive: true });
drag.addEventListener("pointerdown", (e) => {
  drag.setPointerCapture(e.pointerId);
  const move = (ev) => {
    const r = drag.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (ev.clientX - r.left - handle.offsetWidth / 2) / travel()));
    scroller.scrollLeft = t * maxScroll();
  };
  move(e);
  drag.addEventListener("pointermove", move);
  drag.addEventListener("pointerup", () => drag.removeEventListener("pointermove", move), { once: true });
});
// Mobile toolbars fire height-only resizes while the page scrolls; only a width change re-centres
let lastWidth = 0;
const centreTriangles = () => {
  if (!scroller.clientWidth || innerWidth === lastWidth) return;
  lastWidth = innerWidth;
  scroller.scrollLeft = (207 / 753) * scroller.scrollWidth; // the design's starting window
  syncHandle();
};
centreTriangles();
window.addEventListener("resize", centreTriangles);

/* ---------- Animation ---------- */

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (!window.gsap || !window.ScrollTrigger || !window.SplitText || reduceMotion) {
  document.documentElement.classList.remove("js");
} else {
  gsap.registerPlugin(ScrollTrigger, SplitText);
  gsap.defaults({ ease: "power3.out", duration: 1 });

  // Smooth scrolling: Lenis keeps native scroll and runs on GSAP's ticker
  if (window.Lenis) {
    const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.9 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const target = document.querySelector(a.getAttribute("href"));
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { duration: 1.4 });
      });
    });

    // Slideshow snapping (desktop): once scrolling settles, ease to the top of the nearest finding or insight.
    // Inside the run of slides it always settles, leaning toward the scroll direction;
    // at the run's edges (hero, CTA) only when already close.
    const desktopMq = window.matchMedia("(min-width: 960px)");
    let snapTimer;
    const snap = () => {
      if (!desktopMq.matches) return;
      const y = lenis.scroll, vh = innerHeight;
      const tops = [...document.querySelectorAll(".slide, .insight")].map((el) => el.getBoundingClientRect().top + y);
      if (tops.some((t) => Math.abs(t - y) <= 1)) return;
      const next = tops.find((t) => t > y), prev = tops.findLast((t) => t < y);
      let to;
      if (prev != null && next != null && next - prev <= vh * 1.05) {
        const p = (y - prev) / (next - prev);
        to = (lenis.direction >= 0 ? p > 0.3 : p > 0.7) ? next : prev;
      } else {
        to = [prev, next].filter((t) => t != null && Math.abs(t - y) < vh * 0.2).sort((a, b) => Math.abs(a - y) - Math.abs(b - y))[0];
        if (to == null) return;
      }
      // A running snap scrolls every frame, so the idle timer below can't start another mid-snap
      lenis.scrollTo(to, { duration: 0.9, easing: (t) => 1 - Math.pow(1 - t, 3) });
    };
    lenis.on("scroll", () => {
      clearTimeout(snapTimer);
      snapTimer = setTimeout(snap, 140);
    });
  }

  // Ticker, like the 3000 in the hero: each digit is a mask, and a reel of numbers rolls up through it to the
  // final digit. Later digits roll further, like an odometer. Digits are hidden up front; an SVG reel is measured
  // and built the first time it plays, once fonts have settled. Returns a timeline to place in the chart's timeline.
  let tickId = 0;
  const prepTicker = (el) => {
    const svg = el instanceof SVGElement;
    const digits = [];
    const final = el.textContent;
    el.textContent = "";
    if (!svg) el.classList.add("tick");
    [...final].forEach((ch, index) => {
      const isDigit = /\d/.test(ch);
      const len = 5 + 2 * digits.length;
      const seq = isDigit && Array.from({ length: len }, (_, i) => (+ch - len + 1 + i + 100) % 10); // ends on the digit
      if (svg) {
        const t = svgEl("tspan", isDigit ? { "fill-opacity": 0 } : {}, el);
        t.textContent = ch;
        if (isDigit) digits.push({ seq, index });
      } else if (isDigit) {
        const d = document.createElement("span");
        d.className = "digit";
        d.innerHTML = `<span class="ghost">${ch}</span><span class="reel">${seq.map((v) => `<span>${v}</span>`).join("")}</span>`;
        el.append(d);
        digits.push({ seq, reel: d.lastChild });
        gsap.set(d.lastChild, { yPercent: 100 / seq.length });
      } else el.append(ch);
    });
    const buildSvgReel = (d) => {
      const box = el.getExtentOfChar(d.index);
      const id = `tick${tickId++}`;
      const clip = svgEl("clipPath", { id }, el.ownerSVGElement);
      svgEl("rect", { x: box.x - box.width, y: box.y, width: box.width * 3, height: box.height }, clip); // only the height clips
      const g = svgEl("g", { "clip-path": `url(#${id})` });
      el.after(g);
      d.reel = svgEl("g", {}, g);
      d.pitch = box.height;
      d.seq.forEach((v, k) => {
        const attrs = { x: box.x + box.width / 2, y: Number(el.getAttribute("y")) + k * box.height, "text-anchor": "middle" };
        for (const a of ["class", "font-size", "font-weight", "fill"]) if (el.hasAttribute(a)) attrs[a] = el.getAttribute(a);
        svgEl("text", attrs, d.reel).textContent = v;
      });
    };
    return (duration) => digits.forEach((d, i) => {
      const n = d.seq.length, vars = { duration, ease: "power3.inOut", delay: i * 0.08 };
      if (svg) {
        if (!d.reel) buildSvgReel(d);
        gsap.fromTo(d.reel, { y: d.pitch }, { y: -(n - 1) * d.pitch, ...vars });
      } else gsap.fromTo(d.reel, { yPercent: 100 / n }, { yPercent: -100 * (n - 1) / n, ...vars });
    });
  };
  const ticker = (el, { duration = 1.4 } = {}) => {
    const play = (el._ticker ||= prepTicker(el));
    return gsap.timeline().call(() => play(duration));
  };
  // Paused timeline that plays the first time its trigger scrolls into view.
  // The trigger only calls play(), so ScrollTrigger refreshes never rewind it.
  const onView = (trigger, start = "top 75%") => {
    const tl = gsap.timeline({ paused: true });
    ScrollTrigger.create({ trigger, start, once: true, onEnter: () => tl.play() });
    return tl;
  };
  // Masked line reveal: each line rises from behind its own baseline.
  // Lines re-split on resize/font load; `after` restores any state applied to the new line elements.
  const lineReveal = (el, vars = {}, after) => {
    const state = { played: false, anim: null };
    SplitText.create(el, {
      type: "lines",
      mask: "lines",
      linesClass: "line",
      autoSplit: true,
      onSplit(self) {
        if (state.anim) state.anim.kill();
        state.anim = gsap.from(self.lines, { yPercent: 110, duration: 1.15, ease: "expo.out", stagger: 0.1, ...vars, paused: true });
        if (state.played) state.anim.progress(1);
        if (after) after(state.played);
      },
    });
    el.style.visibility = "visible";
    return {
      play() { state.played = true; state.anim.play(); },
      get duration() { return state.anim ? state.anim.totalDuration() : 1; },
    };
  };

  // Progress bar (the one scrubbed element)
  gsap.to(".progress span", { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: true } });
  gsap.to(".people-bg img", { rotate: 360, duration: 240, ease: "none", repeat: -1 });

  /* --- Headings: masked line reveal everywhere --- */
  const hero = {
    title: lineReveal(document.querySelector(".s1-title"), { stagger: 0.12, duration: 1.3 }),
    amidst: lineReveal(document.querySelector(".s1-amidst"), { stagger: 0.08 }),
    sub: lineReveal(document.querySelector(".s1-sub")),
  };
  document.querySelectorAll("section:not(#s1) .split").forEach((el) => {
    const r = lineReveal(el);
    ScrollTrigger.create({ trigger: el, start: "top 88%", once: true, onEnter: () => gsap.delayedCall(el.classList.contains("h2-sub") ? 0.25 : 0, r.play) });
  });

  /* --- Insights: content runs once the panel is 70% of the way into the viewport --- */
  gsap.utils.toArray(".insight").forEach((sec) => {
    const quote = sec.querySelector(".quote");
    const hlDone = () => quote.querySelectorAll(".hl");
    const r = lineReveal(quote, { stagger: 0.12, duration: 1.2 }, (played) => {
      if (played) gsap.set(hlDone(), { "--p": "100%", color: "#222a37" });
    });
    const icons = sec.querySelectorAll(".bulb, .tag, .down");
    gsap.set(icons, { opacity: 0 });
    ScrollTrigger.create({
      trigger: sec,
      start: "top 30%",
      once: true,
      onEnter: () => {
        r.play();
        gsap.timeline()
          .to(hlDone(), { "--p": "100%", duration: 0.7, ease: "power2.inOut", stagger: 0.2 }, 0.75)
          .to(hlDone(), { color: "#222a37", duration: 0.35, stagger: 0.2 }, 0.95)
          .to(icons, { opacity: 1, duration: 0.8, stagger: 0.12 }, 0.4);
      },
    });
  });

  /* --- Shared reveals --- */
  // [data-reveal] elements are revealed by their chart's timeline instead
  gsap.utils.toArray(".reveal:not([data-reveal])").forEach((el) => {
    onView(el, "top 88%").from(el, { y: 50, opacity: 0, duration: 1.1 });
  });
  gsap.utils.toArray(".kf-head").forEach((el) => {
    onView(el, "top 90%")
      .fromTo(el, { "--line": 0 }, { "--line": 1, duration: 1.2, ease: "power2.inOut" })
      .from(el.children, { yPercent: 100, opacity: 0, stagger: 0.1, duration: 0.6 }, 0.4);
  });

  /* --- CTA (same elements in both layouts) --- */
  onView(".cta", "top 85%")
    .from(".card", { y: 80, opacity: 0, duration: 1.1 })
    .from(".card .dot", { scale: 0, stagger: 0.1, duration: 0.6, ease: "back.out(3)" }, 0.5)
    .from(".card .pct", { opacity: 0, y: 8, stagger: 0.1, duration: 0.4 }, 0.6)
    .from(".thumb", { rotate: -8, y: 30, opacity: 0, duration: 0.9 }, 0.4)
    .from(".cta-copy > *", { x: 30, opacity: 0, stagger: 0.12, duration: 0.8 }, 0.5)
    .call(() => gsap.utils.toArray(".card .dot").forEach((d, i) => {
      gsap.to(d, { scale: 1.5, duration: 0.9, yoyo: true, repeat: -1, ease: "sine.inOut", delay: i * 0.25 });
    }));

  /* --- Charts: built per layout so each animates the SVG that's on screen --- */
  const mm = gsap.matchMedia();
  mm.add({ desk: "(min-width: 960px)", mob: "(max-width: 959px)" }, (ctx) => {
    const { desk } = ctx.conditions;
    const L = desk ? ".desk" : ".mob";
    const $ = (sel) => document.querySelector(sel);

    // Hero
    const heroTl = gsap.timeline({ delay: 0.2 })
      .call(hero.title.play, null, 0)
      .call(hero.amidst.play, null, 0.25)
      .call(hero.sub.play, null, 0.5)
      .from(".s1-meta", { opacity: 0, duration: 0.8 }, 0.8)
      // Map: the left circle opens alone like a single globe, then the other two slide out from behind it
      .fromTo(".g1", { clipPath: "circle(0% at 50% 50%)" }, { clipPath: "circle(50% at 50% 50%)", duration: 1.3, ease: "expo.out" }, 0.4)
      .from(".g1 img", { scale: 1.15, transformOrigin: "20.72% 50%", duration: 1.8, ease: "expo.out" }, 0.4)
      .from(".g2, .g3", { autoAlpha: 0, duration: 0.01 }, 1.6)
      .from(".g2", { xPercent: -70.66, duration: 1.6, ease: "expo.inOut" }, 1.6)
      .from(".g3", { xPercent: -141.31, duration: 1.6, ease: "expo.inOut" }, 1.6)
      .from(".lockup p:first-child", { yPercent: 100, opacity: 0, duration: 0.6 }, 0.9)
      // 3000: the 3 ticks 0→1→2→3 in its mask, the zeros rise from behind their baseline
      .fromTo(".n3000 .ticker", { yPercent: 25 }, { yPercent: -75, duration: 1.5, ease: "power3.inOut" }, 0.9)
      .from(".n3000 .reel:not(.ticker)", { yPercent: 100, duration: 1, ease: "expo.out", stagger: 0.09 }, 1.35)
      .from(".lockup .r18", { x: -30, opacity: 0, duration: 0.7 }, 1.2)
      .fromTo(".lockup .arrow", { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.5, ease: "power2.inOut" }, 1.45)
      .from(".lockup .r40", { x: -30, opacity: 0, duration: 0.7 }, 1.75)
      .from(".lockup .yo, .lockup .across", { opacity: 0, y: 12, stagger: 0.1, duration: 0.6 }, 1.95);
    if (!desk) heroTl.from(".pin", { scale: 0, opacity: 0, transformOrigin: "7px 50%", stagger: 0.1, duration: 0.6, ease: "back.out(2.5)" }, 2.9);

    // Leader lines draw from the map pin leftwards, then down to the stat.
    // They wait for the map split to finish, but only while it is still running: scrolled into view later, they start at once.
    if (desk) {
      const afterSplit = (trigger, start, at, stagger) => {
        const tl = gsap.timeline({ paused: true });
        ScrollTrigger.create({ trigger, start, once: true, onEnter: () => gsap.delayedCall(Math.max(stagger, at - heroTl.time()), () => tl.play()) });
        return tl;
      };
      document.querySelectorAll(".leader").forEach((el, i) => {
        const tl = afterSplit(el, "top 90%", 3 + i * 0.12, i * 0.12);
        if (el.dataset.leader === "h") {
          tl.fromTo(el, { clipPath: "inset(0% 0% 99% 100%)" }, { clipPath: "inset(0% 0% 99% 0%)", duration: 0.45, ease: "power2.in" })
            .to(el, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.7, ease: "power2.out" });
        } else {
          tl.fromTo(el, { clipPath: "inset(0% 0% 100% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.7 });
        }
      });
      gsap.utils.toArray(".stat").forEach((s, i) => {
        afterSplit(s, "top 95%", 3.4 + i * 0.12, 0.3 + i * 0.12).from(s, { y: 40, opacity: 0, duration: 0.9 });
      });
    }

    // Rates bars
    const rates = $(`svg.rates${L}`);
    const ratesTl = onView(rates, "top 75%")
      .from(rates.querySelector(".rule"), { attr: { x2: 0 }, duration: 0.8, ease: "power2.inOut" })
      .from(rates.querySelectorAll(".track"), { scaleX: 0, transformOrigin: "0% 50%", stagger: 0.08, duration: 0.8, ease: "power2.inOut" }, 0.2)
      .from(rates.querySelectorAll(".max"), { opacity: 0, stagger: 0.08, duration: 0.4 }, 0.7);
    rates.querySelectorAll(".rate").forEach((g, i) => {
      ratesTl.from(g.querySelector(".fill"), { attr: { width: 0 }, duration: 1.2 }, 0.75 + i * 0.12)
        .add(ticker(g.querySelector("[data-count]"), { duration: 1.2 }), 0.75 + i * 0.12);
    });

    // #1 · 77% area vs 9% bar
    const asp = $(`svg.aspire${L}`);
    onView(asp, "top 70%")
      .from(asp.querySelector(".area"), desk
        ? { scaleX: 0.04, scaleY: 0.04, transformOrigin: "0% 100%", duration: 1.6, ease: "expo.inOut" }
        : { scaleY: 0, transformOrigin: "50% 100%", duration: 1.4, ease: "expo.inOut" })
      // Each block's text arrives once its shape has finished drawing
      .add(ticker(asp.querySelector(".t-area [data-count]"), { duration: 1.3 }), desk ? 1.35 : 1.2)
      .from(asp.querySelectorAll(".t-area > *"), { opacity: 0, y: 20, stagger: 0.1, duration: 0.6 }, desk ? 1.35 : 1.2)
      .from(asp.querySelector(".bar"), desk
        ? { scaleX: 0, transformOrigin: "0% 50%", duration: 1, ease: "power3.inOut" }
        : { scaleY: 0, transformOrigin: "50% 100%", duration: 0.8, ease: "power3.inOut" }, 1.2)
      .add(ticker(asp.querySelector(".t-bar [data-count]"), { duration: 1 }), desk ? 2.1 : 1.9)
      .from(asp.querySelectorAll(".t-bar > *"), { opacity: 0, x: -16, stagger: 0.1, duration: 0.5 }, desk ? 2.1 : 1.9);

    // #2 · Venn
    const venn = $(`svg.venn${L}`);
    const small = venn.querySelector(".c-small");
    const centre = (c) => `${c.getAttribute("cx")} ${c.getAttribute("cy")}`; // svgOrigin: the circle's own centre
    const vennNums = venn.querySelectorAll("[data-count]");
    onView(venn, "top 70%")
      .from(venn.querySelector(".c-big"), { scale: 0, svgOrigin: centre(venn.querySelector(".c-big")), duration: 1.4, ease: "back.out(1.3)" })
      .from(small, { scale: 0.3, x: Number(small.dataset.fromX || 0), y: Number(small.dataset.fromY || 0), opacity: 0, svgOrigin: centre(small), duration: 1.4, ease: "expo.out" }, 0.45)
      .from(vennNums, { opacity: 0, y: 20, stagger: 0.15, duration: 0.7 }, 0.7)
      .add(ticker(vennNums[0]), 0.7)
      .add(ticker(vennNums[1]), 0.85);

    // #3 · Triangles slide out from behind their flat edge
    const tri = desk ? $("svg.tri.desk") : $(".tri-scroll svg");
    const triTl = onView(desk ? tri : scroller, "top 75%");
    tri.querySelectorAll("polygon.t").forEach((t) => {
      triTl.from(t, { y: t.dataset.dir * t.dataset.h, duration: 1.1, ease: "expo.out" }, 0.1 * Number(t.dataset.o));
    });
    tri.querySelectorAll(".tl").forEach((g, i) => {
      triTl.from(g, { opacity: 0, y: 16, duration: 0.6 }, 0.7 + i * 0.12)
        .add(ticker(g.querySelector("[data-count]"), { duration: 1.1 }), 0.7 + i * 0.12);
    });
    // The note sits at the very bottom of the desktop slide, so it rides in with the triangles
    const triNote = $('[data-reveal="tri"]');
    (desk ? triTl : onView(triNote, "top 88%")).from(triNote, { y: 50, opacity: 0, duration: 1.1 }, desk ? 0.6 : 0);

    // #4 · Bubbles pop in, then idle-float
    const bub = $(`svg.bubbles${L}`);
    const bubTl = onView(bub, "top 70%");
    bub.querySelectorAll(".bub").forEach((g, i) => {
      bubTl.from(g, { scale: 0, svgOrigin: `${g.dataset.cx} ${g.dataset.cy}`, duration: 1.2, ease: "elastic.out(1, 0.6)" }, i * 0.18)
        .from(g.querySelectorAll(":scope > text"), { opacity: 0, y: 10, stagger: 0.08, duration: 0.5 }, i * 0.18 + 0.4)
        .add(ticker(g.querySelector("[data-count]"), { duration: 1.2 }), i * 0.18 + 0.4);
      gsap.to(g.querySelector("circle"), { y: i % 2 ? 6 : -6, duration: 2.6 + i * 0.4, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 1.5 });
    });

    // #5 · Rings drop in column by column, left to right
    const rings = $(`svg.rings${L}`);
    const ringEls = [...rings.querySelectorAll(".ring")]
      .sort((a, b) => a.getAttribute("cx") - b.getAttribute("cx") || a.getAttribute("cy") - b.getAttribute("cy"));
    const pitch = Number(rings.dataset.pitch);
    const each = desk ? 0.035 : 0.045;
    const span = ringEls.length * each + 0.4;
    onView(rings, "top 75%")
      .from(ringEls, { y: -pitch * 1.2, opacity: 0, duration: 0.75, ease: "bounce.out", stagger: each })
      .from(rings.querySelector(".under"), { attr: { width: 0 }, duration: span, ease: "power1.inOut" }, 0.2)
      .add(ticker($(".s6-stat .big"), { duration: span }), 0.2)
      .from(".s6-stat p", { opacity: 0, y: 16, duration: 0.6 }, 0.4);
  });

  // Fonts/images change layout heights; re-measure once everything is in
  window.addEventListener("load", () => ScrollTrigger.refresh());
}
