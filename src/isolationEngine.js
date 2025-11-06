// isolationEngine: tries to use 'isolation-forest' npm package if available,
// otherwise falls back to a simple z-score based anomaly scoring as placeholder.

function mean(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }
function std(arr, mu) { mu = mu ?? mean(arr); return Math.sqrt(arr.reduce((a, b) => a + Math.pow(b - mu, 2), 0) / arr.length); }

async function fitAndScore(data, params = {}) {
    // data: array of rows, each row: array of numbers
    // params: { contamination: 0.05, nTrees: 100, ... }
    // Try to require the npm package
    try {
        const pkg = require('isolation-forest'); // may fail if not installed
        // If package exists, try to use a typical API; because packages vary, wrap safely
        if (pkg && typeof pkg.IsolationForest === 'function') {
            // example usage (best-effort); adapt later to real package API
            const Iso = pkg.IsolationForest;
            const iso = new Iso({ nEstimators: params.nTrees || 100 });
            iso.fit(data);
            const scores = iso.scores();
            const labels = labelFromContamination(scores, params.contamination || 0.05);
            return { scores, labels, engine: 'isolation-forest (npm)' };
        }
        // fallback if package's shape is different
        if (pkg && typeof pkg === 'function') {
            // some packages export a function
            const model = pkg({ nTrees: params.nTrees || 100 });
            if (model.fit) model.fit(data);
        }
    } catch (err) {
        // ignore: will use fallback
    }

    // Fallback: simple z-score based scoring
    const cols = data[0].length;
    const colStats = [];
    for (let j = 0; j < cols; j++) {
        const col = data.map(r => Number(r[j]));
        const mu = mean(col);
        const sd = std(col, mu) || 1e-9;
        colStats.push({ mu, sd });
    }
    const scores = data.map(r => {
        // compute max absolute zscore across features
        const zmax = r.reduce((acc, val, j) => {
            const z = Math.abs((Number(val) - colStats[j].mu) / colStats[j].sd);
            return Math.max(acc, z);
        }, 0);
        return zmax;
    });
    // normalize scores to 0-1
    const minS = Math.min(...scores);
    const maxS = Math.max(...scores);
    const norm = scores.map(s => (s - minS) / (maxS - minS + 1e-12));
    const labels = labelFromContamination(norm, params.contamination || 0.05);
    return { scores: norm, labels, engine: 'fallback-zscore' };
}

function labelFromContamination(scores, contamination) {
    // mark top fraction as anomalies
    const n = scores.length;
    const k = Math.max(1, Math.floor(n * (contamination || 0.05)));
    const idx = scores.map((s, i) => [s, i]).sort((a, b) => b[0] - a[0]).slice(0, k).map(x => x[1]);
    const labels = Array.from({ length: n }, () => false);
    idx.forEach(i => labels[i] = true);
    return labels;
}

module.exports = { fitAndScore };
