import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AnalysisResult } from '../models/analysis-result.model';
import {
    IAnalysisConfig,
    IAnalysisResult,
    IIsolationForestParams
} from '../interfaces/analysis.interface';
import { IElectronIsolationConfig, IElectronIsolationResult } from '../interfaces/electron.interface';

/**
 * Service for Anomaly Detection Analysis
 */
@Injectable({
    providedIn: 'root'
})
export class AnalysisService {
    private analysisResultSubject = new BehaviorSubject<AnalysisResult | null>(null);
    public analysisResult$: Observable<AnalysisResult | null> = this.analysisResultSubject.asObservable();

    private isAnalyzingSubject = new BehaviorSubject<boolean>(false);
    public isAnalyzing$: Observable<boolean> = this.isAnalyzingSubject.asObservable();

    constructor() { }

    /**
     * Get current analysis result
     */
    getCurrentResult(): AnalysisResult | null {
        return this.analysisResultSubject.value;
    }

    /**
     * Run Isolation Forest analysis via Electron IPC
     */
    async runAnalysis(config: IAnalysisConfig): Promise<IAnalysisResult> {
        this.isAnalyzingSubject.next(true);
        const startTime = Date.now();

        try {
            if (!window.api) {
                throw new Error('Electron API not available');
            }

            const electronConfig: IElectronIsolationConfig = {
                data: config.data,
                params: {
                    contamination: config.contamination,
                    nTrees: config.nTrees
                }
            };

            const response: IElectronIsolationResult = await window.api.runIsolation(electronConfig);

            if (!response.success || !response.result) {
                throw new Error(response.error || 'Analysis failed');
            }

            const executionTime = (Date.now() - startTime) / 1000;

            const result = new AnalysisResult(
                true,
                response.result.scores,
                response.result.labels,
                executionTime
            );

            this.analysisResultSubject.next(result);
            return result;

        } catch (error: any) {
            const result = new AnalysisResult(
                false,
                [],
                [],
                undefined,
                error.message
            );

            this.analysisResultSubject.next(result);
            return result;

        } finally {
            this.isAnalyzingSubject.next(false);
        }
    }

    /**
     * Clear analysis results
     */
    clearResults(): void {
        this.analysisResultSubject.next(null);
    }

    /**
     * Get default parameters
     */
    getDefaultParams(): IIsolationForestParams {
        return {
            contamination: 0.05,
            nTrees: 100
        };
    }

    /**
     * Validate parameters
     */
    validateParams(params: IIsolationForestParams): { valid: boolean; error?: string } {
        if (params.contamination < 0 || params.contamination > 0.5) {
            return {
                valid: false,
                error: 'Contamination must be between 0 and 0.5'
            };
        }

        if (params.nTrees < 10 || params.nTrees > 1000) {
            return {
                valid: false,
                error: 'Number of trees must be between 10 and 1000'
            };
        }

        return { valid: true };
    }
}
