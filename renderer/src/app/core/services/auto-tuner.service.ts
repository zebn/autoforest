import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { IAutoTuneConfig, IAutoTuneProgress, IAutoTuneResult, ITuningStep } from '../interfaces/electron.interface';

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
 * Service for iterative heuristic-based auto-tuning of Isolation Forest
 * 
 * Pipeline: S → T → F → D → Th (sequential refinement)
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

    get state(): IAutoTuneState {
        return this.stateSubject.value;
    }

    private get isElectron(): boolean {
        return !!(window as any).api?.autoTune;
    }

    private setupProgressListener(): void {
        if (this.isElectron) {
            (window as any).api.onAutoTuneProgress((progress: IAutoTuneProgress) => {
                this.ngZone.run(() => {
                    this.updateState({ progress });
                });
            });
        }
    }

    private updateState(partial: Partial<IAutoTuneState>): void {
        this.stateSubject.next({
            ...this.stateSubject.value,
            ...partial
        });
    }

    async runAutoTune(
        data: number[][],
        delta: number = 0.2
    ): Promise<IAutoTuneResult | null> {

        if (!this.isElectron) {
            this.updateState({
                error: 'Auto-tuning is only available in Electron environment'
            });
            return null;
        }

        this.updateState({
            isRunning: true,
            progress: { phase: 'starting', message: 'Initializing iterative auto-tuning...' },
            result: null,
            error: null
        });

        try {
            const config: IAutoTuneConfig = {
                data,
                options: { delta }
            };

            const response: IAutoTuneResult = await (window as any).api.autoTune(config);

            if (response.success && response.result) {
                this.updateState({
                    isRunning: false,
                    progress: null,
                    result: response.result
                });

                return response;
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

    getStatusMessage(): string {
        const { isRunning, progress, result, error } = this.state;

        if (error) return `Error: ${error}`;
        if (!isRunning && result) return 'Auto-tuning complete';
        if (!isRunning) return 'Ready';

        if (progress) {
            return progress.message || 'Processing...';
        }

        return 'Running...';
    }

    getCurrentPhaseLabel(): string {
        const phaseLabels: Record<string, string> = {
            sampleSize: 'Sample Size (S)',
            trees: 'Trees (T)',
            features: 'Features (F)',
            depth: 'Depth (D)',
            threshold: 'Threshold (Th)'
        };
        return phaseLabels[this.state.progress?.phase || ''] || '';
    }

    clear(): void {
        this.updateState({
            isRunning: false,
            progress: null,
            result: null,
            error: null
        });
    }

    getFormattedParams(): { label: string; value: string; icon: string }[] {
        const result = this.state.result;
        if (!result) return [];

        return [
            { label: 'Sample Size (S)', value: result.optimalParams.sampleSize.toString(), icon: 'data_array' },
            { label: 'Trees (T)', value: result.optimalParams.nTrees.toString(), icon: 'park' },
            { label: 'Max Features (F)', value: result.optimalParams.maxFeatures.toFixed(3), icon: 'view_column' },
            { label: 'Max Depth (D)', value: result.optimalParams.maxDepth.toString(), icon: 'account_tree' },
            { label: 'Threshold (Th)', value: result.optimalParams.threshold.toFixed(4), icon: 'tune' },
            { label: 'Contamination', value: `${(result.optimalParams.contamination * 100).toFixed(2)}%`, icon: 'warning' }
        ];
    }

    getStepsSummary(): { param: string; value: string; iterations: number }[] {
        const result = this.state.result;
        if (!result) return [];

        return result.steps.map(step => ({
            param: step.param,
            value: typeof step.value === 'number'
                ? (step.param === 'Th' ? step.value.toFixed(4) : step.value.toFixed(3))
                : String(step.value),
            iterations: step.history.length
        }));
    }
}
