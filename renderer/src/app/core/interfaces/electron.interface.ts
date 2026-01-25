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
        method?: 'quick' | 'balanced' | 'thorough';
    };
}

/**
 * Interface for Auto-Tune Progress Updates
 */
export interface IAutoTuneProgress {
    phase?: string;
    message?: string;
    current?: number;
    total?: number;
    params?: {
        contamination: number;
        nTrees: number;
    };
}

/**
 * Interface for Auto-Tune Result
 */
export interface IAutoTuneResult {
    success: boolean;
    result?: {
        optimalParams: {
            contamination: number;
            nTrees: number;
            maxSamples: string | number;
            maxFeatures: number;
        };
        metrics: {
            separationScore: number;
            silhouetteScore: number;
            qualityScore: number;
        };
        estimations: {
            iqr: number;
            zscore: number;
            mad: number;
            elbow: number;
            combined: number;
        };
        allResults: Array<{
            params: { contamination: number; nTrees: number };
            qualityScore: number;
        }>;
        iterations: number;
        executionTime: number;
        method: string;
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

