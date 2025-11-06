/**
 * Interface for Isolation Forest Parameters
 */
export interface IIsolationForestParams {
    contamination: number;
    nTrees: number;
    maxSamples?: number;
    maxFeatures?: number;
}

/**
 * Interface for Analysis Configuration
 */
export interface IAnalysisConfig extends IIsolationForestParams {
    data: number[][];
}

/**
 * Interface for Analysis Result
 */
export interface IAnalysisResult {
    success: boolean;
    scores: number[];
    labels: boolean[];
    executionTime?: number;
    error?: string;
}

/**
 * Interface for Analysis Statistics
 */
export interface IAnalysisStatistics {
    totalRecords: number;
    anomaliesDetected: number;
    normalRecords: number;
    anomalyPercentage: number;
    executionTime: number;
    parameters: IIsolationForestParams;
}

/**
 * Interface for Auto-tuning Result
 */
export interface IAutoTuningResult {
    optimalParams: IIsolationForestParams;
    f1Score: number;
    precision: number;
    recall: number;
    iterations: number;
}
