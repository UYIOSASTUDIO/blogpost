let posts = [];
let viewState = 'list';
let selectedIndex = 0;
let currentPostId = null;

// DOM Elemente
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

// --- RENDER LISTE ---
function renderList() {
    viewState = 'list';
    postView.style.display = 'none';
    listView.style.display = 'flex'; // Wichtig: Flexbox für items
    listView.style.flexDirection = 'column';

    // Footer Update
    hintSelect.innerText = "ÖFFNEN";

    listView.innerHTML = '';

    // Header für die Liste (wie im Bild "NOM: ...")
    const listHeader = document.createElement('div');
    listHeader.style.marginBottom = "10px";
    listHeader.innerHTML = "INDEX DES POSTS: <br>----------------";
    listView.appendChild(listHeader);

    posts.forEach((post, index) => {
        const div = document.createElement('div');
        // Aktives Element bekommt die Klasse .active (Blauer Hintergrund)
        div.className = `post-item ${index === selectedIndex ? 'active' : ''}`;

        // HTML Struktur mit Füllpunkten
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

    // Footer Update
    hintSelect.innerText = "ZURÜCK";

    const post = posts[index];

    // Struktur wie die Formularfelder im Bild
    postView.innerHTML = `
        <div class="meta-row">
            <span class="label">TITEL:</span>
            <span class="value">${post.title}</span>
        </div>
        <div class="meta-row">
            <span class="label">RUBRIK:</span>
            <span class="value">${post.location}</span>
        </div>
        <div class="meta-row">
            <span class="label">AUTOR:</span>
            <span class="value">${post.author}</span>
        </div>
        
        <div class="post-body">
            ${post.content}
        </div>
    `;
}

// --- NAVIGATION ---
document.addEventListener('keydown', (e) => {
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
        } else if (e.key === 'Enter') {
            renderList(); // Enter im Post bringt dich zurück (optional)
        }
    }
});

// Touch Swipe (Unverändert gut)
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

// Home Button Logic
document.querySelector('header').addEventListener('click', () => {
    if(viewState === 'post') renderList();
});

loadPosts();