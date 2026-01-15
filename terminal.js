document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('term-input');
    const output = document.getElementById('term-output');
    const termScreen = document.getElementById('term-screen');
    const termWindow = document.getElementById('win-term');
    const promptLabel = document.getElementById('term-prompt');

    // WICHTIG: Hier holen wir jetzt den Wrapper, nicht mehr den Text-Span
    // (Stelle sicher, dass du in index.html die ID auf 'term-visual-wrapper' geändert hast!)
    const visualWrapper = document.getElementById('term-visual-wrapper');

    let commandHistory = [];
    let historyIndex = -1;

    let termStack = [];
    let termPathStack = ['A:\\FILES'];
    let termCurrentContent = null;

    termWindow.addEventListener('click', () => { input.focus(); });
    setTimeout(() => { if(input) input.focus(); }, 100);
    input.addEventListener('select', syncInput);


    // --- INTELLIGENTE SYNC FUNCTION ---
    const syncInput = () => {
        if (!visualWrapper || !input) return;

        const val = input.value;
        // Wir holen Start UND Ende der Auswahl
        const start = input.selectionStart;
        const end = input.selectionEnd;

        // Helper: HTML-Escaping
        const safeText = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        // FALL 1: TEXT IST MARKIERT (Selection)
        if (start !== end) {
            const before = val.slice(0, start);
            const selected = val.slice(start, end);
            const after = val.slice(end);

            visualWrapper.innerHTML =
                safeText(before) +
                `<span class="term-selected-text">${safeText(selected)}</span>` +
                safeText(after);
            return;
        }

        // FALL 2: KEINE MARKIERUNG (Normaler Cursor)
        if (start >= val.length) {
            // Cursor am Ende -> Block anhängen (mit &nbsp; für Breite)
            visualWrapper.innerHTML = safeText(val) + '<span class="term-cursor-char">&nbsp;</span>';
        } else {
            // Cursor mitten im Text -> Buchstabe animieren
            const before = val.slice(0, start);
            const charUnderCursor = val.slice(start, start + 1);
            const after = val.slice(start + 1);

            visualWrapper.innerHTML =
                safeText(before) +
                `<span class="term-cursor-char">${safeText(charUnderCursor)}</span>` +
                safeText(after);
        }
    };

    // --- EVENT LISTENER FÜR DEN CURSOR ---
    // Wir müssen auf alles hören, was den Cursor bewegen könnte
    input.addEventListener('input', syncInput);    // Tippen
    input.addEventListener('click', syncInput);    // Maus-Klick
    input.addEventListener('keyup', syncInput);    // Pfeiltasten loslassen
    input.addEventListener('keydown', syncInput);  // Pfeiltasten drücken (für schnelles Feedback)

    // --- INPUT HANDLER ---
    input.addEventListener('keydown', (e) => {

        if (typeof activeApp !== 'undefined' && activeApp !== 'term') {
            e.preventDefault();
            return; // Abbrechen, wenn Terminal nicht aktiv ist
        }

        if (e.key === 'Enter') {
            e.stopPropagation();
            e.preventDefault();

            const rawInput = input.value;

            // Prompt für das Log bauen
            const currentPrompt = termPathStack.join('\\') + ">";
            printLine(`${currentPrompt} ${rawInput}`);

            if (rawInput.trim()) {
                commandHistory.push(rawInput);
                historyIndex = commandHistory.length;
            }

            // Commands verarbeiten (mit Chain Support &&)
            const commands = rawInput.split('&&');
            processCommandChain(commands);

            input.value = '';
            syncInput();
            scrollToBottom();
        }

        // History Logic (in input keydown)
        if (!e.altKey && !e.metaKey && !e.ctrlKey) {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (historyIndex > 0) {
                    historyIndex--;
                    input.value = commandHistory[historyIndex];
                    syncInput(); // <--- HIER EINFÜGEN
                }
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (historyIndex < commandHistory.length - 1) {
                    historyIndex++;
                    input.value = commandHistory[historyIndex];
                    syncInput(); // <--- HIER EINFÜGEN
                } else {
                    historyIndex = commandHistory.length;
                    input.value = '';
                    syncInput(); // <--- HIER EINFÜGEN
                }
            }
        }
    });

    async function processCommandChain(cmds) {
        for (let cmdStr of cmds) {
            await processCommand(cmdStr.trim());
        }
        scrollToBottom();
        updatePrompt();
    }

    // --- HAUPTLOGIK ---
    async function processCommand(rawCmd) {
        if (!rawCmd) return;

        const parts = rawCmd.split(' ');
        const cmd = parts[0].toLowerCase();
        const arg = parts.slice(1).join(' ');

        // Sicherstellen, dass Daten da sind (filesData kommt aus script.js global)
        if (typeof filesData === 'undefined' || filesData.length === 0) {
            printLine("Error: Drive A: not ready.");
            return;
        }

        switch (cmd) {
            case 'help':
                printLine("COMMANDS:");
                printLine("  LS / DIR       - List files");
                printLine("  CD [DIR]       - Change directory");
                printLine("  CAT [FILE]     - Read text file");
                printLine("  OPEN [FILE]    - Launch file");
                printLine("  CLS            - Clear screen");
                printLine("  EXIT           - Close terminal");
                break;

            case 'ls':
            case 'dir':
                listFiles();
                break;

            case 'cd':
                changeDirectory(arg);
                break;

            case 'cat':
            case 'type':
                await readFileContent(arg);
                break;

            case 'open':
            case 'start':
                openFile(arg);
                break;

            case 'cls':
            case 'clear':
                output.innerHTML = '';
                break;

            case 'exit':
                if (window.closeApp) window.closeApp('term');
                break;

            case 'whoami':
                printLine("ADMINISTRATOR (ROOT)");
                break;

            default:
                printLine(`Bad command or file name: "${cmd}"`);
        }
    }

    // --- HELPER: Hole den aktuellen Inhalt ---
    function getCurrentContent() {
        // Wenn termCurrentContent null ist, sind wir im Root (filesData)
        return termCurrentContent || filesData;
    }

    // --- 1. LS / DIR ---
    function listFiles() {
        const files = getCurrentContent();

        if (!files || files.length === 0) {
            printLine("(Empty directory)");
            return;
        }

        printLine("");
        // Header an die neuen Breiten anpassen
        // TYPE (8 chars) | SIZE (10 chars) | NAME
        printLine("TYPE     SIZE       NAME");
        printLine("-------  ---------  ----------------");

        files.forEach(file => {
            // 1. Type formatieren (z.B. 8 Zeichen Platz)
            let typeRaw = (file.type || 'UNK');
            if (file.type === 'DIR') typeRaw = '<DIR>';

            const type = typeRaw.padEnd(9, ' '); // 9 = 8 Zeichen + 1 Abstand

            // 2. Size formatieren (z.B. 10 Zeichen Platz)
            const size = (file.size || '0B').padEnd(11, ' '); // 11 = 10 Zeichen + 1 Abstand

            // 3. Name formatieren
            let name = file.filename;
            if (file.type === 'DIR') name = `[${name}]`;

            // Zusammenbauen
            printLine(`${type}${size}${name}`);
        });
        printLine("");
        printLine(` ${files.length} File(s)`);
    }

    // --- 2. CD (Unabhängige Navigation) ---
    function changeDirectory(target) {
        // A) Nach oben (..)
        if (target === '..' || target === '../' || target === '/..') {
            if (termStack.length > 0) {
                // Stack Pop: Wir holen den Eltern-Ordner zurück
                termCurrentContent = termStack.pop();
                termPathStack.pop();

                // Spezialfall: Wenn Stack leer ist, sind wir wieder im Root (null)
                if (termStack.length === 0 && termCurrentContent === filesData) {
                    termCurrentContent = null;
                }
            } else {
                // Wenn wir schon im Root waren und Stack leer war
                if (termCurrentContent === null) {
                    printLine("Access denied: Already at root.");
                    return;
                }
                // Fallback Root Reset
                termCurrentContent = null;
            }
            return;
        }

        // B) Nach unten (Ordnername)
        const currentFiles = getCurrentContent();
        const folder = currentFiles.find(f => f.filename.toLowerCase() === target.toLowerCase());

        if (folder && folder.type === 'DIR') {
            // Aktuellen Zustand auf Stack legen (damit wir zurück können)
            termStack.push(termCurrentContent || filesData);

            // In den neuen Ordner wechseln
            termCurrentContent = folder.content;

            // Pfad updaten
            termPathStack.push(folder.filename.toUpperCase());
        } else {
            printLine("System cannot find the path specified.");
        }
    }

    // --- 3. CAT (Text lesen) ---
    async function readFileContent(filename) {
        if (!filename) { printLine("Usage: cat [filename]"); return; }

        const files = getCurrentContent();
        const file = files.find(f => f.filename.toLowerCase() === filename.toLowerCase());

        if (!file) { printLine("File not found."); return; }
        if (file.type === 'DIR') { printLine("Error: Is a directory."); return; }
        if (['IMG', 'BIN', 'AUD', 'VID', 'PDF', 'XLS'].includes(file.type)) {
            printLine(`Binary file. Use OPEN instead.`);
            return;
        }

        printLine(`Reading ${file.filename}...`);
        try {
            const path = file.filepath || file.filename;
            const safePath = path.replace(/\\/g, '/');
            const response = await fetch(`files/${safePath}`);
            if (response.ok) {
                const text = await response.text();
                const lines = text.split('\n');
                printLine("--- START ---");
                lines.forEach(line => printLine(line));
                printLine("--- END ---");
            } else {
                printLine("Read Error.");
            }
        } catch (e) {
            printLine("IO Error.");
        }
    }

    // --- 4. OPEN (Datei öffnen) ---
    function openFile(filename) {
        if (!filename) { printLine("Usage: open [filename]"); return; }

        const files = getCurrentContent();
        const file = files.find(f => f.filename.toLowerCase() === filename.toLowerCase());

        if (file) {
            printLine(`Launching ${file.filename}...`);
            const path = file.filepath || file.filename;
            window.open(`files/${path}`, '_blank');
        } else {
            printLine("File not found.");
        }
    }

    // --- UI HELPER ---
    function updatePrompt() {
        promptLabel.innerText = termPathStack.join('\\') + ">";
    }

    function printLine(text) {
        const div = document.createElement('div');
        div.className = 'term-line';
        div.innerText = text;
        output.appendChild(div);
    }

    function scrollToBottom() {
        termScreen.scrollTop = termScreen.scrollHeight;
    }
});