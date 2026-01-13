// --- CONFIG & STATE ---
// Apps Definition mit asymmetrischen Startpositionen
const apps = {
    blog: {
        id: 'win-blog', iconId: 'icon-blog', open: true,
        x: 42, y: 55, scale: 1.0 // Leicht links unten
    },
    help: {
        id: 'win-help', iconId: 'icon-help', open: true,
        x: 75, y: 40, scale: 1.0 // Rechts oben
    }
};

let activeApp = 'blog'; // Welches Fenster ist gerade "oben"?
let systemFocus = 'app'; // 'app' (Fenster Bedienung) oder 'desktop' (Icons)
let isMobile = false;
let selectedIconIndex = 0;
const iconKeys = ['blog', 'help']; // Reihenfolge auf Desktop

// Blog Data State
let posts = [];
let viewState = 'list';
let selectedPostIndex = 0;
let currentPostId = null;

// DOM Helpers
const listView = document.getElementById('list-view');
const postView = document.getElementById('post-view');

// --- INIT ---
function init() {
    checkMobile();
    window.addEventListener('resize', checkMobile);
    loadPosts();
    updateVisuals(); // Setzt Startpositionen
}

function checkMobile() { isMobile = window.innerWidth <= 800; }

async function loadPosts() {
    try {
        const r = await fetch('posts.json');
        posts = await r.json();
        renderBlogList();
    } catch (e) { listView.innerHTML = "ERR: DB LOST."; }
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

    // 1. Desktop Icons
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

        // Position & Scale
        win.style.left = `${app.x}%`;
        win.style.top = `${app.y}%`;
        win.style.transform = `translate(-50%, -50%) scale(${app.scale})`;

        // Active / Inactive State (Visuals & Z-Index)
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

    // GLOBAL: TOGGLE DESKTOP / APP FOCUS (CTRL+SPACE)
    if (e.code === 'Space' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        systemFocus = (systemFocus === 'app') ? 'desktop' : 'app';
        updateVisuals();
        return;
    }

    // GLOBAL: CYCLE WINDOWS (TAB) - Nur wenn im App Modus
    if (e.code === 'Tab' && systemFocus === 'app') {
        e.preventDefault();
        // Finde nächste offene App
        const keys = Object.keys(apps);
        let currentIndex = keys.indexOf(activeApp);
        let nextIndex = (currentIndex + 1) % keys.length;

        // Loop bis wir eine offene App finden
        while (!apps[keys[nextIndex]].open) {
            nextIndex = (nextIndex + 1) % keys.length;
            if (nextIndex === currentIndex) break; // Alle zu?
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
            systemFocus = 'app'; // Auto-Switch ins Fenster
        }
        updateVisuals();
        return;
    }

    // MODE: WINDOW MANAGEMENT (CMD + ...)
    if (systemFocus === 'app' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const app = apps[activeApp];
        if (!app || !app.open) return;

        if (e.key === 'ArrowRight') app.x = Math.min(95, app.x + 2);
        if (e.key === 'ArrowLeft') app.x = Math.max(5, app.x - 2);
        if (e.key === 'ArrowUp') app.y = Math.max(5, app.y - 2);
        if (e.key === 'ArrowDown') app.y = Math.min(95, app.y + 2);
        if (e.key === '+' || e.key === '=') app.scale = Math.min(1.5, app.scale + 0.1);
        if (e.key === '-') app.scale = Math.max(0.5, app.scale - 0.1);

        if (e.key === 'Backspace') {
            app.open = false;
            // Versuch Fokus auf anderes Fenster zu legen
            const openApps = Object.keys(apps).filter(k => apps[k].open);
            if (openApps.length > 0) activeApp = openApps[0];
            else systemFocus = 'desktop';
        }
        updateVisuals();
        return;
    }

    // MODE: APP CONTENT NAVIGATION
    if (systemFocus === 'app') {
        // Nur wenn Blog aktiv ist, reagieren wir auf Blog-Navigation
        if (activeApp === 'blog') {
            handleBlogNav(e);
        }
        // Help Window hat keine interaktive Navigation nötig, man kann nur scrollen (theoretisch)
    }
});

function handleBlogNav(e) {
    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code)) e.preventDefault();

    if (viewState === 'list') {
        if (e.key === 'ArrowDown') { selectedPostIndex = (selectedPostIndex + 1) % posts.length; renderBlogList(); }
        else if (e.key === 'ArrowUp') { selectedPostIndex = (selectedPostIndex - 1 + posts.length) % posts.length; renderBlogList(); }
        else if (e.key === 'Enter') { openBlogPost(selectedPostIndex); }
    } else if (viewState === 'post') {
        if (e.key === 'Escape' || e.key === 'Backspace') { renderBlogList(); }
        else if (e.key === 'ArrowRight') { openBlogPost((currentPostId + 1) % posts.length); }
        else if (e.key === 'ArrowLeft') { openBlogPost((currentPostId - 1 + posts.length) % posts.length); }
    }
}

function handleMobileInput(e) {
    // Simplifizierte Mobile Steuerung
    if (viewState === 'list') {
        if (e.key === 'ArrowDown') { selectedPostIndex = (selectedPostIndex + 1) % posts.length; renderBlogList(); }
        if (e.key === 'ArrowUp') { selectedPostIndex = (selectedPostIndex - 1 + posts.length) % posts.length; renderBlogList(); }
        if (e.key === 'Enter') openBlogPost(selectedPostIndex);
    } else {
        if (e.key === 'Escape') renderBlogList();
    }
}

// Mobile Touch (nur für Blog relevant)
let touchStartX = 0;
document.addEventListener('touchstart', e => touchStartX = e.changedTouches[0].screenX);
document.addEventListener('touchend', e => {
    if (activeApp === 'blog' && viewState === 'post') {
        let endX = e.changedTouches[0].screenX;
        if (endX < touchStartX - 50) openBlogPost((currentPostId + 1) % posts.length);
        if (endX > touchStartX + 50) openBlogPost((currentPostId - 1 + posts.length) % posts.length);
    }
});
document.querySelector('#win-blog header').addEventListener('click', () => { if(viewState === 'post') renderBlogList(); });

init();