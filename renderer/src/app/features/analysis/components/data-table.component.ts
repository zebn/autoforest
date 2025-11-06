import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { IDatasetRow } from '@core';

@Component({
  selector: 'app-data-table',
  template: `
    <div style="margin-top: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 15px;">
          <span style="color: #666;">
            {{ 'RESULTS.SHOWING' | translate }} {{ displayedData.length }} 
            {{ 'RESULTS.OF' | translate }} {{ totalCount }} 
            {{ 'RESULTS.RECORDS' | translate }}
          </span>
          <button 
            mat-raised-button 
            [color]="showOnlyAnomalies ? 'warn' : 'primary'"
            (click)="toggleFilter()"
            *ngIf="hasScores"
          >
            <mat-icon>{{ showOnlyAnomalies ? 'filter_alt_off' : 'filter_alt' }}</mat-icon>
            {{ (showOnlyAnomalies ? 'RESULTS.SHOW_ALL' : 'RESULTS.ONLY_ANOMALIES') | translate }}
          </button>
        </div>
        <mat-form-field appearance="outline" style="width: 200px;">
          <mat-label>{{ 'RESULTS.ROWS_PER_PAGE' | translate }}</mat-label>
          <select matNativeControl [value]="pageSize" (change)="onPageSizeChange($event)">
            <option *ngFor="let size of pageSizeOptions" [value]="size">{{ size }}</option>
          </select>
        </mat-form-field>
      </div>

      <div style="overflow-x: auto;">
        <table mat-table [dataSource]="displayedData" class="result-table">
          <!-- Dynamic columns -->
          <ng-container *ngFor="let col of columns; let idx = index" [matColumnDef]="col">
            <th mat-header-cell *matHeaderCellDef> {{ col }} </th>
            <td mat-cell *matCellDef="let element"> {{ element.values[idx] }} </td>
          </ng-container>

          <!-- Score column -->
          <ng-container matColumnDef="score">
            <th mat-header-cell *matHeaderCellDef> {{ 'RESULTS.SCORE' | translate }} </th>
            <td mat-cell *matCellDef="let element"> 
              {{ element.score | number:'1.4-4' }}
            </td>
          </ng-container>

          <!-- Anomaly column -->
          <ng-container matColumnDef="anomaly">
            <th mat-header-cell *matHeaderCellDef> {{ 'RESULTS.STATUS' | translate }} </th>
            <td mat-cell *matCellDef="let element">
              <mat-chip *ngIf="element.isAnomaly" color="warn" selected>
                <mat-icon>warning</mat-icon>
                {{ 'RESULTS.ANOMALY' | translate }}
              </mat-chip>
              <mat-chip *ngIf="!element.isAnomaly" color="primary">
                <mat-icon>check_circle</mat-icon>
                {{ 'RESULTS.NORMAL' | translate }}
              </mat-chip>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr 
            mat-row 
            *matRowDef="let row; columns: displayedColumns;"
            [class.anomaly-row]="row.isAnomaly"
          ></tr>
        </table>
      </div>
      
      <mat-paginator 
        [length]="totalCount"
        [pageSize]="pageSize"
        [pageSizeOptions]="pageSizeOptions"
        [pageIndex]="pageIndex"
        (page)="onPageChange($event)"
        showFirstLastButtons
        style="margin-top: 10px;"
      >
      </mat-paginator>
    </div>
  `,
  styles: [`
    .result-table {
      width: 100%;
      background: white;
    }

    .anomaly-row {
      background-color: rgba(233, 30, 99, 0.12);
    }

    .anomaly-row:hover {
      background-color: rgba(233, 30, 99, 0.24);
    }
  `]
})
export class DataTableComponent implements OnInit {
  @Input() data: IDatasetRow[] = [];
  @Input() columns: string[] = [];
  @Input() hasScores: boolean = false;
  @Input() showOnlyAnomalies: boolean = false;
  @Input() pageSize: number = 50;
  @Input() pageIndex: number = 0;
  @Input() pageSizeOptions: number[] = [10, 25, 50, 100, 500];

  @Output() filterToggled = new EventEmitter<void>();
  @Output() pageChanged = new EventEmitter<{ pageIndex: number; pageSize: number }>();

  displayedData: IDatasetRow[] = [];
  displayedColumns: string[] = [];
  totalCount: number = 0;

  ngOnInit(): void {
    this.updateDisplayedColumns();
    this.updateDisplayedData();
  }

  ngOnChanges(): void {
    this.updateDisplayedColumns();
    this.updateDisplayedData();
  }

  private updateDisplayedColumns(): void {
    this.displayedColumns = this.hasScores
      ? [...this.columns, 'score', 'anomaly']
      : [...this.columns];
  }

  private updateDisplayedData(): void {
    let filtered = this.data;

    if (this.showOnlyAnomalies && this.hasScores) {
      filtered = filtered.filter(row => row.isAnomaly);
    }

    this.totalCount = filtered.length;

    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.displayedData = filtered.slice(startIndex, endIndex);
  }

  toggleFilter(): void {
    this.filterToggled.emit();
  }

  onPageChange(event: any): void {
    this.pageChanged.emit({
      pageIndex: event.pageIndex,
      pageSize: event.pageSize
    });
  }

  onPageSizeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.pageChanged.emit({
      pageIndex: 0,
      pageSize: parseInt(select.value, 10)
    });
  }
}
