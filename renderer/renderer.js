// Simple renderer script: parse CSV, recode categorical to numeric, send to main for processing
const fileInput = document.getElementById('file');
const runBtn = document.getElementById('run');
const status = document.getElementById('status');
const resultRows = document.getElementById('result-rows');

function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    const rows = lines.map(l => l.split(',').map(s => s.trim()));
    const header = rows[0];
    const dataRows = rows.slice(1);
    return { header, dataRows };
}

function recode(rows) {
    // rows: array of arrays of strings
    const cols = rows[0].length;
    const maps = Array.from({ length: cols }, () => new Map());
    const nextId = Array.from({ length: cols }, () => 1);
    const numeric = rows.map(r => {
        return r.map((cell, i) => {
            const val = cell === '' ? null : cell;
            // try number
            const n = Number(val);
            if (!Number.isNaN(n) && val !== '') return n;
            // categorical -> map to int
            const m = maps[i];
            if (m.has(val)) return m.get(val);
            const id = nextId[i]++;
            m.set(val, id);
            return id;
        });
    });
    return numeric;
}

function showStatus(msg) { status.innerText = msg; }

runBtn.addEventListener('click', async () => {
    const f = fileInput.files[0];
    if (!f) { showStatus('Selecciona un CSV primero'); return; }
    showStatus('Leyendo archivo...');
    const text = await f.text();
    const { header, dataRows } = parseCSV(text);
    showStatus('Recodificando...');
    const data = recode(dataRows);
    showStatus('Enviando datos al motor...');
    const params = {
        contamination: Number(document.getElementById('contamination').value) || 0.05,
        nTrees: Number(document.getElementById('nTrees').value) || 100
    };
    try {
        const resp = await window.api.runIsolation({ data, params });
        if (!resp.success) throw new Error(resp.error || 'Error desconocido');
        showResults(header, dataRows, resp.result);
        showStatus('Completado');
    } catch (err) {
        showStatus('Error: ' + err.message);
    }
});

function showResults(header, rawRows, result) {
    // result: { scores: [...], labels: [...] }
    resultRows.innerHTML = '';
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const thr = document.createElement('tr');
    // add columns
    header.forEach(h => { const th = document.createElement('th'); th.innerText = h; thr.appendChild(th); });
    const thScore = document.createElement('th'); thScore.innerText = 'score'; thr.appendChild(thScore);
    thead.appendChild(thr);
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    rawRows.forEach((r, idx) => {
        const tr = document.createElement('tr');
        if (result.labels && result.labels[idx]) tr.classList.add('anomaly');
        r.forEach(c => { const td = document.createElement('td'); td.innerText = c; tr.appendChild(td); });
        const tdScore = document.createElement('td'); tdScore.innerText = (result.scores && result.scores[idx]) ? result.scores[idx].toFixed(4) : '';
        tr.appendChild(tdScore);
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    resultRows.appendChild(table);
}
