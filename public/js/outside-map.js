
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

    const allDocs = RAW.map((r, i) => ({
      idx: i+1, rawDate: r[0], title: r[1], actor: r[2], field: r[3], label: r[4], desc: r[5], hasImg: r[6],
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
      syncControls();
    }

    // ─── Interaction Logic ──────────────────────────────────
    function openOverviewEvent(doc) {
      const panel = document.getElementById("overview-panel");
      const years = filteredYears();
      S.backLink = { from: "collapsed", filter: S.filter, year: years[S.yIdx], overviewScrollTop: panel.scrollTop, docIdx: doc.idx };
      S.activeDocIdx = doc.idx; // Persistent selection
      S.pendingCardFocus = doc.idx;
      setView("expanded");
      update();
    }

    function openCardEvent(doc) {
      const vp = document.getElementById("cards-vp");
      const years = filteredYears();
      S.backLink = { from: "expanded", filter: S.filter, year: years[S.yIdx], cardsScrollLeft: vp.scrollLeft, docIdx: doc.idx };
      S.activeDocIdx = doc.idx;
      S.pendingOverviewRestore = { docIdx: doc.idx };
      setView("collapsed");
      update();
    }

    function goBack() {
      if (!S.backLink) return;
      const snap = S.backLink;
      S.filter = snap.filter;
      const years = filteredYears();
      S.yIdx = Math.max(0, years.indexOf(snap.year));

      if (snap.from === "collapsed") {
        S.pendingOverviewRestore = { scrollTop: snap.overviewScrollTop, docIdx: snap.docIdx };
        setView("collapsed");
      } else {
        S.pendingCardFocusBack = { scrollLeft: snap.cardsScrollLeft, docIdx: snap.docIdx };
        setView("expanded");
      }
      S.backLink = null;
      update();
    }

    function applyCardFocus() {
      const vp = document.getElementById("cards-vp");
      if (S.pendingCardFocusBack) {
        vp.scrollLeft = S.pendingCardFocusBack.scrollLeft;
        S.pendingCardFocusBack = null;
      } else if (S.pendingCardFocus) {
        const docIdx = S.pendingCardFocus;
        const card = vp.querySelector(`[data-doc-idx="${docIdx}"]`);
        S.pendingCardFocus = null;
        if (card) {
          requestAnimationFrame(() => {
            centerOutsideDocCard(docIdx, S.pendingGalleryArrival === docIdx ? "auto" : "smooth");
          });
        }
      }
    }

    function centerOutsideDocCard(docIdx, behavior = "smooth") {
      const vp = document.getElementById("cards-vp");
      const card = vp ? vp.querySelector(`[data-doc-idx="${Number(docIdx)}"]`) : null;
      if (!vp || !card) return false;
      vp.querySelectorAll(".event-card.is-active").forEach(el => {
        if (el !== card) el.classList.remove("is-active");
      });
      card.classList.add("is-active");
      S.activeDocIdx = Number(docIdx);
      const target = card.offsetLeft + (card.offsetWidth / 2) - (vp.clientWidth / 2);
      vp.scrollTo({ left: Math.max(0, target), behavior });
      return true;
    }

    function scheduleOutsideDocCardCenter(docIdx) {
      [0, 120, 360, 760].forEach((delay, index) => {
        setTimeout(() => centerOutsideDocCard(docIdx, index === 0 ? "auto" : "smooth"), delay);
      });
    }

    function scheduleOutsideGalleryArrivalFlip(docIdx) {
      const targetIdx = Number(docIdx);
      let completed = false;
      const reveal = () => {
        if (completed) return true;
        const vp = document.getElementById("cards-vp");
        const card = vp ? vp.querySelector(`[data-doc-idx="${targetIdx}"]`) : null;
        if (!card) return false;
        completed = true;
        vp.querySelectorAll(".event-card.flipped").forEach(el => {
          if (el !== card) el.classList.remove("flipped");
        });
        card.classList.add("is-active", "flipped");
        centerOutsideDocCard(targetIdx, "auto");
        setTimeout(() => {
          const currentVp = document.getElementById("cards-vp");
          const currentCard = currentVp ? currentVp.querySelector(`[data-doc-idx="${targetIdx}"]`) : card;
          if (currentCard) {
            currentCard.classList.remove("flipped");
            currentCard.classList.add("is-active");
          }
          S.activeDocIdx = targetIdx;
          if (S.pendingGalleryArrival === targetIdx) S.pendingGalleryArrival = null;
        }, 760);
        return true;
      };
      [120, 320, 620, 920].forEach(delay => {
        setTimeout(() => {
          reveal();
        }, delay);
      });
    }

    let _prevYear = null;

    function update() {
      const years = filteredYears();
      if (S.yIdx >= years.length) S.yIdx = 0;
      const activeYear = years[S.yIdx] || null;
      const docs = activeYear ? docsForYear(activeYear) : [];

      // Reset field filter when year changes
      if (activeYear !== _prevYear) {
        S.ovField = null;
        _prevYear = activeYear;
      }

      syncControls();
      renderTimeline(years, S.yIdx);

      // Animate yb-year number smoothly
      const ybYear = document.getElementById("yb-year");
      const nextYr = activeYear || "—";
      if (ybYear.textContent !== nextYr) {
        ybYear.style.opacity = "0";
        ybYear.style.transform = "translateY(3px)";
        requestAnimationFrame(() => requestAnimationFrame(() => {
          ybYear.textContent = nextYr;
          ybYear.style.opacity = "1";
          ybYear.style.transform = "translateY(0)";
        }));
      }

      setYearStats(docs);
      setWatermark(activeYear);
      renderDensity(activeYear, years);

      if (S.view === "collapsed") {
        const animateRows = (S.prevView === "expanded" && S.view === "collapsed");
        renderOverview(activeYear, docs, animateRows);
        if (S.pendingOverviewRestore) {
          const snap = S.pendingOverviewRestore; S.pendingOverviewRestore = null;
          requestAnimationFrame(() => {
            const panel = document.getElementById("overview-panel");
            const row = panel.querySelector(`[data-doc-idx="${snap.docIdx}"]`);
            if (snap.scrollTop !== undefined) panel.scrollTop = snap.scrollTop;
            else if (row) row.scrollIntoView({ behavior: "smooth", block: "center" });
            if (row) { row.classList.add("is-returned"); setTimeout(() => row.classList.remove("is-returned"), 700); }
          });
        }
      } else {
        const cardDir = (S.prevView === "collapsed" && S.view === "expanded") ? "fromEvents" : S.dir;
        renderCards(docs, cardDir);
      }

      notifyOutsideHudChange();
    }

    // ─── Rendering ──────────────────────────────────────────
    let _tlYearsKey = null;
    let _tlActiveIdx = null;

    function renderTimeline(years, activeIdx) {
      const nr     = document.getElementById("nodes-row");
      const labels = document.getElementById("year-labels");
      const yearsKey = years.join(",");

      const maxCount = Math.max(1, ...ALL_YEARS.map(y => (byYear[y]||[]).length));

      // Rebuild DOM only when the year list changes (e.g. filter change)
      if (yearsKey !== _tlYearsKey) {
        _tlYearsKey = yearsKey;
        _tlActiveIdx = null;

        nr.innerHTML = "";
        labels.innerHTML = "";

        years.forEach((yr, i) => {
          // Geometric tick node — height proportional to event count
          const btn = document.createElement("button");
          btn.className = "node";
          btn.dataset.i = i;
          const count = (byYear[yr] || []).length;
          const baseH = count === 0 ? 4 : Math.max(5, Math.round(5 + (count / maxCount) * 28));
          btn.dataset.baseH = baseH;
          btn.style.height = baseH + "px";
          btn.onclick = () => { S.dir = i > S.yIdx ? 1 : -1; S.yIdx = i; S.activeDocIdx = null; update(); };
          nr.appendChild(btn);

          // Year label — percentage-positioned so it adapts to any container width
          const lbl = document.createElement("div");
          lbl.className = "yr-lbl";
          lbl.dataset.i = i;
          lbl.textContent = yr.slice(2); // "2004" → "04"
          const n = years.length;
          lbl.style.left = (n > 1 ? i / (n - 1) * 100 : 50) + '%';
          lbl.style.top  = '2px';
          lbl.style.cursor = 'pointer';
          lbl.onclick = () => { S.dir = i > S.yIdx ? 1 : -1; S.yIdx = i; S.activeDocIdx = null; update(); };
          labels.appendChild(lbl);
        });
      }

      const activeChanged = activeIdx !== _tlActiveIdx;
      _tlActiveIdx = activeIdx;

      // Update tick heights and active state
      Array.from(nr.children).forEach((btn, i) => {
        const isActive = i === activeIdx;
        const wasActive = btn.classList.contains("active");
        const baseH = parseInt(btn.dataset.baseH) || 6;
        if (isActive && !wasActive) {
          btn.className = "node active";
          btn.style.height = "36px";
        } else if (!isActive && wasActive) {
          btn.className = "node";
          btn.style.height = baseH + "px";
        }
      });

      // Update label visibility — always show active year; hide milestone if too close to active
      Array.from(labels.children).forEach((lbl, i) => {
        lbl.className = (i === activeIdx) ? "yr-lbl active" : "yr-lbl";
      });
    }

    function renderOverview(activeYear, docs, animated) {
      const panel = document.getElementById("overview-panel"); panel.innerHTML = "";
      const fieldBarRow = document.getElementById("field-comp-row");
      if (fieldBarRow) fieldBarRow.innerHTML = "";

      if (!docs.length) { panel.innerHTML = `<div class="empty-state">No matches</div>`; return; }

      const counts = {}; docs.forEach(d => counts[d.field] = (counts[d.field]||0)+1);
      const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]);

      // Field composition bar with click-to-filter — rendered into fixed field-bar
      const barHTML = sorted.map(([f,n]) => {
        const isA = S.ovField === f, isDim = S.ovField && !isA;
        return `<div class="cat-seg${isA?' seg-active':''}${isDim?' seg-dim':''}" data-field="${f}" style="flex:${n};background:${FIELD_META[f].color}" title="${f}: ${n}"></div>`;
      }).join("");
      const lgHTML = sorted.map(([f,n]) => {
        const isA = S.ovField === f, isDim = S.ovField && !isA;
        return `<span class="cat-lg-item${isA?' lg-active':''}${isDim?' lg-dim':''}" data-field="${f}"><span class="cat-lg-dot" style="background:${FIELD_META[f].color}"></span><span>${f}</span><span class="cat-lg-num">${n}</span></span>`;
      }).join("");
      if (fieldBarRow) {
        fieldBarRow.innerHTML = `
          <div class="ov-section-title ov-section-title--inline">Field</div>
          <div class="cat-bar">${barHTML}</div>
          <div class="cat-legend">${lgHTML}</div>`;

        const toggleField = (f) => {
          S.ovField = (S.ovField === f) ? null : f;
          renderOverview(activeYear, docs);
        };
        fieldBarRow.querySelectorAll(".cat-seg").forEach(el => el.onclick = () => toggleField(el.dataset.field));
        fieldBarRow.querySelectorAll(".cat-lg-item").forEach(el => el.onclick = () => toggleField(el.dataset.field));
      }

      // Event list — filtered by S.ovField if set
      const visible = S.ovField ? docs.filter(d => d.field === S.ovField) : docs;
      const list = document.createElement("div"); list.className = "ov-event-list";
      visible.forEach((d, i) => {
        const row = document.createElement("button");
        row.className = "ov-event-row" + (S.activeDocIdx === d.idx ? " is-active" : "");
        row.dataset.docIdx = d.idx;
        row.innerHTML = `
          <div class="ov-ev-date">${MONTH_SHORT[d.month]} · ${d.year}</div>
          <div class="ov-ev-field"><span class="ov-ev-field-dot" style="background:${FIELD_META[d.field].color}"></span><span>${d.field}</span></div>
          <div class="ov-ev-title">${d.title}</div>
          <span class="ov-ev-actor">${d.actor}</span><span class="ov-ev-link">Open</span>
          <button class="ov-ev-gallery" data-outside-idx="${d.idx}">View in Gallery ↗</button>`;
        if (animated) {
          const delay = Math.min(i, 12) * 0.045;
          row.style.animation = `rowEnter .42s var(--ease-spring) ${delay}s both`;
        } else {
          row.style.animation = `rowEnter .38s var(--ease-spring) both`;
        }
        row.onclick = () => openOverviewEvent(d);
        // View in Gallery button — open gallery without navigating to card view
        const galleryBtn = row.querySelector(".ov-ev-gallery");
        if (galleryBtn) {
          galleryBtn.onclick = (e) => {
            e.stopPropagation();
            try { window.parent.parent.openGalleryItem("outside", d.idx); } catch(err) {}
          };
        }
        list.appendChild(row);
      });
      panel.appendChild(list);
    }

    let _cardsExitTimer = null;
    let _cardsQueued    = null;

    function renderCards(docs, dir) {
      const vp = document.getElementById("cards-vp");
      // If no existing cards, inject immediately
      if (S.suppressCardEntranceOnce || !vp.children.length || dir === 0 || dir === "fromEvents") {
        _injectCards(vp, docs, dir);
        return;
      }
      // Queue the next render; if exit already running, just update the queue
      _cardsQueued = { docs, dir };
      if (_cardsExitTimer) return;

      // Animate current cards out
      const exitAnim = dir > 0 ? "exitLeft" : "exitRight";
      Array.from(vp.children).forEach((c, i) => {
        c.style.pointerEvents = "none";
        c.style.animation = `${exitAnim} .16s var(--ease) ${Math.min(i,4)*0.01}s both`;
      });
      _cardsExitTimer = setTimeout(() => {
        _cardsExitTimer = null;
        const next = _cardsQueued || { docs, dir };
        _cardsQueued = null;
        _injectCards(vp, next.docs, next.dir);
      }, 200);
    }

    function fitRenderedCardDensity(vp) {
      if (!vp) return;
      vp.querySelectorAll(".event-card").forEach(card => {
        card.classList.remove("card-compact", "card-dense");
        const front = card.querySelector(".card-front");
        const desc = card.querySelector(".card-desc");
        if (!front || !desc) return;
        const isOverflowing = () => (front.scrollHeight - front.clientHeight) > 2 || (desc.scrollHeight - desc.clientHeight) > 2;
        if (!isOverflowing()) return;
        card.classList.add("card-compact");
        if (isOverflowing()) card.classList.add("card-dense");
      });
    }

    function _injectCards(vp, docs, dir) {
      const suppressEntrance = !!S.suppressCardEntranceOnce;
      vp.classList.toggle("gallery-arrival-prep", suppressEntrance);
      vp.innerHTML = "";
      vp.scrollLeft = 0;
      const anim = dir === "fromEvents" ? "enterSlideIn" : dir > 0 ? "enterRight" : dir < 0 ? "enterLeft" : "enterFade";

      // Cards with a month label (month > 0) go left, sorted Jan→Dec.
      // Cards with no month (month === 0) go right, preserving original order.
      const withMonth    = docs.filter(d => d.month > 0).sort((a, b) => a.month - b.month);
      const withoutMonth = docs.filter(d => d.month === 0);
      docs = [...withMonth, ...withoutMonth];

      docs.forEach((doc, i) => {
        const card = document.createElement("div");
        card.className = "event-card" + (S.activeDocIdx === doc.idx ? " is-active" : "") + (S.pendingGalleryArrival === doc.idx ? " flipped" : "");
        card.dataset.docIdx = doc.idx;
        const staggerDelay = dir === "fromEvents" ? Math.min(i, 10) * 0.055 : Math.min(i, 8) * 0.025;
        if (suppressEntrance) {
          card.style.animation = "none";
          card.style.opacity = "1";
          card.style.transform = "none";
        } else {
          card.style.animation = `${anim} .38s var(--ease-spring) ${staggerDelay}s both`;
        }

        const fm = FIELD_META[doc.field];
        card.innerHTML = `
          <div class="card-flip-inner">
            <div class="card-front">
              <div class="card-head">
                <div class="card-head-top">
                  <span class="card-head-left"><span class="card-field-dot" style="background:${fm.color}"></span><span class="card-mo-day">${MONTH_FULL[doc.month]}</span></span>
                  <span class="card-index">№ ${String(doc.idx).padStart(3,"0")}</span>
                </div>
                <div class="card-year-row"><span class="card-year">${doc.year}</span><span class="card-month-abbr">${MONTH_SHORT[doc.month]}</span></div>
              </div>
              <div class="card-body">
                <div class="card-pills"><span class="pill pill-field">${doc.field}</span><span class="pill pill-label">${doc.label}</span></div>
                <div class="card-title">${doc.title}</div>
                <div class="card-actor"><span>${doc.actor}</span></div>
                <div class="${doc.desc ? "card-desc" : "card-no-desc"}">${doc.desc || ""}</div>
              </div>
            </div>
            <div class="card-back">
              <button class="card-back-close" title="Close">✕</button>
              <div class="card-back-img" style="${outsideImageBackground(doc.idx)}"></div>
              <div class="card-back-title">${doc.title}</div>
              <button class="card-back-btn">View in Gallery ↗</button>
            </div>
          </div>`;

        let startX = 0;
        card.onmousedown  = (e) => { startX = e.clientX; card.classList.add("is-pressing"); };
        card.onmouseleave = ()  => card.classList.remove("is-pressing");
        card.onmouseup    = ()  => card.classList.remove("is-pressing");
        card.ontouchstart = (e) => { startX = e.touches[0].clientX; card.classList.add("is-pressing"); };
        card.ontouchend   = ()  => card.classList.remove("is-pressing");
        card.onclick = (e) => {
          if (Math.abs(e.clientX - startX) > 5) return;
          // If clicking the gallery button on back, let it handle itself
          if (e.target.closest(".card-back-btn")) return;
          card.classList.remove("is-pressing");
          // If already flipped, flip back; otherwise flip all and flip this
          if (card.classList.contains("flipped")) {
            card.classList.remove("flipped", "is-active");
            S.activeDocIdx = null;
          } else {
            vp.querySelectorAll(".event-card").forEach(c => { c.classList.remove("is-active", "flipped"); });
            card.classList.add("is-active", "flipped");
            S.activeDocIdx = doc.idx;
          }
        };
        // View in Gallery
        const galleryBtn = card.querySelector(".card-back-btn");
        if (galleryBtn) galleryBtn.onclick = (e) => {
          e.stopPropagation();
          try { window.parent.parent.openGalleryItem("outside", doc.idx); } catch(err) {}
        };
        vp.appendChild(card);
      });

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          fitRenderedCardDensity(vp);
          applyCardFocus();
          checkCardViewportStates();
          if (suppressEntrance) {
            requestAnimationFrame(() => {
              vp.classList.remove("gallery-arrival-prep");
              S.suppressCardEntranceOnce = false;
            });
          }
        });
      });
    }

    function setYearStats(docs) {
      const el = document.getElementById("yb-stats");
      if (!docs.length) { el.innerHTML = ""; return; }
      const fields = new Set(docs.map(d => d.field)).size;
      const actors = new Set(docs.map(d => d.actor)).size;
      el.innerHTML = `
        <span class="yb-stat"><span class="yb-stat-num">${docs.length}</span><span class="yb-stat-lbl">documents</span></span>
        <span class="yb-stat"><span class="yb-stat-num">${fields}</span><span class="yb-stat-lbl">fields</span></span>
        <span class="yb-stat"><span class="yb-stat-num">${actors}</span><span class="yb-stat-lbl">actors</span></span>`;
    }

    let _wmYear = null;
    function setWatermark(yr) {
      if (yr === _wmYear) return;
      _wmYear = yr;
      const wm = document.getElementById("watermark");
      wm.style.opacity = "0";
      setTimeout(() => { wm.textContent = yr || ""; wm.style.opacity = "1"; }, 120);
    }

    function renderDensity(activeYear, activeYears) {
      const chart = document.getElementById("density-chart"); chart.innerHTML = "";
      const counts = YEAR_RANGE.map(yr => ({ yr, n: docsForYear(yr).length }));
      const maxN = Math.max(1, ...counts.map(c => c.n));
      // Bubble size: min 4px diameter for 0 events, max 36px for maxN
      const MIN_D = 4, MAX_D = 36;

      counts.forEach(({yr, n}) => {
        const bw = document.createElement("div");
        bw.className = "density-bubble-wrap" + (yr === activeYear ? " active" : "") + (!activeYears.includes(yr) ? " dim" : "");
        const d = n === 0 ? MIN_D : Math.round(MIN_D + (n / maxN) * (MAX_D - MIN_D));
        bw.innerHTML = `<div class="density-bubble" style="width:${d}px;height:${d}px"></div><div class="density-tooltip">${yr} · ${n} events</div>`;
        bw.onclick = () => {
          const idx = activeYears.indexOf(yr);
          if (idx >= 0) { S.dir = idx > S.yIdx ? 1 : -1; S.yIdx = idx; S.activeDocIdx = null; update(); }
        };
        chart.appendChild(bw);
      });

      // Drag-to-scrub on density-wrap
      initDensityDrag();
    }

    // ─── Focus tracking for keyboard zones ─────────────────
    // Zones: "timeline" | "cards" | "events" | "none"
    let _kbZone = "timeline";

    function setKbZone(zone) {
      _kbZone = zone;
      // Visual feedback
      document.querySelector(".density-wrap").classList.remove("kb-focus");
      document.getElementById("cards-container").classList.toggle("kb-focus", zone === "cards");
      const op = document.getElementById("overview-panel");
      if (op) op.classList.toggle("kb-focus", zone === "events");
    }

    // Mouse-enter sets zone
    function initZoneHovers() {
      document.querySelector(".timeline-wrap").addEventListener("mouseenter", () => setKbZone("timeline"));
      document.querySelector(".density-wrap").addEventListener("mouseenter", () => setKbZone("none"));
      document.getElementById("cards-container").addEventListener("mouseenter", () => setKbZone("cards"));
      document.getElementById("overview-panel").addEventListener("mouseenter", () => setKbZone("events"));
    }

    function onKey(e) {
      const years = filteredYears();
      const key = e.key;

      // ── Timeline zone: left/right navigate years ──
      if (_kbZone === "timeline") {
        if (key === "ArrowRight" && S.yIdx < years.length - 1) { S.dir = 1; S.yIdx++; S.activeDocIdx = null; update(); e.preventDefault(); }
        else if (key === "ArrowLeft" && S.yIdx > 0) { S.dir = -1; S.yIdx--; S.activeDocIdx = null; update(); e.preventDefault(); }
        return;
      }

      // ── Cards zone: left/right scroll cards viewport ──
      if (_kbZone === "cards" && S.view === "expanded") {
        const vp = document.getElementById("cards-vp");
        if (key === "ArrowRight") { vp.scrollBy({ left: 340, behavior: "smooth" }); e.preventDefault(); }
        else if (key === "ArrowLeft") { vp.scrollBy({ left: -340, behavior: "smooth" }); e.preventDefault(); }
        return;
      }

      // ── Events (overview) zone: up/down scroll list ──
      if (_kbZone === "events" && S.view === "collapsed") {
        const panel = document.getElementById("overview-panel");
        if (key === "ArrowDown") { panel.scrollBy({ top: 80, behavior: "smooth" }); e.preventDefault(); }
        else if (key === "ArrowUp") { panel.scrollBy({ top: -80, behavior: "smooth" }); e.preventDefault(); }
        return;
      }
    }

    // ─── Density drag-to-scrub ──────────────────────────────
    let _densityDragInit = false;
    function initDensityDrag() {
      if (_densityDragInit) return;
      _densityDragInit = true;
      const wrap = document.querySelector(".density-wrap");
      let dragging = false, startX = 0;
      let accumD = 0, lastStep = 0;
      const STEP_PX = 28, MIN_GAP = 140;

      wrap.addEventListener("mousedown", e => {
        if (e.target.closest(".density-bubble-wrap")) return; // clicks handled by onclick
        dragging = true; startX = e.clientX; accumD = 0;
        wrap.classList.add("dragging");
        e.preventDefault();
      });
      window.addEventListener("mousemove", e => {
        if (!dragging) return;
        accumD += e.movementX;
        const now = Date.now();
        if (Math.abs(accumD) >= STEP_PX && now - lastStep >= MIN_GAP) {
          const dir = accumD < 0 ? 1 : -1;
          accumD = 0; lastStep = now;
          stepYear(dir);
        }
      });
      window.addEventListener("mouseup", () => { dragging = false; wrap.classList.remove("dragging"); });

    }

    function stepYear(dir) {
      const years = filteredYears();
      if (dir > 0 && S.yIdx < years.length - 1) { S.dir = 1; S.yIdx++; S.activeDocIdx = null; update(); }
      else if (dir < 0 && S.yIdx > 0) { S.dir = -1; S.yIdx--; S.activeDocIdx = null; update(); }
    }

    function initOverviewWheel() {
      const panel = document.getElementById("overview-panel");
      panel.addEventListener("wheel", e => {
        if (S.view !== "collapsed") return;
        const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
        if (!delta) return;
        e.preventDefault();
        panel.scrollBy({ top: delta });
      }, { passive: false });
    }

    function initCardsWheel() {
      const container = document.getElementById("cards-container");
      const vp = document.getElementById("cards-vp");
      container.addEventListener("wheel", e => {
        if (S.view !== "expanded") return;
        const delta = Math.abs(e.deltaX) >= Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        if (!delta) return;
        e.preventDefault();
        vp.scrollBy({ left: delta });
      }, { passive: false });
    }

    window.getOutsideSearchIndex = function() {
      return allDocs.map(doc => ({
        idx: doc.idx,
        title: doc.title,
        actor: doc.actor,
        field: doc.field,
        label: doc.label,
        desc: doc.desc || "",
        year: Number(doc.year),
        rawDate: doc.rawDate,
        color: FIELD_META[doc.field] ? FIELD_META[doc.field].color : "#86868b"
      }));
    };

    window.openOutsideDocSearch = function(docIdx) {
      const target = allDocs.find(doc => doc.idx === Number(docIdx));
      if (!target) return false;

      S.filter = "All";
      S.ovField = null;

      const years = filteredYears();
      const targetYear = String(target.year);
      const targetYearIdx = Math.max(0, years.indexOf(targetYear));

      S.dir = targetYearIdx >= S.yIdx ? 1 : -1;
      S.yIdx = targetYearIdx;
      S.activeDocIdx = target.idx;

      setView("collapsed");
      update();

      requestAnimationFrame(() => {
        const panel = document.getElementById("overview-panel");
        const row = panel ? panel.querySelector(`[data-doc-idx="${target.idx}"]`) : null;
        if (row) row.scrollIntoView({ block: "center", behavior: "smooth" });
      });

      return true;
    };

    /* Gallery → Outside Map: go straight to the expanded card view. */
    window.openOutsideDocFromGallery = function(docIdx) {
      const target = allDocs.find(doc => doc.idx === Number(docIdx));
      if (!target) return false;

      S.filter = "All";
      S.ovField = null;

      const years = filteredYears();
      const targetYear = String(target.year);
      const targetYearIdx = Math.max(0, years.indexOf(targetYear));

      S.dir = targetYearIdx >= S.yIdx ? 1 : -1;
      S.yIdx = targetYearIdx;
      S.activeDocIdx = target.idx;
      S.pendingCardFocus = target.idx;
      S.pendingGalleryArrival = target.idx;
      S.suppressCardEntranceOnce = true;

      setView("expanded");
      update();
      scheduleOutsideGalleryArrivalFlip(target.idx);

      return true;
    };

    init();
