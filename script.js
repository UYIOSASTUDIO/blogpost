let posts = [];
let viewState = 'list';
let selectedIndex = 0;
let currentPostId = null;

const listView = document.getElementById('list-view');
const postView = document.getElementById('post-view');
const hintSelect = document.getElementById('hint-select');
const hintNav = document.getElementById('hint-nav');

// --- INIT ---
async function loadPosts() {
    try {
        const response = await fetch('posts.json');
        posts = await response.json();
        renderList();
    } catch (e) {
        listView.innerHTML = "FEHLER: DATENBANK OFF-LINE.";
    }
}

// --- RENDER LISTE (Update für die Dots) ---
function renderList() {
    viewState = 'list';
    postView.style.display = 'none';
    listView.style.display = 'flex';
    listView.style.flexDirection = 'column';

    if(hintSelect) hintSelect.innerText = "ÖFFNEN";

    listView.innerHTML = '';

    const listHeader = document.createElement('div');
    listHeader.style.marginBottom = "10px";
    listHeader.innerHTML = "INDEX DES POSTS: <br>----------------";
    listView.appendChild(listHeader);

    posts.forEach((post, index) => {
        const div = document.createElement('div');
        div.className = `post-item ${index === selectedIndex ? 'active' : ''}`;
        div.innerHTML = `
            <span>${post.title}</span>
            <span class="dots-filler"></span>
            <span>${post.date}</span>
        `;

        div.onclick = () => {
            selectedIndex = index;
            renderList();
            openPost(index);
        };
        listView.appendChild(div);
    });
}

// --- RENDER POST ---
function openPost(index) {
    if (!posts[index]) return;
    viewState = 'post';
    currentPostId = index;
    selectedIndex = index;

    listView.style.display = 'none';
    postView.style.display = 'block';

    if(hintSelect) hintSelect.innerText = "ZURÜCK";

    const post = posts[index];
    postView.innerHTML = `
        <div class="meta-row"><span class="label">TITEL:</span><span class="value">${post.title}</span></div>
        <div class="meta-row"><span class="label">RUBRIK:</span><span class="value">${post.location}</span></div>
        <div class="meta-row"><span class="label">AUTOR:</span><span class="value">${post.author}</span></div>
        <div class="post-body">${post.content}</div>
    `;
}

// --- KEYBOARD NAVIGATION ---
document.addEventListener('keydown', (e) => {
    if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].indexOf(e.code) > -1) e.preventDefault();

    if (viewState === 'list') {
        if (e.key === 'ArrowDown') { selectedIndex = (selectedIndex + 1) % posts.length; renderList(); }
        else if (e.key === 'ArrowUp') { selectedIndex = (selectedIndex - 1 + posts.length) % posts.length; renderList(); }
        else if (e.key === 'Enter') { openPost(selectedIndex); }
    } else if (viewState === 'post') {
        if (e.key === 'Escape' || e.key === 'Backspace') { renderList(); }
        else if (e.key === 'ArrowRight') { openPost((currentPostId + 1) % posts.length); }
        else if (e.key === 'ArrowLeft') { openPost((currentPostId - 1 + posts.length) % posts.length); }
        else if (e.key === 'Enter') { renderList(); }
    }
});

// --- TOUCH SWIPE ---
let touchStartX = 0;
let touchEndX = 0;
document.addEventListener('touchstart', e => touchStartX = e.changedTouches[0].screenX);
document.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    if (viewState === 'post') {
        if (touchEndX < touchStartX - 50) openPost((currentPostId + 1) % posts.length);
        if (touchEndX > touchStartX + 50) openPost((currentPostId - 1 + posts.length) % posts.length);
    }
});
document.querySelector('header').addEventListener('click', () => { if(viewState === 'post') renderList(); });

// --- DRAGGABLE WINDOW LOGIC (Nur Desktop) ---
const win = document.getElementById('minitel-screen');
const header = document.querySelector('header');
let isDragging = false;
let startX, startY, initialLeft, initialTop;

// Wir nutzen nur Maus-Events fürs Dragging, da Mobile Touch anders funktioniert
header.addEventListener('mousedown', (e) => {
    // Check ob wir im Desktop Modus sind (Breite > 800)
    if (window.innerWidth <= 800) return;

    isDragging = true;

    // Position der Maus relativ zum Fenster
    startX = e.clientX;
    startY = e.clientY;

    // Aktuelle Position des Fensters holen
    const rect = win.getBoundingClientRect();

    // Wir müssen das "transform: translate(-50%, -50%)" entfernen, sobald wir draggen,
    // sonst springt das Fenster. Wir setzen es auf absolute Pixel-Werte.
    win.style.transform = 'none';
    win.style.left = rect.left + 'px';
    win.style.top = rect.top + 'px';

    initialLeft = rect.left;
    initialTop = rect.top;

    document.body.style.cursor = 'move';
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    win.style.left = (initialLeft + dx) + 'px';
    win.style.top = (initialTop + dy) + 'px';
});

document.addEventListener('mouseup', () => {
    isDragging = false;
    document.body.style.cursor = ''; // Reset cursor (oder wieder auf custom url setzen via CSS)
});

loadPosts();