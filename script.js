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
        // 1. Blog Posts laden
        const r1 = await fetch('posts.json');
        posts = await r1.json();
        renderBlogList();

        // 2. Social Posts laden
        const r2 = await fetch('social.json');
        let rawSocial = await r2.json();

        // 3. Likes aus dem LocalStorage dazu mixen
        socialPosts = rawSocial.map(post => {
            // Check ob wir lokal einen Like-Stand gespeichert haben
            const savedLikes = localStorage.getItem(`like_${post.id}`);
            if (savedLikes) {
                post.likes = parseInt(savedLikes); // Überschreibe JSON Wert mit gespeichertem Wert
                post.likedByMe = true; // Markierung dass wir schon geliked haben (optional für Visuals)
            }
            return post;
        });

        renderSocial();

    } catch (e) {
        listView.innerHTML = "ERR: DB LOST.";
        console.error(e);
    }
}

// --- RENDERING ---
function renderBlogList() {
    viewState = 'list';
    postView.style.display = 'none';
    listView.style.display = 'flex'; listView.style.flexDirection = 'column';
    listView.innerHTML = '<div style="margin-bottom:10px;">INDEX:<br>------</div>';

    posts.forEach((post, index) => {
        const div = document.createElement('div');
        div.className = `post-item ${index === selectedPostIndex ? 'active' : ''}`;
        div.innerHTML = `<span>${post.title}</span><span class="dots-filler"></span><span>${post.date}</span>`;
        div.onclick = () => { selectedPostIndex = index; renderBlogList(); openBlogPost(index); };
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
    if (isMobile) return handleMobileInput(e);

    // GLOBAL: TOGGLE DESKTOP / APP FOCUS
    if (e.code === 'Space' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        systemFocus = (systemFocus === 'app') ? 'desktop' : 'app';
        updateVisuals();
        return;
    }

    // GLOBAL: TAB (Fenster wechseln)
    if (e.code === 'Tab' && systemFocus === 'app') {
        e.preventDefault();
        const keys = Object.keys(apps);
        let currentIndex = keys.indexOf(activeApp);
        let nextIndex = (currentIndex + 1) % keys.length;
        while (!apps[keys[nextIndex]].open) {
            nextIndex = (nextIndex + 1) % keys.length;
            if (nextIndex === currentIndex) break;
        }
        if (apps[keys[nextIndex]].open) {
            activeApp = keys[nextIndex];
            updateVisuals();
        }
        return;
    }

    // MODE: DESKTOP
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

    // MODE: WINDOW MANAGEMENT (CMD + ...)
    if (systemFocus === 'app' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const app = apps[activeApp];
        if (!app || !app.open) return;

        // 1. RESIZE MODUS (CMD + ALT + ARROWS) -> Nur Breite/Höhe
        if (e.altKey) {
            const step = 20;
            if (e.key === 'ArrowRight') app.w += step;
            if (e.key === 'ArrowLeft')  app.w = Math.max(300, app.w - step); // Min Width 300
            if (e.key === 'ArrowDown')  app.h += step;
            if (e.key === 'ArrowUp')    app.h = Math.max(200, app.h - step); // Min Height 200

            updateVisuals();
            return;
        }

        // 2. MOVE MODUS (NUR CMD + ARROWS) -> Verschieben
        if (!e.altKey && !e.shiftKey) {
            if (e.key === 'ArrowRight') app.x = Math.min(95, app.x + 2);
            if (e.key === 'ArrowLeft')  app.x = Math.max(5, app.x - 2);
            if (e.key === 'ArrowUp')    app.y = Math.max(5, app.y - 2);
            if (e.key === 'ArrowDown')  app.y = Math.min(95, app.y + 2);
        }

        // 3. PROPORTIONAL RESIZE (CMD + +/-) -> Bleibt als Alternative
        const resizeStep = 20;
        if (e.key === '+' || e.key === '=') {
            app.w += resizeStep;
            app.h += resizeStep;
        }
        if (e.key === '-') {
            app.w = Math.max(300, app.w - resizeStep);
            app.h = Math.max(200, app.h - resizeStep);
        }

        // CLOSE
        if (e.key === 'Backspace') {
            app.open = false;
            const openApps = Object.keys(apps).filter(k => apps[k].open);
            if (openApps.length > 0) activeApp = openApps[0];
            else systemFocus = 'desktop';
        }
        updateVisuals();
        return;
    }

    // MODE: APP CONTENT NAVIGATION
    if (systemFocus === 'app') {

        // 1. BLOG LOGIC
        if (activeApp === 'blog') {
            handleBlogNav(e);
        }

        // 2. HELP LOGIC (Scrolling)
        if (activeApp === 'help') {
            e.preventDefault();
            const helpScreen = document.getElementById('help-screen');
            if (e.key === 'ArrowDown') helpScreen.scrollTop += 30;
            if (e.key === 'ArrowUp') helpScreen.scrollTop -= 30;
        }
        // 3. SOCIAL LOGIC (Im keydown Listener)
        if (activeApp === 'social') {
            if (["ArrowUp","ArrowDown"].includes(e.code)) e.preventDefault();

            // NACH UNTEN
            if (e.key === 'ArrowDown') {
                // Sind wir noch NICHT am Ende?
                if (selectedSocialIndex < socialPosts.length - 1) {
                    selectedSocialIndex++;
                }
                // Wir SIND am Ende. Check auf Doppelklick.
                else {
                    const now = Date.now();
                    // Wenn der letzte Klick weniger als 400ms her ist -> Reset nach oben
                    if (now - lastBottomPress < 400) {
                        selectedSocialIndex = 0;
                    }
                    lastBottomPress = now;
                }
                renderSocial();
            }

            // NACH OBEN (Loop nach unten verhindern wir hier auch, wenn du willst)
            if (e.key === 'ArrowUp') {
                if (selectedSocialIndex > 0) {
                    selectedSocialIndex--;
                    renderSocial();
                }
            }

            // LIKEN MIT ENTER
            if (e.key === 'Enter') {
                const post = socialPosts[selectedSocialIndex];

                // Einfache Logik: Immer +1 (oder Toggle, wenn du willst)
                post.likes++;
                post.likedByMe = true;

                // Speichern im Browser
                localStorage.setItem(`like_${post.id}`, post.likes);

                // Neu zeichnen um neue Zahl zu zeigen
                renderSocial();

                // Kleines Feedback (Optional: Sound abspielen könnte man hier auch)
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
    screen.innerHTML = '';

    socialPosts.forEach((post, index) => {
        const postDiv = document.createElement('div');
        const activeClass = index === selectedSocialIndex ? 'active-post' : '';
        postDiv.className = `social-post ${activeClass}`;

        // Visueller Indikator ob geliked (Herzchen)
        const likeBtnText = post.likedByMe ? "[♥ LIKED]" : "[LIKE]";
        const likeStyle = post.likedByMe ? "color:var(--crt-blue); font-weight:bold;" : "";

        postDiv.innerHTML = `
            <div class="social-header">
                <span>@${post.user}</span>
                <span>ID: ${post.id}</span>
            </div>
            <div class="ascii-pic">
                <pre>${post.art}</pre>
            </div>
            <div class="social-actions">
                <span class="action-btn" style="${likeStyle}">${likeBtnText}</span>
                <span class="action-btn">[COMMENT]</span>
                <span class="action-btn">[SHARE]</span>
            </div>
            <div class="social-caption">
                <strong>${post.likes} likes</strong><br>
                ${post.caption}
            </div>
        `;
        screen.appendChild(postDiv);
    });

    const activeEl = screen.children[selectedSocialIndex];
    if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
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