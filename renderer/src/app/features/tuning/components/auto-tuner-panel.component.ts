import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AutoTunerService, IAutoTuneState } from '@core';

/**
 * Auto-Tuner Panel Component
 * 
 * Provides UI for automatic parameter tuning:
 * - Method selection (quick, balanced, thorough)
 * - Progress indicator
 * - Results display with metrics
 * - Apply button to use optimal parameters
 */
@Component({
    selector: 'app-auto-tuner-panel',
    template: `
        <mat-card class="auto-tuner-card">
            <mat-card-header>
                <mat-icon mat-card-avatar>auto_fix_high</mat-icon>
                <mat-card-title>{{ 'AUTO_TUNE.TITLE' | translate }}</mat-card-title>
                <mat-card-subtitle>{{ 'AUTO_TUNE.SUBTITLE' | translate }}</mat-card-subtitle>
            </mat-card-header>
            
            <mat-card-content>
                <!-- Method Selection -->
                <div class="method-selection" *ngIf="!state.isRunning && !state.result">
                    <mat-form-field appearance="outline" class="full-width">
                        <mat-label>{{ 'AUTO_TUNE.METHOD' | translate }}</mat-label>
                        <mat-select [(value)]="selectedMethod">
                            <mat-option value="quick">
                                <mat-icon>flash_on</mat-icon>
                                {{ 'AUTO_TUNE.METHODS.QUICK' | translate }}
                            </mat-option>
                            <mat-option value="balanced">
                                <mat-icon>balance</mat-icon>
                                {{ 'AUTO_TUNE.METHODS.BALANCED' | translate }}
                            </mat-option>
                            <mat-option value="thorough">
                                <mat-icon>search</mat-icon>
                                {{ 'AUTO_TUNE.METHODS.THOROUGH' | translate }}
                            </mat-option>
                        </mat-select>
                        <mat-hint>{{ getMethodDescription() }}</mat-hint>
                    </mat-form-field>
                </div>
                
                <!-- Progress -->
                <div class="progress-section" *ngIf="state.isRunning">
                    <mat-progress-bar 
                        [mode]="state.progress?.total ? 'determinate' : 'indeterminate'"
                        [value]="autoTunerService.getProgressPercentage()">
                    </mat-progress-bar>
                    <p class="status-text">{{ autoTunerService.getStatusMessage() }}</p>
                    <p class="progress-detail" *ngIf="state.progress?.params">
                        {{ 'AUTO_TUNE.TESTING' | translate }}: 
                        contamination={{ state.progress.params.contamination | number:'1.2-2' }}, 
                        nTrees={{ state.progress.params.nTrees }}
                    </p>
                </div>
                
                <!-- Results -->
                <div class="results-section" *ngIf="state.result && !state.isRunning">
                    <h4>{{ 'AUTO_TUNE.OPTIMAL_PARAMS' | translate }}</h4>
                    
                    <div class="optimal-params">
                        <div class="param-card">
                            <span class="param-label">{{ 'CONFIG.CONTAMINATION' | translate }}</span>
                            <span class="param-value">{{ state.result.optimalParams.contamination * 100 | number:'1.1-1' }}%</span>
                        </div>
                        <div class="param-card">
                            <span class="param-label">{{ 'CONFIG.N_TREES' | translate }}</span>
                            <span class="param-value">{{ state.result.optimalParams.nTrees }}</span>
                        </div>
                    </div>
                    
                    <mat-expansion-panel class="metrics-panel">
                        <mat-expansion-panel-header>
                            <mat-panel-title>
                                <mat-icon>analytics</mat-icon>
                                {{ 'AUTO_TUNE.METRICS' | translate }}
                            </mat-panel-title>
                        </mat-expansion-panel-header>
                        
                        <div class="metrics-grid">
                            <div class="metric" *ngFor="let metric of autoTunerService.getFormattedMetrics()">
                                <span class="metric-label">{{ metric.label }}</span>
                                <span class="metric-value">{{ metric.value }}</span>
                            </div>
                        </div>
                    </mat-expansion-panel>
                    
                    <mat-expansion-panel class="estimations-panel">
                        <mat-expansion-panel-header>
                            <mat-panel-title>
                                <mat-icon>calculate</mat-icon>
                                {{ 'AUTO_TUNE.ESTIMATIONS' | translate }}
                            </mat-panel-title>
                        </mat-expansion-panel-header>
                        
                        <div class="estimations-grid">
                            <div class="estimation" *ngFor="let est of autoTunerService.getEstimationBreakdown()">
                                <span class="estimation-method">{{ est.method }}</span>
                                <span class="estimation-value">{{ est.value }}</span>
                            </div>
                        </div>
                    </mat-expansion-panel>
                </div>
                
                <!-- Error -->
                <div class="error-section" *ngIf="state.error">
                    <mat-icon color="warn">error</mat-icon>
                    <span>{{ state.error }}</span>
                </div>
            </mat-card-content>
            
            <mat-card-actions align="end">
                <button mat-button 
                        *ngIf="state.result" 
                        (click)="autoTunerService.clear()">
                    <mat-icon>refresh</mat-icon>
                    {{ 'AUTO_TUNE.RESET' | translate }}
                </button>
                
                <button mat-raised-button 
                        color="accent"
                        *ngIf="state.result"
                        (click)="applyParams()">
                    <mat-icon>check</mat-icon>
                    {{ 'AUTO_TUNE.APPLY' | translate }}
                </button>
                
                <button mat-raised-button 
                        color="primary"
                        *ngIf="!state.result && !state.isRunning"
                        [disabled]="!hasData"
                        (click)="runAutoTune()">
                    <mat-icon>auto_fix_high</mat-icon>
                    {{ 'AUTO_TUNE.RUN' | translate }}
                </button>
            </mat-card-actions>
        </mat-card>
    `,
    styles: [`
        .auto-tuner-card {
            margin-bottom: 16px;
        }
        
        .full-width {
            width: 100%;
        }
        
        .progress-section {
            padding: 16px 0;
        }
        
        .status-text {
            margin-top: 8px;
            color: rgba(0, 0, 0, 0.6);
            font-size: 14px;
        }
        
        .progress-detail {
            font-size: 12px;
            color: rgba(0, 0, 0, 0.4);
            font-family: monospace;
        }
        
        .optimal-params {
            display: flex;
            gap: 16px;
            margin: 16px 0;
        }
        
        .param-card {
            flex: 1;
            background: #e8f5e9;
            border-radius: 8px;
            padding: 16px;
            text-align: center;
        }
        
        .param-label {
            display: block;
            font-size: 12px;
            color: rgba(0, 0, 0, 0.6);
            margin-bottom: 4px;
        }
        
        .param-value {
            display: block;
            font-size: 24px;
            font-weight: 600;
            color: #2e7d32;
        }
        
        .metrics-panel, .estimations-panel {
            margin-top: 16px;
        }
        
        .metrics-grid, .estimations-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 12px;
            padding: 8px 0;
        }
        
        .metric, .estimation {
            display: flex;
            flex-direction: column;
        }
        
        .metric-label, .estimation-method {
            font-size: 11px;
            color: rgba(0, 0, 0, 0.5);
            text-transform: uppercase;
        }
        
        .metric-value, .estimation-value {
            font-size: 16px;
            font-weight: 500;
        }
        
        .error-section {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #f44336;
            padding: 8px;
            background: #ffebee;
            border-radius: 4px;
        }
        
        mat-card-avatar {
            color: #1976d2;
        }
    `]
})
export class AutoTunerPanelComponent {

    @Input() hasData = false;
    @Output() paramsSelected = new EventEmitter<{ contamination: number; nTrees: number }>();

    selectedMethod: 'quick' | 'balanced' | 'thorough' = 'balanced';

    constructor(public autoTunerService: AutoTunerService) { }

    get state(): IAutoTuneState {
        return this.autoTunerService.state;
    }

    getMethodDescription(): string {
        const descriptions: Record<string, string> = {
            quick: '~3 iterations, fast results',
            balanced: '~15 iterations, good accuracy',
            thorough: '~45 iterations, best accuracy'
        };
        return descriptions[this.selectedMethod] || '';
    }

    async runAutoTune(): Promise<void> {
        // Emit event to parent to get data
        // The parent component should call autoTunerService.runAutoTune with data
    }

    applyParams(): void {
        const result = this.state.result;
        if (result) {
            this.paramsSelected.emit({
                contamination: result.optimalParams.contamination,
                nTrees: result.optimalParams.nTrees
            });
        }
    }
}
