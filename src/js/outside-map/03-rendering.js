    // ─── Rendering ──────────────────────────────────────────
    let _tlYearsKey = null;

    function renderTimeline(years, activeIdx) {
      const nr     = document.getElementById("nodes-row");
      const labels = document.getElementById("year-labels");
      const yearsKey = years.join(",");

      const maxCount = Math.max(1, ...ALL_YEARS.map(y => (byYear[y]||[]).length));

      // Rebuild DOM only when the year list changes (e.g. filter change)
      if (yearsKey !== _tlYearsKey) {
        _tlYearsKey = yearsKey;

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
