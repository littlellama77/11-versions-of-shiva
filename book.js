/**
 * 11 Versions of Shiva - Core Interactive Engine
 * Handles page navigation, realistic scrapbook rendering, touch gestures,
 * Web Audio sound effects, ambient lo-fi music box, live photo manager & lightbox,
 * live letter & memories editor, reading atmospheres, and celebratory confetti.
 */

(function () {
  'use strict';

  // --- Storage Keys ---
  const STORAGE_PHOTOS_KEY = 'shiva_keepsake_photos_v1';
  const STORAGE_LETTERS_KEY = 'shiva_keepsake_custom_letters_v1';
  const STORAGE_ATMOSPHERE_KEY = 'shiva_keepsake_atmosphere_v1';

  // --- State Variables ---
  let currentPage = 0; // 0: Cover, 1: TOC, 2..N+1: Chapters, N+2: Epilogue
  let soundEnabled = false;
  let musicEnabled = false;
  let audioCtx = null;
  let musicInterval = null;
  let activeUploadTargetId = null;
  let currentAtmosphere = localStorage.getItem(STORAGE_ATMOSPHERE_KEY) || 'default';

  // --- Photo LocalStorage Management ---
  function getSavedPhotos() {
    try {
      const data = localStorage.getItem(STORAGE_PHOTOS_KEY);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      console.warn('LocalStorage photo retrieval error:', e);
      return {};
    }
  }

  function savePhoto(photoId, dataUrl) {
    try {
      const current = getSavedPhotos();
      current[photoId] = dataUrl;
      localStorage.setItem(STORAGE_PHOTOS_KEY, JSON.stringify(current));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
      alert('Photo is quite large for browser memory, but will be shown for this session!');
    }
  }

  function removePhoto(photoId) {
    try {
      const current = getSavedPhotos();
      delete current[photoId];
      localStorage.setItem(STORAGE_PHOTOS_KEY, JSON.stringify(current));
    } catch (e) {
      console.warn('LocalStorage remove error:', e);
    }
  }

  function clearAllPhotos() {
    try {
      localStorage.removeItem(STORAGE_PHOTOS_KEY);
    } catch (e) {
      console.warn('LocalStorage clear error:', e);
    }
  }

  // --- Letters & Memories LocalStorage Management ---
  function getCustomLetters() {
    try {
      const data = localStorage.getItem(STORAGE_LETTERS_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn('LocalStorage letters retrieval error:', e);
      return null;
    }
  }

  function saveCustomLetters(chapters) {
    try {
      localStorage.setItem(STORAGE_LETTERS_KEY, JSON.stringify(chapters));
    } catch (e) {
      console.warn('LocalStorage custom letters save error:', e);
    }
  }

  function revertCustomLetters() {
    try {
      localStorage.removeItem(STORAGE_LETTERS_KEY);
    } catch (e) {
      console.warn('LocalStorage revert error:', e);
    }
  }

  // Active Chapters (defaults merged with custom updates)
  function getActiveChapters() {
    const custom = getCustomLetters();
    if (custom && Array.isArray(custom) && custom.length > 0) {
      return custom;
    }
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
  const bookRibbon = document.getElementById('bookRibbon');
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

  const openPhotosBtn = document.getElementById('openPhotosBtn');
  const photosModal = document.getElementById('photosModal');
  const closePhotosModalBtn = document.getElementById('closePhotosModalBtn');
  const photoSlotGrid = document.getElementById('photoSlotGrid');
  const resetAllPhotosBtn = document.getElementById('resetAllPhotosBtn');
  const exportPhotosBtn = document.getElementById('exportPhotosBtn');
  const importPhotosBtn = document.getElementById('importPhotosBtn');
  const importPhotosInput = document.getElementById('importPhotosInput');

  const openLettersBtn = document.getElementById('openLettersBtn');
  const lettersModal = document.getElementById('lettersModal');
  const closeLettersModalBtn = document.getElementById('closeLettersModalBtn');
  const lettersChapterSelect = document.getElementById('lettersChapterSelect');
  const addNewChapterBtn = document.getElementById('addNewChapterBtn');
  const editAuthorName = document.getElementById('editAuthorName');
  const editSubtitle = document.getElementById('editSubtitle');
  const editHighlight = document.getElementById('editHighlight');
  const editAnnotations = document.getElementById('editAnnotations');
  const editLetterText = document.getElementById('editLetterText');
  const saveLetterBtn = document.getElementById('saveLetterBtn');
  const revertLetterBtn = document.getElementById('revertLetterBtn');
  const exportLettersJsonBtn = document.getElementById('exportLettersJsonBtn');
  const importLettersJsonBtn = document.getElementById('importLettersJsonBtn');
  const importLettersInput = document.getElementById('importLettersInput');
  const copyLettersCodeBtn = document.getElementById('copyLettersCodeBtn');

  const lightboxModal = document.getElementById('lightboxModal');
  const closeLightboxBtn = document.getElementById('closeLightboxBtn');
  const lightboxImgWrapper = document.getElementById('lightboxImgWrapper');
  const lightboxPerson = document.getElementById('lightboxPerson');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxReplaceBtn = document.getElementById('lightboxReplaceBtn');
  const lightboxDownloadBtn = document.getElementById('lightboxDownloadBtn');
  const lightboxRemoveBtn = document.getElementById('lightboxRemoveBtn');
  let currentLightboxPhoto = null;

  const directPhotoInput = document.getElementById('directPhotoInput');

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
    const chapters = getActiveChapters();
    const totalPages = getTotalPages();
    const epilogueIndex = totalPages - 1;

    // Reset views
    [viewCover, viewToc, viewChapter, viewFinal].forEach(v => v.classList.remove('active'));

    // Navigation buttons state
    prevBtn.disabled = (currentPage === 0);
    nextBtn.disabled = (currentPage === totalPages - 1);

    // Update Indicators
    updatePageLabel();
    updateChapterDots();

    // Activate the appropriate view
    if (currentPage === 0) {
      viewCover.classList.add('active');
    } else if (currentPage === 1) {
      viewToc.classList.add('active');
    } else if (currentPage >= 2 && currentPage < epilogueIndex) {
      const chapterIndex = currentPage - 2;
      renderChapterSpread(chapterIndex);
      viewChapter.classList.add('active');
      setMobileActiveTab('left');
    } else if (currentPage === epilogueIndex) {
      renderFinalPage();
      viewFinal.classList.add('active');
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

  // --- Render Chapter Spread (Left Scrapbook + Right Full Letter) ---
  function renderChapterSpread(chapterIndex) {
    const chapters = getActiveChapters();
    const ch = chapters[chapterIndex];
    if (!ch) return;

    const savedPhotos = getSavedPhotos();

    // 1. Build Polaroids for Left Page
    let polaroidsHtml = '';
    const photosList = ch.photos || [
      { id: `${ch.id}-photo-1`, label: `${ch.name} PHOTO`, caption: ch.subtitle, src: '' }
    ];

    photosList.forEach((photo, pIdx) => {
      const uploadedImg = savedPhotos[photo.id] || photo.src;
      const tapeClass = (pIdx % 2 === 1) ? 'washi-tape alt' : 'washi-tape';

      let innerContent = '';
      if (uploadedImg) {
        innerContent = `<img src="${uploadedImg}" alt="${photo.label}" class="polaroid-img">`;
      } else {
        innerContent = `
          <div class="polaroid-placeholder-inner">
            <span class="placeholder-icon">📸</span>
            <span class="placeholder-label">${photo.label}</span>
            <span class="placeholder-action">+ Add / Replace Photo</span>
          </div>
        `;
      }

      polaroidsHtml += `
        <div class="polaroid-card ${uploadedImg ? 'has-photo' : 'empty-frame'}" 
             data-photo-id="${photo.id}" 
             data-photo-label="${escapeHtml(photo.label)}"
             data-photo-caption="${escapeHtml(photo.caption)}"
             data-has-img="${uploadedImg ? 'true' : 'false'}"
             title="${uploadedImg ? 'Click to view photo or replace' : 'Click or drag & drop photo here'}">
          <div class="${tapeClass}"></div>
          <div class="polaroid-photo-frame">
            ${innerContent}
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

    // 4. Build Right Page (Letter - Strictly preserving verbatim nuance)
    const formattedParagraphs = (ch.letterText || '')
      .split('\n\n')
      .map(p => `<p>${escapeHtmlWithLineBreaks(p)}</p>`)
      .join('');

    chapterPageRight.innerHTML = `
      <div class="letter-header">
        <div class="letter-title-group">
          <span class="letter-number">LETTER ${ch.number} / ${chapters.length}</span>
          <h2 class="letter-author">${escapeHtml(ch.displayName || ch.name)}</h2>
          <div class="letter-subtitle">${escapeHtml(ch.subtitle)}</div>
        </div>
        <div class="letter-stamp-icon" title="Keepsake Letter">💌</div>
      </div>

      <div class="letter-body">
        ${formattedParagraphs}
      </div>

      <div class="letter-footer-meta">
        <span>11 VERSIONS OF SHIVA</span>
        <button class="letter-copy-btn" id="copyLetterBtn" title="Copy verbatim letter text to clipboard">
          📋 Copy Letter
        </button>
        <span>${ch.number} OF ${chapters.length}</span>
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

    // Attach click and drag-drop listeners to polaroids
    chapterPageLeft.querySelectorAll('.polaroid-card').forEach(card => {
      const photoId = card.getAttribute('data-photo-id');
      const hasImg = card.getAttribute('data-has-img') === 'true';
      const label = card.getAttribute('data-photo-label');
      const caption = card.getAttribute('data-photo-caption');

      card.addEventListener('click', () => {
        if (hasImg) {
          openLightbox(photoId, label, caption, savedPhotos[photoId]);
        } else {
          triggerDirectUpload(photoId);
        }
      });

      // Drag and Drop functionality
      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        card.classList.add('drag-over');
      });

      card.addEventListener('dragleave', () => {
        card.classList.remove('drag-over');
      });

      card.addEventListener('drop', (e) => {
        e.preventDefault();
        card.classList.remove('drag-over');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
          const file = e.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (evt) => {
              savePhoto(photoId, evt.target.result);
              renderChapterSpread(chapterIndex);
              populatePhotoManagerGrid();
            };
            reader.readAsDataURL(file);
          }
        }
      });
    });
  }

  // --- Render Final Epilogue Page ---
  function renderFinalPage() {
    const savedPhotos = getSavedPhotos();
    const finalPhoto = window.BOOK_DATA.finalPage.photo;
    const uploadedImg = savedPhotos[finalPhoto.id] || finalPhoto.src;

    if (uploadedImg) {
      finalPhotoFrame.innerHTML = `<img src="${uploadedImg}" alt="Final Keepsake Photo" class="polaroid-img">`;
      finalPhotoCard.title = "Click to enlarge keepsake photo";
    } else {
      finalPhotoFrame.innerHTML = `
        <div class="polaroid-placeholder-inner">
          <span class="placeholder-icon">📸</span>
          <span class="placeholder-label">${escapeHtml(finalPhoto.label)}</span>
          <span class="placeholder-action">+ Add Keepsake Photo</span>
        </div>
      `;
      finalPhotoCard.title = "Click or drag photo here to add";
    }

    finalPhotoCard.onclick = () => {
      if (uploadedImg) {
        openLightbox(finalPhoto.id, finalPhoto.label, finalPhoto.caption, uploadedImg);
      } else {
        triggerDirectUpload(finalPhoto.id);
      }
    };

    finalPhotoCard.ondragover = (e) => {
      e.preventDefault();
      finalPhotoCard.classList.add('drag-over');
    };
    finalPhotoCard.ondragleave = () => {
      finalPhotoCard.classList.remove('drag-over');
    };
    finalPhotoCard.ondrop = (e) => {
      e.preventDefault();
      finalPhotoCard.classList.remove('drag-over');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            savePhoto(finalPhoto.id, evt.target.result);
            renderFinalPage();
            populatePhotoManagerGrid();
          };
          reader.readAsDataURL(file);
        }
      }
    };
  }

  // --- Direct File Upload Engine ---
  function triggerDirectUpload(photoId) {
    activeUploadTargetId = photoId;
    directPhotoInput.value = '';
    directPhotoInput.click();
  }

  directPhotoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file || !activeUploadTargetId) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      const dataUrl = event.target.result;
      savePhoto(activeUploadTargetId, dataUrl);

      const epilogueIndex = getTotalPages() - 1;
      if (currentPage >= 2 && currentPage < epilogueIndex) {
        renderChapterSpread(currentPage - 2);
      } else if (currentPage === epilogueIndex) {
        renderFinalPage();
      }
      populatePhotoManagerGrid();
    };
    reader.readAsDataURL(file);
  });

  // --- Lightbox Modal Engine ---
  function openLightbox(photoId, personLabel, caption, imgSrc) {
    currentLightboxPhoto = { photoId, personLabel, caption, imgSrc };
    lightboxImgWrapper.innerHTML = `<img src="${imgSrc}" alt="${personLabel}">`;
    lightboxPerson.textContent = personLabel;
    lightboxCaption.textContent = caption;
    lightboxModal.classList.add('active');
  }

  function closeLightbox() {
    lightboxModal.classList.remove('active');
    currentLightboxPhoto = null;
  }

  closeLightboxBtn.addEventListener('click', closeLightbox);
  lightboxModal.addEventListener('click', (e) => {
    if (e.target === lightboxModal) closeLightbox();
  });

  lightboxReplaceBtn.addEventListener('click', () => {
    if (currentLightboxPhoto) {
      const pId = currentLightboxPhoto.photoId;
      closeLightbox();
      triggerDirectUpload(pId);
    }
  });

  lightboxDownloadBtn.addEventListener('click', () => {
    if (currentLightboxPhoto && currentLightboxPhoto.imgSrc) {
      const a = document.createElement('a');
      a.href = currentLightboxPhoto.imgSrc;
      a.download = `${currentLightboxPhoto.photoId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  });

  lightboxRemoveBtn.addEventListener('click', () => {
    if (currentLightboxPhoto) {
      removePhoto(currentLightboxPhoto.photoId);
      closeLightbox();
      const epilogueIndex = getTotalPages() - 1;
      if (currentPage >= 2 && currentPage < epilogueIndex) {
        renderChapterSpread(currentPage - 2);
      } else if (currentPage === epilogueIndex) {
        renderFinalPage();
      }
      populatePhotoManagerGrid();
    }
  });

  // --- Photo Manager Modal & Backups ---
  function populatePhotoManagerGrid() {
    photoSlotGrid.innerHTML = '';
    const savedPhotos = getSavedPhotos();
    const chapters = getActiveChapters();

    const allSlots = [];
    chapters.forEach(ch => {
      (ch.photos || []).forEach(p => {
        allSlots.push({ ...p, person: ch.name });
      });
    });
    allSlots.push({
      ...window.BOOK_DATA.finalPage.photo,
      person: 'Epilogue'
    });

    allSlots.forEach(slot => {
      const currentImg = savedPhotos[slot.id] || slot.src;
      const card = document.createElement('div');
      card.className = 'photo-slot-card';

      const thumbHtml = currentImg 
        ? `<img src="${currentImg}" alt="${slot.label}">` 
        : `<span>📷</span>`;

      card.innerHTML = `
        <div class="photo-slot-thumb">
          ${thumbHtml}
        </div>
        <div class="photo-slot-info">
          <div class="photo-slot-label">${escapeHtml(slot.person)} · ${escapeHtml(slot.label)}</div>
          <div class="photo-slot-caption">${escapeHtml(slot.caption)}</div>
          <button class="photo-upload-btn" data-slot-id="${slot.id}">
            ${currentImg ? 'Replace Photo' : 'Choose Photo'}
          </button>
          ${currentImg ? `<button class="photo-clear-btn" data-clear-id="${slot.id}">Remove</button>` : ''}
        </div>
      `;

      card.querySelector('.photo-upload-btn').addEventListener('click', () => {
        triggerDirectUpload(slot.id);
      });

      const clearBtn = card.querySelector('.photo-clear-btn');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          removePhoto(slot.id);
          const epilogueIndex = getTotalPages() - 1;
          if (currentPage >= 2 && currentPage < epilogueIndex) {
            renderChapterSpread(currentPage - 2);
          } else if (currentPage === epilogueIndex) {
            renderFinalPage();
          }
          populatePhotoManagerGrid();
        });
      }

      photoSlotGrid.appendChild(card);
    });
  }

  // Backup & Restore Photos
  exportPhotosBtn.addEventListener('click', () => {
    const photos = getSavedPhotos();
    const blob = new Blob([JSON.stringify(photos, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shiva-keepsake-photos-backup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  importPhotosBtn.addEventListener('click', () => {
    importPhotosInput.value = '';
    importPhotosInput.click();
  });

  importPhotosInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const imported = JSON.parse(evt.target.result);
        if (typeof imported === 'object' && imported !== null) {
          const current = getSavedPhotos();
          Object.assign(current, imported);
          localStorage.setItem(STORAGE_PHOTOS_KEY, JSON.stringify(current));
          alert('Photos restored successfully!');
          updateView('none');
          populatePhotoManagerGrid();
        } else {
          alert('Invalid backup file format.');
        }
      } catch (err) {
        alert('Could not parse backup file.');
      }
    };
    reader.readAsText(file);
  });

  resetAllPhotosBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all uploaded photos back to placeholder frames?')) {
      clearAllPhotos();
      updateView('none');
      populatePhotoManagerGrid();
    }
  });

  // --- Letters & Memories Editor Modal ---
  function populateLettersEditor() {
    const chapters = getActiveChapters();
    lettersChapterSelect.innerHTML = '';

    chapters.forEach((ch, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = `${ch.number} · ${ch.name} (${ch.subtitle})`;
      lettersChapterSelect.appendChild(opt);
    });

    const addOpt = document.createElement('option');
    addOpt.value = 'new';
    addOpt.textContent = '➕ [Add New Keepsake Chapter / Memory]';
    lettersChapterSelect.appendChild(addOpt);

    // Default select current chapter if viewing one
    if (currentPage >= 2 && currentPage < getTotalPages() - 1) {
      lettersChapterSelect.value = (currentPage - 2);
    } else {
      lettersChapterSelect.value = 0;
    }

    loadSelectedChapterToEditor();
  }

  function loadSelectedChapterToEditor() {
    const val = lettersChapterSelect.value;
    const chapters = getActiveChapters();

    if (val === 'new') {
      const nextNum = (chapters.length + 1).toString().padStart(2, '0');
      editAuthorName.value = '';
      editSubtitle.value = '';
      editHighlight.value = '';
      editAnnotations.value = '';
      editLetterText.value = '';
      revertLetterBtn.style.display = 'none';
    } else {
      const ch = chapters[parseInt(val, 10)];
      if (ch) {
        editAuthorName.value = ch.name || '';
        editSubtitle.value = ch.subtitle || '';
        editHighlight.value = (ch.highlights && ch.highlights[0]) || '';
        editAnnotations.value = (ch.annotations || []).join(', ');
        editLetterText.value = ch.letterText || '';
        revertLetterBtn.style.display = 'inline-block';
      }
    }
  }

  lettersChapterSelect.addEventListener('change', loadSelectedChapterToEditor);

  addNewChapterBtn.addEventListener('click', () => {
    lettersChapterSelect.value = 'new';
    loadSelectedChapterToEditor();
    editAuthorName.focus();
  });

  saveLetterBtn.addEventListener('click', () => {
    const val = lettersChapterSelect.value;
    const chapters = [...getActiveChapters()];

    const author = editAuthorName.value.trim();
    const subtitle = editSubtitle.value.trim() || 'A sweet memory';
    const highlight = editHighlight.value.trim();
    const annotations = editAnnotations.value.split(',').map(s => s.trim()).filter(Boolean);
    const letter = editLetterText.value;

    if (!author) {
      alert('Please enter an Author or Person name!');
      editAuthorName.focus();
      return;
    }

    if (val === 'new') {
      const newNum = (chapters.length + 1).toString().padStart(2, '0');
      const newId = author.toLowerCase().replace(/[^a-z0-9]/g, '-') || `ch-${newNum}`;
      const newChapter = {
        id: newId,
        number: newNum,
        name: author.toUpperCase(),
        displayName: author,
        subtitle: subtitle,
        motifs: ['memory', 'love'],
        annotations: annotations.length > 0 ? annotations : ['cherished memory', 'forever friend'],
        highlights: highlight ? [highlight] : [],
        photos: [
          {
            id: `${newId}-photo-1`,
            label: `${author.toUpperCase()} PHOTO 1`,
            caption: subtitle,
            src: ''
          }
        ],
        letterText: letter
      };
      chapters.push(newChapter);
    } else {
      const idx = parseInt(val, 10);
      const existing = chapters[idx];
      existing.name = author.toUpperCase();
      existing.displayName = author;
      existing.subtitle = subtitle;
      if (highlight) existing.highlights = [highlight];
      existing.annotations = annotations;
      existing.letterText = letter;
    }

    saveCustomLetters(chapters);
    setupTableOfContents();
    setupChapterDots();
    populateLettersEditor();
    populatePhotoManagerGrid();
    updateView('none');

    triggerConfetti();
    alert('Letter saved successfully!');
  });

  revertLetterBtn.addEventListener('click', () => {
    if (confirm('Revert all letters back to the original manuscript?')) {
      revertCustomLetters();
      setupTableOfContents();
      setupChapterDots();
      populateLettersEditor();
      populatePhotoManagerGrid();
      updateView('none');
      alert('Reverted to original letters!');
    }
  });

  exportLettersJsonBtn.addEventListener('click', () => {
    const chapters = getActiveChapters();
    const blob = new Blob([JSON.stringify(chapters, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shiva-book-data-backup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  importLettersJsonBtn.addEventListener('click', () => {
    importLettersInput.value = '';
    importLettersInput.click();
  });

  importLettersInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const imported = JSON.parse(evt.target.result);
        if (Array.isArray(imported)) {
          saveCustomLetters(imported);
          setupTableOfContents();
          setupChapterDots();
          populateLettersEditor();
          updateView('none');
          alert('Letters imported successfully!');
        } else {
          alert('Invalid JSON structure for chapters.');
        }
      } catch (err) {
        alert('Could not parse JSON file.');
      }
    };
    reader.readAsText(file);
  });

  copyLettersCodeBtn.addEventListener('click', () => {
    const chapters = getActiveChapters();
    const code = `window.BOOK_DATA.chapters = ${JSON.stringify(chapters, null, 2)};`;
    navigator.clipboard.writeText(code).then(() => {
      alert('Code copied! You can now paste this directly into letters-data.js.');
    }).catch(() => {
      alert('Could not copy code automatically.');
    });
  });

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

  // --- Modals Management ---
  function openTocModal() { tocModal.classList.add('active'); }
  function closeTocModal() { tocModal.classList.remove('active'); }

  function openPhotosModal() {
    populatePhotoManagerGrid();
    photosModal.classList.add('active');
  }
  function closePhotosModal() { photosModal.classList.remove('active'); }

  function openLettersModal() {
    populateLettersEditor();
    lettersModal.classList.add('active');
  }
  function closeLettersModal() { lettersModal.classList.remove('active'); }

  function openShortcutsModal() { shortcutsModal.classList.add('active'); }
  function closeShortcutsModal() { shortcutsModal.classList.remove('active'); }

  openTocBtn.addEventListener('click', openTocModal);
  closeTocModalBtn.addEventListener('click', closeTocModal);
  tocModal.addEventListener('click', (e) => { if (e.target === tocModal) closeTocModal(); });

  openPhotosBtn.addEventListener('click', openPhotosModal);
  closePhotosModalBtn.addEventListener('click', closePhotosModal);
  photosModal.addEventListener('click', (e) => { if (e.target === photosModal) closePhotosModal(); });

  openLettersBtn.addEventListener('click', openLettersModal);
  closeLettersModalBtn.addEventListener('click', closeLettersModal);
  lettersModal.addEventListener('click', (e) => { if (e.target === lettersModal) closeLettersModal(); });

  openShortcutsBtn.addEventListener('click', openShortcutsModal);
  closeShortcutsModalBtn.addEventListener('click', closeShortcutsModal);
  shortcutsModal.addEventListener('click', (e) => { if (e.target === shortcutsModal) closeShortcutsModal(); });

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

  // Ribbon Bookmark Interaction
  if (bookRibbon) {
    bookRibbon.addEventListener('click', () => {
      if (currentPage === 0) {
        goToPage(1, 'next'); // Go to TOC
      } else {
        goToPage(1, 'prev'); // Bookmark back to Contents
      }
    });
  }

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
      closePhotosModal();
      closeLettersModal();
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
    } else if (key === 'p') {
      e.preventDefault();
      openPhotosModal();
    } else if (key === 'l') {
      e.preventDefault();
      openLettersModal();
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
    applyAtmosphere(currentAtmosphere);
    setupTableOfContents();
    setupChapterDots();
    updateView('none');
    populatePhotoManagerGrid();
    initConfettiCanvas();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
