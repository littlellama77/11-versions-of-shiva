/**
 * 11 Versions of Shiva - Core Interactive Engine
 * Handles page navigation, realistic scrapbook rendering, touch gestures,
 * Web Audio sound effects, ambient lo-fi music box, live photo manager & lightbox,
 * live letter & memories editor, reading atmospheres, and celebratory confetti.
 */

(function () {
  'use strict';

  // --- Storage Keys ---
  const STORAGE_ATMOSPHERE_KEY = 'shiva_keepsake_atmosphere_v1';

  // Clear any old editing overrides from prior test sessions so the book is always pristine
  try {
    localStorage.removeItem('shiva_keepsake_photos_v1');
    localStorage.removeItem('shiva_keepsake_custom_letters_v1');
  } catch (e) {
    // Ignore storage errors
  }

  // Actively remove any ribbon elements if lingering in DOM/cache
  function purgeRibbon() {
    try {
      const ribbons = document.querySelectorAll('.book-ribbon-bookmark, [class*="ribbon-bookmark"], .ribbon');
      ribbons.forEach(el => el.remove());
    } catch (e) {}
  }
  purgeRibbon();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', purgeRibbon);
  }
  window.addEventListener('load', purgeRibbon);

  // --- State Variables ---
  let currentPage = 0; // 0: Cover, 1: TOC, 2..N+1: Chapters, N+2: Epilogue
  let soundEnabled = false;
  let musicEnabled = false;
  let audioCtx = null;
  let musicInterval = null;
  let currentAtmosphere = localStorage.getItem(STORAGE_ATMOSPHERE_KEY) || 'candlelight';

  // Active Chapters are pristine and immutable
  function getActiveChapters() {
    return window.BOOK_DATA.chapters;
  }

  function getTotalPages() {
    // 0: Cover, 1: TOC, 2..(N+1): Chapters, (N+2): Epilogue
    return 3 + getActiveChapters().length;
  }

  // --- DOM Elements ---
  const viewCover = document.getElementById('viewCover');
  const viewToc = document.getElementById('viewToc');
  const viewChapter = document.getElementById('viewChapter');
  const viewFinal = document.getElementById('viewFinal');

  const chapterPageLeft = document.getElementById('chapterPageLeft');
  const chapterPageRight = document.getElementById('chapterPageRight');

  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const pageLabelIndicator = document.getElementById('pageLabelIndicator');
  const chapterDotsContainer = document.getElementById('chapterDotsContainer');

  const coverOpenBtn = document.getElementById('coverOpenBtn');
  const readAgainBtn = document.getElementById('readAgainBtn');
  const headerHomeBtn = document.getElementById('headerHomeBtn');
  const confettiCanvas = document.getElementById('confettiCanvas');

  // Atmosphere & Sound Controls
  const atmosphereToggleBtn = document.getElementById('atmosphereToggleBtn');
  const atmosphereIcon = document.getElementById('atmosphereIcon');
  const atmosphereLabel = document.getElementById('atmosphereLabel');

  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const soundIcon = document.getElementById('soundIcon');
  const soundLabel = document.getElementById('soundLabel');

  const musicToggleBtn = document.getElementById('musicToggleBtn');
  const musicIcon = document.getElementById('musicIcon');
  const musicLabel = document.getElementById('musicLabel');

  const fullscreenToggleBtn = document.getElementById('fullscreenToggleBtn');
  const fullscreenIcon = document.getElementById('fullscreenIcon');

  // Modals & Triggers
  const openShortcutsBtn = document.getElementById('openShortcutsBtn');
  const shortcutsModal = document.getElementById('shortcutsModal');
  const closeShortcutsModalBtn = document.getElementById('closeShortcutsModalBtn');

  const openTocBtn = document.getElementById('openTocBtn');
  const tocModal = document.getElementById('tocModal');
  const closeTocModalBtn = document.getElementById('closeTocModalBtn');
  const modalTocList = document.getElementById('modalTocList');

  const lightboxModal = document.getElementById('lightboxModal');
  const closeLightboxBtn = document.getElementById('closeLightboxBtn');
  const lightboxCloseActionBtn = document.getElementById('lightboxCloseActionBtn');
  const lightboxImgWrapper = document.getElementById('lightboxImgWrapper');
  const lightboxPerson = document.getElementById('lightboxPerson');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxDownloadBtn = document.getElementById('lightboxDownloadBtn');
  let currentLightboxPhoto = null;

  // Mobile Tabs
  const mobileTabs = document.getElementById('mobileTabs');
  const tabScrapbookBtn = document.getElementById('tabScrapbookBtn');
  const tabLetterBtn = document.getElementById('tabLetterBtn');

  // Final Photo
  const finalPhotoCard = document.getElementById('finalPhotoCard');
  const finalPhotoFrame = document.getElementById('finalPhotoFrame');

  // --- Web Audio Synthesizer (Realistic Page Rustle & Music Box) ---
  function getAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playPaperTurnSound() {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      const bufferSize = ctx.sampleRate * 0.18; // 180ms
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, ctx.currentTime);
      filter.Q.setValueAtTime(1.5, ctx.currentTime);

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.01, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.04);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.17);

      whiteNoise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      whiteNoise.start();
    } catch (err) {
      console.warn('Audio synthesis warning:', err);
    }
  }

  // Pentatonic gentle acoustic music box notes
  const PENTATONIC_SCALE = [
    261.63, 293.66, 329.63, 392.00, 440.00, // C4, D4, E4, G4, A4
    523.25, 587.33, 659.25, 783.99, 880.00, // C5, D5, E5, G5, A5
    1046.50 // C6
  ];

  function playMusicBoxNote(freq) {
    if (!musicEnabled) return;
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      // Lowpass warmth
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, ctx.currentTime);

      // Music box envelope: sudden soft strike, slow sweet decay
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.045, ctx.currentTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.6);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 1.65);
    } catch (err) {
      console.warn('Music box note error:', err);
    }
  }

  function startAmbientMusicBox() {
    if (musicInterval) clearInterval(musicInterval);
    const chords = [
      [523.25, 659.25, 783.99], // C, E, G
      [440.00, 523.25, 659.25], // A, C, E
      [392.00, 587.33, 783.99], // G, D, G
      [329.63, 440.00, 659.25]  // E, A, E
    ];
    let chordIdx = 0;
    let step = 0;

    musicInterval = setInterval(() => {
      if (!musicEnabled) return;
      const currentChord = chords[chordIdx];
      const note = currentChord[step % currentChord.length];
      playMusicBoxNote(note);

      // Occasionally add a sweet twinkling high note
      if (Math.random() > 0.65) {
        setTimeout(() => {
          if (musicEnabled) {
            const highNote = PENTATONIC_SCALE[Math.floor(Math.random() * PENTATONIC_SCALE.length)];
            playMusicBoxNote(highNote);
          }
        }, 320);
      }

      step++;
      if (step % 6 === 0) {
        chordIdx = (chordIdx + 1) % chords.length;
      }
    }, 950);
  }

  function stopAmbientMusicBox() {
    if (musicInterval) {
      clearInterval(musicInterval);
      musicInterval = null;
    }
  }

  // --- Confetti Celebrations Canvas Engine ---
  let confettiAnimationId = null;
  let confettiParticles = [];

  function initConfettiCanvas() {
    if (!confettiCanvas) return;
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }

  window.addEventListener('resize', initConfettiCanvas);

  function triggerConfetti() {
    if (!confettiCanvas) return;
    initConfettiCanvas();
    const ctx = confettiCanvas.getContext('2d');
    if (!ctx) return;

    const colors = ['#cf6d76', '#c48b3c', '#4f748a', '#e89fa6', '#ffd166', '#06d6a0', '#f4845f'];
    confettiParticles = [];

    // Create 70 festive particles
    for (let i = 0; i < 70; i++) {
      confettiParticles.push({
        x: window.innerWidth * (0.2 + Math.random() * 0.6),
        y: window.innerHeight * 0.35 + Math.random() * 60,
        vx: (Math.random() - 0.5) * 12,
        vy: -Math.random() * 12 - 4,
        size: Math.random() * 9 + 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
        shape: Math.random() > 0.5 ? 'heart' : 'rect',
        opacity: 1
      });
    }

    if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId);

    function renderConfetti() {
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      let aliveCount = 0;

      confettiParticles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // gravity
        p.rotation += p.rotSpeed;
        p.opacity -= 0.009;

        if (p.opacity > 0 && p.y < window.innerHeight + 50) {
          aliveCount++;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.fillStyle = p.color;

          if (p.shape === 'rect') {
            ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          } else {
            // Cute heart shape
            ctx.font = `${p.size * 1.5}px serif`;
            ctx.fillText('♡', -p.size / 2, p.size / 2);
          }
          ctx.restore();
        }
      });

      if (aliveCount > 0) {
        confettiAnimationId = requestAnimationFrame(renderConfetti);
      } else {
        ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      }
    }

    confettiAnimationId = requestAnimationFrame(renderConfetti);
  }

  // --- Reading Atmosphere Mode ---
  function applyAtmosphere(theme) {
    currentAtmosphere = theme;
    document.body.classList.remove('theme-candlelight', 'theme-midnight');

    if (theme === 'candlelight') {
      document.body.classList.add('theme-candlelight');
      atmosphereIcon.textContent = '🕯️';
      atmosphereLabel.textContent = 'Candlelight';
    } else if (theme === 'midnight') {
      document.body.classList.add('theme-midnight');
      atmosphereIcon.textContent = '🌙';
      atmosphereLabel.textContent = 'Midnight';
    } else {
      atmosphereIcon.textContent = '📖';
      atmosphereLabel.textContent = 'Classic Desk';
    }
    localStorage.setItem(STORAGE_ATMOSPHERE_KEY, theme);
  }

  function cycleAtmosphere() {
    if (currentAtmosphere === 'default') {
      applyAtmosphere('candlelight');
    } else if (currentAtmosphere === 'candlelight') {
      applyAtmosphere('midnight');
    } else {
      applyAtmosphere('default');
    }
  }

  // --- Navigation & View Management ---
  function updateView(direction = 'none') {
    purgeRibbon();
    const chapters = getActiveChapters();
    const totalPages = getTotalPages();
    const epilogueIndex = totalPages - 1;

    // Reset views: hide all views with both class and explicit inline style
    [viewCover, viewToc, viewChapter, viewFinal].forEach(v => {
      if (v) {
        v.classList.remove('active');
        v.style.setProperty('display', 'none', 'important');
      }
    });

    // Navigation buttons state
    prevBtn.disabled = (currentPage === 0);
    nextBtn.disabled = (currentPage === totalPages - 1);

    // Update Indicators
    updatePageLabel();
    updateChapterDots();

    // Activate the appropriate view
    if (currentPage === 0) {
      viewCover.classList.add('active');
      viewCover.style.setProperty('display', 'flex', 'important');
    } else if (currentPage === 1) {
      viewToc.classList.add('active');
      viewToc.style.setProperty('display', 'flex', 'important');
    } else if (currentPage >= 2 && currentPage < epilogueIndex) {
      const chapterIndex = currentPage - 2;
      renderChapterSpread(chapterIndex);
      viewChapter.classList.add('active');
      viewChapter.style.setProperty('display', 'flex', 'important');
      setMobileActiveTab('left');
    } else if (currentPage === epilogueIndex) {
      renderFinalPage();
      viewFinal.classList.add('active');
      viewFinal.style.setProperty('display', 'flex', 'important');
      triggerConfetti();
    }

    // Scroll containers to top
    const bookContainer = document.getElementById('bookContainer');
    if (bookContainer) bookContainer.scrollTop = 0;
    if (chapterPageLeft) chapterPageLeft.scrollTop = 0;
    if (chapterPageRight) chapterPageRight.scrollTop = 0;

    // Play subtle page rustle sound
    if (direction !== 'none') {
      playPaperTurnSound();
    }
  }

  function updatePageLabel() {
    const chapters = getActiveChapters();
    const totalPages = getTotalPages();
    const epilogueIndex = totalPages - 1;

    if (currentPage === 0) {
      pageLabelIndicator.textContent = 'COVER';
    } else if (currentPage === 1) {
      pageLabelIndicator.textContent = 'CONTENTS';
    } else if (currentPage >= 2 && currentPage < epilogueIndex) {
      const ch = chapters[currentPage - 2];
      if (ch) {
        pageLabelIndicator.textContent = `PAGE ${ch.number} / ${chapters.length} · ${ch.name}`;
      }
    } else if (currentPage === epilogueIndex) {
      pageLabelIndicator.textContent = 'EPILOGUE';
    }
  }

  function updateChapterDots() {
    const dots = chapterDotsContainer.querySelectorAll('.chapter-dot');
    dots.forEach(dot => {
      const pageNum = parseInt(dot.getAttribute('data-page'), 10);
      if (pageNum === currentPage) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }

  function goToPage(pageIndex, direction = 'next') {
    const totalPages = getTotalPages();
    if (pageIndex < 0 || pageIndex >= totalPages) return;
    currentPage = pageIndex;
    updateView(direction);
  }

  function nextPage() {
    if (currentPage < getTotalPages() - 1) {
      goToPage(currentPage + 1, 'next');
    }
  }

  function prevPage() {
    if (currentPage > 0) {
      goToPage(currentPage - 1, 'prev');
    }
  }

  // --- Table of Contents Setup ---
  function setupTableOfContents() {
    const chapters = getActiveChapters();
    const tocListLeft = document.getElementById('tocListLeft');
    const tocListRight = document.getElementById('tocListRight');

    if (!tocListLeft || !tocListRight || !modalTocList) return;

    tocListLeft.innerHTML = '';
    tocListRight.innerHTML = '';
    modalTocList.innerHTML = '';

    const mid = Math.ceil(chapters.length / 2);

    chapters.forEach((ch, idx) => {
      const targetPage = idx + 2; // page 0=cover, 1=toc, 2=ch1...

      const createTocItem = () => {
        const item = document.createElement('div');
        item.className = 'toc-item';
        item.setAttribute('role', 'button');
        item.setAttribute('tabindex', '0');
        item.innerHTML = `
          <div class="toc-item-left">
            <span class="toc-item-num">${ch.number}</span>
            <div>
              <div class="toc-item-name">${ch.name}</div>
              <div class="toc-item-sub">${ch.subtitle}</div>
            </div>
          </div>
          <span class="toc-item-arrow">&rarr;</span>
        `;
        item.addEventListener('click', () => {
          goToPage(targetPage, 'next');
          closeTocModal();
        });
        item.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            goToPage(targetPage, 'next');
            closeTocModal();
          }
        });
        return item;
      };

      if (idx < mid) {
        tocListLeft.appendChild(createTocItem());
      } else {
        tocListRight.appendChild(createTocItem());
      }
      modalTocList.appendChild(createTocItem());
    });

    // Add Cover to Modal TOC
    const coverModalItem = document.createElement('div');
    coverModalItem.className = 'toc-item';
    coverModalItem.innerHTML = `
      <div class="toc-item-left">
        <span class="toc-item-num">00</span>
        <div>
          <div class="toc-item-name">FRONT COVER</div>
          <div class="toc-item-sub">11 Versions of Shiva</div>
        </div>
      </div>
      <span class="toc-item-arrow">&rarr;</span>
    `;
    coverModalItem.addEventListener('click', () => {
      goToPage(0, 'prev');
      closeTocModal();
    });
    modalTocList.insertBefore(coverModalItem, modalTocList.firstChild);

    // Add Epilogue to Modal TOC
    const epilogueIndex = getTotalPages() - 1;
    const finalModalItem = document.createElement('div');
    finalModalItem.className = 'toc-item';
    finalModalItem.innerHTML = `
      <div class="toc-item-left">
        <span class="toc-item-num">END</span>
        <div>
          <div class="toc-item-name">THE END ♡</div>
          <div class="toc-item-sub">Except not really.</div>
        </div>
      </div>
      <span class="toc-item-arrow">&rarr;</span>
    `;
    finalModalItem.addEventListener('click', () => {
      goToPage(epilogueIndex, 'next');
      closeTocModal();
    });
    modalTocList.appendChild(finalModalItem);
  }

  // --- Chapter Navigation Dots ---
  function setupChapterDots() {
    chapterDotsContainer.innerHTML = '';
    const chapters = getActiveChapters();
    const titles = ['Cover', 'Contents', ...chapters.map(c => c.name), 'The End'];

    titles.forEach((name, pageNum) => {
      const dot = document.createElement('button');
      dot.className = 'chapter-dot';
      dot.setAttribute('data-page', pageNum);
      dot.setAttribute('title', name);
      dot.setAttribute('aria-label', `Go to ${name}`);
      dot.addEventListener('click', () => goToPage(pageNum, pageNum > currentPage ? 'next' : 'prev'));
      chapterDotsContainer.appendChild(dot);
    });
  }

  // --- Render Chapter Spread (Left Scrapbook + Right Wholesome Live Letter) ---
  function renderChapterSpread(chapterIndex) {
    const chapters = getActiveChapters();
    const ch = chapters[chapterIndex];
    if (!ch) return;

    // 1. Build Polaroids for Left Scrapbook Page
    let polaroidsHtml = '';
    const photosList = ch.photos || [];

    photosList.forEach((photo, pIdx) => {
      const tapeClass = (pIdx % 2 === 1) ? 'washi-tape alt' : 'washi-tape';
      polaroidsHtml += `
        <div class="polaroid-card has-photo" 
             data-photo-id="${photo.id}" 
             data-photo-label="${escapeHtml(photo.label)}"
             data-photo-caption="${escapeHtml(photo.caption)}"
             data-photo-src="${photo.src}"
             title="Click to view keepsake photo ♡">
          <div class="${tapeClass}"></div>
          <div class="polaroid-photo-frame">
            <img src="${photo.src}" alt="${escapeHtml(photo.label)}" class="polaroid-img" loading="lazy">
          </div>
          <div class="polaroid-caption">${escapeHtml(photo.caption)}</div>
        </div>
      `;
    });

    // 2. Annotations / Sticky Notes
    let notesHtml = '';
    const noteColors = ['yellow', 'pink', 'blue', 'kraft'];
    const annotationsList = ch.annotations || [];
    annotationsList.forEach((note, nIdx) => {
      const col = noteColors[nIdx % noteColors.length];
      notesHtml += `<span class="scrapbook-note ${col}">📌 ${escapeHtml(note)}</span>`;
    });

    // 3. Special Chapter Motifs
    let specialMotifHtml = '';

    if (ch.caseFile) {
      specialMotifHtml = `
        <div class="special-motif-box">
          <div class="case-file-card">
            <span class="case-file-badge">${escapeHtml(ch.caseFile.status)}</span>
            <div class="case-file-row"><strong>CASE:</strong> ${escapeHtml(ch.caseFile.caseTitle)}</div>
            <div class="case-file-row"><strong>DATE:</strong> ${escapeHtml(ch.caseFile.date)}</div>
            <div class="case-file-row"><strong>SUSPECT:</strong> ${escapeHtml(ch.caseFile.suspect)}</div>
            <div class="case-file-row"><strong>EVIDENCE:</strong> ${escapeHtml(ch.caseFile.evidence)}</div>
          </div>
        </div>
      `;
    }

    if (ch.invoice) {
      specialMotifHtml = `
        <div class="special-motif-box">
          <div class="invoice-card">
            <div class="invoice-header">🧾 ${escapeHtml(ch.invoice.title)}</div>
            ${ch.invoice.items.map(it => `
              <div class="invoice-item">
                <span>• ${escapeHtml(it.item)}</span>
                <span><strong>${escapeHtml(it.cost)}</strong></span>
              </div>
            `).join('')}
            <div class="invoice-total">
              <span>${escapeHtml(ch.invoice.total)}</span>
            </div>
          </div>
        </div>
      `;
    }

    if (ch.wealthMeter) {
      specialMotifHtml = `
        <div class="special-motif-box">
          <div class="wealth-meter-box">
            <div class="wealth-meter-label">💰 ${escapeHtml(ch.wealthMeter.title)}: ${escapeHtml(ch.wealthMeter.level)}</div>
            <div class="wealth-meter-bar">
              <div class="wealth-meter-fill"></div>
            </div>
            <div class="wealth-meter-status">${escapeHtml(ch.wealthMeter.indicator)}</div>
          </div>
        </div>
      `;
    }

    // Highlighted Quote Box
    let quoteHtml = '';
    if (ch.highlights && ch.highlights.length > 0) {
      quoteHtml = `
        <div class="scrapbook-quote-card">
          <div class="scrapbook-quote-text">“${escapeHtml(ch.highlights[0])}”</div>
        </div>
      `;
    }

    // Render Left Scrapbook Page
    chapterPageLeft.innerHTML = `
      <div class="scrapbook-header">
        <span class="scrapbook-badge">Scrapbook Spread · ${ch.number}</span>
        <h2 class="scrapbook-name">${escapeHtml(ch.name)}</h2>
        <div class="scrapbook-subtitle">${escapeHtml(ch.subtitle)}</div>
      </div>

      <div class="scrapbook-canvas">
        <div class="polaroid-gallery">
          ${polaroidsHtml}
        </div>

        ${specialMotifHtml}

        <div class="scrapbook-notes-container">
          ${notesHtml}
        </div>

        ${quoteHtml}
      </div>
    `;

    // 4. Build Right Page (Wholesome & Cozy Live Letter)
    const formattedParagraphs = (ch.letterText || '')
      .split('\n\n')
      .map((p, idx) => {
        const cleanP = escapeHtmlWithLineBreaks(p);
        if (idx === 0) {
          return `<p class="letter-para-lead">${cleanP}</p>`;
        }
        return `<p>${cleanP}</p>`;
      })
      .join('');

    chapterPageRight.innerHTML = `
      <div class="letter-stationery">
        <!-- Vintage Postal Stamp & Cancellation Waves -->
        <div class="vintage-postal-mark" title="Special Air Mail · Dehradun 2026">
          <div class="postal-stamp">
            <div class="stamp-scallops"></div>
            <div class="stamp-content">
              <span class="stamp-number">18<small>th</small></span>
              <span class="stamp-airmail">AIR MAIL</span>
              <span class="stamp-heart">♡</span>
            </div>
          </div>
          <div class="postmark-circle">
            <span class="postmark-city">DEHRADUN</span>
            <span class="postmark-date">26.09.26</span>
            <div class="postmark-waves">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>

        <!-- Corner Paperclip Accent -->
        <div class="stationery-paperclip" aria-hidden="true" title="Keepsake clip">📎</div>

        <div class="letter-header">
          <div class="letter-title-group">
            <span class="letter-lead-label">A LIVE LETTER FROM</span>
            <h2 class="letter-author">${escapeHtml(ch.displayName || ch.name)}</h2>
            <div class="letter-subtitle">“${escapeHtml(ch.subtitle)}”</div>
          </div>
        </div>

        <div class="letter-paper-content">
          <div class="letter-body">
            ${formattedParagraphs}
          </div>

          <!-- Handwritten Closing & Wax Seal -->
          <div class="letter-seal-footer">
            <div class="wax-seal" title="Sealed with love">
              <div class="wax-seal-inner">
                <span class="wax-heart">❤</span>
              </div>
            </div>
            <div class="letter-stationery-signoff">
              <span class="signoff-note">Written with all the love in the world ♡</span>
            </div>
          </div>
        </div>

        <div class="letter-footer-meta">
          <span>CHAPTER ${ch.number} OF ${chapters.length}</span>
          <button class="letter-copy-btn" id="copyLetterBtn" title="Copy verbatim letter text to clipboard">
            📋 Copy Letter
          </button>
          <span>11 VERSIONS OF SHIVA</span>
        </div>
      </div>
    `;

    // Attach copy button handler
    const copyLetterBtn = chapterPageRight.querySelector('#copyLetterBtn');
    if (copyLetterBtn) {
      copyLetterBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(ch.letterText).then(() => {
          copyLetterBtn.textContent = 'Copied! ✓';
          copyLetterBtn.classList.add('copied');
          setTimeout(() => {
            copyLetterBtn.textContent = '📋 Copy Letter';
            copyLetterBtn.classList.remove('copied');
          }, 2000);
        }).catch(() => {
          alert('Could not copy to clipboard.');
        });
      });
    }

    // Attach click listeners to polaroids for full view in lightbox
    chapterPageLeft.querySelectorAll('.polaroid-card').forEach(card => {
      const photoId = card.getAttribute('data-photo-id');
      const label = card.getAttribute('data-photo-label');
      const caption = card.getAttribute('data-photo-caption');
      const src = card.getAttribute('data-photo-src');

      card.addEventListener('click', () => {
        openLightbox(photoId, label, caption, src);
      });
    });
  }

  // --- Render Final Epilogue Page ---
  function renderFinalPage() {
    const finalPhoto = window.BOOK_DATA.finalPage.photo;
    const uploadedImg = finalPhoto.src;

    finalPhotoFrame.innerHTML = `<img src="${uploadedImg}" alt="Final Keepsake Photo" class="polaroid-img">`;
    finalPhotoCard.title = "Click to view full keepsake photo ♡";

    finalPhotoCard.onclick = () => {
      openLightbox(finalPhoto.id, finalPhoto.label, finalPhoto.caption, uploadedImg);
    };
  }

  // --- Lightbox Modal Engine (Pure View Mode) ---
  function openLightbox(photoId, personLabel, caption, imgSrc) {
    currentLightboxPhoto = { photoId, personLabel, caption, imgSrc };
    lightboxImgWrapper.innerHTML = `<img src="${imgSrc}" alt="${personLabel}" class="lightbox-photo-full">`;
    lightboxPerson.textContent = personLabel;
    lightboxCaption.textContent = caption;
    lightboxModal.classList.add('active');
  }

  function closeLightbox() {
    lightboxModal.classList.remove('active');
    currentLightboxPhoto = null;
  }

  if (closeLightboxBtn) closeLightboxBtn.addEventListener('click', closeLightbox);
  if (lightboxCloseActionBtn) lightboxCloseActionBtn.addEventListener('click', closeLightbox);
  if (lightboxModal) {
    lightboxModal.addEventListener('click', (e) => {
      if (e.target === lightboxModal) closeLightbox();
    });
  }

  if (lightboxDownloadBtn) {
    lightboxDownloadBtn.addEventListener('click', () => {
      if (currentLightboxPhoto && currentLightboxPhoto.imgSrc) {
        const a = document.createElement('a');
        a.href = currentLightboxPhoto.imgSrc;
        a.download = `${currentLightboxPhoto.personLabel || 'shiva-keepsake'}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    });
  }

  // --- Mobile Tab Switching ---
  function setMobileActiveTab(target) {
    if (!tabScrapbookBtn || !tabLetterBtn) return;
    if (target === 'left') {
      tabScrapbookBtn.classList.add('active');
      tabLetterBtn.classList.remove('active');
      chapterPageLeft.classList.remove('mobile-hidden');
      chapterPageRight.classList.add('mobile-hidden');
    } else {
      tabScrapbookBtn.classList.remove('active');
      tabLetterBtn.classList.add('active');
      chapterPageLeft.classList.add('mobile-hidden');
      chapterPageRight.classList.remove('mobile-hidden');
    }
  }

  if (tabScrapbookBtn) tabScrapbookBtn.addEventListener('click', () => setMobileActiveTab('left'));
  if (tabLetterBtn) tabLetterBtn.addEventListener('click', () => setMobileActiveTab('right'));

  // --- Modals Management (TOC & Shortcuts) ---
  function openTocModal() { tocModal.classList.add('active'); }
  function closeTocModal() { tocModal.classList.remove('active'); }

  function openShortcutsModal() { shortcutsModal.classList.add('active'); }
  function closeShortcutsModal() { shortcutsModal.classList.remove('active'); }

  if (openTocBtn) openTocBtn.addEventListener('click', openTocModal);
  if (closeTocModalBtn) closeTocModalBtn.addEventListener('click', closeTocModal);
  if (tocModal) {
    tocModal.addEventListener('click', (e) => {
      if (e.target === tocModal) closeTocModal();
    });
  }

  if (openShortcutsBtn) openShortcutsBtn.addEventListener('click', openShortcutsModal);
  if (closeShortcutsModalBtn) closeShortcutsModalBtn.addEventListener('click', closeShortcutsModal);
  if (shortcutsModal) {
    shortcutsModal.addEventListener('click', (e) => {
      if (e.target === shortcutsModal) closeShortcutsModal();
    });
  }

  // --- Atmosphere & Audio Toggles ---
  atmosphereToggleBtn.addEventListener('click', cycleAtmosphere);

  soundToggleBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    if (soundEnabled) {
      soundIcon.textContent = '🔊';
      soundLabel.textContent = 'Rustle On';
      playPaperTurnSound();
    } else {
      soundIcon.textContent = '🔇';
      soundLabel.textContent = 'Rustle Off';
    }
  });

  musicToggleBtn.addEventListener('click', () => {
    musicEnabled = !musicEnabled;
    if (musicEnabled) {
      musicIcon.textContent = '🎶';
      musicLabel.textContent = 'Music On';
      startAmbientMusicBox();
    } else {
      musicIcon.textContent = '🎵';
      musicLabel.textContent = 'Music Off';
      stopAmbientMusicBox();
    }
  });

  // Fullscreen Toggle
  fullscreenToggleBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      fullscreenIcon.textContent = '✕';
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      fullscreenIcon.textContent = '⛶';
    }
  });

  document.addEventListener('fullscreenchange', () => {
    fullscreenIcon.textContent = document.fullscreenElement ? '✕' : '⛶';
  });

  // Branding home button
  headerHomeBtn.addEventListener('click', () => goToPage(0, 'prev'));

  // Main navigation buttons
  coverOpenBtn.addEventListener('click', () => {
    triggerConfetti();
    goToPage(1, 'next');
  });

  readAgainBtn.addEventListener('click', () => goToPage(0, 'prev'));
  prevBtn.addEventListener('click', prevPage);
  nextBtn.addEventListener('click', nextPage);

  // --- Keyboard Shortcuts ---
  window.addEventListener('keydown', (e) => {
    // If a modal is open, let Escape close it
    if (e.key === 'Escape') {
      closeTocModal();
      closeShortcutsModal();
      closeLightbox();
      return;
    }

    // Do not trigger hotkeys if user is currently typing in an input or textarea
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      return;
    }

    const key = e.key.toLowerCase();

    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault();
      nextPage();
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      prevPage();
    } else if (e.key === 'Home') {
      e.preventDefault();
      goToPage(0, 'prev');
    } else if (e.key === 'End') {
      e.preventDefault();
      goToPage(getTotalPages() - 1, 'next');
    } else if (key === 't') {
      e.preventDefault();
      openTocModal();
    } else if (key === 'm') {
      e.preventDefault();
      musicToggleBtn.click();
    } else if (key === 'a') {
      e.preventDefault();
      cycleAtmosphere();
    } else if (key === 'f') {
      e.preventDefault();
      fullscreenToggleBtn.click();
    } else if (key === '?' || key === 'h') {
      e.preventDefault();
      openShortcutsModal();
    }
  });

  // --- Touch Swipe Navigation for Mobile Devices ---
  let touchStartX = 0;
  let touchStartY = 0;
  let touchEndX = 0;
  let touchEndY = 0;

  const bookContainer = document.getElementById('bookContainer');
  if (bookContainer) {
    bookContainer.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    bookContainer.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      touchEndY = e.changedTouches[0].screenY;
      handleSwipeGesture();
    }, { passive: true });
  }

  function handleSwipeGesture() {
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;

    if (Math.abs(diffX) > 60 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
      if (diffX < 0) {
        nextPage();
      } else {
        prevPage();
      }
    }
  }

  // --- Helpers ---
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function escapeHtmlWithLineBreaks(str) {
    if (!str) return '';
    return escapeHtml(str).replace(/\n/g, '<br>');
  }

  // --- Initialize App ---
  function init() {
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get('page');
    if (pageParam !== null) {
      const p = parseInt(pageParam, 10);
      if (!isNaN(p) && p >= 0) {
        currentPage = Math.min(p, getTotalPages() - 1);
      }
    }
    applyAtmosphere(currentAtmosphere);
    setupTableOfContents();
    setupChapterDots();
    updateView('none');
    initConfettiCanvas();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
