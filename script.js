// --- STATE ---
let posts = [];
let viewState = 'list';
let selectedIndex = 0;
let currentPostId = null;

// Desktop System State
let isMobile = false; // Wird beim Start gecheckt
let systemFocus = 'app'; // 'app' (Fenster) oder 'desktop' (Icons)
let isWindowOpen = true;

// Window Position State
let winX = 50;
let winY = 50;
let winScale = 1.0;

// Icon Selection State
let selectedIconIndex = 0;
const icons = ['icon-blog', 'icon-trash']; // IDs der Icons

// DOM Elemente
const listView = document.getElementById('list-view');
const postView = document.getElementById('post-view');
const windowWrapper = document.getElementById('window-wrapper');
const desktopHint = document.getElementById('desktop-hint');

// --- CHECK MOBILE ---
function checkMobile() {
    // Einfacher Check: Breite unter 800px
    isMobile = window.innerWidth <= 800;
}
window.addEventListener('resize', checkMobile);
checkMobile(); // Sofort ausführen

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

// --- RENDER FUNKTIONEN ---
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

// --- WINDOW & DESKTOP SYSTEM ---

// Aktualisiert das Aussehen je nach Fokus
function updateFocusVisuals() {
    if (isMobile) return; // Auf Handy egal

    // Icons aktualisieren
    icons.forEach((id, idx) => {
        const el = document.getElementById(id);
        if (systemFocus === 'desktop' && idx === selectedIconIndex) {
            el.classList.add('selected');
        } else {
            el.classList.remove('selected');
        }
    });

    // Fenster Aussehen
    if (!isWindowOpen) {
        windowWrapper.style.display = 'none';
    } else {
        windowWrapper.style.display = 'flex';
        // Wenn Fokus auf Desktop liegt, Fenster grau machen
        if (systemFocus === 'desktop') {
            windowWrapper.classList.add('inactive');
        } else {
            windowWrapper.classList.remove('inactive');
        }
    }
}

function updateWindowPosition() {
    if (isMobile) return; // Nicht auf Handy anwenden!

    // Position aktualisieren (nur wenn nicht mobile)
    windowWrapper.style.left = `${winX}%`;
    windowWrapper.style.top = `${winY}%`;
    windowWrapper.style.transform = `translate(-50%, -50%) scale(${winScale})`;
}

// --- INPUT HANDLER ---
document.addEventListener('keydown', (e) => {

    // 1. MOBILE LOGIK (Einfach halten)
    if (isMobile) {
        if (viewState === 'list') {
            if (e.key === 'ArrowDown') { selectedIndex = (selectedIndex + 1) % posts.length; renderList(); }
            if (e.key === 'ArrowUp') { selectedIndex = (selectedIndex - 1 + posts.length) % posts.length; renderList(); }
            if (e.key === 'Enter') openPost(selectedIndex);
        } else {
            if (e.key === 'Escape') renderList();
        }
        return; // Desktop Logik abbrechen
    }

    // 2. FOCUS SWITCH (CTRL + SPACE)
    if (e.code === 'Space' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        // Toggle
        systemFocus = (systemFocus === 'app') ? 'desktop' : 'app';
        updateFocusVisuals();
        return;
    }

    // 3. WINDOW COMMANDS (CMD + ...)
    if (e.metaKey || e.ctrlKey) {
        if (systemFocus !== 'app' || !isWindowOpen) return;

        e.preventDefault();
        const moveStep = 2;
        if (e.key === 'ArrowRight') winX = Math.min(95, winX + moveStep);
        if (e.key === 'ArrowLeft') winX = Math.max(5, winX - moveStep);
        if (e.key === 'ArrowUp') winY = Math.max(5, winY - moveStep);
        if (e.key === 'ArrowDown') winY = Math.min(95, winY + moveStep);
        if (e.key === '+' || e.key === '=') winScale = Math.min(1.5, winScale + 0.1);
        if (e.key === '-') winScale = Math.max(0.5, winScale - 0.1);

        // Fenster schließen
        if (e.key === 'Backspace') {
            isWindowOpen = false;
            systemFocus = 'desktop'; // Fokus muss auf Desktop gehen
            updateFocusVisuals();
        }

        updateWindowPosition();
        return;
    }

    // 4. DESKTOP NAVIGATION (Wenn Fokus auf Desktop)
    if (systemFocus === 'desktop') {
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            selectedIconIndex = (selectedIconIndex + 1) % icons.length;
            updateFocusVisuals();
        }
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            selectedIconIndex = (selectedIconIndex - 1 + icons.length) % icons.length;
            updateFocusVisuals();
        }
        if (e.key === 'Enter') {
            // Aktion ausführen
            const action = document.getElementById(icons[selectedIconIndex]).dataset.action;
            if (action === 'open-blog') {
                isWindowOpen = true;
                systemFocus = 'app';
                updateFocusVisuals();
                updateWindowPosition();
            }
        }
        return;
    }

    // 5. APP NAVIGATION (Normaler Blog)
    if (systemFocus === 'app' && isWindowOpen) {
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
    }
});

// Touch Swipe (Bleibt gleich)
let touchStartX = 0;
document.addEventListener('touchstart', e => touchStartX = e.changedTouches[0].screenX);
document.addEventListener('touchend', e => {
    if (viewState === 'post') {
        let touchEndX = e.changedTouches[0].screenX;
        if (touchEndX < touchStartX - 50) openPost((currentPostId + 1) % posts.length);
        if (touchEndX > touchStartX + 50) openPost((currentPostId - 1 + posts.length) % posts.length);
    }
});
document.querySelector('header').addEventListener('click', () => { if(viewState === 'post') renderList(); });

// Start
loadPosts();
checkMobile();
updateFocusVisuals();
updateWindowPosition();