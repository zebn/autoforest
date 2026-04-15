/**
 * Test: Manual anomaly detection vs IsolationForest vs AutoTuner
 * 
 * 1. Reads random-1000.csv
 * 2. Manually finds rows containing value 5 (known anomalies)
 * 3. Runs IsolationForest with fixed params
 * 4. Runs AutoTuner pipeline
 * 5. Compares results
 */

const fs = require('fs');
const path = require('path');
const { IsolationForest } = require('../src/isolationForest');
const { autoTune } = require('../src/autoTuner');

// ── Helpers ──────────────────────────────────────────────────────────────────

function readCSV(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
    const header = lines[0].split(',');
    const rows = lines.slice(1).map(l => l.split(',').map(Number));
    return { header, rows };
}

function f1Score(predicted, actual) {
    let tp = 0, fp = 0, fn = 0;
    for (let i = 0; i < predicted.length; i++) {
        if (predicted[i] && actual[i]) tp++;
        else if (predicted[i] && !actual[i]) fp++;
        else if (!predicted[i] && actual[i]) fn++;
    }
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;
    return { tp, fp, fn, precision, recall, f1 };
}

// ── Step 1: Manual detection ─────────────────────────────────────────────────

console.log('=== Test: Anomaly Detection Comparison ===\n');

const csvPath = path.join(__dirname, 'random-1000.csv');
const { header, rows } = readCSV(csvPath);
console.log(`Dataset: ${rows.length} rows × ${header.length} columns\n`);

// Manually find rows that contain value 5 (our injected anomalies)
const ANOMALY_VALUE = 5;
const manualAnomalies = [];
for (let i = 0; i < rows.length; i++) {
    if (rows[i].some(v => v === ANOMALY_VALUE)) {
        manualAnomalies.push(i);
    }
}

console.log(`[Manual] Found ${manualAnomalies.length} anomalies (rows with value=${ANOMALY_VALUE}):`);
manualAnomalies.forEach(idx => {
    const col = rows[idx].findIndex(v => v === ANOMALY_VALUE);
    console.log(`  Row ${idx + 1}: ${header[col]} = ${ANOMALY_VALUE}`);
});

const manualLabels = rows.map((_, i) => manualAnomalies.includes(i));

// ── Step 2: IsolationForest (fixed params) ───────────────────────────────────

console.log('\n--- IsolationForest (fixed params) ---');
const ifModel = new IsolationForest({
    nEstimators: 100,
    maxSamples: 256,
    contamination: manualAnomalies.length / rows.length,
    randomState: 42
});
ifModel.fit(rows);
const ifLabels = ifModel.predictBinary(rows);

const ifMetrics = f1Score(ifLabels, manualLabels);
const ifDetected = ifLabels.reduce((acc, v, i) => { if (v) acc.push(i); return acc; }, []);
console.log(`Detected ${ifDetected.length} anomalies`);
console.log(`  TP=${ifMetrics.tp}  FP=${ifMetrics.fp}  FN=${ifMetrics.fn}`);
console.log(`  Precision=${ifMetrics.precision.toFixed(3)}  Recall=${ifMetrics.recall.toFixed(3)}  F1=${ifMetrics.f1.toFixed(3)}`);

const ifHits = manualAnomalies.filter(i => ifLabels[i]);
console.log(`  Found ${ifHits.length}/${manualAnomalies.length} real anomalies: rows [${ifHits.map(i => i + 1).join(', ')}]`);
const ifFP = ifDetected.filter(i => !manualLabels[i]);
console.log(`  False positives (${ifFP.length}): rows [${ifFP.map(i => i + 1).join(', ')}]`);
const ifMissed = manualAnomalies.filter(i => !ifLabels[i]);
console.log(`  Missed (${ifMissed.length}): rows [${ifMissed.map(i => i + 1).join(', ')}]`);

// ── Step 3: AutoTuner ────────────────────────────────────────────────────────

console.log('\n--- AutoTuner ---');
(async () => {
    const result = await autoTune(rows, {
        progressCallback: (p) => {
            if (p.phase && p.message && !p.iteration) {
                process.stdout.write(`  ${p.message}\n`);
            }
        }
    });

    const atLabels = result.labels;
    const atMetrics = f1Score(atLabels, manualLabels);
    const atDetected = atLabels.reduce((acc, v, i) => { if (v) acc.push(i); return acc; }, []);

    console.log(`\nTuned params: S=${result.optimalParams.sampleSize}, T=${result.optimalParams.nTrees}, F=${result.optimalParams.maxFeatures}, D=${result.optimalParams.maxDepth}`);
    console.log(`Threshold=${result.optimalParams.threshold.toFixed(4)}, Contamination=${result.optimalParams.contamination.toFixed(4)}`);
    console.log(`Execution time: ${result.executionTime}ms`);
    console.log(`Detected ${atDetected.length} anomalies`);
    console.log(`  TP=${atMetrics.tp}  FP=${atMetrics.fp}  FN=${atMetrics.fn}`);
    console.log(`  Precision=${atMetrics.precision.toFixed(3)}  Recall=${atMetrics.recall.toFixed(3)}  F1=${atMetrics.f1.toFixed(3)}`);

    const atHits = manualAnomalies.filter(i => atLabels[i]);
    console.log(`  Found ${atHits.length}/${manualAnomalies.length} real anomalies: rows [${atHits.map(i => i + 1).join(', ')}]`);
    const atFP = atDetected.filter(i => !manualLabels[i]);
    console.log(`  False positives (${atFP.length}): rows [${atFP.map(i => i + 1).join(', ')}]`);
    const atMissed = manualAnomalies.filter(i => !atLabels[i]);
    console.log(`  Missed (${atMissed.length}): rows [${atMissed.map(i => i + 1).join(', ')}]`);

    // ── Summary ──────────────────────────────────────────────────────────────
    console.log('\n=== Summary ===');
    console.log(`Manual anomalies:       ${manualAnomalies.length}`);
    console.log(`IsolationForest F1:     ${ifMetrics.f1.toFixed(3)}`);
    console.log(`AutoTuner F1:           ${atMetrics.f1.toFixed(3)}`);
    console.log(`Winner:                 ${atMetrics.f1 >= ifMetrics.f1 ? 'AutoTuner' : 'IsolationForest'} (or tie)`);
})();
