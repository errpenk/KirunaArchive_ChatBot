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

      // Synchronize user-driven year changes without overwriting a pending deep link on initialization.
      if (_prevYear !== null) {
        const routes = window.parent.parent.KirunaRoutes;
        const route = routes?.parse(new URL(window.parent.parent.location.href));
        if (route?.page === 'timeline2' && route.source === 'outside') {
          routes.update('timeline2', {year: activeYear ? Number(activeYear) : null, event: S.activeDocIdx ?? null});
        }
      }

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
