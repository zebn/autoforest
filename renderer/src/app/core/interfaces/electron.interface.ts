/**
 * Interface for Electron API exposed via preload
 */
export interface IElectronAPI {
    onFileLoaded: (callback: (data: IFileLoadedData) => void) => void;
    runIsolation: (config: IElectronIsolationConfig) => Promise<IElectronIsolationResult>;
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
 * Extend Window interface to include Electron API
 */
declare global {
    interface Window {
        api?: IElectronAPI;
        require?: any;
    }
}
