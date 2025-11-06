import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Dataset } from '../models/dataset.model';
import { IDataset, IFileLoadResult } from '../interfaces/dataset.interface';

/**
 * Service for Dataset Management
 */
@Injectable({
    providedIn: 'root'
})
export class DatasetService {
    private datasetSubject = new BehaviorSubject<Dataset | null>(null);
    public dataset$: Observable<Dataset | null> = this.datasetSubject.asObservable();

    constructor() { }

    /**
     * Get current dataset
     */
    getCurrentDataset(): Dataset | null {
        return this.datasetSubject.value;
    }

    /**
     * Load dataset from CSV content
     */
    loadFromCSV(content: string, fileName: string): IFileLoadResult {
        try {
            const dataset = Dataset.fromCSV(content, fileName);

            if (!dataset.isValid()) {
                return {
                    success: false,
                    error: 'Invalid dataset format'
                };
            }

            this.datasetSubject.next(dataset);

            return {
                success: true,
                dataset
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Unknown error loading dataset'
            };
        }
    }

    /**
     * Clear current dataset
     */
    clearDataset(): void {
        this.datasetSubject.next(null);
    }

    /**
     * Recode dataset (text to numeric)
     */
    recodeDataset(rows: string[][]): number[][] {
        const cols = rows[0]?.length || 0;
        const maps = Array.from({ length: cols }, () => new Map<any, number>());
        const nextId = Array.from({ length: cols }, () => 1);

        return rows.map(row =>
            row.map((cell, i) => {
                const val = cell === '' ? null : cell;
                const n = Number(val);

                // If already a number, return it
                if (!Number.isNaN(n) && val !== '') {
                    return n;
                }

                // Otherwise, map to numeric ID
                const m = maps[i];
                if (m.has(val)) {
                    return m.get(val)!;
                }

                const id = nextId[i]++;
                m.set(val, id);
                return id;
            })
        );
    }

    /**
     * Get dataset dimensions
     */
    getDatasetDimensions(): { rows: number; columns: number } | null {
        const dataset = this.getCurrentDataset();
        if (!dataset) return null;

        return {
            rows: dataset.recordCount,
            columns: dataset.columnCount
        };
    }
}
