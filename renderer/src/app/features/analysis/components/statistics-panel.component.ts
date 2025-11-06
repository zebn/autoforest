import { Component, Input } from '@angular/core';
import { IDatasetStats } from '@core';

@Component({
  selector: 'app-statistics-panel',
  template: `
    <div style="padding: 20px;">
      <h3>{{ 'STATS.TITLE' | translate }}</h3>
      <div class="stats-grid">
        <mat-card>
          <mat-card-content>
            <h2>{{ stats.totalRecords | number }}</h2>
            <p>{{ 'STATS.TOTAL_RECORDS' | translate }}</p>
          </mat-card-content>
        </mat-card>
        
        <mat-card>
          <mat-card-content>
            <h2 style="color: #e91e63;">{{ stats.totalAnomalies | number }}</h2>
            <p>{{ 'STATS.ANOMALIES_DETECTED' | translate }}</p>
          </mat-card-content>
        </mat-card>
        
        <mat-card>
          <mat-card-content>
            <h2 style="color: #26a69a;">{{ stats.normalRecords | number }}</h2>
            <p>{{ 'STATS.NORMAL_RECORDS' | translate }}</p>
          </mat-card-content>
        </mat-card>
        
        <mat-card>
          <mat-card-content>
            <h2>{{ stats.anomalyRate | number:'1.2-2' }}%</h2>
            <p>{{ 'STATS.ANOMALY_RATE' | translate }}</p>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }

    .stats-grid mat-card {
      text-align: center;
    }

    .stats-grid h2 {
      font-size: 3em;
      margin: 10px 0;
    }

    .stats-grid p {
      color: #666;
      font-size: 0.9em;
    }
  `]
})
export class StatisticsPanelComponent {
  @Input() stats: IDatasetStats = {
    totalRecords: 0,
    totalAnomalies: 0,
    normalRecords: 0,
    anomalyRate: 0
  };
}
