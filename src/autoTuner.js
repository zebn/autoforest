/**
 * AutoTuner - Iterative Heuristic-Based Parameter Tuning for Isolation Forest
 * 
 * Sequential pipeline: S → T → F → D → Th
 * Each step refines one parameter using the previous results.
 * No grid search or exhaustive search — pure heuristic + iterative convergence.
 * 
 * Based on: Saavedra et al. (2024) - Multivariate Automatic Tuning of Isolation Forest
 */

const { IsolationForest } = require('./isolationForest');

// ============================================================================
// Statistical Helpers
// ============================================================================

function mean(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function std(arr, mu) {
    if (arr.length === 0) return 0;
    mu = mu ?? mean(arr);
    return Math.sqrt(arr.reduce((a, b) => a + Math.pow(b - mu, 2), 0) / arr.length);
}

function percentile(arr, p) {
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

function normalize01(data) {
    const cols = data[0].length;
    const mins = Array(cols).fill(Infinity);
    const maxs = Array(cols).fill(-Infinity);
    for (const row of data) {
        for (let j = 0; j < cols; j++) {
            if (row[j] < mins[j]) mins[j] = row[j];
            if (row[j] > maxs[j]) maxs[j] = row[j];
        }
    }
    return data.map(row =>
        row.map((v, j) => {
            const range = maxs[j] - mins[j];
            return range > 1e-12 ? (v - mins[j]) / range : 0;
        })
    );
}

function columnVariances(data) {
    const cols = data[0].length;
    const variances = [];
    for (let j = 0; j < cols; j++) {
        const vals = data.map(r => r[j]);
        const mu = mean(vals);
        variances.push(vals.reduce((s, v) => s + (v - mu) ** 2, 0) / vals.length);
    }
    return variances;
}

// ============================================================================
// Synthetic Anomaly Injection
// ============================================================================

function injectAnomalies(data, fraction) {
    const n = data.length;
    const nAnomalies = Math.max(1, Math.round(n * fraction));
    const cols = data[0].length;

    const injected = data.map(r => [...r]);
    const trueLabels = new Array(n + nAnomalies).fill(false);

    const colStats = [];
    for (let j = 0; j < cols; j++) {
        const vals = data.map(r => r[j]);
        const mu = mean(vals);
        const sd = std(vals, mu) || 1;
        colStats.push({ mu, sd });
    }

    for (let i = 0; i < nAnomalies; i++) {
        const anomaly = [];
        for (let j = 0; j < cols; j++) {
            const direction = Math.random() > 0.5 ? 1 : -1;
            const magnitude = 3 + Math.random() * 2;
            anomaly.push(colStats[j].mu + direction * magnitude * colStats[j].sd);
        }
        injected.push(anomaly);
        trueLabels[n + i] = true;
    }

    return { data: injected, trueLabels, nInjected: nAnomalies };
}

// ============================================================================
// F1 Score
// ============================================================================

function computeF1(predictions, trueLabels) {
    let tp = 0, fp = 0, fn = 0;
    for (let i = 0; i < predictions.length; i++) {
        if (predictions[i] && trueLabels[i]) tp++;
        else if (predictions[i] && !trueLabels[i]) fp++;
        else if (!predictions[i] && trueLabels[i]) fn++;
    }
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    return precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;
}

// ============================================================================
// Step 1: Tune Sample Size (S)
// ============================================================================

function tuneSampleSize(data, progressCallback) {
    const n = data.length;
    let S = Math.min(256, n);
    const maxS = Math.min(n, 4096);
    let prevStd = Infinity;
    const history = [];
    const T_default = 50;
    const maxIter = 20;

    for (let iter = 0; iter < maxIter; iter++) {
        if (progressCallback) {
            progressCallback({
                phase: 'sampleSize', step: 'S',
                iteration: iter + 1, currentValue: S,
                message: `Tuning sample size: S=${S}`
            });
        }

        const model = new IsolationForest({
            nEstimators: T_default, maxSamples: S,
            maxFeatures: 1.0, contamination: 0.05, randomState: 42
        });
        model.fit(data);
        const scores = model.decisionFunction(data);
        const currentStd = std(scores);

        history.push({ S, std: currentStd });

        if (history.length >= 2) {
            const change = Math.abs(currentStd - prevStd) / (prevStd || 1e-9);
            if (change < 0.05) break;
        }

        prevStd = currentStd;
        const nextS = Math.min(Math.ceil(S * 1.1), maxS);
        if (nextS === S) break;
        S = nextS;
    }

    return { S, history };
}

// ============================================================================
// Step 2: Tune Number of Trees (T)
// ============================================================================

function tuneTrees(data, S, progressCallback) {
    const { data: augmented, trueLabels } = injectAnomalies(data, 0.01);

    let bestT = 50;
    let bestF1 = 0;
    const history = [];
    const f1Window = [];

    for (let T = 5; T <= 200; T += 5) {
        if (progressCallback) {
            progressCallback({
                phase: 'trees', step: 'T',
                iteration: Math.floor(T / 5), currentValue: T,
                message: `Tuning trees: T=${T}`
            });
        }

        const model = new IsolationForest({
            nEstimators: T, maxSamples: S,
            maxFeatures: 1.0, contamination: 0.05, randomState: 42
        });
        model.fit(augmented);
        const predictions = model.predictBinary(augmented);
        const f1 = computeF1(predictions, trueLabels);

        history.push({ T, f1 });
        f1Window.push(f1);

        if (f1 > bestF1) {
            bestF1 = f1;
            bestT = T;
        }

        if (f1Window.length >= 3) {
            const last3 = f1Window.slice(-3);
            const maxDiff = Math.max(...last3) - Math.min(...last3);
            if (maxDiff < 0.01 && T >= 20) break;
            if (f1Window.length > 3) f1Window.shift();
        }
    }

    return { T: bestT, bestF1, history };
}

// ============================================================================
// Step 3: Tune Max Features (F)
// ============================================================================

function tuneFeatures(data, S, T, progressCallback) {
    const nFeatures = data[0].length;
    if (nFeatures <= 1) return { F: 1.0, history: [] };

    const normalized = normalize01(data);
    const variances = columnVariances(normalized);
    const avgVariance = mean(variances);
    const history = [];

    let F = 1.0;
    const targetVariance = 0.08;
    const maxIter = 10;

    for (let iter = 0; iter < maxIter; iter++) {
        if (progressCallback) {
            progressCallback({
                phase: 'features', step: 'F',
                iteration: iter + 1, currentValue: F,
                message: `Tuning features: F=${F.toFixed(3)}`
            });
        }

        const nFeaturesUsed = Math.max(1, Math.round(nFeatures * F));
        const actualF = nFeaturesUsed / nFeatures;

        const { data: augmented, trueLabels } = injectAnomalies(data, 0.01);
        const model = new IsolationForest({
            nEstimators: T, maxSamples: S,
            maxFeatures: actualF, contamination: 0.05, randomState: 42
        });
        model.fit(augmented);
        const predictions = model.predictBinary(augmented);
        const f1 = computeF1(predictions, trueLabels);

        history.push({ F: actualF, f1, avgVariance });

        if (avgVariance > targetVariance * 2) {
            F = Math.max(1 / nFeatures, F * 0.5);
        } else if (avgVariance < targetVariance * 0.5) {
            F = Math.min(1.0, F * 1.5);
        } else {
            break;
        }

        if (history.length >= 2) {
            const prev = history[history.length - 2].F;
            if (Math.abs(actualF - prev) < 1e-6) break;
        }
    }

    const bestEntry = history.reduce((best, h) => h.f1 > best.f1 ? h : best, history[0]);
    return { F: bestEntry.F, history };
}

// ============================================================================
// Step 4: Tune Max Depth (D)
// ============================================================================

function tuneDepth(data, S, T, F, progressCallback) {
    const baseD = Math.ceil(Math.log2(S));
    let D = baseD;
    const history = [];
    const maxIter = 10;

    const { data: augmented, trueLabels } = injectAnomalies(data, 0.05);
    let prevD = D;

    for (let iter = 0; iter < maxIter; iter++) {
        if (progressCallback) {
            progressCallback({
                phase: 'depth', step: 'D',
                iteration: iter + 1, currentValue: D,
                message: `Tuning depth: D=${D}`
            });
        }

        const effectiveSamples = Math.min(Math.pow(2, D), augmented.length);
        const model = new IsolationForest({
            nEstimators: T, maxSamples: effectiveSamples,
            maxFeatures: F, contamination: 0.05, randomState: 42
        });
        model.fit(augmented);
        const scores = model.decisionFunction(augmented);

        const anomalyScores = scores.filter((_, i) => trueLabels[i]);
        const normalScores = scores.filter((_, i) => !trueLabels[i]);
        const avgAnomalyScore = mean(anomalyScores);
        const avgNormalScore = mean(normalScores);
        const q25 = percentile(scores, 25);
        const q75 = percentile(scores, 75);

        history.push({
            D, effectiveSamples,
            avgAnomalyScore, avgNormalScore,
            separation: avgAnomalyScore - avgNormalScore
        });

        if (avgAnomalyScore < q75) {
            D = Math.ceil(D * 1.2);
        } else if (avgNormalScore > q25) {
            D = Math.max(2, Math.floor(D * 0.8));
        } else {
            break;
        }

        if (D === prevD) break;
        prevD = D;
        D = Math.max(2, Math.min(D, 20));
    }

    const bestEntry = history.reduce((best, h) =>
        h.separation > best.separation ? h : best, history[0]);
    return { D: bestEntry.D, effectiveSamples: bestEntry.effectiveSamples, history };
}

// ============================================================================
// Step 5: Tune Threshold (Th) via Binary Search
// ============================================================================

function tuneThreshold(data, S, T, F, D, progressCallback, delta = 0.2) {
    const effectiveSamples = Math.min(Math.pow(2, D), data.length);

    const model = new IsolationForest({
        nEstimators: T, maxSamples: effectiveSamples,
        maxFeatures: F, contamination: 'auto', randomState: 42
    });
    model.fit(data);
    const scores = model.decisionFunction(data);

    let lo = 0.0;
    let hi = 1.0;
    let bestTh = 0.5;
    let bestCost = Infinity;
    const history = [];
    const maxIter = 20;

    for (let iter = 0; iter < maxIter; iter++) {
        const th = (lo + hi) / 2;

        if (progressCallback) {
            progressCallback({
                phase: 'threshold', step: 'Th',
                iteration: iter + 1, currentValue: th,
                message: `Tuning threshold: Th=${th.toFixed(4)}`
            });
        }

        const predictions = scores.map(s => s >= th);
        const nPredicted = predictions.filter(p => p).length;

        const injected = injectAnomalies(data, 0.05);
        const injModel = new IsolationForest({
            nEstimators: T, maxSamples: effectiveSamples,
            maxFeatures: F, contamination: 'auto', randomState: 42
        });
        injModel.fit(injected.data);
        const injScores = injModel.decisionFunction(injected.data);
        const injPredictions = injScores.map(s => s >= th);

        let fp = 0, fn = 0;
        for (let i = 0; i < injPredictions.length; i++) {
            if (injPredictions[i] && !injected.trueLabels[i]) fp++;
            if (!injPredictions[i] && injected.trueLabels[i]) fn++;
        }

        const cost = delta * fp + (1 - delta) * fn;

        history.push({ th, cost, fp, fn, nPredicted, anomalyRate: nPredicted / data.length });

        if (cost < bestCost) {
            bestCost = cost;
            bestTh = th;
        }

        if (fn > fp * (delta / (1 - delta))) {
            hi = th;
        } else {
            lo = th;
        }

        if (hi - lo < 0.01) break;
    }

    const contamination = scores.filter(s => s >= bestTh).length / data.length;

    return {
        threshold: bestTh,
        contamination: Math.max(0.001, Math.min(0.5, contamination)),
        bestCost,
        history
    };
}

// ============================================================================
// Main AutoTune Pipeline
// ============================================================================

async function autoTune(data, options = {}) {
    const { progressCallback = null, delta = 0.2 } = options;
    const startTime = Date.now();
    const steps = [];

    // Step 1: Sample Size
    if (progressCallback) {
        progressCallback({ phase: 'sampleSize', message: 'Step 1/5: Tuning sample size (S)...' });
    }
    const sampleResult = tuneSampleSize(data, progressCallback);
    const S = sampleResult.S;
    steps.push({ param: 'S', value: S, history: sampleResult.history });

    // Step 2: Number of Trees
    if (progressCallback) {
        progressCallback({ phase: 'trees', message: `Step 2/5: Tuning trees (T) with S=${S}...` });
    }
    const treesResult = tuneTrees(data, S, progressCallback);
    const T = treesResult.T;
    steps.push({ param: 'T', value: T, history: treesResult.history });

    // Step 3: Max Features
    if (progressCallback) {
        progressCallback({ phase: 'features', message: `Step 3/5: Tuning features (F) with S=${S}, T=${T}...` });
    }
    const featResult = tuneFeatures(data, S, T, progressCallback);
    const F = featResult.F;
    steps.push({ param: 'F', value: F, history: featResult.history });

    // Step 4: Max Depth
    if (progressCallback) {
        progressCallback({ phase: 'depth', message: `Step 4/5: Tuning depth (D)...` });
    }
    const depthResult = tuneDepth(data, S, T, F, progressCallback);
    const D = depthResult.D;
    steps.push({ param: 'D', value: D, history: depthResult.history });

    // Step 5: Threshold
    if (progressCallback) {
        progressCallback({ phase: 'threshold', message: `Step 5/5: Tuning threshold (Th)...` });
    }
    const thResult = tuneThreshold(data, S, T, F, D, progressCallback, delta);
    steps.push({ param: 'Th', value: thResult.threshold, history: thResult.history });

    // Final model with tuned parameters
    const effectiveSamples = Math.min(Math.pow(2, D), data.length);
    const finalModel = new IsolationForest({
        nEstimators: T, maxSamples: effectiveSamples,
        maxFeatures: F, contamination: thResult.contamination, randomState: 42
    });
    finalModel.fit(data);
    const finalScores = finalModel.decisionFunction(data);
    const finalLabels = finalModel.predictBinary(data);

    const executionTime = Date.now() - startTime;

    return {
        optimalParams: {
            sampleSize: S,
            nTrees: T,
            maxFeatures: F,
            maxDepth: D,
            threshold: thResult.threshold,
            contamination: thResult.contamination
        },
        scores: finalScores,
        labels: finalLabels,
        steps,
        executionTime,
        totalIterations: steps.reduce((sum, s) => sum + s.history.length, 0)
    };
}

// ============================================================================
// Convenience class wrapper
// ============================================================================

class AutoTunedIsolationForest {
    constructor(options = {}) {
        this.delta = options.delta ?? 0.2;
        this.progressCallback = options.progressCallback ?? null;
        this.params = null;
        this.model = null;
        this.tuningResult = null;
    }

    async tune(data) {
        this.tuningResult = await autoTune(data, {
            progressCallback: this.progressCallback,
            delta: this.delta
        });
        this.params = this.tuningResult.optimalParams;
        return this.tuningResult;
    }

    fit(data) {
        if (!this.params) {
            throw new Error('Call tune() before fit(), or set params manually.');
        }
        const effectiveSamples = Math.min(
            Math.pow(2, this.params.maxDepth), data.length
        );
        this.model = new IsolationForest({
            nEstimators: this.params.nTrees,
            maxSamples: effectiveSamples,
            maxFeatures: this.params.maxFeatures,
            contamination: this.params.contamination,
            randomState: 42
        });
        this.model.fit(data);
        return this;
    }

    predict(data) {
        if (!this.model) {
            throw new Error('Call fit() before predict().');
        }
        return {
            scores: this.model.decisionFunction(data),
            labels: this.model.predictBinary(data)
        };
    }
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
    autoTune,
    AutoTunedIsolationForest,
    tuneSampleSize,
    tuneTrees,
    tuneFeatures,
    tuneDepth,
    tuneThreshold
};
