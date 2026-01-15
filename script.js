// --- CONFIG & STATE ---
// Apps Definition: Jetzt mit width (w) und height (h) in Pixeln statt Scale!
const apps = {
    blog: {
        id: 'win-blog', iconId: 'icon-blog', open: true,
        x: 42, y: 55, w: 700, h: 500 // Startgröße in Pixel
    },
    help: {
        id: 'win-help', iconId: 'icon-help', open: true,
        x: 75, y: 40, w: 320, h: 450
    },
    social: {
        id: 'win-social', iconId: 'icon-social', open: false, // Startet minimiert
        x: 20, y: 40, w: 400, h: 550
    },
    files: { id: 'win-files', iconId: 'icon-files', open: false, x: 50, y: 50, w: 500, h: 400 },
    term: {
        id: 'win-term', iconId: 'icon-term', open: false,
        x: 30, y: 30, w: 600, h: 400
    }
};

let activeApp = 'blog';
let windowStack = ['blog', 'help', 'social', 'files', 'term'];
let systemFocus = 'app';
let isMobile = false;
let selectedIconIndex = 0;
const iconKeys = ['blog', 'help', 'social', 'files', 'term'];

// Blog Data State
let posts = [];
let viewState = 'list';
let selectedPostIndex = 0;
let currentPostId = null;

// DOM Helpers
const listView = document.getElementById('list-view');
const postView = document.getElementById('post-view');

let socialPosts = [];
let selectedSocialIndex = 0;
let lastBottomPress = 0;

let searchQuery = ""; // Für die Suchleiste
let scrollHoverTimer = null;

// SOCIAL STATE UPDATE
let socialMode = 'list'; // 'list' (Scrollen) oder 'focus' (Im Post drin)
let socialFocusTarget = 'like'; // 'like' oder 'caption'
let expandedCaptions = {};

let filesData = []; // Hier landen die echten Files
let selectedFileIndex = 0; // Für die Navigation
const FILES_COLS = 4;
let blogFocusMode = 'read'; // 'read' (Text) oder 'files' (Anhänge)
let blogFileIndex = 0;

let currentDirStack = [];
let currentDirectory = [];
let currentPathStack = ['A:\\FILES'];

// --- INIT ---
function init() {
    checkMobile();
    window.addEventListener('resize', checkMobile);
    loadPosts();
    updateVisuals();
    renderSocial();
    runBootSequence();
    renderFiles();
}

function checkMobile() { isMobile = window.innerWidth <= 800; }

function runBootSequence() {
    const log = document.getElementById('boot-log');
    const bar = document.getElementById('progress-bar-fill');
    const txt = document.getElementById('progress-percent');
    const screen = document.getElementById('loading-screen');

    // Retro Log Nachrichten
    const messages = [
        "INITIALIZING KERNEL...",
        "CHECKING MEMORY: 640K OK",
        "LOADING DRIVERS...",
        "MOUNTING VIRTUAL DRIVE A:...",
        "READING POSTS.JSON...",
        "CONNECTING TO SOCIAL.EXE...",
        "DECRYPTING BLOG DATA...",
        "ESTABLISHING SECURE CONNECTION...",
        "SYSTEM 3615 READY."
    ];

    let progress = 0;
    let msgIndex = 0;

    // Funktion für jeden Schritt
    const interval = setInterval(() => {
        // Fortschritt erhöhen
        progress += Math.floor(Math.random() * 5) + 2; // Zufällig 2-7% dazu
        if (progress > 100) progress = 100;

        // UI Updates
        bar.style.width = `${progress}%`;
        txt.innerText = `${progress}%`;

        // Text hinzufügen (nicht bei jedem Tick, sondern alle ~10%)
        if (progress > (msgIndex * 12) && msgIndex < messages.length) {
            const line = document.createElement('div');
            line.className = 'log-line';
            line.innerText = `> ${messages[msgIndex]}`;
            log.appendChild(line);
            msgIndex++;
        }

        // FERTIG?
        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                // Ladescreen ausblenden
                screen.style.opacity = '0';
                setTimeout(() => {
                    screen.style.display = 'none';
                    // Visuelles Update der Apps erzwingen
                    updateVisuals();
                }, 500);
            }, 500); // Kurze Pause bei 100%
        }
    }, 50); // Geschwindigkeit der Animation
}

// --- FILE SYSTEM MOCK ---
const virtualFiles = [
    { id: 'f1', name: 'secret_plans.txt', type: 'TXT', size: '2KB' },
    { id: 'f2', name: 'profile_pic.bmp', type: 'IMG', size: '1.4MB' },
    { id: 'f3', name: 'virus.exe', type: 'BIN', size: '45KB' },
    { id: 'f4', name: 'passwords.log', type: 'LOG', size: '120B' }
];

function renderFiles() {
    const list = document.getElementById('file-list');
    list.innerHTML = '';

    // Sicherheits-Check für Index
    // Wir nutzen jetzt 'currentDirectory' statt 'filesData'
    // +1 rechnen wir, falls wir im Unterordner sind (wegen dem ".." Zurück-Button)
    const totalItems = currentDirectory.length + (currentDirStack.length > 0 ? 1 : 0);

    if (selectedFileIndex >= totalItems) selectedFileIndex = totalItems - 1;
    if (selectedFileIndex < 0) selectedFileIndex = 0;

    let renderIndex = 0;

    // 1. ZURÜCK-BUTTON (.., wenn wir nicht im Hauptverzeichnis sind)
    if (currentDirStack.length > 0) {
        const el = document.createElement('div');
        const isActive = (renderIndex === selectedFileIndex);
        el.className = `file-item ${isActive ? 'active-file' : ''}`;
        el.innerHTML = `
            <div class="file-icon">⤴️</div>
            <div class="file-name">..</div>
        `;
        el.onclick = () => { navigateUp(); };
        list.appendChild(el);
        renderIndex++;
    }

    // 2. DATEIEN & ORDNER RENDERN
    currentDirectory.forEach((file) => {
        // ICONS WÄHLEN
        let icon = '📄';
        if(file.type === 'IMG') icon = '🖼️';
        if(file.type === 'BIN') icon = '⚙️';
        if(file.type === 'PDF') icon = '📑';
        if(file.type === 'DIR') icon = '📁'; // Ordner Icon

        const isActive = (renderIndex === selectedFileIndex);

        const el = document.createElement('div');
        el.className = `file-item ${isActive ? 'active-file' : ''}`;

        // Ordner bekommen eine spezielle Klasse für CSS (optional)
        if (file.type === 'DIR') el.classList.add('is-folder');

        el.innerHTML = `
            <div class="file-icon">${icon}</div>
            <div class="file-name">${file.filename}</div>
        `;

        // KLICK LOGIK
        el.onclick = () => {
            selectedFileIndex = Array.from(list.children).indexOf(el);
            renderFiles();

            // Kurze Verzögerung für Doppelklick-Feeling
            setTimeout(() => {
                if (file.type === 'DIR') {
                    navigateDown(file);
                } else {
                    window.open(`files/${file.filepath || file.filename}`, '_blank');
                }
            }, 50);
        };

        list.appendChild(el);
        renderIndex++;
    });
}

function updatePathDisplay() {
    const el = document.getElementById('file-path-display');
    if (el) {
        // Wir verbinden die Teile mit Backslash für den Retro-Look
        el.innerText = currentPathStack.join('\\');
    }
}

async function loadPosts() {
    try {
        // 1. Posts laden
        const r1 = await fetch('posts.json');
        let rawPosts = await r1.json();

        // NEU: Sortieren nach ID absteigend (Höchste ID zuerst)
        // Damit musst du alte IDs nie ändern. Neue Posts einfach in der JSON unten anhängen.
        posts = rawPosts.sort((a, b) => b.id - a.id);

        renderBlogList();

        // 2. Social laden
        const r2 = await fetch('social.json');
        let rawSocial = await r2.json();
        socialPosts = rawSocial.map(post => {
            const savedLike = localStorage.getItem(`liked_${post.id}`);
            if (savedLike === 'true') { post.likedByMe = true; post.likes++; }
            return post;
        });
        renderSocial();

        // 3. Files laden
        const r3 = await fetch('files.json');
        filesData = await r3.json();

        currentDirectory = filesData;

        // RESET: Immer bei A:\FILES starten
        currentPathStack = ['A:\\FILES'];
        updatePathDisplay();

        renderFiles();

    } catch (e) {
        console.error("DATA LOAD ERROR:", e);
    }
}

// --- RENDERING ---
function renderBlogList() {

    const headerCount = document.getElementById('blog-header-count');
    if (headerCount) {
        headerCount.innerText = `${posts.length} T`;
    }

    viewState = 'list';
    postView.style.display = 'none';

    // HAUPT-LAYOUT
    listView.style.display = 'flex';
    listView.style.flexDirection = 'column';
    listView.style.height = '100%';
    listView.style.overflow = 'hidden';

    // 1. FILTERN
    const filtered = posts.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));

    // Index Absicherung
    if (filtered.length > 0) {
        if (selectedPostIndex >= filtered.length) selectedPostIndex = filtered.length - 1;
        if (selectedPostIndex < 0) selectedPostIndex = 0;
    }

    // --- NEUES LAYOUT AUFBAUEN ---

    // A. DER FIXED HEADER (Bereinigt)
    // Kein Border mehr, kein "Index"-Text mehr. Nur die Suche.
    let headerHTML = `
        <div style="flex-shrink: 0; background: var(--bg-color); z-index: 20;">
            <div class="search-bar" onclick="activateMobileSearch()">
                SUCHE: ${searchQuery}<span class="search-cursor">_</span>
            </div>
        </div>
    `;

    // B. DER SCROLLBARE BEREICH
    const scrollContainer = document.createElement('div');
    scrollContainer.id = 'blog-scroll-area';
    scrollContainer.style.flexGrow = '1';
    scrollContainer.style.overflowY = 'auto';
    scrollContainer.style.minHeight = '0';
    scrollContainer.style.paddingTop = '0px';

    // Inhalt der Liste generieren
    if (filtered.length === 0) {
        scrollContainer.innerHTML = "<div style='padding-top:10px;'>KEINE ERGEBNISSE.</div>";
    } else {
        filtered.forEach((post, index) => {
            const div = document.createElement('div');
            div.className = `post-item ${index === selectedPostIndex ? 'active' : ''}`;

            div.innerHTML = `<span>${post.title}</span><span class="dots-filler"></span><span>${post.date}</span>`;

            const originalIndex = posts.indexOf(post);
            div.onclick = () => { selectedPostIndex = index; openBlogPost(originalIndex); };

            scrollContainer.appendChild(div);
        });

        // Spacer unten
        const spacer = document.createElement('div');
        spacer.style.minHeight = "60px";
        scrollContainer.appendChild(spacer);
    }

    // ZUSAMMENBAUEN
    listView.innerHTML = headerHTML;
    listView.appendChild(scrollContainer);

    // AUTO-SCROLLING
    const activeEl = scrollContainer.querySelector('.post-item.active');
    if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'auto', block: 'nearest' });
    }
}

// --- NEUE FUNKTION FÜR WEICHES SCROLLEN ---
function updateBlogSelection() {
    // 1. Container finden
    const scrollContainer = document.getElementById('blog-scroll-area');
    if (!scrollContainer) return;

    // 2. Alle Items holen (Das sind die, die gerade sichtbar/gefiltert sind)
    const items = scrollContainer.querySelectorAll('.post-item');

    // 3. Klassen tauschen (Active setzen)
    items.forEach((el, idx) => {
        if (idx === selectedPostIndex) {
            el.classList.add('active');

            // 4. NUR das aktive Element scrollen (Weich!)
            // block: 'nearest' sorgt dafür, dass nur minimal gescrollt wird
            el.scrollIntoView({ behavior: 'auto', block: 'nearest' });

        } else {
            el.classList.remove('active');
        }
    });
}

function openBlogPost(index) {
    viewState = 'post';
    currentPostId = index;
    selectedPostIndex = index;

    // 1. STATE RESET (Aggressiv)
    blogFocusMode = 'read'; // Wir fangen IMMER im Lese-Modus an
    blogFileIndex = 0;      // Dateiauswahl zurücksetzen

    listView.style.display = 'none';
    postView.style.display = 'block';

    // FIX: Scrollposition sofort nach oben setzen
    postView.scrollTop = 0;

    const post = posts[index];

    const headerCount = document.getElementById('blog-header-count');
    if (headerCount) {
        const displayId = String(post.id).padStart(2, '0');
        headerCount.innerText = `B ${displayId}`;
    }

    // START HTML GENERIERUNG
    let html = `
        <div class="post-nav">
            <span class="nav-btn" onclick="renderBlogList()">[ ← BACK ]</span>
        </div>

        <div class="meta-row"><span class="label">TITEL:</span><span class="value">${post.title}</span></div>
        <div class="meta-row"><span class="label">ORT:</span><span class="value">${post.location}</span></div>
        
        <div class="post-body">${post.content}</div>
    `;

    // ANHÄNGE (FILES) LOGIK
    if (post.files && post.files.length > 0) {
        html += `<div class="attachment-section"><span class="attachment-label">ATTACHMENTS:</span>`;

        post.files.forEach((fileName, idx) => { // idx nutzen für IDs
            const meta = filesData.find(f => f.filename === fileName) || { type: 'UNK', size: '?' };

            let icon = '📄';
            if(meta.type === 'IMG') icon = '🖼️';
            if(meta.type === 'PDF') icon = '📑';

            // WICHTIG: Die Klasse 'active-file' darf hier NICHT gesetzt werden!
            html += `
                <a href="files/${fileName}" target="_blank" class="attachment-file" id="att-file-${idx}">
                    <span style="font-size:1.2rem;">${icon}</span>
                    <span style="flex-grow:1;">${fileName}</span>
                    <span style="opacity:0.6;">[${meta.size}]</span>
                    <span>↗</span>
                </a>
            `;
        });
        html += `</div>`;
    }

    postView.innerHTML = html;

    updateAttachmentHighlight();
    updateBackHighlight();
}

// --- SYSTEM VISUALS ENGINE ---
function updateVisuals() {
    // --- NEU: STACK AKTUALISIEREN ---
    // Das aktive Fenster ans Ende der Liste schieben (damit es den höchsten Index bekommt)
    if (activeApp) {
        windowStack = windowStack.filter(app => app !== activeApp);
        windowStack.push(activeApp);
    }

    // 1. Icons (DEIN ORIGINAL CODE)
    iconKeys.forEach((key, idx) => {
        const el = document.getElementById(apps[key].iconId);
        if (el) {
            if (systemFocus === 'desktop' && idx === selectedIconIndex) el.classList.add('selected');
            else el.classList.remove('selected');
        }
    });

    // 2. Windows Management (DEIN ORIGINAL CODE + Z-INDEX)
    for (const [key, app] of Object.entries(apps)) {
        const win = document.getElementById(app.id);

        // KORREKTUR: Zuerst die Klassen setzen, DANN prüfen ob offen/zu.
        if (activeApp === key && systemFocus === 'app') {
            win.classList.add('active');
            win.classList.remove('inactive');
        } else {
            win.classList.remove('active');
            win.classList.add('inactive');
        }

        // Jetzt Sichtbarkeit regeln
        if (!app.open) {
            win.style.display = 'none';
            continue;
        }

        win.style.display = 'flex';

        // --- NEU: Z-INDEX BASIEREND AUF STACK ---
        // Wir suchen die Position im Stack und rechnen +20 (Basis-Level)
        const stackIndex = windowStack.indexOf(key);
        if (stackIndex !== -1) {
            // Das sorgt dafür, dass auch inaktive Fenster korrekt übereinander liegen
            win.style.zIndex = 20 + stackIndex;
        }

        // Desktop Positionierung (DEIN ORIGINAL CODE - UNVERÄNDERT)
        win.style.left = `${app.x}%`;
        win.style.top = `${app.y}%`;
        win.style.width = `${app.w}px`;
        win.style.height = `${app.h}px`;
        win.style.transform = `translate(-50%, -50%)`;
    }

    const termInput = document.getElementById('term-input');

    // 1. TERMINAL IST AKTIV: Fokus reinsetzen
    if (activeApp === 'term' && apps.term.open && systemFocus === 'app') {
        setTimeout(() => {
            if (termInput) termInput.focus();
        }, 10);
    }
    // 2. TERMINAL IST NICHT AKTIV: Fokus RAUSWERFEN (Blur)
    else {
        if (termInput) {
            termInput.blur(); // Das entfernt den blinkenden Cursor
        }
    }
}

// --- INPUT HANDLER ---
document.addEventListener('keydown', (e) => {
    if (isMobile) return handleMobileInput(e);

    // 1. GLOBAL HOTKEYS (Space, Tab...)
    if (e.code === 'Space' && (e.ctrlKey || e.metaKey || e.altKey)) {
        e.preventDefault();

        // Modus wechseln
        systemFocus = (systemFocus === 'app') ? 'desktop' : 'app';

        // WICHTIG: Wenn wir zum Desktop gehen, Fokus von Inputs entfernen!
        if (systemFocus === 'desktop') {
            document.activeElement.blur();
        }

        updateVisuals();
        return;
    }

    if (e.code === 'Tab' && systemFocus === 'app') {
        e.preventDefault();
        const keys = Object.keys(apps);
        let idx = keys.indexOf(activeApp);
        for(let i=0; i<keys.length; i++) {
            idx = (idx + 1) % keys.length;
            if(apps[keys[idx]].open) { activeApp = keys[idx]; updateVisuals(); return; }
        }
        return;
    }

    // -------------------------------------------------------------
    // HIERHIN VERSCHOBEN: 4. WINDOW COMMANDS (CMD + ...)
    // System-Befehle haben jetzt Vorrang vor der Suche!
    // -------------------------------------------------------------
    if (systemFocus === 'app' && (e.metaKey || e.ctrlKey)) {

        // CLOSE (CMD + BACKSPACE)
        if (e.key === 'Backspace') {
            e.preventDefault();
            if (window.closeApp) {
                window.closeApp(activeApp);
            }
            return;
        }

        // --- RESIZE & MOVE LOGIK ---
        const app = apps[activeApp];
        if (!app || !app.open) return;

        // Resize Modus (CMD + ALT + ARROWS)
        if (e.altKey) {
            e.preventDefault();
            const step = 20;
            if (e.key === 'ArrowRight') app.w += step;
            if (e.key === 'ArrowLeft')  app.w = Math.max(300, app.w - step);
            if (e.key === 'ArrowDown')  app.h += step;
            if (e.key === 'ArrowUp')    app.h = Math.max(200, app.h - step);
            updateVisuals();
            return;
        }

        // Move Modus (NUR CMD + ARROWS)
        if (!e.altKey && !e.shiftKey && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
            e.preventDefault();
            if (e.key === 'ArrowRight') app.x = Math.min(95, app.x + 2);
            if (e.key === 'ArrowLeft')  app.x = Math.max(5, app.x - 2);
            if (e.key === 'ArrowUp')    app.y = Math.max(5, app.y - 2);
            if (e.key === 'ArrowDown')  app.y = Math.min(95, app.y + 2);
            updateVisuals();
            return;
        }

        // Proportional Resize (CMD + +/-)
        const resizeStep = 20;
        if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') {
            e.preventDefault();
            app.w += resizeStep;
            app.h += resizeStep;
            updateVisuals();
            return;
        }
        if (e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract') {
            e.preventDefault();
            app.w = Math.max(300, app.w - resizeStep);
            app.h = Math.max(200, app.h - resizeStep);
            updateVisuals();
            return;
        }
    }
    // -------------------------------------------------------------


    // 2. SUCHE (Tippen abfangen)
    // Jetzt wird Backspace hier nur noch ausgeführt, wenn KEIN CMD gedrückt ist,
    // weil der CMD-Block oben das Event schon abgefangen hat.
    if (systemFocus === 'app' && (activeApp === 'blog' || activeApp === 'social')) {
        const isNavKey = e.key.length > 1 || e.ctrlKey || e.metaKey || e.altKey;

        if (!isNavKey && !(activeApp === 'social' && socialMode === 'focus')) {
            searchQuery += e.key;
            if(activeApp === 'blog') renderBlogList(); else renderSocial();
            return;
        }
        if (e.key === 'Backspace') {
            searchQuery = searchQuery.slice(0, -1);
            if(activeApp === 'blog') renderBlogList(); else renderSocial();
            return;
        }
    }

    // 3. DESKTOP MODE
    if (systemFocus === 'desktop') {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') selectedIconIndex = (selectedIconIndex + 1) % iconKeys.length;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') selectedIconIndex = (selectedIconIndex - 1 + iconKeys.length) % iconKeys.length;
        if (e.key === 'Enter') {
            const appKey = iconKeys[selectedIconIndex];
            apps[appKey].open = true;
            activeApp = appKey;
            systemFocus = 'app';
        }
        updateVisuals();
        return;
    }

    // 5. APP CONTENT NAVIGATION
    if (systemFocus === 'app') {

        // --- BLOG ---
        if (activeApp === 'blog') {
            // WICHTIG: Enter muss jetzt das gefilterte Ergebnis öffnen
            if (e.key === 'Enter' && viewState === 'list') {
                const filtered = posts.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
                const post = filtered[selectedPostIndex];
                if(post) openBlogPost(posts.indexOf(post));
                return;
            }
            // Standard Navigation aufrufen
            handleBlogNav(e);
        }

        // --- HELP ---
        if (activeApp === 'help') {
            e.preventDefault();
            const hs = document.getElementById('help-screen');
            if (e.key === 'ArrowDown') hs.scrollTop += 30;
            if (e.key === 'ArrowUp') hs.scrollTop -= 30;
        }

        // --- SOCIAL (NEUE LOGIK) ---
        if (activeApp === 'social') {
            e.preventDefault();

            // LIST MODE
            if (socialMode === 'list') {
                if (e.key === 'ArrowDown') {
                    const filtered = socialPosts.filter(p => p.user.includes(searchQuery));
                    if (selectedSocialIndex < filtered.length - 1) selectedSocialIndex++;
                    renderSocial();
                }
                if (e.key === 'ArrowUp') {
                    if (selectedSocialIndex > 0) selectedSocialIndex--;
                    renderSocial();
                }
                if (e.key === 'Enter') {
                    socialMode = 'focus';
                    socialFocusTarget = 'like';
                    renderSocial();
                }
            }
            // FOCUS MODE (Buttons)
            else if (socialMode === 'focus') {
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                    socialFocusTarget = (socialFocusTarget === 'like') ? 'caption' : 'like';
                    renderSocial();
                }
                if (e.key === 'Enter') {
                    const filtered = socialPosts.filter(p => p.user.includes(searchQuery));
                    const post = filtered[selectedSocialIndex];
                    if (socialFocusTarget === 'like') {
                        if (!post.likedByMe) {
                            post.likes++; post.likedByMe = true;
                            localStorage.setItem(`liked_${post.id}`, 'true');
                        } else {
                            post.likes--; post.likedByMe = false;
                            localStorage.removeItem(`liked_${post.id}`);
                        }
                    } else if (socialFocusTarget === 'caption') {
                        expandedCaptions[post.id] = !expandedCaptions[post.id];
                    }
                    renderSocial();
                }
                if (e.key === 'Escape') {
                    socialMode = 'list'; renderSocial();
                }
            }
        }

        // --- FILES APP NAVIGATION ---
        if (activeApp === 'files') {
            e.preventDefault();

            // 1. WIE VIELE ITEMS SEHEN WIR?
            // Wir müssen prüfen, ob der ".." Button da ist (Stack > 0)
            const hasParent = currentDirStack.length > 0;
            // Die echte Anzahl an sichtbaren Icons: Inhalt + 1 (wenn ".." da ist)
            const totalItems = currentDirectory.length + (hasParent ? 1 : 0);

            // NAVIGATION RECHTS
            if (e.key === 'ArrowRight') {
                if (selectedFileIndex < totalItems - 1) {
                    selectedFileIndex++;
                    renderFiles();
                }
            }

            // NAVIGATION LINKS
            if (e.key === 'ArrowLeft') {
                if (selectedFileIndex > 0) {
                    selectedFileIndex--;
                    renderFiles();
                }
            }

            // NAVIGATION RUNTER (Grid Logic: +4)
            if (e.key === 'ArrowDown') {
                if (selectedFileIndex + FILES_COLS < totalItems) {
                    selectedFileIndex += FILES_COLS;
                } else {
                    // Optional: Zum letzten Element springen, wenn man "ins Leere" drückt
                    selectedFileIndex = totalItems - 1;
                }
                renderFiles();
            }

            // NAVIGATION HOCH (Grid Logic: -4)
            if (e.key === 'ArrowUp') {
                if (selectedFileIndex - FILES_COLS >= 0) {
                    selectedFileIndex -= FILES_COLS;
                } else {
                    selectedFileIndex = 0;
                }
                renderFiles();
            }

            // ENTER: DATEI ÖFFNEN ODER ORDNER BETRETEN
            if (e.key === 'Enter') {
                // Fall A: ".." (Zurück) ausgewählt
                // Das ist IMMER Index 0, wenn wir in einem Unterordner sind
                if (hasParent && selectedFileIndex === 0) {
                    navigateUp();
                    return;
                }

                // Fall B: Echtes Item (Index umrechnen, falls ".." davor steht)
                const realIndex = hasParent ? selectedFileIndex - 1 : selectedFileIndex;
                const file = currentDirectory[realIndex];

                if (file) {
                    if (file.type === 'DIR') {
                        // -> Ordner betreten
                        navigateDown(file);
                    } else {
                        // -> Datei öffnen
                        // FIX: Wir nutzen 'filepath' (aus dem Generator), damit der Pfad stimmt!
                        // Fallback auf filename, falls filepath fehlt.
                        const path = file.filepath || file.filename;

                        // replace backslashes (falls Windows Pfad) zur Sicherheit
                        const safePath = path.replace(/\\/g, '/');

                        window.open(`files/${safePath}`, '_blank');
                    }
                }
            }

            // BACKSPACE: ZURÜCK NAVIGIEREN
            if (e.key === 'Backspace') {
                if (currentDirStack.length > 0) {
                    e.preventDefault(); // App nicht schließen
                    navigateUp();
                    return;
                }
                // Wenn wir im Hauptverzeichnis sind, greift die normale "Close App" Logik weiter oben
            }
        }

        if (activeApp === 'term') {
            const termInput = document.getElementById('term-input');
            const termScreen = document.getElementById('term-screen');

            // 1. SCROLLING (Option + Pfeile)
            // e.altKey entspricht der "Option"-Taste auf Mac und "Alt" auf Windows
            if (e.altKey) {
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    termScreen.scrollTop -= 20; // Hoch scrollen (Zeilenweise)
                    return;
                }
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    termScreen.scrollTop += 20; // Runter scrollen
                    return;
                }
            }

            // 2. FORCE FOCUS (Immer tippen können)
            // Wir prüfen, ob es eine normale Taste ist (kein Strg/Cmd Befehl)
            if (!e.ctrlKey && !e.metaKey && !e.altKey) {
                // Wenn wir nicht gerade Text im Terminal markieren (zum Kopieren),
                // dann Fokus sofort zurück in den Input zwingen!
                if (document.activeElement !== termInput) {
                    termInput.focus();
                }
            }
        }


    }
});

function handleBlogNav(e) {
    if (viewState === 'post') {
        const view = document.getElementById('post-view');
        const post = posts[currentPostId];
        const hasFiles = post.files && post.files.length > 0;

        // --- 1. MODUS: BACK BUTTON (Ganz oben) ---
        if (blogFocusMode === 'back') {
            e.preventDefault();
            if (e.key === 'Enter') { renderBlogList(); return; }
            if (e.key === 'ArrowDown') { blogFocusMode = 'read'; updateBackHighlight(); return; }
            if (e.key === 'Escape') { blogFocusMode = 'read'; updateBackHighlight(); return; }
            return;
        }

        // --- 2. MODUS: DATEI-AUSWAHL (Files) ---
        if (blogFocusMode === 'files') {
            const count = post.files.length;
            e.preventDefault();

            // PFEIL RUNTER
            if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                if (blogFileIndex < count - 1) {
                    blogFileIndex++;
                    updateAttachmentHighlight();
                }
                return;
            }

            // PFEIL HOCH (FIXED: Kein Springen mehr!)
            if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                if (blogFileIndex > 0) {
                    blogFileIndex--;
                    updateAttachmentHighlight();
                } else {
                    // WIR SIND BEI DATEI 1 -> ZURÜCK ZUM TEXT!
                    blogFocusMode = 'read';
                    updateAttachmentHighlight();

                    // --- FIX 1: Sanftes Scrollen statt Sprung ans Ende ---
                    // Wir gehen einfach 30px nach oben, das wirkt nahtlos.
                    view.scrollTop -= 30;
                }
                return;
            }

            if (e.key === 'Enter') {
                const links = document.querySelectorAll('.attachment-file');
                if(links[blogFileIndex]) links[blogFileIndex].click();
            }

            if (e.key === 'Escape') {
                blogFocusMode = 'read';
                updateAttachmentHighlight();
            }
            return;
        }

        // --- 3. MODUS: LESEN (Standard / Text Scrollen) ---

        const activateScrollProtection = () => {
            view.classList.add('keyboard-scrolling');
            clearTimeout(scrollHoverTimer);
            scrollHoverTimer = setTimeout(() => {
                view.classList.remove('keyboard-scrolling');
            }, 500);
        };

        // PFEIL HOCH
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            activateScrollProtection();

            if (view.scrollTop <= 5) {
                blogFocusMode = 'back';
                updateBackHighlight();
            } else {
                view.scrollTop -= 30;
            }
            return;
        }

        // PFEIL RUNTER
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activateScrollProtection();

            let shouldSwitchToFiles = false;

            if (hasFiles) {
                const attachSection = view.querySelector('.attachment-section');

                if (attachSection) {
                    // 1. Positionen berechnen
                    const attachRect = attachSection.getBoundingClientRect();
                    const viewRect = view.getBoundingClientRect();

                    // --- FIX 2: BESSERE SICHTBARKEITS-LOGIK ---
                    // Wir prüfen: Ist die OBERKANTE (Top) der Attachments im sichtbaren Bereich?
                    // Wir ziehen 50px ab, damit man nicht sofort wechselt, wenn nur 1 Pixel zu sehen ist.
                    // Sobald ca. eine Zeile der Attachments sichtbar ist, erlauben wir den Wechsel.
                    const isVisible = (attachRect.top <= viewRect.bottom - 50);

                    // Backup: Sind wir technisch am Ende?
                    const isAtBottom = (view.scrollTop + view.clientHeight >= view.scrollHeight - 5);

                    if (isVisible || isAtBottom) {
                        shouldSwitchToFiles = true;
                    }
                }
            }

            if (shouldSwitchToFiles) {
                // MODUS WECHSELN
                blogFocusMode = 'files';
                blogFileIndex = 0;

                // Sanft hinscrollen, damit es sauber aussieht
                const attachSection = view.querySelector('.attachment-section');
                if(attachSection) attachSection.scrollIntoView({behavior:'smooth', block: 'nearest'});

                updateAttachmentHighlight();
            } else {
                // Normal Scrollen
                view.scrollTop += 30;
            }
            return;
        }

        if (e.key === 'ArrowRight') { e.preventDefault(); openBlogPost((currentPostId + 1) % posts.length); return; }
        if (e.key === 'ArrowLeft') { e.preventDefault(); openBlogPost((currentPostId - 1 + posts.length) % posts.length); return; }
        if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); renderBlogList(); return; }
    }

    // List View Navigation (Original Code)
    if (viewState === 'list') {
        if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code)) e.preventDefault();
        const currentItemsCount = document.querySelectorAll('#blog-scroll-area .post-item').length;

        if (e.key === 'ArrowDown') {
            if (selectedPostIndex < currentItemsCount - 1) { selectedPostIndex++; updateBlogSelection(); }
        } else if (e.key === 'ArrowUp') {
            if (selectedPostIndex > 0) { selectedPostIndex--; updateBlogSelection(); }
        } else if (e.key === 'Enter') {
            const scrollContainer = document.getElementById('blog-scroll-area');
            const items = scrollContainer.querySelectorAll('.post-item');
            const activeItem = items[selectedPostIndex];
            if(activeItem) {
                const titleText = activeItem.querySelector('span').innerText;
                const realPostIndex = posts.findIndex(p => p.title.toUpperCase() === titleText);
                if(realPostIndex !== -1) openBlogPost(realPostIndex);
            }
        }
    }
}

function handleMobileInput(e) {
    // BLOG LOGIK
    if (activeApp === 'blog') {
        if (viewState === 'list') {
            // 1. Filtern (damit wir wissen, was der User gerade sieht)
            const filtered = posts.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));

            // Wenn Liste leer, mach nichts
            if (filtered.length === 0) return;

            // 2. Index im Rahmen halten (falls durch Filterung der Index zu hoch war)
            if (selectedPostIndex >= filtered.length) selectedPostIndex = 0;

            // 3. Navigation innerhalb der GEFILTERTEN Liste
            if (e.key === 'ArrowDown') {
                selectedPostIndex = (selectedPostIndex + 1) % filtered.length;
                renderBlogList();
            }
            if (e.key === 'ArrowUp') {
                selectedPostIndex = (selectedPostIndex - 1 + filtered.length) % filtered.length;
                renderBlogList();
            }

            // 4. Enter öffnet das RICHTIGE Ergebnis (Mapping zurück zum Original)
            if (e.key === 'Enter') {
                const post = filtered[selectedPostIndex];
                if(post) openBlogPost(posts.indexOf(post));
            }
        } else {
            // Im Post-View: Escape geht zurück
            if (e.key === 'Escape') renderBlogList();
        }
    }
}

// --- SOCIAL ACTIONS (Für Mobile Click & Desktop) ---
function toggleSocialLike(dataIndex, uiIndex) {
    // Wir brauchen zwei Indizes:
    // dataIndex = Welcher Post ist es im Speicher (socialPosts)?
    // uiIndex = An welcher Stelle steht er gerade auf dem Bildschirm (wichtig bei Suche)?

    const post = socialPosts[dataIndex];
    if (!post) return;

    // 1. Data Update
    if (!post.likedByMe) {
        post.likes++;
        post.likedByMe = true;
        localStorage.setItem(`liked_${post.id}`, 'true');
    } else {
        post.likes--;
        post.likedByMe = false;
        localStorage.removeItem(`liked_${post.id}`);
    }

    // 2. UI Fokus setzen (damit der Post aktiv bleibt)
    selectedSocialIndex = uiIndex;
    socialMode = 'focus';

    // 3. Neu zeichnen
    renderSocial();
}

function toggleSocialCaption(dataIndex, uiIndex) {
    const post = socialPosts[dataIndex];
    if (!post) return;

    // 1. Caption Toggle
    if (expandedCaptions[post.id]) {
        delete expandedCaptions[post.id];
    } else {
        expandedCaptions[post.id] = true;
    }

    // 2. UI Fokus
    selectedSocialIndex = uiIndex;
    socialMode = 'focus';

    renderSocial();
}

function renderSocial() {
    const screen = document.getElementById('social-screen');

    screen.innerHTML = `
        <div class="search-bar" onclick="activateMobileSearch()">
            FILTER: ${searchQuery}<span class="search-cursor">_</span>
        </div>
    `;

    const filtered = socialPosts.filter(p => p.user.includes(searchQuery) || p.caption.includes(searchQuery));

    if (filtered.length === 0) { screen.innerHTML += "<div>LEER.</div>"; return; }
    if (selectedSocialIndex >= filtered.length) selectedSocialIndex = filtered.length - 1;

    filtered.forEach((post, index) => {
        const isActive = index === selectedSocialIndex;
        const isFocus = isActive && socialMode === 'focus';
        const isExpanded = expandedCaptions[post.id];

        // Daten-Index finden (wichtig für Klicks, wenn Filter aktiv ist)
        const originalIndex = socialPosts.indexOf(post);

        const likeText = post.likedByMe ? "LIKE" : "LIKE";
        const descText = isExpanded ? "CLOSE" : "DESC";

        // --- LOGIK ÄNDERUNG HIER ---
        let likeClass = '';
        let descClass = '';

        if (isMobile) {
            // MOBILE: Blau markieren basierend auf STATUS (Geliked / Offen)
            if (post.likedByMe) likeClass = 'selected-btn';
            if (isExpanded) descClass = 'selected-btn';
        } else {
            // DESKTOP: Blau markieren basierend auf FOKUS (Cursor Position)
            // (So bleibt die Tastatur-Steuerung logisch)
            if (isFocus && socialFocusTarget === 'like') likeClass = 'selected-btn';
            if (isFocus && socialFocusTarget === 'caption') descClass = 'selected-btn';
        }
        // ---------------------------

        const div = document.createElement('div');
        div.className = `social-post ${isActive ? 'active-post' : ''} ${isFocus ? 'interaction-mode' : ''}`;

        div.innerHTML = `
            <div class="social-header"><span>@${post.user}</span><span>ID:${post.id}</span></div>
            <div class="ascii-pic"><pre>${post.art}</pre></div>
            <div class="social-actions">
                <span class="action-btn ${likeClass}" onclick="toggleSocialLike(${originalIndex}, ${index}); event.stopPropagation();">[${likeText} ${post.likes}]</span>
                <span class="action-btn ${descClass}" onclick="toggleSocialCaption(${originalIndex}, ${index}); event.stopPropagation();">[${descText}]</span>
            </div>
            <div class="social-caption ${isExpanded ? 'expanded' : ''}">${post.caption}</div>
        `;

        // Touch auf den ganzen Post setzt den Fokus (für Scrolling etc.)
        div.onclick = () => {
            selectedSocialIndex = index;
            socialMode = 'focus';
            renderSocial();
        };
        screen.appendChild(div);
    });

    const activeEl = screen.children[selectedSocialIndex + 1];
    if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Mobile Touch
let touchStartX = 0;
document.addEventListener('touchstart', e => touchStartX = e.changedTouches[0].screenX);

document.addEventListener('touchend', e => {
    if (activeApp === 'blog' && viewState === 'post') {
        let endX = e.changedTouches[0].screenX;

        // SWIPE LOGIK
        if (endX < touchStartX - 50) { // Swipe Links -> Nächster Post
            let next = (currentPostId + 1) % posts.length;

            // FIX: Kleine Verzögerung oder direkter Aufruf,
            // aber wir verhindern Events auf dem neuen Inhalt
            e.preventDefault();
            e.stopPropagation();

            selectedPostIndex = next;
            openBlogPost(next);
        }
        if (endX > touchStartX + 50) { // Swipe Rechts -> Vorheriger Post
            let prev = (currentPostId - 1 + posts.length) % posts.length;

            e.preventDefault();
            e.stopPropagation();

            selectedPostIndex = prev;
            openBlogPost(prev);
        }
    }
});
document.querySelector('#win-blog header').addEventListener('click', () => { if(viewState === 'post') renderBlogList(); });

// --- MOBILE HELPER ---

// --- MOBILE APP SWITCHER ---
function switchMobileApp(appName) {
    // 1. State setzen
    activeApp = appName;
    systemFocus = 'app'; // Sicherstellen, dass der Fokus stimmt

    // 2. Tabs aktualisieren (Visuell)
    document.querySelectorAll('.mobile-tab').forEach(el => el.classList.remove('active'));
    const activeTab = document.getElementById(`tab-${appName}`);
    if (activeTab) activeTab.classList.add('active');

    // 3. Logic: Wir müssen sicherstellen, dass die gewählte App "open" ist
    // Auf Mobile tun wir so, als wäre NUR diese App offen
    Object.keys(apps).forEach(key => {
        apps[key].open = (key === appName);
    });

    // 4. Alles neu zeichnen
    updateVisuals();
}

// 2. Suche aktivieren (Tastatur hochfahren)
function activateMobileSearch() {
    if(!isMobile) return;
    const input = document.getElementById('virtual-keyboard-input');
    input.focus();
    input.click(); // Sicherstellen
}

// 3. Ghost Input Listener (Verbindet Input -> JS Variable)
document.getElementById('virtual-keyboard-input').addEventListener('input', (e) => {
    searchQuery = e.target.value.toUpperCase(); // Alles Uppercase für Retro-Look

    selectedPostIndex = 0;
    selectedSocialIndex = 0;

    // Sofort rendern je nach App
    if(activeApp === 'blog') renderBlogList();
    if(activeApp === 'social') renderSocial();
});

function updateAttachmentHighlight() {
    const links = document.querySelectorAll('.attachment-file');
    links.forEach((el, idx) => {
        if (blogFocusMode === 'files' && idx === blogFileIndex) {
            el.classList.add('active-file');
            // Scrollt automatisch zum Button, falls er nicht im Bild ist
            el.scrollIntoView({behavior: 'smooth', block: 'nearest'});
        } else {
            el.classList.remove('active-file');
        }
    });
}

function updateBackHighlight() {
    const btn = document.querySelector('.nav-btn');
    if (btn) {
        if (blogFocusMode === 'back') btn.classList.add('selected-nav');
        else btn.classList.remove('selected-nav');
    }
}

// --- GLOBALE "SMART CLOSE" FUNKTION ---
window.closeApp = function(appName) {
    console.log("System: Closing " + appName);

    // 1. App schließen
    if (apps[appName]) {
        apps[appName].open = false;
    }

    // 2. Das nächste offene Fenster im Stack finden
    // Wir gehen den Stack rückwärts durch (von oben nach unten)
    let nextApp = null;

    // windowStack ist global in script.js definiert
    for (let i = windowStack.length - 1; i >= 0; i--) {
        const key = windowStack[i];

        // Wir suchen ein Fenster, das NICHT das gerade geschlossene ist
        // UND das aktuell offen (open: true) ist
        if (key !== appName && apps[key].open) {
            nextApp = key;
            break; // Gefunden! Das ist das oberste Fenster darunter.
        }
    }

    // 3. Entscheidung: Fenster wechseln oder Desktop
    if (nextApp) {
        activeApp = nextApp;
        systemFocus = 'app'; // Sicherstellen, dass wir im App-Modus bleiben
    } else {
        // Keine Fenster mehr offen -> Desktop
        activeApp = null;
        systemFocus = 'desktop';
        // Optional: Icon des geschlossenen Fensters auswählen
        const idx = iconKeys.indexOf(appName);
        if (idx !== -1) selectedIconIndex = idx;
    }

    // 4. Alles neu zeichnen
    updateVisuals();
};

function navigateDown(folderObj) {
    if (!folderObj.content) return;

    // 1. Stack speichern
    currentDirStack.push(currentDirectory);

    // 2. Pfad-Namen speichern (NEU)
    // Wir nehmen den Ordnernamen und machen ihn UPPERCASE für den Look
    currentPathStack.push(folderObj.filename.toUpperCase());

    // 3. Verzeichnis wechseln
    currentDirectory = folderObj.content;

    // 4. UI Updates
    selectedFileIndex = 0;
    updatePathDisplay(); // <--- Hier updaten wir die Anzeige
    renderFiles();
}

function navigateUp() {
    if (currentDirStack.length === 0) return;

    // 1. Stack wiederherstellen
    const parentDir = currentDirStack.pop();

    // 2. Pfad entfernen (NEU)
    currentPathStack.pop();

    // 3. Verzeichnis wechseln
    currentDirectory = parentDir;

    // 4. UI Updates
    selectedFileIndex = 0;
    updatePathDisplay(); // <--- Hier updaten wir die Anzeige
    renderFiles();
}

init();