import { IDataset, IDatasetStats } from '../interfaces/dataset.interface';

/**
 * Dataset Model Class
 */
export class Dataset implements IDataset {
    constructor(
        public fileName: string,
        public header: string[],
        public rows: string[][],
        public recordCount: number = rows.length,
        public columnCount: number = header.length
    ) { }

    /**
     * Create Dataset from CSV content
     */
    static fromCSV(content: string, fileName: string): Dataset {
        const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
        const rows = lines.map(l => l.split(',').map(s => s.trim()));
        const header = rows[0];
        const dataRows = rows.slice(1);

        return new Dataset(fileName, header, dataRows);
    }

    /**
     * Get dataset statistics
     */
    getStats(anomalyLabels: boolean[]): IDatasetStats {
        const totalAnomalies = anomalyLabels.filter(l => l).length;
        return {
            totalRecords: this.recordCount,
            totalAnomalies,
            normalRecords: this.recordCount - totalAnomalies,
            anomalyRate: this.recordCount > 0
                ? (totalAnomalies / this.recordCount) * 100
                : 0
        };
    }

    /**
     * Validate dataset
     */
    isValid(): boolean {
        return this.header.length > 0 &&
            this.rows.length > 0 &&
            this.rows.every(row => row.length === this.columnCount);
    }
}
