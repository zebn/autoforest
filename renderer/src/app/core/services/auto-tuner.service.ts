import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { IAutoTuneConfig, IAutoTuneProgress, IAutoTuneResult } from '../interfaces/electron.interface';
import { IIsolationForestParams } from '../interfaces/analysis.interface';

/**
 * Interface for Auto-Tuning State
 */
export interface IAutoTuneState {
    isRunning: boolean;
    progress: IAutoTuneProgress | null;
    result: IAutoTuneResult['result'] | null;
    error: string | null;
}

/**
 * Service for automatic parameter tuning of Isolation Forest
 * 
 * Provides methods to:
 * - Run auto-tuning with different strategies (quick, balanced, thorough)
 * - Track progress of auto-tuning process
 * - Apply optimal parameters to analysis
 */
@Injectable({
    providedIn: 'root'
})
export class AutoTunerService {

    private readonly stateSubject = new BehaviorSubject<IAutoTuneState>({
        isRunning: false,
        progress: null,
        result: null,
        error: null
    });

    public readonly state$: Observable<IAutoTuneState> = this.stateSubject.asObservable();

    constructor(private ngZone: NgZone) {
        this.setupProgressListener();
    }

    /**
     * Get current state
     */
    get state(): IAutoTuneState {
        return this.stateSubject.value;
    }

    /**
     * Check if Electron API is available
     */
    private get isElectron(): boolean {
        return !!(window as any).api?.autoTune;
    }

    /**
     * Setup listener for progress updates from main process
     */
    private setupProgressListener(): void {
        if (this.isElectron) {
            (window as any).api.onAutoTuneProgress((progress: IAutoTuneProgress) => {
                this.ngZone.run(() => {
                    this.updateState({ progress });
                });
            });
        }
    }

    /**
     * Update state helper
     */
    private updateState(partial: Partial<IAutoTuneState>): void {
        this.stateSubject.next({
            ...this.stateSubject.value,
            ...partial
        });
    }

    /**
     * Run auto-tuning on the provided data
     * 
     * @param data - 2D array of numerical data
     * @param method - Tuning method: 'quick', 'balanced', or 'thorough'
     * @returns Promise with optimal parameters
     */
    async runAutoTune(
        data: number[][],
        method: 'quick' | 'balanced' | 'thorough' = 'balanced'
    ): Promise<IIsolationForestParams | null> {

        if (!this.isElectron) {
            this.updateState({
                error: 'Auto-tuning is only available in Electron environment'
            });
            return null;
        }

        // Reset state and start
        this.updateState({
            isRunning: true,
            progress: { phase: 'starting', message: 'Initializing auto-tuning...' },
            result: null,
            error: null
        });

        try {
            const config: IAutoTuneConfig = {
                data,
                options: { method }
            };

            const response: IAutoTuneResult = await (window as any).api.autoTune(config);

            if (response.success && response.result) {
                this.updateState({
                    isRunning: false,
                    progress: null,
                    result: response.result
                });

                return {
                    contamination: response.result.optimalParams.contamination,
                    nTrees: response.result.optimalParams.nTrees,
                    maxSamples: typeof response.result.optimalParams.maxSamples === 'number'
                        ? response.result.optimalParams.maxSamples
                        : undefined,
                    maxFeatures: response.result.optimalParams.maxFeatures
                };
            } else {
                throw new Error(response.error || 'Unknown error during auto-tuning');
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Auto-tuning failed';
            this.updateState({
                isRunning: false,
                progress: null,
                error: errorMessage
            });
            return null;
        }
    }

    /**
     * Get progress percentage (0-100)
     */
    getProgressPercentage(): number {
        const progress = this.state.progress;
        if (!progress || !progress.total) return 0;
        return Math.round((progress.current || 0) / progress.total * 100);
    }

    /**
     * Get human-readable status message
     */
    getStatusMessage(): string {
        const { isRunning, progress, result, error } = this.state;

        if (error) return `Error: ${error}`;
        if (!isRunning && result) return 'Auto-tuning complete';
        if (!isRunning) return 'Ready';

        if (progress) {
            if (progress.phase === 'estimation') {
                return 'Estimating initial parameters...';
            }
            if (progress.phase === 'gridSearch' && progress.current && progress.total) {
                return `Testing combination ${progress.current}/${progress.total}`;
            }
            return progress.message || 'Processing...';
        }

        return 'Running...';
    }

    /**
     * Clear result and error state
     */
    clear(): void {
        this.updateState({
            isRunning: false,
            progress: null,
            result: null,
            error: null
        });
    }

    /**
     * Get formatted metrics for display
     */
    getFormattedMetrics(): { label: string; value: string }[] {
        const result = this.state.result;
        if (!result) return [];

        return [
            {
                label: 'Optimal Contamination',
                value: `${(result.optimalParams.contamination * 100).toFixed(1)}%`
            },
            {
                label: 'Optimal Trees',
                value: result.optimalParams.nTrees.toString()
            },
            {
                label: 'Quality Score',
                value: result.metrics.qualityScore.toFixed(3)
            },
            {
                label: 'Separation Score',
                value: result.metrics.separationScore.toFixed(3)
            },
            {
                label: 'Silhouette Score',
                value: result.metrics.silhouetteScore.toFixed(3)
            },
            {
                label: 'Execution Time',
                value: `${(result.executionTime / 1000).toFixed(2)}s`
            },
            {
                label: 'Iterations',
                value: result.iterations.toString()
            }
        ];
    }

    /**
     * Get estimation breakdown for display
     */
    getEstimationBreakdown(): { method: string; value: string }[] {
        const result = this.state.result;
        if (!result) return [];

        return [
            { method: 'IQR Method', value: `${(result.estimations.iqr * 100).toFixed(1)}%` },
            { method: 'Z-Score Method', value: `${(result.estimations.zscore * 100).toFixed(1)}%` },
            { method: 'MAD Method', value: `${(result.estimations.mad * 100).toFixed(1)}%` },
            { method: 'Elbow Method', value: `${(result.estimations.elbow * 100).toFixed(1)}%` },
            { method: 'Combined', value: `${(result.estimations.combined * 100).toFixed(1)}%` }
        ];
    }
}
