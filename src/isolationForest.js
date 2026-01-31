/**
 * Isolation Forest - Native JavaScript Implementation
 * 
 * Based on the original paper:
 * Liu, F. T., Ting, K. M., & Zhou, Z. H. (2008). Isolation Forest.
 * 
 * Full parameter control:
 * - nEstimators: number of isolation trees
 * - maxSamples: subsample size for each tree
 * - maxFeatures: number of features to consider for each split
 * - contamination: expected proportion of anomalies
 * - bootstrap: whether to sample with replacement
 * - randomState: seed for reproducibility
 */

// ============================================================================
// Random Number Generator with Seed Support
// ============================================================================

class SeededRandom {
    constructor(seed = Date.now()) {
        this.seed = seed;
    }

    // Mulberry32 PRNG - fast and good quality
    next() {
        let t = this.seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }

    // Random integer in range [min, max)
    randInt(min, max) {
        return Math.floor(this.next() * (max - min)) + min;
    }

    // Random float in range [min, max)
    randFloat(min, max) {
        return this.next() * (max - min) + min;
    }

    // Shuffle array in place (Fisher-Yates)
    shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = this.randInt(0, i + 1);
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    // Sample k elements from array
    sample(arr, k, withReplacement = false) {
        if (withReplacement) {
            return Array.from({ length: k }, () => arr[this.randInt(0, arr.length)]);
        }
        const shuffled = this.shuffle([...arr]);
        return shuffled.slice(0, k);
    }
}

// ============================================================================
// Isolation Tree Node
// ============================================================================

class IsolationTreeNode {
    constructor() {
        this.left = null;
        this.right = null;
        this.splitFeature = null;
        this.splitValue = null;
        this.size = 0;          // number of samples at this node (for external nodes)
        this.isExternal = false;
    }
}

// ============================================================================
// Isolation Tree
// ============================================================================

class IsolationTree {
    /**
     * @param {number} maxDepth - Maximum depth of the tree (log2(maxSamples))
     * @param {number[]} featureIndices - Indices of features to consider
     * @param {SeededRandom} rng - Random number generator
     */
    constructor(maxDepth, featureIndices, rng) {
        this.maxDepth = maxDepth;
        this.featureIndices = featureIndices;
        this.rng = rng;
        this.root = null;
    }

    /**
     * Build the isolation tree from data
     * @param {number[][]} data - Array of samples (each sample is array of features)
     */
    fit(data) {
        this.root = this._buildTree(data, 0);
        return this;
    }

    /**
     * Recursively build tree nodes
     */
    _buildTree(data, currentDepth) {
        const node = new IsolationTreeNode();
        const n = data.length;

        // External node conditions:
        // 1. Reached max depth
        // 2. Only one sample left
        // 3. All samples are identical
        if (currentDepth >= this.maxDepth || n <= 1 || this._allSame(data)) {
            node.isExternal = true;
            node.size = n;
            return node;
        }

        // Select random feature from allowed features
        const featureIdx = this.featureIndices[this.rng.randInt(0, this.featureIndices.length)];

        // Get min and max for selected feature
        const featureValues = data.map(row => row[featureIdx]);
        const minVal = Math.min(...featureValues);
        const maxVal = Math.max(...featureValues);

        // If all values are the same, create external node
        if (minVal === maxVal) {
            node.isExternal = true;
            node.size = n;
            return node;
        }

        // Random split point between min and max
        const splitValue = this.rng.randFloat(minVal, maxVal);

        // Partition data
        const leftData = [];
        const rightData = [];
        for (const row of data) {
            if (row[featureIdx] < splitValue) {
                leftData.push(row);
            } else {
                rightData.push(row);
            }
        }

        // Handle edge case where all points go to one side
        if (leftData.length === 0 || rightData.length === 0) {
            node.isExternal = true;
            node.size = n;
            return node;
        }

        node.splitFeature = featureIdx;
        node.splitValue = splitValue;
        node.left = this._buildTree(leftData, currentDepth + 1);
        node.right = this._buildTree(rightData, currentDepth + 1);

        return node;
    }

    /**
     * Check if all samples are identical
     */
    _allSame(data) {
        if (data.length <= 1) return true;
        const first = data[0];
        return data.every(row =>
            row.every((val, i) => val === first[i])
        );
    }

    /**
     * Calculate path length for a single sample
     * @param {number[]} sample - Single sample (array of features)
     * @returns {number} Path length
     */
    pathLength(sample) {
        return this._traverse(sample, this.root, 0);
    }

    /**
     * Traverse tree and calculate path length
     */
    _traverse(sample, node, currentDepth) {
        if (node.isExternal) {
            // Add average path length adjustment for external node size
            return currentDepth + averagePathLength(node.size);
        }

        if (sample[node.splitFeature] < node.splitValue) {
            return this._traverse(sample, node.left, currentDepth + 1);
        } else {
            return this._traverse(sample, node.right, currentDepth + 1);
        }
    }
}

// ============================================================================
// Isolation Forest
// ============================================================================

class IsolationForest {
    /**
     * @param {Object} options - Configuration options
     * @param {number} [options.nEstimators=100] - Number of isolation trees
     * @param {number|string} [options.maxSamples='auto'] - Number of samples per tree
     *        'auto' = min(256, n_samples)
     * @param {number|string} [options.maxFeatures=1.0] - Features per split
     *        1.0 = all features, 0.5 = half, 'sqrt' = sqrt(n_features)
     * @param {number|string} [options.contamination='auto'] - Expected anomaly proportion
     *        'auto' = use decision_function scores
     * @param {boolean} [options.bootstrap=false] - Sample with replacement
     * @param {number|null} [options.randomState=null] - Random seed
     */
    constructor(options = {}) {
        this.nEstimators = options.nEstimators ?? 100;
        this.maxSamples = options.maxSamples ?? 'auto';
        this.maxFeatures = options.maxFeatures ?? 1.0;
        this.contamination = options.contamination ?? 'auto';
        this.bootstrap = options.bootstrap ?? false;
        this.randomState = options.randomState ?? null;

        this.trees = [];
        this.nFeatures = 0;
        this.nSamplesUsed = 0;
        this.threshold = null;
        this.isFitted = false;
    }

    /**
     * Fit the isolation forest on training data
     * @param {number[][]} data - Training data (array of samples)
     * @returns {IsolationForest} this
     */
    fit(data) {
        const n = data.length;
        this.nFeatures = data[0].length;

        // Determine actual maxSamples
        if (this.maxSamples === 'auto') {
            this.nSamplesUsed = Math.min(256, n);
        } else if (typeof this.maxSamples === 'number') {
            if (this.maxSamples <= 1) {
                this.nSamplesUsed = Math.floor(n * this.maxSamples);
            } else {
                this.nSamplesUsed = Math.min(Math.floor(this.maxSamples), n);
            }
        }
        this.nSamplesUsed = Math.max(2, this.nSamplesUsed);

        // Determine actual maxFeatures
        let nFeaturesUsed;
        if (this.maxFeatures === 'sqrt') {
            nFeaturesUsed = Math.ceil(Math.sqrt(this.nFeatures));
        } else if (this.maxFeatures === 'log2') {
            nFeaturesUsed = Math.ceil(Math.log2(this.nFeatures));
        } else if (typeof this.maxFeatures === 'number') {
            if (this.maxFeatures <= 1) {
                nFeaturesUsed = Math.ceil(this.nFeatures * this.maxFeatures);
            } else {
                nFeaturesUsed = Math.min(Math.floor(this.maxFeatures), this.nFeatures);
            }
        } else {
            nFeaturesUsed = this.nFeatures;
        }
        nFeaturesUsed = Math.max(1, nFeaturesUsed);

        // Max depth based on subsample size
        const maxDepth = Math.ceil(Math.log2(this.nSamplesUsed));

        // Initialize RNG
        const rng = new SeededRandom(this.randomState ?? Date.now());

        // All feature indices
        const allFeatures = Array.from({ length: this.nFeatures }, (_, i) => i);

        // Build trees
        this.trees = [];
        for (let i = 0; i < this.nEstimators; i++) {
            // Subsample data
            const subsample = rng.sample(data, this.nSamplesUsed, this.bootstrap);

            // Select features for this tree
            const featureIndices = nFeaturesUsed >= this.nFeatures
                ? allFeatures
                : rng.sample(allFeatures, nFeaturesUsed, false);

            // Build tree
            const tree = new IsolationTree(maxDepth, featureIndices, rng);
            tree.fit(subsample);
            this.trees.push(tree);
        }

        // Mark as fitted before calculating threshold (decisionFunction needs this)
        this.isFitted = true;

        // Calculate threshold if contamination is specified
        if (this.contamination !== 'auto' && typeof this.contamination === 'number') {
            const scores = this.decisionFunction(data);
            const sortedScores = [...scores].sort((a, b) => b - a);
            const thresholdIdx = Math.floor(n * this.contamination);
            this.threshold = sortedScores[Math.min(thresholdIdx, n - 1)];
        }

        return this;
    }

    /**
     * Calculate anomaly scores for samples
     * Higher score = more anomalous
     * Score close to 1 = anomaly, close to 0 = normal
     * 
     * @param {number[][]} data - Samples to score
     * @returns {number[]} Anomaly scores
     */
    decisionFunction(data) {
        if (!this.isFitted) {
            throw new Error('IsolationForest must be fitted before calling decisionFunction');
        }

        const c = averagePathLength(this.nSamplesUsed);

        return data.map(sample => {
            // Average path length across all trees
            const avgPathLength = this.trees.reduce((sum, tree) =>
                sum + tree.pathLength(sample), 0) / this.trees.length;

            // Anomaly score: s(x, n) = 2^(-E(h(x)) / c(n))
            return Math.pow(2, -avgPathLength / c);
        });
    }

    /**
     * Predict anomaly labels
     * @param {number[][]} data - Samples to predict
     * @returns {number[]} Labels: -1 = anomaly, 1 = normal
     */
    predict(data) {
        const scores = this.decisionFunction(data);

        if (this.threshold !== null) {
            return scores.map(s => s >= this.threshold ? -1 : 1);
        }

        // If no threshold, use 0.5 as default
        return scores.map(s => s >= 0.5 ? -1 : 1);
    }

    /**
     * Predict binary labels (for convenience)
     * @param {number[][]} data - Samples to predict
     * @returns {boolean[]} Labels: true = anomaly, false = normal
     */
    predictBinary(data) {
        return this.predict(data).map(label => label === -1);
    }

    /**
     * Fit and predict in one step
     * @param {number[][]} data - Training and prediction data
     * @returns {number[]} Labels: -1 = anomaly, 1 = normal
     */
    fitPredict(data) {
        this.fit(data);
        return this.predict(data);
    }

    /**
     * Get model parameters
     */
    getParams() {
        return {
            nEstimators: this.nEstimators,
            maxSamples: this.maxSamples,
            maxFeatures: this.maxFeatures,
            contamination: this.contamination,
            bootstrap: this.bootstrap,
            randomState: this.randomState,
            // Derived
            nSamplesUsed: this.nSamplesUsed,
            nFeatures: this.nFeatures,
            nTrees: this.trees.length,
            threshold: this.threshold
        };
    }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Average path length of unsuccessful search in BST
 * c(n) = 2 * H(n-1) - 2(n-1)/n
 * where H(i) is the harmonic number ≈ ln(i) + 0.5772156649 (Euler-Mascheroni constant)
 * 
 * @param {number} n - Number of samples
 * @returns {number} Average path length
 */
function averagePathLength(n) {
    if (n <= 1) return 0;
    if (n === 2) return 1;

    const EULER_MASCHERONI = 0.5772156649;
    const H = Math.log(n - 1) + EULER_MASCHERONI;
    return 2 * H - (2 * (n - 1) / n);
}

/**
 * Harmonic number approximation
 * @param {number} n
 * @returns {number}
 */
function harmonicNumber(n) {
    if (n <= 0) return 0;
    const EULER_MASCHERONI = 0.5772156649;
    return Math.log(n) + EULER_MASCHERONI;
}

// ============================================================================
// Convenience wrapper function (compatible with old API)
// ============================================================================

/**
 * Fit Isolation Forest and return scores/labels
 * @param {number[][]} data - Training data
 * @param {Object} params - Parameters
 * @returns {Object} { scores, labels, model, engine }
 */
async function fitAndScore(data, params = {}) {
    const model = new IsolationForest({
        nEstimators: params.nTrees ?? params.nEstimators ?? 100,
        maxSamples: params.maxSamples ?? 'auto',
        maxFeatures: params.maxFeatures ?? 1.0,
        contamination: params.contamination ?? 0.05,
        bootstrap: params.bootstrap ?? false,
        randomState: params.randomState ?? null
    });

    model.fit(data);
    const scores = model.decisionFunction(data);
    const labels = model.predictBinary(data);

    return {
        scores,
        labels,
        model,
        engine: 'isolation-forest-native'
    };
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
    IsolationForest,
    IsolationTree,
    IsolationTreeNode,
    SeededRandom,
    averagePathLength,
    harmonicNumber,
    fitAndScore
};
