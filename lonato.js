(function() {
    // ---- Configuration ----
    const COLS = 5;           // 5 colonnes
    const DIGITS_PER_PAIR = 2; // 2 chiffres par paire
    const MIN = 0;
    const MAX = 9;
    const MAX_PAIR_VALUE = 90;
    const COLUMN_INTERVAL = 350; // décalage entre chaque colonne (ms)
    const HISTORY_MAX = 12;
    const MIN_ROLL_SECONDS = 9;
    const MAX_ROLL_SECONDS = 18;

    // ---- État ----
    let currentDraw = Array(COLS).fill(null).map(() => [null, null]);
    let isRolling = false;
    let history = [];

    // ---- DOM ----
    const gridEl = document.getElementById('grid');
    const btnTirage = document.getElementById('btnTirage');
    const btnReset = document.getElementById('btnReset');
    const statusEl = document.getElementById('status');
    const historyList = document.getElementById('historyList');

    // ---- Initialisation de la grille ----
    function buildGrid() {
        gridEl.innerHTML = '';
        for (let c = 0; c < COLS; c++) {
            const col = document.createElement('div');
            col.className = 'col';

            const label = document.createElement('div');
            label.className = 'col-label';
            label.textContent = `Colonne ${c + 1}`;

            const pair = document.createElement('div');
            pair.className = 'number-pair';
            pair.id = `pair-${c}`;

            const digits = document.createElement('div');
            digits.className = 'digits';
            digits.id = `digits-${c}`;

            // Créer les 2 emplacements de chiffres
            for (let d = 0; d < DIGITS_PER_PAIR; d++) {
                const digitEl = document.createElement('input');
                digitEl.type = 'text';
                digitEl.inputMode = 'numeric';
                digitEl.maxLength = 1;
                digitEl.className = 'digit';
                digitEl.id = `digit-${c}-${d}`;
                digitEl.placeholder = '—';
                digitEl.value = '';
                digitEl.addEventListener('input', () => sanitizeDigitInput(digitEl));
                digits.appendChild(digitEl);
            }

            pair.appendChild(digits);
            col.appendChild(label);
            col.appendChild(pair);
            gridEl.appendChild(col);
        }
    }

    function sanitizeDigitInput(input) {
        const sanitized = input.value.replace(/\D/g, '').slice(0, 1);
        if (sanitized === '') {
            input.value = '';
            return;
        }

        const digit = Number(sanitized);
        if (!Number.isInteger(digit) || digit < MIN || digit > MAX) {
            input.value = '';
            return;
        }

        input.value = String(digit);
    }

    function readDigitValue(colIndex, digitIndex) {
        const input = document.getElementById(`digit-${colIndex}-${digitIndex}`);
        if (!input) return null;

        const value = input.value.trim();
        if (value === '') return null;

        const digit = Number(value);
        return Number.isInteger(digit) && digit >= MIN && digit <= MAX ? digit : null;
    }

    // ---- Affichage d'un état ----
    function renderState(state) {
        for (let c = 0; c < COLS; c++) {
            for (let d = 0; d < DIGITS_PER_PAIR; d++) {
                const el = document.getElementById(`digit-${c}-${d}`);
                if (state[c][d] !== null) {
                    el.value = String(state[c][d]);
                } else {
                    el.value = '';
                }
            }
        }
    }

    // ---- Génération d'un tirage complet ----
    function generateDraw() {
        const usedValues = new Set();
        const draw = [];

        while (draw.length < COLS) {
            const value = Math.floor(Math.random() * (MAX_PAIR_VALUE + 1));
            if (usedValues.has(value)) continue;

            usedValues.add(value);
            const valueAsString = String(value).padStart(2, '0');
            draw.push([
                Number(valueAsString[0]),
                Number(valueAsString[1])
            ]);
        }

        return draw;
    }

    function randomDigitInRange() {
        return Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;
    }

    function randomPairInRange(preferredPair = null) {
        if (preferredPair && preferredPair[0] !== null && preferredPair[1] !== null && Math.random() < 0.15) {
            return preferredPair;
        }

        const value = Math.floor(Math.random() * (MAX_PAIR_VALUE + 1));
        const valueAsString = String(value).padStart(2, '0');
        return [Number(valueAsString[0]), Number(valueAsString[1])];
    }

    // ---- Animation de roulement pour une colonne ----
    function rollColumn(colIndex, finalDigits, delay, preferredPair = [null, null], durationMs = 1000) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const digitsEls = [];
                for (let d = 0; d < DIGITS_PER_PAIR; d++) {
                    digitsEls.push(document.getElementById(`digit-${colIndex}-${d}`));
                }
                digitsEls.forEach(el => el.disabled = true);
                const pairEl = document.getElementById(`pair-${colIndex}`);

                // Ajouter la classe rolling
                digitsEls.forEach(el => el.classList.add('rolling'));
                pairEl.classList.add('revealed');

                const rollInterval = 60;
                const rollChanges = Math.max(12, Math.floor(durationMs / rollInterval));

                let count = 0;
                const intervalId = setInterval(() => {
                    const rollingPair = randomPairInRange(preferredPair);
                    digitsEls.forEach((el, idx) => {
                        el.value = String(rollingPair[idx]);
                    });
                    count++;

                    if (count >= rollChanges) {
                        clearInterval(intervalId);
                        // Afficher les chiffres finaux
                        digitsEls.forEach((el, idx) => {
                            el.value = String(finalDigits[idx]);
                            el.classList.remove('rolling');
                            el.classList.add('final');
                            el.disabled = false;
                        });
                        resolve();
                    }
                }, rollInterval);
            }, delay);
        });
    }

    // ---- Lancer le tirage complet ----
    async function startDraw() {
        if (isRolling) return;
        isRolling = true;
        btnTirage.disabled = true;
        statusEl.textContent = '🎰 Tirage en cours…';

        // Réinitialiser les classes finales et rolling
        for (let c = 0; c < COLS; c++) {
            for (let d = 0; d < DIGITS_PER_PAIR; d++) {
                const el = document.getElementById(`digit-${c}-${d}`);
                el.classList.remove('rolling', 'final');
                el.disabled = true;
            }
            document.getElementById(`pair-${c}`).classList.remove('revealed');
        }

        const preferredDigits = Array.from({ length: COLS }, (_, c) => [
            readDigitValue(c, 0),
            readDigitValue(c, 1)
        ]);

        const totalDurationMs = Math.floor(Math.random() * (MAX_ROLL_SECONDS - MIN_ROLL_SECONDS + 1) + MIN_ROLL_SECONDS) * 1000;
        const durationPerColumn = totalDurationMs / COLS;

        // Générer les vrais chiffres de résultat final (toujours entre 0 et 9)
        const draw = generateDraw();
        currentDraw = draw;

        // Lancer l'animation colonne par colonne avec décalage
        for (let c = 0; c < COLS; c++) {
            await rollColumn(c, draw[c], 0, preferredDigits[c], durationPerColumn);
            // Petit délai entre les colonnes (sauf la dernière)
            if (c < COLS - 1) {
                await new Promise(r => setTimeout(r, COLUMN_INTERVAL));
            }
        }

        // Ajouter à l'historique
        addHistory(draw);
        statusEl.textContent = '✅ Tirage terminé !';
        isRolling = false;
        btnTirage.disabled = false;
        for (let c = 0; c < COLS; c++) {
            for (let d = 0; d < DIGITS_PER_PAIR; d++) {
                document.getElementById(`digit-${c}-${d}`).disabled = false;
            }
        }
    }

    // ---- Historique ----
    function addHistory(draw) {
        const formatted = draw.map(pair => `${pair[0]}${pair[1]}`).join(' · ');
        history.unshift(formatted);
        if (history.length > HISTORY_MAX) history.pop();
        renderHistory();
    }

    function renderHistory() {
        historyList.innerHTML = '';
        if (history.length === 0) {
            historyList.innerHTML = '<span style="color:rgba(255,255,255,0.15);font-size:0.75rem;">Aucun tirage pour le moment</span>';
            return;
        }
        history.forEach(item => {
            const el = document.createElement('span');
            el.className = 'history-item';
            el.textContent = item;
            historyList.appendChild(el);
        });
    }

    // ---- Reset ----
    function resetAll() {
        if (isRolling) return;
        currentDraw = Array(COLS).fill(null).map(() => [null, null]);
        for (let c = 0; c < COLS; c++) {
            for (let d = 0; d < DIGITS_PER_PAIR; d++) {
                const el = document.getElementById(`digit-${c}-${d}`);
                el.value = '';
                el.classList.remove('rolling', 'final');
                el.disabled = false;
            }
            document.getElementById(`pair-${c}`).classList.remove('revealed');
        }

        history = [];
        renderHistory();
        statusEl.textContent = '🔄 Réinitialisé — prêt pour un nouveau tirage';
    }

    // ---- Événements ----
    btnTirage.addEventListener('click', startDraw);
    btnReset.addEventListener('click', resetAll);

    // ---- Démarrage ----
    buildGrid();
    renderState(currentDraw);
    renderHistory();
    statusEl.textContent = '🔴 Prêt — appuie sur "Lancer le tirage"';
})();