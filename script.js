let posts = [];
let viewState = 'list'; // 'list' oder 'post'
let selectedIndex = 0;
let currentPostId = null;

// DOM Elemente
const listView = document.getElementById('list-view');
const postView = document.getElementById('post-view');
const pageNum = document.getElementById('page-num');
const navHint = document.getElementById('nav-hint');

// Touch Variablen
let touchStartX = 0;
let touchEndX = 0;

// --- INIT ---
async function loadPosts() {
    try {
        const response = await fetch('posts.json');
        posts = await response.json();
        renderList();
        updateHints();
    } catch (e) {
        console.error(e);
        listView.innerHTML = "FEHLER: 'posts.json' NICHT GEFUNDEN.";
    }
}

// --- RENDER ---
function renderList() {
    viewState = 'list';
    postView.style.display = 'none';
    listView.style.display = 'block';
    pageNum.innerText = "01";
    updateHints();

    listView.innerHTML = '';
    posts.forEach((post, index) => {
        const div = document.createElement('div');
        div.className = `post-item ${index === selectedIndex ? 'active' : ''}`;
        div.innerHTML = `
            <span style="pointer-events:none;">${post.title}</span>
            <span style="pointer-events:none;">${post.location}</span>
        `;

        // Touch/Maus Klick Event für Mobile (Funktioniert auch Desktop, aber User nutzt Keyboard)
        div.onclick = () => {
            selectedIndex = index;
            renderList(); // Um active state zu updaten
            openPost(index);
        };

        listView.appendChild(div);
    });
}

function openPost(index) {
    if (!posts[index]) return;

    viewState = 'post';
    currentPostId = index;
    selectedIndex = index; // Sync selection

    listView.style.display = 'none';
    postView.style.display = 'block';

    pageNum.innerText = (index + 1).toString().padStart(2, '0');
    updateHints();

    const post = posts[index];
    postView.innerHTML = `
        <div class="meta-block">
            TITEL: ${post.title}<br>
            DATUM: ${post.date} | ORT: ${post.location}<br>
            AUTOR: ${post.author}
        </div>
        <div class="post-body">
            ${post.content}
        </div>
    `;
}

function updateHints() {
    // Erkennt ob Touch gerät (grob)
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    if (viewState === 'list') {
        navHint.innerHTML = isTouch ? "TIPPEN ZUM ÖFFNEN" : "WÄHLEN: <span style='background:#0ff;color:#00a'>ENTER</span>";
    } else {
        navHint.innerHTML = isTouch ? "ZURÜCK: TIPPEN | NEXT: SWIPE" : "ZURÜCK: <span style='background:#0ff;color:#00a'>ESC</span>";
    }
}

// --- KEYBOARD NAVIGATION (Desktop) ---
document.addEventListener('keydown', (e) => {
    // Verhindert Scrollen mit Pfeiltasten
    if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].indexOf(e.code) > -1) {
        e.preventDefault();
    }

    if (viewState === 'list') {
        if (e.key === 'ArrowDown') {
            selectedIndex = (selectedIndex + 1) % posts.length;
            renderList();
        } else if (e.key === 'ArrowUp') {
            selectedIndex = (selectedIndex - 1 + posts.length) % posts.length;
            renderList();
        } else if (e.key === 'Enter') {
            openPost(selectedIndex);
        }
    } else if (viewState === 'post') {
        if (e.key === 'Escape' || e.key === 'Backspace') {
            renderList();
        } else if (e.key === 'ArrowRight') {
            let nextIdx = (currentPostId + 1) % posts.length;
            openPost(nextIdx);
        } else if (e.key === 'ArrowLeft') {
            let prevIdx = (currentPostId - 1 + posts.length) % posts.length;
            openPost(prevIdx);
        }
    }
});

// --- TOUCH NAVIGATION (Mobile/Tablet) ---
// Swipe Erkennung
document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
});

document.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
});

function handleSwipe() {
    // Swipe Logik nur im Post-View oder auch Liste? Hier nur Post-View für Next/Prev
    if (viewState === 'post') {
        if (touchEndX < touchStartX - 50) { // Swipe Links -> Nächster
            let nextIdx = (currentPostId + 1) % posts.length;
            openPost(nextIdx);
        }
        if (touchEndX > touchStartX + 50) { // Swipe Rechts -> Vorheriger
            let prevIdx = (currentPostId - 1 + posts.length) % posts.length;
            openPost(prevIdx);
        }
    }
}

// Zurück zur Liste bei Tippen auf Header (als "Home Button" Alternative auf Handy)
document.querySelector('header').addEventListener('click', () => {
    if(viewState === 'post') renderList();
});

// Start
loadPosts();