import { Component, Input, OnChanges, SimpleChanges, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { ITuningStep } from '@core';

@Component({
    selector: 'app-tuning-chart',
    template: `
        <div class="tuning-chart-container" *ngIf="steps && steps.length > 0">
            <div class="chart-header">
                <mat-icon>insights</mat-icon>
                <h4>{{ 'AUTO_TUNE.CONVERGENCE' | translate }}</h4>
            </div>

            <div class="steps-tabs">
                <button
                    *ngFor="let step of steps; let i = index"
                    [class.active]="activeTab === i"
                    (click)="selectTab(i)">
                    <span class="tab-symbol">{{ step.param }}</span>
                    <span class="tab-label">{{ getStepName(step.param) }}</span>
                    <span class="tab-badge">{{ step.history.length }}</span>
                </button>
            </div>

            <div class="chart-area">
                <canvas #chartCanvas width="600" height="240"></canvas>
            </div>

            <div class="step-info" *ngIf="steps[activeTab]">
                <div class="info-chip best">
                    <mat-icon>star</mat-icon>
                    <span class="info-label">{{ 'AUTO_TUNE.FINAL_VALUE' | translate }}</span>
                    <span class="info-value">{{ formatValue(steps[activeTab]) }}</span>
                </div>
                <div class="info-chip">
                    <mat-icon>repeat</mat-icon>
                    <span class="info-label">{{ 'AUTO_TUNE.ITERATIONS' | translate }}</span>
                    <span class="info-value">{{ steps[activeTab].history.length }}</span>
                </div>
                <div class="info-chip" *ngIf="getMetricRange(steps[activeTab]) as mr">
                    <mat-icon>trending_up</mat-icon>
                    <span class="info-label">{{ 'AUTO_TUNE.METRIC' | translate }}</span>
                    <span class="info-value">{{ mr }}</span>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .tuning-chart-container {
            padding: 20px;
            background: linear-gradient(135deg, #f5f7fa 0%, #f0f4f8 100%);
            border-radius: 12px;
            margin-top: 16px;
            border: 1px solid #e1e8ed;
        }
        
        .chart-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 16px;
        }
        .chart-header mat-icon {
            color: #5c6bc0;
        }
        .chart-header h4 {
            margin: 0;
            font-size: 16px;
            color: #37474f;
        }
        
        .steps-tabs {
            display: flex;
            gap: 6px;
            margin-bottom: 16px;
            flex-wrap: wrap;
        }
        .steps-tabs button {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            min-width: 60px;
            border: 2px solid #e0e0e0;
            border-radius: 24px;
            background: white;
            padding: 6px 14px;
            cursor: pointer;
            transition: all 0.25s cubic-bezier(.4,0,.2,1);
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .steps-tabs button:hover {
            border-color: #90caf9;
            background: #e3f2fd;
        }
        .steps-tabs button.active {
            background: linear-gradient(135deg, #1565c0, #1976d2);
            color: white;
            border-color: transparent;
            box-shadow: 0 3px 8px rgba(25,118,210,0.3);
        }
        .tab-symbol {
            font-weight: 700;
            font-size: 14px;
        }
        .tab-label {
            font-size: 11px;
            opacity: 0.75;
        }
        .tab-badge {
            font-size: 10px;
            background: rgba(0,0,0,0.08);
            border-radius: 10px;
            padding: 1px 7px;
            font-weight: 600;
        }
        .steps-tabs button.active .tab-badge {
            background: rgba(255,255,255,0.25);
        }
        .steps-tabs button.active .tab-label {
            opacity: 0.9;
        }
        
        .chart-area {
            background: white;
            border-radius: 12px;
            padding: 16px;
            border: 1px solid #e8eaf6;
            box-shadow: inset 0 1px 3px rgba(0,0,0,0.03);
        }
        .chart-area canvas {
            width: 100%;
            height: 240px;
        }
        
        .step-info {
            display: flex;
            gap: 12px;
            margin-top: 14px;
            flex-wrap: wrap;
        }
        
        .info-chip {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 14px;
            background: white;
            border-radius: 20px;
            border: 1px solid #e0e0e0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .info-chip mat-icon {
            font-size: 16px;
            width: 16px;
            height: 16px;
            color: #90a4ae;
        }
        .info-chip.best mat-icon {
            color: #f9a825;
        }
        .info-label {
            font-size: 10px;
            color: #999;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        .info-value {
            font-size: 15px;
            font-weight: 700;
            color: #1565c0;
            font-family: 'Roboto Mono', monospace;
        }
        .info-chip.best .info-value {
            color: #2e7d32;
        }
    `]
})
export class TuningChartComponent implements OnChanges, AfterViewInit {
    @Input() steps: ITuningStep[] = [];
    @ViewChild('chartCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

    activeTab = 0;
    private isViewReady = false;

    private readonly stepNames: Record<string, string> = {
        S: 'Sample Size', T: 'Trees', F: 'Features', D: 'Depth', Th: 'Threshold'
    };

    private readonly colors: Record<string, { main: string; light: string; accent: string }> = {
        S: { main: '#5c6bc0', light: '#e8eaf6', accent: '#3f51b5' },
        T: { main: '#26a69a', light: '#e0f2f1', accent: '#00897b' },
        F: { main: '#ef6c00', light: '#fff3e0', accent: '#e65100' },
        D: { main: '#7b1fa2', light: '#f3e5f5', accent: '#6a1b9a' },
        Th: { main: '#c62828', light: '#ffebee', accent: '#b71c1c' }
    };

    ngAfterViewInit() {
        this.isViewReady = true;
        this.drawChart();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['steps'] && this.isViewReady) {
            this.activeTab = 0;
            this.drawChart();
        }
    }

    selectTab(idx: number) {
        this.activeTab = idx;
        this.drawChart();
    }

    getStepName(param: string): string {
        return this.stepNames[param] || param;
    }

    formatValue(step: ITuningStep): string {
        if (step.param === 'Th') return step.value.toFixed(4);
        if (step.param === 'F') return step.value.toFixed(3);
        return String(step.value);
    }

    getMetricRange(step: ITuningStep): string | null {
        const { values } = this.getChartData(step);
        if (values.length < 2) return null;
        const first = values[0];
        const last = values[values.length - 1];
        return `${this.formatNumber(first)} → ${this.formatNumber(last)}`;
    }

    private drawChart() {
        if (!this.canvasRef || !this.steps || this.steps.length === 0) return;

        const canvas = this.canvasRef.nativeElement;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const w = rect.width;
        const h = rect.height;
        const step = this.steps[this.activeTab];
        if (!step || step.history.length === 0) return;

        ctx.clearRect(0, 0, w, h);

        const { values, label } = this.getChartData(step);
        if (values.length === 0) return;

        const pal = this.colors[step.param] || this.colors['S'];
        const padding = { top: 24, right: 24, bottom: 40, left: 60 };
        const chartW = w - padding.left - padding.right;
        const chartH = h - padding.top - padding.bottom;

        const minVal = Math.min(...values);
        const maxVal = Math.max(...values);
        const pad10 = (maxVal - minVal) * 0.1 || 0.01;
        const yMin = minVal - pad10;
        const yMax = maxVal + pad10;
        const yRange = yMax - yMin;

        const toX = (i: number) => padding.left + (values.length > 1 ? (chartW * i) / (values.length - 1) : chartW / 2);
        const toY = (v: number) => padding.top + chartH - ((v - yMin) / yRange) * chartH;

        // Grid lines (dashed)
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#eceff1';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = padding.top + (chartH * i) / 4;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(padding.left + chartW, y);
            ctx.stroke();
        }
        ctx.setLineDash([]);

        // Y-axis labels
        ctx.fillStyle = '#90a4ae';
        ctx.font = '11px "Roboto Mono", monospace';
        ctx.textAlign = 'right';
        for (let i = 0; i <= 4; i++) {
            const val = yMax - (yRange * i) / 4;
            const y = padding.top + (chartH * i) / 4;
            ctx.fillText(this.formatNumber(val), padding.left - 10, y + 4);
        }

        // X-axis labels
        ctx.textAlign = 'center';
        ctx.fillStyle = '#b0bec5';
        ctx.font = '10px sans-serif';
        for (let i = 0; i < values.length; i++) {
            ctx.fillText(String(i + 1), toX(i), h - 10);
        }

        // Axis labels
        ctx.fillStyle = '#78909c';
        ctx.font = '11px sans-serif';
        ctx.fillText('Iteration', padding.left + chartW / 2, h - 0);

        ctx.save();
        ctx.translate(14, padding.top + chartH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillText(label, 0, 0);
        ctx.restore();

        // Gradient fill under the curve
        ctx.beginPath();
        ctx.moveTo(toX(0), toY(values[0]));
        for (let i = 1; i < values.length; i++) {
            ctx.lineTo(toX(i), toY(values[i]));
        }
        ctx.lineTo(toX(values.length - 1), padding.top + chartH);
        ctx.lineTo(toX(0), padding.top + chartH);
        ctx.closePath();

        const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
        gradient.addColorStop(0, pal.main + '30');
        gradient.addColorStop(1, pal.main + '05');
        ctx.fillStyle = gradient;
        ctx.fill();

        // Smooth line
        ctx.strokeStyle = pal.main;
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let i = 0; i < values.length; i++) {
            const x = toX(i);
            const y = toY(values[i]);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Points with glow on best
        const bestIdx = values.length - 1;
        for (let i = 0; i < values.length; i++) {
            const x = toX(i);
            const y = toY(values[i]);

            if (i === bestIdx) {
                // Glow for final point
                ctx.beginPath();
                ctx.arc(x, y, 10, 0, Math.PI * 2);
                ctx.fillStyle = pal.main + '20';
                ctx.fill();
            }

            ctx.beginPath();
            ctx.arc(x, y, i === bestIdx ? 5.5 : 3.5, 0, Math.PI * 2);
            ctx.fillStyle = i === bestIdx ? pal.accent : pal.main;
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Annotation on best point
        if (values.length > 0) {
            const bx = toX(bestIdx);
            const by = toY(values[bestIdx]);
            const valueText = this.formatNumber(values[bestIdx]);

            ctx.font = 'bold 11px "Roboto Mono", monospace';
            const tw = ctx.measureText(valueText).width;
            const boxPad = 6;
            const boxW = tw + boxPad * 2;
            const boxH = 20;
            const boxX = bx - boxW / 2;
            const boxY = by - boxH - 12;

            // Rounded rect
            const r = 4;
            ctx.beginPath();
            ctx.moveTo(boxX + r, boxY);
            ctx.lineTo(boxX + boxW - r, boxY);
            ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + r);
            ctx.lineTo(boxX + boxW, boxY + boxH - r);
            ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - r, boxY + boxH);
            ctx.lineTo(boxX + r, boxY + boxH);
            ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - r);
            ctx.lineTo(boxX, boxY + r);
            ctx.quadraticCurveTo(boxX, boxY, boxX + r, boxY);
            ctx.closePath();
            ctx.fillStyle = pal.accent;
            ctx.fill();

            // Arrow
            ctx.beginPath();
            ctx.moveTo(bx - 4, boxY + boxH);
            ctx.lineTo(bx, boxY + boxH + 5);
            ctx.lineTo(bx + 4, boxY + boxH);
            ctx.fillStyle = pal.accent;
            ctx.fill();

            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.fillText(valueText, bx, boxY + boxH - 5.5);
        }
    }

    private getChartData(step: ITuningStep): { values: number[]; label: string } {
        switch (step.param) {
            case 'S':
                return { values: step.history.map((h: any) => h.std || 0), label: 'Score Std Dev' };
            case 'T':
                return { values: step.history.map((h: any) => h.f1 || 0), label: 'F1 Score' };
            case 'F':
                return { values: step.history.map((h: any) => h.f1 || 0), label: 'F1 Score' };
            case 'D':
                return { values: step.history.map((h: any) => h.separation || 0), label: 'Separation' };
            case 'Th':
                return { values: step.history.map((h: any) => h.cost ?? 0), label: 'Cost' };
            default:
                return { values: [], label: '' };
        }
    }

    private formatNumber(n: number): string {
        if (Math.abs(n) >= 1000) return n.toFixed(0);
        if (Math.abs(n) >= 1) return n.toFixed(2);
        if (Math.abs(n) >= 0.01) return n.toFixed(3);
        return n.toFixed(4);
    }
}
