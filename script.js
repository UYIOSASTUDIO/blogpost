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
    }
};

let activeApp = 'blog';
let systemFocus = 'app';
let isMobile = false;
let selectedIconIndex = 0;
const iconKeys = ['blog', 'help', 'social'];

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

// SOCIAL STATE UPDATE
let socialMode = 'list'; // 'list' (Scrollen) oder 'focus' (Im Post drin)
let socialFocusTarget = 'like'; // 'like' oder 'caption'
let expandedCaptions = {};

// --- INIT ---
function init() {
    checkMobile();
    window.addEventListener('resize', checkMobile);
    loadPosts();
    updateVisuals();
    renderSocial();
}

function checkMobile() { isMobile = window.innerWidth <= 800; }

async function loadPosts() {
    try {
        const r1 = await fetch('posts.json');
        posts = await r1.json();

        const r2 = await fetch('social.json');
        let rawSocial = await r2.json();

        socialPosts = rawSocial.map(post => {
            // Check ob wir diesen Post schon geliked haben
            const isLiked = localStorage.getItem(`liked_${post.id}`) === 'true';
            if (isLiked) {
                post.likedByMe = true;
                post.likes++; // Erhöhe die Zahl visuell, da wir geliked haben
            }
            return post;
        });

        renderBlogList();
        renderSocial();
    } catch (e) { console.error(e); }
}

// --- RENDERING ---
function renderBlogList() {
    viewState = 'list';
    postView.style.display = 'none';
    listView.style.display = 'flex'; listView.style.flexDirection = 'column';

    // Header mit Suche
    listView.innerHTML = `
        <div class="search-bar">SUCHE: ${searchQuery}<span class="search-cursor">_</span></div>
        <div style="margin-bottom:10px;">INDEX:<br>------</div>
    `;

    // Filtern nach Suche
    const filtered = posts.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));

    if (filtered.length === 0) {
        listView.innerHTML += "<div>KEINE ERGEBNISSE.</div>";
        return;
    }

    // Safety Check: Index im Rahmen halten
    if (selectedPostIndex >= filtered.length) selectedPostIndex = filtered.length - 1;
    if (selectedPostIndex < 0) selectedPostIndex = 0;

    filtered.forEach((post, index) => {
        const div = document.createElement('div');
        div.className = `post-item ${index === selectedPostIndex ? 'active' : ''}`;
        div.innerHTML = `<span>${post.title}</span><span class="dots-filler"></span><span>${post.date}</span>`;

        // Den echten Index im Original-Array finden
        const originalIndex = posts.indexOf(post);
        div.onclick = () => { selectedPostIndex = index; openBlogPost(originalIndex); };
        listView.appendChild(div);
    });
}

function openBlogPost(index) {
    viewState = 'post';
    currentPostId = index;
    // Wichtig: selection syncen
    selectedPostIndex = index;

    listView.style.display = 'none';
    postView.style.display = 'block';
    const post = posts[index];
    postView.innerHTML = `
        <div class="meta-row"><span class="label">TITEL:</span><span class="value">${post.title}</span></div>
        <div class="meta-row"><span class="label">ORT:</span><span class="value">${post.location}</span></div>
        <div class="post-body">${post.content}</div>
    `;
}

// --- SYSTEM VISUALS ENGINE ---
function updateVisuals() {
    if (isMobile) return;

    // 1. Icons
    iconKeys.forEach((key, idx) => {
        const el = document.getElementById(apps[key].iconId);
        if (systemFocus === 'desktop' && idx === selectedIconIndex) el.classList.add('selected');
        else el.classList.remove('selected');
    });

    // 2. Windows Management
    for (const [key, app] of Object.entries(apps)) {
        const win = document.getElementById(app.id);

        if (!app.open) {
            win.style.display = 'none';
            continue;
        }
        win.style.display = 'flex';

        // Position & Größe (Echtes Resizing)
        win.style.left = `${app.x}%`;
        win.style.top = `${app.y}%`;
        // Hier setzen wir Width/Height direkt
        win.style.width = `${app.w}px`;
        win.style.height = `${app.h}px`;

        // Transform nutzen wir nur noch für die Zentrierung des Ankerpunkts
        win.style.transform = `translate(-50%, -50%)`;

        // Active State
        if (activeApp === key && systemFocus === 'app') {
            win.classList.add('active');
            win.classList.remove('inactive');
        } else {
            win.classList.remove('active');
            win.classList.add('inactive');
        }
    }
}

// --- INPUT HANDLER ---
document.addEventListener('keydown', (e) => {
    // 1. GLOBAL HOTKEYS (Space, Tab, etc.) bleiben wie vorher
    if (e.code === 'Space' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault(); systemFocus = (systemFocus === 'app') ? 'desktop' : 'app'; updateVisuals(); return;
    }
    if (e.code === 'Tab' && systemFocus === 'app') {
        e.preventDefault();
        // Deine Tab-Logik hier... (z.B. Cycle Apps)
        const keys = Object.keys(apps);
        let idx = keys.indexOf(activeApp);
        idx = (idx + 1) % keys.length;
        activeApp = keys[idx];
        updateVisuals(); return;
    }

    // 2. SEARCH INPUT (Buchstaben abfangen)
    // Nur wenn App Fokus hat und wir im Blog oder Social sind
    if (systemFocus === 'app' && (activeApp === 'blog' || activeApp === 'social')) {
        // Verhindern, dass Tasten wie Enter/Pfeile/CTRL als Text gewertet werden
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            // Spezialfall: Wenn wir im Social "Focus Mode" sind, wollen wir vielleicht nicht suchen?
            // Oder wir erlauben Suche immer:
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

    // 3. DESKTOP NAV (Hier unverändert lassen oder deinen Code einfügen)
    if (systemFocus === 'desktop') {
        // ... Dein Desktop Code ...
        return;
    }

    // 4. APP NAVIGATION
    if (systemFocus === 'app') {

        // --- BLOG LOGIC ---
        if (activeApp === 'blog') {
            if (e.key === 'ArrowDown') { selectedPostIndex++; renderBlogList(); }
            if (e.key === 'ArrowUp') { selectedPostIndex--; renderBlogList(); }

            if (e.key === 'Enter' && viewState === 'list') {
                // Enter öffnet den gefilterten Post
                const filtered = posts.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
                const post = filtered[selectedPostIndex];
                if(post) openBlogPost(posts.indexOf(post));
            }
            if (e.key === 'Escape') { viewState='list'; searchQuery=""; renderBlogList(); }
            // Hier deine Scroll Logik (handleBlogNav) aufrufen...
        }

        // --- SOCIAL LOGIC (NEU) ---
        if (activeApp === 'social') {
            e.preventDefault();

            // MODUS A: LISTE DURCHSCROLLEN
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
                // ENTER -> REIN GEHEN (Focus Mode)
                if (e.key === 'Enter') {
                    socialMode = 'focus';
                    socialFocusTarget = 'like'; // Startet immer beim Like Button
                    renderSocial();
                }
            }

            // MODUS B: IM POST (BUTTONS BEDIENEN)
            else if (socialMode === 'focus') {
                // Links/Rechts wechselt zwischen Buttons
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                    socialFocusTarget = (socialFocusTarget === 'like') ? 'caption' : 'like';
                    renderSocial();
                }

                // ENTER löst Button aus
                if (e.key === 'Enter') {
                    const filtered = socialPosts.filter(p => p.user.includes(searchQuery));
                    const post = filtered[selectedSocialIndex];

                    if (socialFocusTarget === 'like') {
                        // LIKE TOGGLE
                        if (!post.likedByMe) {
                            post.likes++;
                            post.likedByMe = true;
                            localStorage.setItem(`liked_${post.id}`, 'true');
                        } else {
                            post.likes--;
                            post.likedByMe = false;
                            localStorage.removeItem(`liked_${post.id}`);
                        }
                    } else if (socialFocusTarget === 'caption') {
                        // CAPTION TOGGLE
                        if (expandedCaptions[post.id]) {
                            delete expandedCaptions[post.id];
                        } else {
                            expandedCaptions[post.id] = true;
                        }
                    }
                    renderSocial();
                }

                // ESCAPE -> Raus zur Liste
                if (e.key === 'Escape') {
                    socialMode = 'list';
                    renderSocial();
                }
            }
        }
    }
});

function handleBlogNav(e) {
    // Wenn SHIFT gedrückt ist, scrollen wir den Inhalt (nur im Post-View)
    if (viewState === 'post' && e.shiftKey) {
        e.preventDefault();
        const view = document.getElementById('post-view');
        const scrollStep = 30;

        if (e.key === 'ArrowDown') view.scrollTop += scrollStep;
        if (e.key === 'ArrowUp')   view.scrollTop -= scrollStep;
        return; // Navigation abbrechen, da wir scrollen
    }

    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code)) e.preventDefault();

    if (viewState === 'list') {
        if (e.key === 'ArrowDown') { selectedPostIndex = (selectedPostIndex + 1) % posts.length; renderBlogList(); }
        else if (e.key === 'ArrowUp') { selectedPostIndex = (selectedPostIndex - 1 + posts.length) % posts.length; renderBlogList(); }
        else if (e.key === 'Enter') { openBlogPost(selectedPostIndex); }
    } else if (viewState === 'post') {
        if (e.key === 'Escape' || e.key === 'Backspace') { renderBlogList(); }
        else if (e.key === 'ArrowRight') {
            let next = (currentPostId + 1) % posts.length;
            selectedPostIndex = next;
            openBlogPost(next);
        }
        else if (e.key === 'ArrowLeft') {
            let prev = (currentPostId - 1 + posts.length) % posts.length;
            selectedPostIndex = prev;
            openBlogPost(prev);
        }
    }
}

function handleMobileInput(e) {
    if (viewState === 'list') {
        if (e.key === 'ArrowDown') { selectedPostIndex = (selectedPostIndex + 1) % posts.length; renderBlogList(); }
        if (e.key === 'ArrowUp') { selectedPostIndex = (selectedPostIndex - 1 + posts.length) % posts.length; renderBlogList(); }
        if (e.key === 'Enter') openBlogPost(selectedPostIndex);
    } else {
        if (e.key === 'Escape') renderBlogList();
    }
}

function renderSocial() {
    const screen = document.getElementById('social-screen');
    screen.innerHTML = `
        <div class="search-bar">FILTER: ${searchQuery}<span class="search-cursor">_</span></div>
    `;

    // Filtern
    const filtered = socialPosts.filter(p => p.user.includes(searchQuery) || p.caption.includes(searchQuery));

    if (filtered.length === 0) {
        screen.innerHTML += "<div>LEER.</div>";
        return;
    }

    if (selectedSocialIndex >= filtered.length) selectedSocialIndex = filtered.length - 1;

    filtered.forEach((post, index) => {
        const isActive = index === selectedSocialIndex;
        // Sind wir im "Focus Mode" auf diesem Post?
        const isFocus = isActive && socialMode === 'focus';
        const isExpanded = expandedCaptions[post.id];

        // Button Texte & Styles
        const likeText = post.likedByMe ? "♥" : "LIKE";
        const descText = isExpanded ? "CLOSE" : "DESC";

        // Welcher Button ist gerade ausgewählt?
        const likeClass = (isFocus && socialFocusTarget === 'like') ? 'selected-btn' : '';
        const descClass = (isFocus && socialFocusTarget === 'caption') ? 'selected-btn' : '';

        const div = document.createElement('div');
        // Klassen für CSS Highlighting
        div.className = `social-post ${isActive ? 'active-post' : ''} ${isFocus ? 'interaction-mode' : ''}`;

        div.innerHTML = `
            <div class="social-header">
                <span>@${post.user}</span>
                <span>ID:${post.id}</span>
            </div>
            <div class="ascii-pic"><pre>${post.art}</pre></div>
            
            <div class="social-actions">
                <span class="action-btn ${likeClass}" style="margin-right:10px;">[${likeText} ${post.likes}]</span>
                <span class="action-btn ${descClass}">[${descText}]</span>
            </div>
            
            <div class="social-caption ${isExpanded ? 'expanded' : ''}">
                ${post.caption}
            </div>
        `;
        screen.appendChild(div);
    });

    // Auto Scroll zum aktiven Element
    const activeEl = screen.children[selectedSocialIndex + 1]; // +1 wegen Searchbar
    if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Mobile Touch
let touchStartX = 0;
document.addEventListener('touchstart', e => touchStartX = e.changedTouches[0].screenX);
document.addEventListener('touchend', e => {
    if (activeApp === 'blog' && viewState === 'post') {
        let endX = e.changedTouches[0].screenX;
        // SWIPE LOGIK UPDATED: Sync selection!
        if (endX < touchStartX - 50) {
            let next = (currentPostId + 1) % posts.length;
            selectedPostIndex = next; // SYNC!
            openBlogPost(next);
        }
        if (endX > touchStartX + 50) {
            let prev = (currentPostId - 1 + posts.length) % posts.length;
            selectedPostIndex = prev; // SYNC!
            openBlogPost(prev);
        }
    }
});
document.querySelector('#win-blog header').addEventListener('click', () => { if(viewState === 'post') renderBlogList(); });

init();