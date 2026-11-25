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
      let dragging = false;
      let accumD = 0, lastStep = 0;
      const STEP_PX = 28, MIN_GAP = 140;

      wrap.addEventListener("mousedown", e => {
        if (e.target.closest(".density-bubble-wrap")) return; // clicks handled by onclick
        dragging = true; accumD = 0;
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

    function selectOutsideDoc(docIdx) {
      const target = allDocs.find(doc => doc.idx === Number(docIdx));
      if (!target) return null;

      S.filter = "All";
      S.ovField = null;

      const years = filteredYears();
      const targetYear = String(target.year);
      const targetYearIdx = Math.max(0, years.indexOf(targetYear));

      S.dir = targetYearIdx >= S.yIdx ? 1 : -1;
      S.yIdx = targetYearIdx;
      S.activeDocIdx = target.idx;
      return target;
    }

    window.openOutsideDocSearch = function(docIdx) {
      const target = selectOutsideDoc(docIdx);
      if (!target) return false;

      setView("collapsed");
      update();

      requestAnimationFrame(() => {
        const panel = document.getElementById("overview-panel");
        const row = panel ? panel.querySelector(`[data-doc-idx="${target.idx}"]`) : null;
        if (row) row.scrollIntoView({ block: "center", behavior: "smooth" });
      });

      return true;
    };

    window.openOutsideCards = function() {
      setView("expanded");
      update();
    };

    /* Gallery → Outside Map: go straight to the expanded card view. */
    window.openOutsideDocFromGallery = function(docIdx) {
      const target = selectOutsideDoc(docIdx);
      if (!target) return false;
      S.pendingCardFocus = target.idx;
      S.pendingGalleryArrival = target.idx;
      S.suppressCardEntranceOnce = true;

      setView("expanded");
      update();
      scheduleOutsideGalleryArrivalFlip(target.idx);

      return true;
    };

    init();
