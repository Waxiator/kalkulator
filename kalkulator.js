document.addEventListener('DOMContentLoaded', () => {

    let elementsData = [];
    let uvMap = new Map();

    // --- Inicjalizacja wszystkich komponentów ---
    async function initialize() {
        setupThemeToggle(); // Logika przełącznika motywu
        
        try {
            const response = await fetch('PeriodicTable_UV.json');
            if (!response.ok) throw new Error("Błąd sieci");
            const data = await response.json();
            
            elementsData = data.elements;
            uvMap = new Map(elementsData.map(el => [el.symbol, el.odpornosc_uv]));

            renderElementList(elementsData);
            setupSearch();
            setupCalculator();
            setupModal();

        } catch (error) {
            console.error("Nie udało się załadować danych o pierwiastkach:", error);
            document.querySelector('.search-section').innerHTML = "<p style='color:red'>Błąd ładowania danych.</p>";
        }
    }

    // --- LOGIKA MOTYWU ---
    function setupThemeToggle() {
        // ... (skopiowane z poprzedniego skryptu)
        const toggleBtn = document.getElementById('theme-toggle-btn');
        const sunIcon = document.getElementById('sun-icon');
        const moonIcon = document.getElementById('moon-icon');
        function updateIcons(theme) {
            if (theme === 'dark') { moonIcon.style.display = 'none'; sunIcon.style.display = 'block'; } 
            else { sunIcon.style.display = 'none'; moonIcon.style.display = 'block'; }
        }
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.body.className = savedTheme === 'dark' ? 'dark-mode' : '';
        updateIcons(savedTheme);
        toggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            let currentTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
            localStorage.setItem('theme', currentTheme);
            updateIcons(currentTheme);
        });
    }

    // --- LOGIKA LISTY PIERWIASTKÓW ---
    function renderElementList(elements) {
        const listContainer = document.getElementById('element-list');
        listContainer.innerHTML = ''; // Wyczyść listę
        
        if (elements.length === 0) {
            listContainer.innerHTML = '<p style="text-align:center; padding: 20px;">Brak wyników</p>';
            return;
        }

        elements.forEach(el => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.dataset.symbol = el.symbol; // Zapisujemy symbol do późniejszego odczytu
            item.innerHTML = `
                <div class="list-item-symbol">${el.symbol}</div>
                <div class="list-item-name">${el.name}</div>
            `;
            listContainer.appendChild(item);
        });
    }

    function setupSearch() {
        const searchInput = document.getElementById('search-input');
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase().trim();
            const filtered = elementsData.filter(el => 
                el.name.toLowerCase().includes(query) ||
                el.symbol.toLowerCase().includes(query)
            );
            renderElementList(filtered);
        });
    }

    // --- LOGIKA MODALA (OKNA ZE SZCZEGÓŁAMI) ---
    function setupModal() {
        const overlay = document.getElementById('modal-overlay');
        const closeBtn = document.getElementById('modal-close-btn');
        const listContainer = document.getElementById('element-list');
        const modalDetails = document.getElementById('modal-details');

        function openModal(element) {
            modalDetails.innerHTML = `
                <h2>${element.name} (${element.symbol})</h2>
                <p><strong>Liczba atomowa:</strong> ${element.number}</p>
                <p><strong>Masa atomowa:</strong> ${element.atomic_mass.toFixed(4)} u</p>
                <p><strong>Grupa:</strong> ${element.group || 'N/A'}</p>
                <p><strong>Okres:</strong> ${element.period}</p>
                <p><strong>Odporność UV:</strong> <span class="uv-value">${element.odpornosc_uv} / 10</span></p>
            `;
            overlay.classList.remove('hidden');
        }

        function closeModal() {
            overlay.classList.add('hidden');
        }

        listContainer.addEventListener('click', (event) => {
            const item = event.target.closest('.list-item');
            if (item) {
                const symbol = item.dataset.symbol;
                const element = elementsData.find(el => el.symbol === symbol);
                if (element) {
                    openModal(element);
                }
            }
        });

        closeBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) { // Zamyka tylko po kliknięciu na tło, a nie na okno
                closeModal();
            }
        });
    }

    // --- LOGIKA KALKULATORA ---
    function setupCalculator() { /* ... identyczna jak w poprzednim pliku ... */
        const calculateBtn = document.getElementById('calculate-btn'); const compoundInput = document.getElementById('compound-input');
        const resultDiv = document.getElementById('calculator-result');
        calculateBtn.addEventListener('click', () => {
            const formula = compoundInput.value.trim(); if (!formula) { resultDiv.textContent = 'Wpisz wzór.'; resultDiv.style.color = 'orange'; return; }
            try {
                const parsed = parseFormula(formula); let isPureLevel10 = true;
                for (const symbol in parsed) { if (uvMap.get(symbol) < 10) { isPureLevel10 = false; break; } }
                let finalResult;
                if (isPureLevel10) { finalResult = 10; } 
                else {
                    let totalUvResistance = 0;
                    for (const symbol in parsed) { const count = parsed[symbol]; const uvValue = uvMap.get(symbol); totalUvResistance += uvValue * count; }
                    const rawResult = totalUvResistance / 4.30; const flooredResult = Math.floor(rawResult);
                    finalResult = Math.min(flooredResult, 9);
                }
                resultDiv.innerHTML = `Finalna Odporność: <span class="uv-value">${finalResult} / 10</span>`;
                resultDiv.style.color = 'var(--text-color)';
            } catch (error) { resultDiv.textContent = error.message; resultDiv.style.color = 'red'; }
        });
    }

    function parseFormula(formula) { /* ... identyczna jak w poprzednim pliku ... */
        const regex = /([A-Z][a-z]*)(\d*)/g; const result = {}; let match; const normalizedFormula = formula.trim();
        if (normalizedFormula.length === 0) throw new Error("Wzór jest pusty.");
        while ((match = regex.exec(normalizedFormula)) !== null) {
            const element = match[1]; const count = match[2] ? parseInt(match[2], 10) : 1;
            if (uvMap.has(element)) { result[element] = (result[element] || 0) + count; } 
            else { throw new Error(`Nieznany pierwiastek: ${element}`); }
        }
        const parsedString = Object.entries(result).map(([el, count]) => el + (count > 1 ? count : '')).join('');
        if (parsedString.length !== normalizedFormula.length) throw new Error("Nieprawidłowy format wzoru.");
        return result;
    }

    // --- URUCHOMIENIE APLIKACJI ---
    initialize();
});