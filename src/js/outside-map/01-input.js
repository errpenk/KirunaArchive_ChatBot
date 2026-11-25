
    // ═══════════════════════════════════════════════════════════
    // DATA (LKAB Kiruna Archive Simplified)
    // ═══════════════════════════════════════════════════════════
    const {RAW, FIELD_META} = window.KirunaOutsideData;

    const FIELDS = Object.keys(FIELD_META);

    const MONTHS = { january:1,february:2,march:3,april:4,may:5,june:6, july:7,august:8,september:9,october:10,november:11,december:12 };
    const MONTH_SHORT = {0:"YEAR",1:"JAN",2:"FEB",3:"MAR",4:"APR",5:"MAY",6:"JUN",7:"JUL",8:"AUG",9:"SEP",10:"OCT",11:"NOV",12:"DEC"};
    const MONTH_FULL  = {0:"—",1:"January",2:"February",3:"March",4:"April",5:"May",6:"June",7:"July",8:"August",9:"September",10:"October",11:"November",12:"December"};

    function outsideImageBackground(docIdx) {
      const id = String(docIdx).padStart(3, '0');
      return 'background-image:url(images/outside/outside-' + id + '.jpg),linear-gradient(90deg,var(--g5) 0%,var(--g4) 45%,var(--g5) 100%);background-size:cover,cover;background-position:center,center;animation:none;';
    }

    function getYear(raw) {
      const p = raw.replace(/[~]/g,'').trim().split(' ');
      return p.length === 2 ? p[1] : p[0];
    }
    function getMonth(raw) {
      const s = raw.toLowerCase().replace(/[~]/g,'').trim().split(' ');
      return s.length === 2 ? (MONTHS[s[0]]||0) : 0;
    }
    function sortKey(raw) {
      const s = raw.toLowerCase().replace(/[~]/g,'').trim().split(' ');
      return s.length === 2 ? parseInt(s[1])*100 + (MONTHS[s[0]]||0) : parseInt(s[0])*100;
    }

    const allDocs = RAW.map(r => ({
      idx: r[7], rawDate: r[0], title: r[1], actor: r[2], field: r[3], label: r[4], desc: r[5], hasImg: r[6],
      year: getYear(r[0]), month: getMonth(r[0]), sk: sortKey(r[0])
    })).sort((a,b) => a.sk - b.sk);

    const byYear = {};
    allDocs.forEach(d => { (byYear[d.year] = byYear[d.year]||[]).push(d); });
    const ALL_YEARS = Object.keys(byYear).sort();
    const YEAR_RANGE = []; for (let y=2004; y<=2025; y++) YEAR_RANGE.push(String(y));

    // State
    const S = {
      filter:"All", yIdx:0, dir:1, view:"expanded",
      activeDocIdx: null, ovField: null,
      backLink: null, pendingCardFocus: null, pendingCardFocusBack: null, pendingOverviewRestore: null,
      pendingGalleryArrival: null,
      suppressCardEntranceOnce: false,
      prevView: null
    };

    function init() {
      buildFilter();
      document.getElementById("toggle-btn").addEventListener("click", () => {
        const nextView = S.view === "collapsed" ? "expanded" : "collapsed";
        setView(nextView);
        update();
      });
      document.getElementById("back-btn") && document.getElementById("back-btn").addEventListener("click", goBack);
      document.addEventListener("keydown", onKey);

      initTimelineDrag();
      initTimelineWheel();
      initCardDrag();
      initCardNav();
      initCardsWheel();
      initOverviewWheel();
      initZoneHovers();
      syncControls();
      update();
    }

    // ─── Timeline scrub ──────────────────────────────
    function initTimelineDrag() {
      const row = document.querySelector(".track-row");
      let mouseDragging = false, touchActive = false, rect = null;

      function yearAtX(x) {
        const years = filteredYears();
        if (!years.length) return 0;
        const p = Math.max(0, Math.min(1, x / rect.width));
        return Math.round(p * (years.length - 1));
      }

      function handleMouseDrag(x) {
        if (!mouseDragging) return;
        let targetIdx = yearAtX(x - rect.left);
        if (targetIdx !== S.yIdx) {
          S.dir = targetIdx > S.yIdx ? 1 : -1;
          S.yIdx = targetIdx;
          S.activeDocIdx = null;
          update();
        }
      }

      row.addEventListener("mousedown", e => {
        if (e.target.closest(".node")) return;
        rect = row.getBoundingClientRect();
        mouseDragging = true; row.classList.add("dragging");
        handleMouseDrag(e.clientX);
        e.preventDefault();
      });
      window.addEventListener("mousemove", e => handleMouseDrag(e.clientX));
      window.addEventListener("mouseup", () => { mouseDragging = false; if (!touchActive) row.classList.remove("dragging"); });

      // ── Touch: step-by-step scrub (one year per STEP_PX pixels) ──
      let touchLastX = 0, touchAccum = 0, touchStartX = 0, touchMoved = false;
      const STEP_PX = 28;

      row.addEventListener("touchstart", e => {
        rect = row.getBoundingClientRect();
        touchLastX = e.touches[0].clientX;
        touchStartX = touchLastX;
        touchAccum = 0;
        touchMoved = false;
        touchActive = true; row.classList.add("dragging");
        e.preventDefault();
      }, { passive: false });

      row.addEventListener("touchmove", e => {
        if (!touchActive) return;
        const x = e.touches[0].clientX;
        touchAccum += x - touchLastX;
        touchLastX = x;
        if (Math.abs(x - touchStartX) > 8) touchMoved = true;
        const steps = Math.trunc(touchAccum / STEP_PX);
        if (steps !== 0) {
          touchAccum -= steps * STEP_PX;
          const years = filteredYears();
          const newIdx = Math.max(0, Math.min(years.length - 1, S.yIdx + steps));
          if (newIdx !== S.yIdx) {
            S.dir = steps > 0 ? 1 : -1;
            S.yIdx = newIdx;
            S.activeDocIdx = null;
            update();
          }
        }
        e.preventDefault();
      }, { passive: false });

      row.addEventListener("touchend", e => {
        if (touchActive && !touchMoved && rect) {
          const x = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientX : touchStartX;
          const targetIdx = yearAtX(x - rect.left);
          if (targetIdx !== S.yIdx) {
            S.dir = targetIdx > S.yIdx ? 1 : -1;
            S.yIdx = targetIdx;
            S.activeDocIdx = null;
            update();
          }
        }
        touchActive = false; touchAccum = 0; touchMoved = false; if (!mouseDragging) row.classList.remove("dragging");
      });
      row.addEventListener("touchcancel", () => { touchActive = false; touchAccum = 0; touchMoved = false; row.classList.remove("dragging"); });
    }

    function initTimelineWheel() {
      const wrap = document.querySelector(".timeline-wrap");
      let accumDelta = 0;
      let lastChange = 0;
      const THRESHOLD = 90;   // px to accumulate before stepping
      const MIN_GAP = 160;    // ms minimum between steps
      const PER_EVENT_CAP = 24; // clamp individual wheel event delta

      wrap.addEventListener("wheel", e => {
        const raw = Math.abs(e.deltaX) >= Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        if (!raw) return; e.preventDefault();
        accumDelta += Math.sign(raw) * Math.min(Math.abs(raw), PER_EVENT_CAP);
        const now = Date.now();
        if (Math.abs(accumDelta) >= THRESHOLD && now - lastChange >= MIN_GAP) {
          const direction = accumDelta > 0 ? 1 : -1;
          accumDelta = 0; lastChange = now;
          const years = filteredYears();
          if (direction > 0 && S.yIdx < years.length - 1) {
            S.dir = 1; S.yIdx++; S.activeDocIdx = null; update();
          } else if (direction < 0 && S.yIdx > 0) {
            S.dir = -1; S.yIdx--; S.activeDocIdx = null; update();
          }
        }
      }, { passive: false });
    }

    // ─── Card Viewport Logic ───────────────────────────
    function initCardDrag() {
      const vp = document.getElementById("cards-vp");
      let dragging = false, startX = 0, startScroll = 0;

      vp.addEventListener("mousedown", e => {
        if (e.button !== 0) return;
        dragging = true; startX = e.clientX; startScroll = vp.scrollLeft;
        vp.classList.add("dragging");
        document.body.style.userSelect = "none";
      });
      window.addEventListener("mousemove", e => { if (dragging) vp.scrollLeft = startScroll - (e.clientX - startX); });
      window.addEventListener("mouseup", () => { dragging = false; vp.classList.remove("dragging"); document.body.style.userSelect = ""; });
      vp.addEventListener("scroll", checkCardViewportStates, {passive: true});
    }

    function initCardNav() {
      document.getElementById("nav-left").addEventListener("click", () => {
        document.getElementById("cards-vp").scrollBy({ left: -340, behavior: "smooth" });
      });
      document.getElementById("nav-right").addEventListener("click", () => {
        document.getElementById("cards-vp").scrollBy({ left: 340, behavior: "smooth" });
      });
    }

    // New Dual Side Mask & Arrow Sync
    function checkCardViewportStates() {
      if (S.view !== "expanded") return;
      const vp = document.getElementById("cards-vp");
      const leftBtn = document.getElementById("nav-left");
      const rightBtn = document.getElementById("nav-right");

      const scrollL = vp.scrollLeft;
      const maxScroll = vp.scrollWidth - vp.clientWidth;

      // 1. Arrow Visibility
      scrollL > 10 ? leftBtn.classList.remove("hidden") : leftBtn.classList.add("hidden");
      scrollL < maxScroll - 10 && maxScroll > 0 ? rightBtn.classList.remove("hidden") : rightBtn.classList.add("hidden");

      // 2. Dual Side Gradient Masking
      // We calculate percentage for CSS mask-image
      const maskRange = 80; // pixels for fade
      const leftFade = Math.min(maskRange, scrollL);
      const rightFade = Math.min(maskRange, maxScroll - scrollL);

      vp.style.setProperty("--mask-left", `${(leftFade / vp.clientWidth) * 100}%`);
      vp.style.setProperty("--mask-right", `${100 - (rightFade / vp.clientWidth) * 100}%`);
    }

    function buildFilter() {
      const btn  = document.getElementById("yb-filter-btn");
      const drop = document.getElementById("yf-dropdown");

      function rebuildOptions() {
        drop.innerHTML = "";
        const allOpt = document.createElement("div");
        allOpt.className = "yf-option" + (S.filter === "All" ? " selected" : "");
        allOpt.setAttribute("role","option");
        allOpt.innerHTML = `<span class="yf-opt-dot" style="background:var(--g4)"></span><span>All fields</span>`;
        allOpt.onclick = () => applyFilter("All");
        drop.appendChild(allOpt);
        FIELDS.forEach(f => {
          const opt = document.createElement("div");
          opt.className = "yf-option" + (S.filter === f ? " selected" : "");
          opt.setAttribute("role","option");
          opt.innerHTML = `<span class="yf-opt-dot" style="background:${FIELD_META[f].color}"></span><span>${f}</span>`;
          opt.onclick = () => applyFilter(f);
          drop.appendChild(opt);
        });
      }

      function applyFilter(f) {
        S.filter = f; S.yIdx = 0; S.dir = 0; S.activeDocIdx = null;
        btn.classList.remove("open"); drop.classList.remove("open");
        syncFilterBtn();
        rebuildOptions();
        update();
      }

      function toggle(e) {
        e.stopPropagation();
        const opening = !drop.classList.contains("open");
        btn.classList.toggle("open", opening);
        drop.classList.toggle("open", opening);
        if (opening) rebuildOptions();
      }

      btn.addEventListener("click", toggle);
      document.addEventListener("click", e => {
        if (!document.getElementById("yb-filter").contains(e.target)) {
          btn.classList.remove("open"); drop.classList.remove("open");
        }
      });

      syncFilterBtn();
      rebuildOptions();
    }

    function syncFilterBtn() {
      const dot   = document.getElementById("yf-dot");
      const label = document.getElementById("yf-label");
      if (!dot || !label) return;
      if (S.filter === "All") {
        dot.style.background = "var(--g4)";
        label.textContent = "All fields";
      } else {
        dot.style.background = FIELD_META[S.filter].color;
        label.textContent = S.filter;
      }
    }

    function filteredYears() {
      if (S.filter === "All") return ALL_YEARS;
      return ALL_YEARS.filter(yr => byYear[yr].some(d => d.field === S.filter));
    }

    function docsForYear(yr) {
      const docs = byYear[yr] || [];
      return S.filter === "All" ? docs : docs.filter(d => d.field === S.filter);
    }

    function getOutsideHudState() {
      const years = filteredYears();
      if (!years.length) {
        return {
          startYear: null,
          endYear: null,
          count: 0,
          activeYear: null,
          activeCount: 0,
          filter: S.filter,
          view: S.view
        };
      }
      const activeIndex = Math.max(0, Math.min(S.yIdx, years.length - 1));
      const activeYear = years[activeIndex];
      const count = years.reduce((sum, yr) => sum + docsForYear(yr).length, 0);
      return {
        startYear: Number(years[0]),
        endYear: Number(years[years.length - 1]),
        count,
        activeYear: Number(activeYear),
        activeCount: docsForYear(activeYear).length,
        filter: S.filter,
        view: S.view
      };
    }

    function notifyOutsideHudChange() {
      try {
        if (window.parent && typeof window.parent.refreshTimeline2Hud === "function") {
          window.parent.refreshTimeline2Hud(getOutsideHudState());
        }
      } catch (err) {}
    }

    window.getOutsideHudState = getOutsideHudState;

    function syncControls() {
      syncFilterBtn();
      document.getElementById("main-area").dataset.view = S.view;
      document.getElementById("toggle-btn").dataset.view = S.view;
      document.getElementById("toggle-label").textContent = S.view === "collapsed" ? "Expand cards" : "Collapse cards";
      const fieldBar = document.getElementById("field-bar");
      if (fieldBar) fieldBar.style.display = S.view === "collapsed" ? "flex" : "none";
    }

    function setView(view) {
      S.prevView = S.view;
      S.view = view;
      window.parent.parent.KirunaRoutes?.update('timeline2',{
        source:'outside',view:view==='expanded'?'cards':'overview',year:Number(filteredYears()[S.yIdx])||null,event:S.activeDocIdx??null
      });
      syncControls();
    }
