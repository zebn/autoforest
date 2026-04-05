import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AutoTunerService, IAutoTuneState } from '@core';

@Component({
    selector: 'app-auto-tuner-panel',
    template: `
        <mat-card class="auto-tuner-card" [class.running]="state.isRunning" [class.done]="state.result && !state.isRunning">
            <mat-card-header>
                <mat-icon mat-card-avatar class="header-icon" [class.spin]="state.isRunning">auto_fix_high</mat-icon>
                <mat-card-title>{{ 'AUTO_TUNE.TITLE' | translate }}</mat-card-title>
                <mat-card-subtitle>{{ 'AUTO_TUNE.SUBTITLE' | translate }}</mat-card-subtitle>
            </mat-card-header>
            
            <mat-card-content>

                <!-- ============ PIPELINE STEPPER (always visible during run / after results) ============ -->
                <div class="pipeline-stepper" *ngIf="state.isRunning || state.result">
                    <div class="stepper-track">
                        <div 
                            *ngFor="let step of pipelineSteps; let i = index; let last = last"
                            class="stepper-item"
                            [class.active]="isStepActive(step.key)"
                            [class.done]="isStepDone(step.key)"
                            [class.pending]="!isStepActive(step.key) && !isStepDone(step.key)">
                            
                            <div class="step-node">
                                <div class="step-circle">
                                    <mat-icon *ngIf="isStepDone(step.key)">check</mat-icon>
                                    <mat-icon *ngIf="isStepActive(step.key) && !isStepDone(step.key)">sync</mat-icon>
                                    <span *ngIf="!isStepActive(step.key) && !isStepDone(step.key)">{{ i + 1 }}</span>
                                </div>
                                <div class="step-text">
                                    <span class="step-symbol">{{ step.symbol }}</span>
                                    <span class="step-name">{{ step.label | translate }}</span>
                                </div>
                                <!-- Live value during execution -->
                                <div class="step-live-value" *ngIf="isStepActive(step.key) && state.progress?.currentValue != null">
                                    {{ formatLive(step.key, state.progress!.currentValue!) }}
                                </div>
                                <!-- Final value after done -->
                                <div class="step-final-value" *ngIf="state.result && getStepResult(step.key) as val">
                                    {{ val }}
                                </div>
                            </div>
                            <div class="step-connector" *ngIf="!last">
                                <div class="connector-line" [class.filled]="isStepDone(step.key)"></div>
                                <mat-icon class="connector-arrow" [class.filled]="isStepDone(step.key)">arrow_forward</mat-icon>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Progress bar during execution -->
                    <div class="progress-area" *ngIf="state.isRunning">
                        <mat-progress-bar mode="indeterminate" color="primary"></mat-progress-bar>
                        <div class="progress-text">
                            <mat-icon class="pulse-icon">{{ getPhaseIcon() }}</mat-icon>
                            <span>{{ autoTunerService.getStatusMessage() }}</span>
                        </div>
                        <div class="progress-detail" *ngIf="state.progress?.step && state.progress?.iteration">
                            {{ 'AUTO_TUNE.ITERATION' | translate }} {{ state.progress.iteration }}
                            &nbsp;·&nbsp;
                            {{ state.progress.step }} = {{ formatLive(phaseToKey(state.progress.phase || ''), state.progress.currentValue || 0) }}
                        </div>
                    </div>
                </div>

                <!-- ============ RESULTS ============ -->
                <div class="results-area" *ngIf="state.result && !state.isRunning">
                    
                    <!-- Optimal parameters grid -->
                    <div class="params-header">
                        <mat-icon>emoji_events</mat-icon>
                        <h4>{{ 'AUTO_TUNE.OPTIMAL_PARAMS' | translate }}</h4>
                        <div class="timing-badge">
                            <mat-icon>timer</mat-icon>
                            {{ (state.result.executionTime / 1000).toFixed(1) }}s
                            &nbsp;·&nbsp;
                            {{ state.result.totalIterations }} {{ 'AUTO_TUNE.ITERS' | translate }}
                        </div>
                    </div>
                    
                    <div class="params-grid">
                        <div class="param-tile" *ngFor="let p of autoTunerService.getFormattedParams()">
                            <div class="param-tile-icon">
                                <mat-icon>{{ p.icon }}</mat-icon>
                            </div>
                            <div class="param-tile-content">
                                <span class="param-tile-value">{{ p.value }}</span>
                                <span class="param-tile-label">{{ p.label }}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Convergence visualization -->
                    <app-tuning-chart [steps]="state.result.steps"></app-tuning-chart>
                    
                    <!-- Pipeline details (collapsed) -->
                    <mat-expansion-panel class="details-panel">
                        <mat-expansion-panel-header>
                            <mat-panel-title>
                                <mat-icon>list_alt</mat-icon>
                                {{ 'AUTO_TUNE.PIPELINE_DETAIL' | translate }}
                            </mat-panel-title>
                        </mat-expansion-panel-header>
                        
                        <div class="detail-table">
                            <div class="detail-row header">
                                <span>{{ 'AUTO_TUNE.STEP' | translate }}</span>
                                <span>{{ 'AUTO_TUNE.PARAMETER' | translate }}</span>
                                <span>{{ 'AUTO_TUNE.FINAL_VALUE' | translate }}</span>
                                <span>{{ 'AUTO_TUNE.ITERATIONS' | translate }}</span>
                                <span>{{ 'AUTO_TUNE.CRITERION' | translate }}</span>
                            </div>
                            <div class="detail-row" *ngFor="let step of pipelineSteps; let i = index">
                                <span class="detail-step-num">{{ i + 1 }}</span>
                                <span class="detail-param">
                                    <strong>{{ step.symbol }}</strong>
                                    <small>{{ step.fullName | translate }}</small>
                                </span>
                                <span class="detail-value">{{ getStepResult(step.key) || '—' }}</span>
                                <span class="detail-iters">{{ getStepIterations(step.key) }}</span>
                                <span class="detail-criterion">{{ step.criterion | translate }}</span>
                            </div>
                        </div>
                    </mat-expansion-panel>
                </div>
                
                <!-- Error -->
                <div class="error-section" *ngIf="state.error">
                    <mat-icon color="warn">error_outline</mat-icon>
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
        /* ===== CARD ===== */
        .auto-tuner-card {
            margin-bottom: 16px;
            transition: box-shadow 0.3s, border-color 0.3s;
            border: 2px solid transparent;
        }
        .auto-tuner-card.running {
            border-color: #1976d2;
            box-shadow: 0 4px 20px rgba(25,118,210,0.15);
        }
        .auto-tuner-card.done {
            border-color: #4caf50;
        }
        
        .header-icon {
            color: #1976d2;
            transition: transform 0.3s;
        }
        .header-icon.spin {
            animation: spin 2s linear infinite;
        }
        @keyframes spin {
            100% { transform: rotate(360deg); }
        }
        
        /* ===== PIPELINE STEPPER ===== */
        .pipeline-stepper {
            margin: 16px 0;
        }
        
        .stepper-track {
            display: flex;
            align-items: flex-start;
            justify-content: center;
            padding: 8px 0;
            overflow-x: auto;
        }
        
        .stepper-item {
            display: flex;
            align-items: center;
        }
        
        .step-node {
            display: flex;
            flex-direction: column;
            align-items: center;
            min-width: 80px;
            position: relative;
        }
        
        .step-circle {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: 700;
            transition: all 0.4s cubic-bezier(.4,0,.2,1);
            border: 3px solid #e0e0e0;
            background: white;
            color: #bdbdbd;
        }
        .step-circle mat-icon {
            font-size: 20px;
            width: 20px;
            height: 20px;
        }
        
        .stepper-item.active .step-circle {
            border-color: #1976d2;
            background: #1976d2;
            color: white;
            box-shadow: 0 0 0 6px rgba(25,118,210,0.15);
            animation: pulse-ring 1.5s ease infinite;
        }
        @keyframes pulse-ring {
            0% { box-shadow: 0 0 0 4px rgba(25,118,210,0.2); }
            50% { box-shadow: 0 0 0 10px rgba(25,118,210,0.05); }
            100% { box-shadow: 0 0 0 4px rgba(25,118,210,0.2); }
        }
        
        .stepper-item.done .step-circle {
            border-color: #4caf50;
            background: #4caf50;
            color: white;
        }
        
        .step-text {
            margin-top: 8px;
            text-align: center;
        }
        .step-symbol {
            display: block;
            font-size: 15px;
            font-weight: 700;
            color: #333;
        }
        .step-name {
            display: block;
            font-size: 10px;
            color: #999;
            max-width: 80px;
            line-height: 1.2;
        }
        .stepper-item.active .step-symbol { color: #1976d2; }
        .stepper-item.done .step-symbol { color: #4caf50; }
        
        .step-live-value {
            margin-top: 4px;
            font-size: 13px;
            font-family: 'Roboto Mono', monospace;
            color: #1976d2;
            font-weight: 600;
            animation: fadeIn 0.3s;
        }
        .step-final-value {
            margin-top: 4px;
            font-size: 13px;
            font-family: 'Roboto Mono', monospace;
            color: #2e7d32;
            font-weight: 600;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-4px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .step-connector {
            display: flex;
            align-items: center;
            padding: 0 4px;
            margin-bottom: 40px;
        }
        .connector-line {
            width: 24px;
            height: 3px;
            background: #e0e0e0;
            border-radius: 2px;
            transition: background 0.4s;
        }
        .connector-line.filled {
            background: #4caf50;
        }
        .connector-arrow {
            font-size: 16px;
            width: 16px;
            height: 16px;
            color: #e0e0e0;
            transition: color 0.4s;
        }
        .connector-arrow.filled {
            color: #4caf50;
        }
        
        /* ===== PROGRESS AREA ===== */
        .progress-area {
            margin-top: 16px;
            padding: 12px 16px;
            background: #e3f2fd;
            border-radius: 8px;
        }
        .progress-text {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 10px;
            font-size: 14px;
            color: #1565c0;
        }
        .pulse-icon {
            animation: pulse-opacity 1.5s ease infinite;
        }
        @keyframes pulse-opacity {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
        }
        .progress-detail {
            font-size: 12px;
            color: #42a5f5;
            font-family: 'Roboto Mono', monospace;
            margin-top: 4px;
            margin-left: 32px;
        }
        
        /* ===== RESULTS ===== */
        .results-area {
            margin-top: 8px;
        }
        
        .params-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 12px;
        }
        .params-header mat-icon {
            color: #f9a825;
            font-size: 28px;
            width: 28px;
            height: 28px;
        }
        .params-header h4 {
            margin: 0;
            flex: 1;
            font-size: 16px;
        }
        .timing-badge {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 12px;
            color: #757575;
            background: #f5f5f5;
            padding: 4px 10px;
            border-radius: 12px;
        }
        .timing-badge mat-icon {
            font-size: 14px;
            width: 14px;
            height: 14px;
            color: #757575;
        }
        
        .params-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-bottom: 16px;
        }
        @media (max-width: 700px) {
            .params-grid { grid-template-columns: repeat(2, 1fr); }
        }
        
        .param-tile {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px;
            background: linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%);
            border-radius: 10px;
            border: 1px solid #c8e6c9;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .param-tile:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
        
        .param-tile-icon {
            width: 36px;
            height: 36px;
            border-radius: 8px;
            background: #2e7d32;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .param-tile-icon mat-icon {
            color: white;
            font-size: 20px;
            width: 20px;
            height: 20px;
        }
        
        .param-tile-content {
            display: flex;
            flex-direction: column;
        }
        .param-tile-value {
            font-size: 18px;
            font-weight: 700;
            color: #1b5e20;
            line-height: 1.1;
        }
        .param-tile-label {
            font-size: 10px;
            color: #558b2f;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        
        /* ===== DETAIL TABLE ===== */
        .details-panel {
            margin-top: 16px;
        }
        .detail-table {
            width: 100%;
        }
        .detail-row {
            display: grid;
            grid-template-columns: 40px 1.5fr 100px 80px 1fr;
            gap: 8px;
            padding: 8px 4px;
            align-items: center;
            border-bottom: 1px solid #f0f0f0;
        }
        .detail-row.header {
            font-size: 11px;
            text-transform: uppercase;
            color: #999;
            font-weight: 600;
            border-bottom: 2px solid #e0e0e0;
        }
        .detail-step-num {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: #e8eaf6;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 700;
            color: #3f51b5;
        }
        .detail-param strong {
            display: block;
            font-size: 14px;
        }
        .detail-param small {
            color: #999;
            font-size: 11px;
        }
        .detail-value {
            font-family: 'Roboto Mono', monospace;
            font-weight: 600;
            color: #2e7d32;
        }
        .detail-iters {
            text-align: center;
            color: #757575;
        }
        .detail-criterion {
            font-size: 12px;
            color: #757575;
            font-style: italic;
        }
        
        /* ===== ERROR ===== */
        .error-section {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #c62828;
            padding: 12px;
            background: #ffebee;
            border-radius: 8px;
            border: 1px solid #ef9a9a;
        }
    `]
})
export class AutoTunerPanelComponent {

    @Input() hasData = false;
    @Output() paramsSelected = new EventEmitter<{
        contamination: number;
        nTrees: number;
        maxFeatures: number;
        maxDepth: number;
        sampleSize: number;
        threshold: number;
    }>();

    pipelineSteps = [
        { key: 'sampleSize', symbol: 'S', label: 'AUTO_TUNE.STEPS.S', fullName: 'AUTO_TUNE.STEPS.S_FULL', criterion: 'AUTO_TUNE.CRITERIA.S' },
        { key: 'trees', symbol: 'T', label: 'AUTO_TUNE.STEPS.T', fullName: 'AUTO_TUNE.STEPS.T_FULL', criterion: 'AUTO_TUNE.CRITERIA.T' },
        { key: 'features', symbol: 'F', label: 'AUTO_TUNE.STEPS.F', fullName: 'AUTO_TUNE.STEPS.F_FULL', criterion: 'AUTO_TUNE.CRITERIA.F' },
        { key: 'depth', symbol: 'D', label: 'AUTO_TUNE.STEPS.D', fullName: 'AUTO_TUNE.STEPS.D_FULL', criterion: 'AUTO_TUNE.CRITERIA.D' },
        { key: 'threshold', symbol: 'Th', label: 'AUTO_TUNE.STEPS.TH', fullName: 'AUTO_TUNE.STEPS.TH_FULL', criterion: 'AUTO_TUNE.CRITERIA.TH' }
    ];

    private readonly phaseOrder = ['sampleSize', 'trees', 'features', 'depth', 'threshold'];

    constructor(public autoTunerService: AutoTunerService) { }

    get state(): IAutoTuneState {
        return this.autoTunerService.state;
    }

    isStepActive(key: string): boolean {
        return this.state.progress?.phase === key;
    }

    isStepDone(key: string): boolean {
        const phase = this.state.progress?.phase;
        if (this.state.result && !this.state.isRunning) return true;
        if (!phase) return false;
        return this.phaseOrder.indexOf(key) < this.phaseOrder.indexOf(phase);
    }

    phaseToKey(phase: string): string {
        return phase;
    }

    getPhaseIcon(): string {
        const icons: Record<string, string> = {
            sampleSize: 'data_array',
            trees: 'park',
            features: 'view_column',
            depth: 'account_tree',
            threshold: 'tune'
        };
        return icons[this.state.progress?.phase || ''] || 'settings';
    }

    formatLive(key: string, value: number): string {
        if (key === 'threshold') return value.toFixed(4);
        if (key === 'features') return value.toFixed(3);
        return String(Math.round(value * 1000) / 1000);
    }

    getStepResult(key: string): string | null {
        const result = this.state.result;
        if (!result) return null;
        const step = result.steps.find(s => {
            const paramMap: Record<string, string> = { sampleSize: 'S', trees: 'T', features: 'F', depth: 'D', threshold: 'Th' };
            return s.param === paramMap[key];
        });
        if (!step) return null;
        if (key === 'threshold') return step.value.toFixed(4);
        if (key === 'features') return step.value.toFixed(3);
        return String(step.value);
    }

    getStepIterations(key: string): number {
        const result = this.state.result;
        if (!result) return 0;
        const paramMap: Record<string, string> = { sampleSize: 'S', trees: 'T', features: 'F', depth: 'D', threshold: 'Th' };
        const step = result.steps.find(s => s.param === paramMap[key]);
        return step ? step.history.length : 0;
    }

    async runAutoTune(): Promise<void> { }

    applyParams(): void {
        const result = this.state.result;
        if (result) {
            this.paramsSelected.emit({
                contamination: result.optimalParams.contamination,
                nTrees: result.optimalParams.nTrees,
                maxFeatures: result.optimalParams.maxFeatures,
                maxDepth: result.optimalParams.maxDepth,
                sampleSize: result.optimalParams.sampleSize,
                threshold: result.optimalParams.threshold
            });
        }
    }
}
