/**
 * AutoTuner - Automatic parameter tuning for Isolation Forest
 * 
 * Uses multiple heuristics to find optimal parameters:
 * 1. Statistical estimation of contamination (IQR, Z-score)
 * 2. Grid search with unsupervised metrics
 * 3. Stability analysis across different parameter combinations
 */

const { fitAndScore } = require('./isolationEngine');

// ============================================================================
// Statistical Helper Functions
// ============================================================================

function mean(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function std(arr, mu) {
    mu = mu ?? mean(arr);
    return Math.sqrt(arr.reduce((a, b) => a + Math.pow(b - mu, 2), 0) / arr.length);
}

function median(arr) {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(arr, p) {
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

function iqr(arr) {
    return percentile(arr, 75) - percentile(arr, 25);
}

// ============================================================================
// Contamination Estimation Methods
// ============================================================================

/**
 * Estimate contamination using IQR method (Tukey's fences)
 * Points beyond 1.5*IQR from Q1/Q3 are considered outliers
 */
function estimateContaminationIQR(data) {
    const outlierCounts = [];

    for (let col = 0; col < data[0].length; col++) {
        const values = data.map(row => Number(row[col]));
        const q1 = percentile(values, 25);
        const q3 = percentile(values, 75);
        const iqrVal = q3 - q1;
        const lowerFence = q1 - 1.5 * iqrVal;
        const upperFence = q3 + 1.5 * iqrVal;

        const outliers = values.filter(v => v < lowerFence || v > upperFence).length;
        outlierCounts.push(outliers / values.length);
    }

    // Use maximum contamination across features
    return Math.max(...outlierCounts);
}

/**
 * Estimate contamination using Z-score method
 * Points with |z| > 3 are considered outliers
 */
function estimateContaminationZScore(data, threshold = 3) {
    const outlierFlags = data.map(() => false);

    for (let col = 0; col < data[0].length; col++) {
        const values = data.map(row => Number(row[col]));
        const mu = mean(values);
        const sd = std(values, mu) || 1e-9;

        values.forEach((v, i) => {
            const z = Math.abs((v - mu) / sd);
            if (z > threshold) outlierFlags[i] = true;
        });
    }

    return outlierFlags.filter(f => f).length / data.length;
}

/**
 * Estimate contamination using MAD (Median Absolute Deviation)
 * More robust to outliers than Z-score
 */
function estimateContaminationMAD(data, threshold = 3.5) {
    const outlierFlags = data.map(() => false);

    for (let col = 0; col < data[0].length; col++) {
        const values = data.map(row => Number(row[col]));
        const med = median(values);
        const mad = median(values.map(v => Math.abs(v - med))) || 1e-9;
        const k = 1.4826; // consistency constant for normal distribution

        values.forEach((v, i) => {
            const modifiedZ = Math.abs((v - med) / (k * mad));
            if (modifiedZ > threshold) outlierFlags[i] = true;
        });
    }

    return outlierFlags.filter(f => f).length / data.length;
}

// ============================================================================
// Quality Metrics for Unsupervised Evaluation
// ============================================================================

/**
 * Calculate separation score between anomalies and normal points
 * Higher is better - means anomalies have distinctly different scores
 */
function calculateSeparationScore(scores, labels) {
    const anomalyScores = scores.filter((_, i) => labels[i]);
    const normalScores = scores.filter((_, i) => !labels[i]);

    if (anomalyScores.length === 0 || normalScores.length === 0) return 0;

    const anomalyMean = mean(anomalyScores);
    const normalMean = mean(normalScores);
    const anomalyStd = std(anomalyScores) || 1e-9;
    const normalStd = std(normalScores) || 1e-9;

    // Cohen's d-like effect size
    const pooledStd = Math.sqrt((anomalyStd * anomalyStd + normalStd * normalStd) / 2);
    return Math.abs(anomalyMean - normalMean) / pooledStd;
}

/**
 * Calculate silhouette-like score for clustering quality
 */
function calculateSilhouetteScore(data, labels) {
    const anomalyIndices = labels.map((l, i) => l ? i : -1).filter(i => i >= 0);
    const normalIndices = labels.map((l, i) => !l ? i : -1).filter(i => i >= 0);

    if (anomalyIndices.length === 0 || normalIndices.length === 0) return 0;

    // Sample for performance (max 100 points)
    const sampleSize = Math.min(100, data.length);
    const sampleIndices = [];
    for (let i = 0; i < sampleSize; i++) {
        sampleIndices.push(Math.floor(Math.random() * data.length));
    }

    let totalSilhouette = 0;

    for (const idx of sampleIndices) {
        const point = data[idx];
        const isAnomaly = labels[idx];

        // Calculate average distance to same cluster
        const sameCluster = isAnomaly ? anomalyIndices : normalIndices;
        const otherCluster = isAnomaly ? normalIndices : anomalyIndices;

        const a = meanDistance(point, sameCluster.filter(i => i !== idx).map(i => data[i]));
        const b = meanDistance(point, otherCluster.map(i => data[i]));

        if (Math.max(a, b) > 0) {
            totalSilhouette += (b - a) / Math.max(a, b);
        }
    }

    return totalSilhouette / sampleSize;
}

function euclideanDistance(a, b) {
    return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - Number(b[i]), 2), 0));
}

function meanDistance(point, cluster) {
    if (cluster.length === 0) return 0;
    return mean(cluster.map(c => euclideanDistance(point, c)));
}

/**
 * Calculate the "elbow" score based on score distribution
 * Looks for a natural break point in the sorted scores
 */
function calculateElbowScore(scores) {
    const sorted = [...scores].sort((a, b) => b - a);
    const n = sorted.length;

    // Calculate second derivative to find elbow
    const diffs = [];
    for (let i = 1; i < sorted.length; i++) {
        diffs.push(sorted[i - 1] - sorted[i]);
    }

    const secondDiffs = [];
    for (let i = 1; i < diffs.length; i++) {
        secondDiffs.push(Math.abs(diffs[i - 1] - diffs[i]));
    }

    // Find the index with maximum second derivative
    let maxIdx = 0;
    let maxVal = 0;
    for (let i = 0; i < secondDiffs.length; i++) {
        if (secondDiffs[i] > maxVal) {
            maxVal = secondDiffs[i];
            maxIdx = i + 1; // +1 because of derivative offset
        }
    }

    // Return estimated contamination from elbow point
    return (maxIdx + 1) / n;
}

// ============================================================================
// Grid Search Auto-Tuning
// ============================================================================

/**
 * Perform grid search to find optimal parameters
 */
async function gridSearch(data, options = {}) {
    const {
        contaminationRange = [0.01, 0.05, 0.10, 0.15, 0.20],
        nTreesRange = [50, 100, 150, 200],
        progressCallback = null
    } = options;

    const results = [];
    const totalIterations = contaminationRange.length * nTreesRange.length;
    let currentIteration = 0;

    for (const contamination of contaminationRange) {
        for (const nTrees of nTreesRange) {
            currentIteration++;

            if (progressCallback) {
                progressCallback({
                    current: currentIteration,
                    total: totalIterations,
                    params: { contamination, nTrees }
                });
            }

            const params = { contamination, nTrees };
            const result = await fitAndScore(data, params);

            const separationScore = calculateSeparationScore(result.scores, result.labels);
            const silhouetteScore = calculateSilhouetteScore(data, result.labels);

            // Combined quality metric
            const qualityScore = 0.6 * separationScore + 0.4 * (silhouetteScore + 1) / 2;

            results.push({
                params,
                separationScore,
                silhouetteScore,
                qualityScore,
                scores: result.scores,
                labels: result.labels
            });
        }
    }

    // Sort by quality score descending
    results.sort((a, b) => b.qualityScore - a.qualityScore);

    return results;
}

// ============================================================================
// Main Auto-Tuning Function
// ============================================================================

/**
 * Automatically tune Isolation Forest parameters
 * 
 * @param {number[][]} data - 2D array of numerical data
 * @param {Object} options - Tuning options
 * @param {string} options.method - 'quick', 'balanced', 'thorough'
 * @param {Function} options.progressCallback - Progress callback
 * @returns {Object} Optimal parameters and metrics
 */
async function autoTune(data, options = {}) {
    const {
        method = 'balanced',
        progressCallback = null
    } = options;

    const startTime = Date.now();

    // Step 1: Statistical estimation
    if (progressCallback) {
        progressCallback({ phase: 'estimation', message: 'Estimating initial parameters...' });
    }

    const iqrContamination = estimateContaminationIQR(data);
    const zscoreContamination = estimateContaminationZScore(data);
    const madContamination = estimateContaminationMAD(data);

    // Average of methods, bounded between 0.01 and 0.5
    let estimatedContamination = (iqrContamination + zscoreContamination + madContamination) / 3;
    estimatedContamination = Math.max(0.01, Math.min(0.5, estimatedContamination));

    // Determine search ranges based on method
    let contaminationRange, nTreesRange;

    switch (method) {
        case 'quick':
            // Search around estimated value only
            contaminationRange = [
                Math.max(0.01, estimatedContamination - 0.02),
                estimatedContamination,
                Math.min(0.5, estimatedContamination + 0.02)
            ];
            nTreesRange = [100];
            break;

        case 'thorough':
            // Wide search range
            contaminationRange = [0.01, 0.02, 0.05, 0.08, 0.10, 0.15, 0.20, 0.25, 0.30];
            nTreesRange = [50, 100, 150, 200, 250];
            break;

        case 'balanced':
        default:
            // Balanced search around estimated value
            const baseContam = Math.round(estimatedContamination * 100) / 100;
            contaminationRange = [
                Math.max(0.01, baseContam - 0.05),
                Math.max(0.01, baseContam - 0.02),
                baseContam,
                Math.min(0.5, baseContam + 0.02),
                Math.min(0.5, baseContam + 0.05)
            ];
            // Remove duplicates
            contaminationRange = [...new Set(contaminationRange)].sort((a, b) => a - b);
            nTreesRange = [100, 150, 200];
            break;
    }

    // Step 2: Grid search
    if (progressCallback) {
        progressCallback({ phase: 'gridSearch', message: 'Running grid search...' });
    }

    const gridResults = await gridSearch(data, {
        contaminationRange,
        nTreesRange,
        progressCallback: progressCallback ? (p) => {
            progressCallback({
                phase: 'gridSearch',
                ...p
            });
        } : null
    });

    // Step 3: Select best parameters
    const best = gridResults[0];

    // Step 4: Calculate elbow-based contamination for comparison
    const elbowContamination = calculateElbowScore(best.scores);

    const executionTime = Date.now() - startTime;

    return {
        optimalParams: {
            contamination: best.params.contamination,
            nTrees: best.params.nTrees,
            maxSamples: 'auto',
            maxFeatures: 1.0
        },
        metrics: {
            separationScore: best.separationScore,
            silhouetteScore: best.silhouetteScore,
            qualityScore: best.qualityScore
        },
        estimations: {
            iqr: iqrContamination,
            zscore: zscoreContamination,
            mad: madContamination,
            elbow: elbowContamination,
            combined: estimatedContamination
        },
        allResults: gridResults.slice(0, 5), // Top 5 results
        iterations: gridResults.length,
        executionTime,
        method
    };
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
    autoTune,
    estimateContaminationIQR,
    estimateContaminationZScore,
    estimateContaminationMAD,
    gridSearch,
    calculateSeparationScore,
    calculateSilhouetteScore,
    calculateElbowScore
};
