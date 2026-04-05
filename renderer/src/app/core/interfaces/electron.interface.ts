/**
 * Interface for Electron API exposed via preload
 */
export interface IElectronAPI {
    onFileLoaded: (callback: (data: IFileLoadedData) => void) => void;
    runIsolation: (config: IElectronIsolationConfig) => Promise<IElectronIsolationResult>;
    autoTune: (config: IAutoTuneConfig) => Promise<IAutoTuneResult>;
    onAutoTuneProgress: (callback: (data: IAutoTuneProgress) => void) => void;
}

/**
 * Interface for File Loaded Data from Main Process
 */
export interface IFileLoadedData {
    content: string;
    name: string;
    path?: string;
}

/**
 * Interface for Isolation Forest Configuration sent to Main Process
 */
export interface IElectronIsolationConfig {
    data: number[][];
    params: {
        contamination: number;
        nTrees: number;
    };
}

/**
 * Interface for Isolation Forest Result from Main Process
 */
export interface IElectronIsolationResult {
    success: boolean;
    result?: {
        scores: number[];
        labels: boolean[];
    };
    error?: string;
}

/**
 * Interface for Auto-Tune Configuration
 */
export interface IAutoTuneConfig {
    data: number[][];
    options?: {
        delta?: number;
    };
}

/**
 * Interface for Auto-Tune Progress Updates
 */
export interface IAutoTuneProgress {
    phase?: string;
    step?: string;
    message?: string;
    iteration?: number;
    currentValue?: number;
}

/**
 * Interface for a single tuning step history entry
 */
export interface ITuningStepEntry {
    [key: string]: any;
}

/**
 * Interface for a tuning step result
 */
export interface ITuningStep {
    param: string;
    value: number;
    history: ITuningStepEntry[];
}

/**
 * Interface for Auto-Tune Result
 */
export interface IAutoTuneResult {
    success: boolean;
    result?: {
        optimalParams: {
            sampleSize: number;
            nTrees: number;
            maxFeatures: number;
            maxDepth: number;
            threshold: number;
            contamination: number;
        };
        scores: number[];
        labels: boolean[];
        steps: ITuningStep[];
        executionTime: number;
        totalIterations: number;
    };
    error?: string;
}

/**
 * Extend Window interface to include Electron API
 */
declare global {
    interface Window {
        api?: IElectronAPI;
        require?: any;
    }
}

