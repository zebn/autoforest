/**
 * Interface for CSV Dataset
 */
export interface IDataset {
    fileName: string;
    header: string[];
    rows: string[][];
    recordCount: number;
    columnCount: number;
}

/**
 * Interface for Dataset Row with Analysis Results
 */
export interface IDatasetRow {
    values: string[];
    score: number;
    isAnomaly: boolean;
    index: number;
}

/**
 * Interface for Dataset Statistics
 */
export interface IDatasetStats {
    totalRecords: number;
    totalAnomalies: number;
    normalRecords: number;
    anomalyRate: number;
}

/**
 * Interface for File Loading Result
 */
export interface IFileLoadResult {
    success: boolean;
    dataset?: IDataset;
    error?: string;
}
