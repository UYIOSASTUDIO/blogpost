const fs = require('fs');
const path = require('path');

// --- KONFIGURATION ---
const FILES_DIR = './files';       // Dein Quellordner
const OUTPUT_FILE = './files.json'; // Deine Ziel-JSON

// Helper: Typ erkennen
function getType(ext) {
    ext = ext.toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'].includes(ext)) return 'IMG';
    if (['.pdf'].includes(ext)) return 'PDF';
    if (['.txt', '.md', '.json', '.log', '.js', '.css', '.html'].includes(ext)) return 'TXT';
    if (['.exe', '.bin', '.bat', '.sh', '.iso'].includes(ext)) return 'BIN';
    if (['.mp3', '.wav', '.ogg'].includes(ext)) return 'AUD';
    if (['.mp4', '.mov', '.avi', '.mkv'].includes(ext)) return 'VID';
    if (['.zip', '.rar', '.7z', '.tar'].includes(ext)) return 'ARC';
    return 'DAT';
}

// Helper: Größe formatieren
function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(0) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
}

// --- REKURSIVE SCAN FUNKTION ---
function scanDirectory(dirPath) {
    // Liest den Inhalt des aktuellen Ordners
    const items = fs.readdirSync(dirPath);
    const result = [];

    items.forEach(item => {
        // Ignoriere versteckte Dateien (starten mit Punkt)
        if (item.startsWith('.')) return;

        const fullPath = path.join(dirPath, item);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
            // ---> ES IST EIN ORDNER
            console.log(`📁 Ordner gefunden: ${item}`);

            result.push({
                filename: item,     // Name des Ordners (für die Anzeige)
                type: 'DIR',        // Typ für das Icon
                // Hier ruft sich die Funktion SELBST auf (Magie der Rekursion!)
                content: scanDirectory(fullPath)
            });

        } else if (stats.isFile()) {
            // ---> ES IST EINE DATEI
            const ext = path.extname(item);

            // Relativer Pfad berechnen (z.B. "unterordner/bild.jpg")
            // Wichtig: Wir ersetzen Backslashes (Windows) durch Slashes (Web)
            const relativePath = path.relative(FILES_DIR, fullPath).replace(/\\/g, '/');

            result.push({
                filename: item,
                filepath: relativePath, // WICHTIG: Der Pfad für window.open()
                type: getType(ext),
                size: formatSize(stats.size)
            });

            console.log(`   📄 Datei: ${item}`);
        }
    });

    return result;
}

// --- HAUPTPROGRAMM ---
console.log(`🚀 Starte Scan in "${FILES_DIR}"...`);

if (!fs.existsSync(FILES_DIR)) {
    console.error(`❌ Fehler: Ordner "${FILES_DIR}" existiert nicht.`);
    process.exit(1);
}

const data = scanDirectory(FILES_DIR);

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));

console.log(`✅ Fertig! Struktur erfolgreich in "${OUTPUT_FILE}" gespeichert.`);