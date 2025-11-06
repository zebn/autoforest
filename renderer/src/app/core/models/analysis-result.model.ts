import { IAnalysisResult, IAnalysisStatistics, IIsolationForestParams } from '../interfaces/analysis.interface';
import { IDatasetRow } from '../interfaces/dataset.interface';

/**
 * Analysis Result Model Class
 */
export class AnalysisResult implements IAnalysisResult {
    constructor(
        public success: boolean,
        public scores: number[],
        public labels: boolean[],
        public executionTime?: number,
        public error?: string
    ) { }

    /**
     * Get analysis statistics
     */
    getStatistics(totalRecords: number, params: IIsolationForestParams): IAnalysisStatistics {
        const anomaliesDetected = this.labels.filter(l => l).length;
        return {
            totalRecords,
            anomaliesDetected,
            normalRecords: totalRecords - anomaliesDetected,
            anomalyPercentage: totalRecords > 0
                ? (anomaliesDetected / totalRecords) * 100
                : 0,
            executionTime: this.executionTime || 0,
            parameters: params
        };
    }

    /**
     * Combine dataset rows with analysis results
     */
    mergeWithDataset(dataRows: string[][]): IDatasetRow[] {
        return dataRows.map((row, idx) => ({
            values: row,
            score: this.scores[idx] || 0,
            isAnomaly: this.labels[idx] || false,
            index: idx
        }));
    }

    /**
     * Get anomalies only
     */
    getAnomalies(dataRows: string[][]): IDatasetRow[] {
        return this.mergeWithDataset(dataRows).filter(row => row.isAnomaly);
    }

    /**
     * Get normal records only
     */
    getNormalRecords(dataRows: string[][]): IDatasetRow[] {
        return this.mergeWithDataset(dataRows).filter(row => !row.isAnomaly);
    }
}
