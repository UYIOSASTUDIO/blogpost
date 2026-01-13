// --- STATE ---
let posts = [];
let viewState = 'list';
let selectedIndex = 0;
let currentPostId = null;

// Desktop OS State
let isWindowOpen = true;
let winX = 50; // Prozent
let winY = 50; // Prozent
let winScale = 1.0;

// DOM Elemente
const listView = document.getElementById('list-view');
const postView = document.getElementById('post-view');
const windowWrapper = document.getElementById('window-wrapper');
const blogIcon = document.getElementById('blog-icon');

// --- INIT ---
async function loadPosts() {
    try {
        const response = await fetch('posts.json');
        posts = await response.json();
        renderList();
    } catch (e) {
        listView.innerHTML = "OFF-LINE.";
    }
}

// --- RENDER FUNKTIONEN (Wie vorher) ---
function renderList() {
    viewState = 'list';
    postView.style.display = 'none';
    listView.style.display = 'flex'; listView.style.flexDirection = 'column';

    listView.innerHTML = '';
    const listHeader = document.createElement('div');
    listHeader.innerHTML = "INDEX:<br>------";
    listView.appendChild(listHeader);

    posts.forEach((post, index) => {
        const div = document.createElement('div');
        div.className = `post-item ${index === selectedIndex ? 'active' : ''}`;
        div.innerHTML = `<span>${post.title}</span><span class="dots-filler"></span><span>${post.date}</span>`;
        // Mobile Touch Support
        div.onclick = () => { selectedIndex = index; renderList(); openPost(index); };
        listView.appendChild(div);
    });
}

function openPost(index) {
    if (!posts[index]) return;
    viewState = 'post';
    currentPostId = index;
    selectedIndex = index;
    listView.style.display = 'none';
    postView.style.display = 'block';
    const post = posts[index];
    postView.innerHTML = `
        <div class="meta-row"><span class="label">TITEL:</span><span class="value">${post.title}</span></div>
        <div class="meta-row"><span class="label">ORT:</span><span class="value">${post.location}</span></div>
        <div class="post-body">${post.content}</div>
    `;
}

// --- WINDOW MANAGEMENT LOGIK ---
function updateWindowPosition() {
    if (!isWindowOpen) {
        windowWrapper.style.display = 'none';
        blogIcon.style.display = 'flex';
        return;
    }
    windowWrapper.style.display = 'flex';
    blogIcon.style.display = 'none';

    // Position aktualisieren
    windowWrapper.style.left = `${winX}%`;
    windowWrapper.style.top = `${winY}%`;

    // Größe aktualisieren (Scale simuliert Resizing)
    windowWrapper.style.transform = `translate(-50%, -50%) scale(${winScale})`;
}

// --- HAUPT INPUT HANDLER ---
document.addEventListener('keydown', (e) => {
    // Check ob Mobile (dann keine Desktop-Logik)
    if (window.innerWidth <= 800) {
        handleMobileInput(e);
        return;
    }

    // 1. WINDOW MANAGEMENT (Mit CMD/CTRL oder ALT)
    // Wir nutzen CMD (Meta) oder CTRL
    if (e.metaKey || e.ctrlKey) {
        e.preventDefault(); // Verhindert Browser Zoom etc.

        if (!isWindowOpen) return; // Wenn zu, keine Manipulation

        // VERSCHIEBEN (CMD + Arrows)
        const moveStep = 2; // Prozent
        if (e.key === 'ArrowRight') winX = Math.min(95, winX + moveStep);
        if (e.key === 'ArrowLeft') winX = Math.max(5, winX - moveStep);
        if (e.key === 'ArrowUp') winY = Math.max(5, winY - moveStep);
        if (e.key === 'ArrowDown') winY = Math.min(95, winY + moveStep);

        // RESIZEN (CMD + / -)
        if (e.key === '+' || e.key === '=') winScale = Math.min(1.5, winScale + 0.1);
        if (e.key === '-') winScale = Math.max(0.5, winScale - 0.1);

        // SCHLIEßEN (CMD + Backspace)
        if (e.key === 'Backspace') {
            isWindowOpen = false;
        }

        updateWindowPosition();
        return;
    }

    // 2. DESKTOP MODE (Wenn Fenster zu ist)
    if (!isWindowOpen) {
        if (e.key === 'Enter') {
            isWindowOpen = true;
            updateWindowPosition();
        }
        return;
    }

    // 3. APP NAVIGATION (Nur wenn Fenster offen und kein CMD gedrückt)
    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code)) e.preventDefault();

    if (viewState === 'list') {
        if (e.key === 'ArrowDown') { selectedIndex = (selectedIndex + 1) % posts.length; renderList(); }
        else if (e.key === 'ArrowUp') { selectedIndex = (selectedIndex - 1 + posts.length) % posts.length; renderList(); }
        else if (e.key === 'Enter') { openPost(selectedIndex); }
    } else if (viewState === 'post') {
        if (e.key === 'Escape' || e.key === 'Backspace') { renderList(); }
        else if (e.key === 'ArrowRight') { openPost((currentPostId + 1) % posts.length); }
        else if (e.key === 'ArrowLeft') { openPost((currentPostId - 1 + posts.length) % posts.length); }
    }
});

// Fallback für Mobile (ohne CMD Logic)
function handleMobileInput(e) {
    // Gleiche Navi Logik wie oben, nur ohne Window Management
    if (viewState === 'list') {
        if (e.key === 'ArrowDown') { selectedIndex = (selectedIndex + 1) % posts.length; renderList(); }
        if (e.key === 'ArrowUp') { selectedIndex = (selectedIndex - 1 + posts.length) % posts.length; renderList(); }
        if (e.key === 'Enter') openPost(selectedIndex);
    } else {
        if (e.key === 'Escape') renderList();
    }
}

// Touch Support (bleibt gleich)
let touchStartX = 0;
document.addEventListener('touchstart', e => touchStartX = e.changedTouches[0].screenX);
document.addEventListener('touchend', e => {
    if (viewState === 'post') {
        let touchEndX = e.changedTouches[0].screenX;
        if (touchEndX < touchStartX - 50) openPost((currentPostId + 1) % posts.length);
        if (touchEndX > touchStartX + 50) openPost((currentPostId - 1 + posts.length) % posts.length);
    }
});

// Start
loadPosts();
updateWindowPosition(); // Setzt initiale Position