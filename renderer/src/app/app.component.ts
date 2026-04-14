import { Component, OnInit, ViewChild, NgZone } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { TranslateService } from '@ngx-translate/core';
import { AutoTunerService } from '@core';

@Component({
  selector: 'app-root',
  template: `
    <mat-toolbar color="warn" style="display: flex; align-items: center; padding: 8px 20px;">
      <img src="assets/images/logonotitle.png" alt="AutoForest" style="height: 40px; margin-right: 15px;">
      <span style="font-size: 1.3em; font-weight: 300;">{{ 'APP.TITLE' | translate }}</span>
      <span style="margin-left: 10px; font-size: 0.9em; opacity: 0.8;">| {{ 'APP.SUBTITLE' | translate }}</span>
      <span style="flex: 1;"></span>
      <button mat-icon-button [matMenuTriggerFor]="langMenu" style="margin-right: 10px;">
        <mat-icon>language</mat-icon>
      </button>
      <mat-menu #langMenu="matMenu">
        <button mat-menu-item (click)="changeLanguage('es')">
          <span [style.font-weight]="currentLang === 'es' ? 'bold' : 'normal'">🇪🇸 Español</span>
        </button>
        <button mat-menu-item (click)="changeLanguage('en')">
          <span [style.font-weight]="currentLang === 'en' ? 'bold' : 'normal'">🇬🇧 English</span>
        </button>
      </mat-menu>
      <button mat-icon-button [matMenuTriggerFor]="menu">
        <mat-icon>more_vert</mat-icon>
      </button>
      <mat-menu #menu="matMenu">
        <button mat-menu-item (click)="showAbout()">
          <mat-icon>info</mat-icon>
          <span>{{ 'MENU.ABOUT' | translate }}</span>
        </button>
        <button mat-menu-item (click)="openDocs()">
          <mat-icon>help</mat-icon>
          <span>{{ 'MENU.DOCS' | translate }}</span>
        </button>
      </mat-menu>
    </mat-toolbar>

    <div class="container">
      <!-- Configuration Card -->
      <mat-card style="margin-top: 20px;">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>upload_file</mat-icon>
            {{ 'CONFIG.TITLE' | translate }}
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div style="margin: 20px 0;">
            <input 
              type="file" 
              #fileInput
              (change)="onFile($event)" 
              accept=".csv" 
              style="display: none;"
              id="fileInput"
            />
            <button 
              mat-raised-button 
              color="warn"
              (click)="fileInput.click()"
            >
              <mat-icon>folder_open</mat-icon>
              {{ 'CONFIG.SELECT_CSV' | translate }}
            </button>
            <span style="margin-left: 15px;" *ngIf="fileName">
              <mat-chip>{{ fileName }}</mat-chip>
            </span>
          </div>

          <!-- Column selector (appears after CSV load) -->
          <div *ngIf="header.length > 0" style="margin-top: 16px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <mat-icon style="color: #666;">view_column</mat-icon>
              <span style="font-size: 14px; color: #666;">{{ 'CONFIG.SELECT_COLUMNS' | translate }}</span>
              <span style="font-size: 12px; color: #999;">({{ getSelectedColumnCount() }}/{{ header.length }})</span>
              <button mat-button style="margin-left: auto; font-size: 12px;" (click)="toggleAllColumns()">
                {{ allColumnsSelected() ? ('CONFIG.DESELECT_ALL' | translate) : ('CONFIG.SELECT_ALL' | translate) }}
              </button>
            </div>
            <div style="max-height: 200px; overflow-y: auto; border: 1px solid #e0e0e0; border-radius: 8px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr *ngFor="let col of header; let i = index"
                    style="border-bottom: 1px solid #f0f0f0; cursor: pointer;"
                    (click)="toggleColumn(i)"
                    [style.background]="selectedColumns[i] ? '#e8f5e9' : 'white'">
                  <td style="padding: 6px 12px; width: 40px;">
                    <mat-checkbox
                      [checked]="selectedColumns[i]"
                      (change)="toggleColumn(i)"
                      (click)="$event.stopPropagation()"
                      color="primary">
                    </mat-checkbox>
                  </td>
                  <td style="padding: 6px 8px; font-size: 13px;">{{ col }}</td>
                  <td style="padding: 6px 12px; font-size: 11px; color: #999; text-align: right;">{{ getColumnPreview(i) }}</td>
                </tr>
              </table>
            </div>
          </div>

          <div style="display: flex; gap: 20px; margin-top: 20px;">
            <mat-form-field appearance="outline" style="flex: 1;">
              <mat-label>{{ 'CONFIG.CONTAMINATION' | translate }}</mat-label>
              <input 
                matInput 
                type="number" 
                [(ngModel)]="contamination" 
                step="0.01" 
                min="0" 
                max="0.5"
              />
              <mat-hint>{{ 'CONFIG.CONTAMINATION_HINT' | translate }}</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline" style="flex: 1;">
              <mat-label>{{ 'CONFIG.N_TREES' | translate }}</mat-label>
              <input 
                matInput 
                type="number" 
                [(ngModel)]="nTrees"
              />
              <mat-hint>{{ 'CONFIG.N_TREES_HINT' | translate }}</mat-hint>
            </mat-form-field>
          </div>

          <!-- Advanced parameters row -->
          <div style="display: flex; gap: 20px; margin-top: 16px; flex-wrap: wrap;">
            <mat-form-field appearance="outline" style="flex: 1; min-width: 140px;">
              <mat-label>{{ 'CONFIG.SAMPLE_SIZE' | translate }}</mat-label>
              <input 
                matInput 
                type="number" 
                [(ngModel)]="sampleSize"
                min="2"
              />
              <mat-hint>{{ 'CONFIG.SAMPLE_SIZE_HINT' | translate }}</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline" style="flex: 1; min-width: 140px;">
              <mat-label>{{ 'CONFIG.MAX_FEATURES' | translate }}</mat-label>
              <input 
                matInput 
                type="number" 
                [(ngModel)]="maxFeatures"
                step="0.1"
                min="0.1"
                max="1"
              />
              <mat-hint>{{ 'CONFIG.MAX_FEATURES_HINT' | translate }}</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline" style="flex: 1; min-width: 140px;">
              <mat-label>{{ 'CONFIG.MAX_DEPTH' | translate }}</mat-label>
              <input 
                matInput 
                type="number" 
                [(ngModel)]="maxDepth"
                min="0"
              />
              <mat-hint>{{ 'CONFIG.MAX_DEPTH_HINT' | translate }}</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline" style="flex: 1; min-width: 140px;">
              <mat-label>{{ 'CONFIG.THRESHOLD' | translate }}</mat-label>
              <input 
                matInput 
                type="number" 
                [(ngModel)]="threshold"
                step="0.01"
                min="0"
                max="1"
              />
              <mat-hint>{{ 'CONFIG.THRESHOLD_HINT' | translate }}</mat-hint>
            </mat-form-field>
          </div>

          <div style="margin-top: 20px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <button 
              mat-raised-button 
              color="accent" 
              (click)="run()"
              [disabled]="!rows.length || isLoading"
            >
              <mat-icon>play_arrow</mat-icon>
              {{ 'CONFIG.RUN' | translate }}
            </button>
            
            <button 
              mat-raised-button 
              color="primary"
              (click)="autoTune()"
              [disabled]="!rows.length || isLoading || isAutoTuning"
            >
              <mat-icon>auto_fix_high</mat-icon>
              {{ 'AUTO_TUNE.RUN' | translate }}
            </button>
            
            <button 
              mat-button 
              (click)="clear()"
              [disabled]="!rows.length"
            >
              <mat-icon>clear</mat-icon>
              {{ 'CONFIG.CLEAR' | translate }}
            </button>
          </div>

          <div style="margin-top: 15px;" *ngIf="status">
            <mat-chip-listbox>
              <mat-chip [color]="statusColor" selected>
                <mat-icon *ngIf="isLoading">hourglass_empty</mat-icon>
                {{ status }}
              </mat-chip>
            </mat-chip-listbox>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Results -->
      <mat-card *ngIf="rows.length && !isLoading" style="margin-top: 20px;">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>analytics</mat-icon>
            {{ 'RESULTS.TITLE' | translate }}
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <mat-tab-group>
            <mat-tab [label]="'RESULTS.TABLE_TAB' | translate">
              <div style="margin-top: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 10px;">
                  <div style="display: flex; align-items: center; gap: 15px;">
                    <span style="color: #666;">{{ 'RESULTS.SHOWING' | translate }} {{ getPaginatedData().length }} {{ 'RESULTS.OF' | translate }} {{ getFilteredDataCount() }} {{ 'RESULTS.RECORDS' | translate }}</span>
                    <button 
                      mat-raised-button 
                      [color]="showOnlyAnomalies ? 'warn' : 'primary'"
                      (click)="toggleAnomaliesFilter()"
                      *ngIf="scores.length > 0"
                    >
                      <mat-icon>{{ showOnlyAnomalies ? 'filter_alt_off' : 'filter_alt' }}</mat-icon>
                      {{ (showOnlyAnomalies ? 'RESULTS.SHOW_ALL' : 'RESULTS.ONLY_ANOMALIES') | translate }}
                    </button>
                    <button
                      mat-stroked-button
                      color="warn"
                      (click)="clearExcluded()"
                      *ngIf="excludedRows.size > 0"
                      style="margin-left: 8px;"
                    >
                      <mat-icon>restore</mat-icon>
                      {{ 'RESULTS.CLEAR_EXCLUDED' | translate }} ({{ excludedRows.size }})
                    </button>
                  </div>
                  <mat-form-field appearance="outline" style="width: 200px;">
                    <mat-label>{{ 'RESULTS.ROWS_PER_PAGE' | translate }}</mat-label>
                    <select matNativeControl [(ngModel)]="pageSize" (change)="onPageSizeChange()">
                      <option [value]="10">10</option>
                      <option [value]="25">25</option>
                      <option [value]="50">50</option>
                      <option [value]="100">100</option>
                      <option [value]="500">500</option>
                    </select>
                  </mat-form-field>
                </div>
                <div style="overflow-x: auto;">
                  <table mat-table [dataSource]="getPaginatedData()" class="result-table">
                  <!-- Exclude checkbox column -->
                  <ng-container matColumnDef="exclude">
                    <th mat-header-cell *matHeaderCellDef style="width: 48px;">
                      <mat-icon style="font-size: 18px; color: #999;" matTooltip="{{ 'RESULTS.EXCLUDE_HINT' | translate }}">block</mat-icon>
                    </th>
                    <td mat-cell *matCellDef="let element">
                      <mat-checkbox
                        [checked]="excludedRows.has(element.originalIndex)"
                        (change)="toggleExcludeRow(element.originalIndex)"
                        color="warn">
                      </mat-checkbox>
                    </td>
                  </ng-container>

                  <!-- Dynamic columns -->
                  <ng-container *ngFor="let col of header; let idx = index" [matColumnDef]="col">
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
                    [class.excluded-row]="excludedRows.has(row.originalIndex)"
                  ></tr>
                </table>
              </div>
              
              <mat-paginator 
                #paginator
                [length]="getFilteredDataCount()"
                [pageSize]="pageSize"
                [pageSizeOptions]="[10, 25, 50, 100, 500]"
                [pageIndex]="pageIndex"
                (page)="onPageChange($event)"
                showFirstLastButtons
                style="margin-top: 10px;"
              >
              </mat-paginator>
            </div>
            </mat-tab>

            <mat-tab [label]="'RESULTS.STATS_TAB' | translate">
              <div style="padding: 20px;">
                <h3>{{ 'STATS.TITLE' | translate }}</h3>
                <div class="stats-grid">
                  <mat-card>
                    <mat-card-content>
                      <h2>{{ rows.length }}</h2>
                      <p>{{ 'STATS.TOTAL_RECORDS' | translate }}</p>
                    </mat-card-content>
                  </mat-card>
                  <mat-card>
                    <mat-card-content>
                      <h2 style="color: #e91e63;">{{ getAnomalyCount() }}</h2>
                      <p>{{ 'STATS.ANOMALIES_DETECTED' | translate }}</p>
                    </mat-card-content>
                  </mat-card>
                  <mat-card>
                    <mat-card-content>
                      <h2 style="color: #26a69a;">{{ rows.length - getAnomalyCount() }}</h2>
                      <p>{{ 'STATS.NORMAL_RECORDS' | translate }}</p>
                    </mat-card-content>
                  </mat-card>
                  <mat-card>
                    <mat-card-content>
                      <h2>{{ getAnomalyPercentage() }}%</h2>
                      <p>{{ 'STATS.ANOMALY_RATE' | translate }}</p>
                    </mat-card-content>
                  </mat-card>
                </div>
                <!-- Healthy Baseline -->
                <div *ngIf="healthyBaseline.length > 0" style="margin-top: 30px;">
                  <h3 style="display: flex; align-items: center; gap: 8px;">
                    <mat-icon style="color: #26a69a;">favorite</mat-icon>
                    {{ 'STATS.HEALTHY_BASELINE' | translate }}
                  </h3>
                  <p style="color: #888; font-size: 0.85em; margin-bottom: 12px;">{{ 'STATS.BASELINE_DESC' | translate }}</p>
                  <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                      <thead>
                        <tr style="background: #e0f2f1;">
                          <th style="padding: 10px 14px; text-align: left; font-weight: 500;">{{ 'STATS.COLUMN' | translate }}</th>
                          <th style="padding: 10px 14px; text-align: right; font-weight: 500;">{{ 'STATS.MEDIAN' | translate }}</th>
                          <th style="padding: 10px 14px; text-align: right; font-weight: 500;">{{ 'STATS.MEAN' | translate }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr *ngFor="let b of healthyBaseline; let odd = odd"
                            [style.background]="odd ? '#fafafa' : 'white'"
                            style="border-bottom: 1px solid #f0f0f0;">
                          <td style="padding: 8px 14px; font-size: 13px;">{{ b.column }}</td>
                          <td style="padding: 8px 14px; text-align: right; font-family: monospace; font-size: 13px;">{{ b.median | number:'1.4-4' }}</td>
                          <td style="padding: 8px 14px; text-align: right; font-family: monospace; font-size: 13px;">{{ b.mean | number:'1.4-4' }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </mat-tab>

            <mat-tab [label]="'RESULTS.CHART_TAB' | translate">
              <div style="padding: 20px;">
                <canvas #chartCanvas></canvas>
              </div>
            </mat-tab>

            <!-- Auto-Tuning Tab -->
            <mat-tab *ngIf="autoTunerService.state.isRunning || autoTunerService.state.result">
              <ng-template mat-tab-label>
                <mat-icon style="margin-right: 6px;" [class.spin-icon]="autoTunerService.state.isRunning">auto_fix_high</mat-icon>
                {{ 'AUTO_TUNE.TITLE' | translate }}
              </ng-template>
              <div style="padding: 20px;">
                <app-auto-tuner-panel
                  [hasData]="rows.length > 0"
                  (paramsSelected)="onTuningParamsSelected($event)">
                </app-auto-tuner-panel>
              </div>
            </mat-tab>
          </mat-tab-group>
        </mat-card-content>
      </mat-card>

      <!-- Loading spinner -->
      <div *ngIf="isLoading" style="text-align: center; margin-top: 50px;">
        <mat-spinner style="margin: 0 auto;"></mat-spinner>
        <p style="margin-top: 20px;">{{ status }}</p>
      </div>
    </div>
  `,
  styles: [`
    .container {
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
    }

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

    .excluded-row {
      opacity: 0.4;
      text-decoration: line-through;
      background-color: #f5f5f5;
    }

    .excluded-row:hover {
      opacity: 0.6;
    }

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

    mat-card {
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    mat-card-title {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .spin-icon {
      animation: spin-anim 2s linear infinite;
    }
    @keyframes spin-anim {
      100% { transform: rotate(360deg); }
    }
  `]
})
export class AppComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  header: string[] = [];
  rows: string[][] = [];
  scores: number[] = [];
  labels: boolean[] = [];
  status = '';
  statusColor: 'primary' | 'accent' | 'warn' = 'primary';
  contamination = 0.05;
  nTrees = 100;
  sampleSize = 256;
  maxFeatures = 1.0;
  maxDepth = 0;      // 0 = auto (log2(sampleSize))
  threshold = 0;     // 0 = auto (use contamination-based)
  isLoading = false;
  fileName = '';
  displayedColumns: string[] = [];
  selectedColumns: boolean[] = []; // which CSV columns to use for analysis
  excludedRows = new Set<number>(); // row indices excluded from analysis
  healthyBaseline: { column: string; median: number; mean: number }[] = [];

  // Auto-tuning
  isAutoTuning = false;
  autoTuneProgress: any = null;
  autoTuneResult: any = null;

  // Pagination
  pageSize = 50;
  pageIndex = 0;
  showOnlyAnomalies = false;

  // i18n
  currentLang = 'es';

  constructor(
    private translate: TranslateService,
    public autoTunerService: AutoTunerService,
    private ngZone: NgZone
  ) {
    // Set default language
    this.translate.setDefaultLang('es');
    this.translate.use('es');
  }

  ngOnInit() {
    // Listen for files loaded from menu
    if ((window as any).api && (window as any).api.onFileLoaded) {
      (window as any).api.onFileLoaded((data: any) => {
        this.loadFileContent(data.content, data.name);
      });
    }

    // Listen for auto-tune progress
    if ((window as any).api && (window as any).api.onAutoTuneProgress) {
      (window as any).api.onAutoTuneProgress((progress: any) => {
        this.ngZone.run(() => {
          this.autoTuneProgress = progress;
        });
      });
    }
  }

  changeLanguage(lang: string) {
    this.currentLang = lang;
    this.translate.use(lang);
  }

  async loadFileContent(content: string, name: string) {
    this.fileName = name;
    this.isLoading = true;
    this.status = this.translate.instant('STATUS.PARSING');
    this.statusColor = 'primary';

    try {
      // Process in chunks for large files
      await new Promise(resolve => setTimeout(resolve, 10));

      const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
      this.status = this.translate.instant('STATUS.PROCESSING', { count: lines.length });

      await new Promise(resolve => setTimeout(resolve, 10));

      const rows = lines.map(l => this.parseCSVLine(l));
      // Deduplicate header names (mat-table requires unique matColumnDef)
      const rawHeader = rows[0];
      const seen = new Map<string, number>();
      this.header = rawHeader.map(name => {
        const count = seen.get(name) || 0;
        seen.set(name, count + 1);
        return count === 0 ? name : `${name}_${count}`;
      });
      this.rows = rows.slice(1);
      this.displayedColumns = ['exclude', ...this.header, 'score', 'anomaly'];
      this.selectedColumns = this.header.map(() => true); // select all by default
      this.scores = [];
      this.labels = [];

      // Reset pagination
      this.pageIndex = 0;
      this.pageSize = 50;

      this.status = this.translate.instant('STATUS.LOADED', {
        records: this.rows.length.toLocaleString(),
        columns: this.header.length
      });
      this.statusColor = 'accent';
      this.isLoading = false;
    } catch (e: any) {
      this.status = this.translate.instant('STATUS.ERROR_LOADING', { error: e.message });
      this.statusColor = 'warn';
      this.isLoading = false;
    }
  }

  onFile(ev: any) {
    const f: File = ev.target.files[0];
    if (!f) return;

    f.text().then(content => {
      this.loadFileContent(content, f.name);
    }).catch(e => {
      this.status = this.translate.instant('STATUS.ERROR_LOADING', { error: e.message });
      this.statusColor = 'warn';
      this.isLoading = false;
    });
  }

  // Column selection helpers
  getSelectedColumnCount(): number {
    return this.selectedColumns.filter(s => s).length;
  }

  allColumnsSelected(): boolean {
    return this.selectedColumns.length > 0 && this.selectedColumns.every(s => s);
  }

  toggleAllColumns(): void {
    const allSelected = this.allColumnsSelected();
    this.selectedColumns = this.selectedColumns.map(() => !allSelected);
  }

  toggleColumn(index: number): void {
    this.selectedColumns[index] = !this.selectedColumns[index];
  }

  getColumnPreview(index: number): string {
    if (this.rows.length === 0) return '';
    const samples = this.rows.slice(0, 3).map(r => r[index] || '').join(', ');
    return samples.length > 40 ? samples.substring(0, 37) + '...' : samples;
  }

  /**
   * Check if string looks like a date (contains month names or date patterns)
   */
  isDateLike(val: string): boolean {
    if (!val) return false;
    // Month names (English/Spanish)
    const monthPattern = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Ene|Abr|Ago|Dic)\b/i;
    // Common date patterns like DD/MM/YYYY, YYYY-MM-DD, etc.
    const datePattern = /^\d{1,4}[-\/]\d{1,2}[-\/]\d{1,4}/;
    return monthPattern.test(val) || datePattern.test(val);
  }

  /**
   * Try to parse date string to Unix timestamp (seconds since epoch)
   */
  parseDateToTimestamp(val: string): number | null {
    if (!val) return null;

    // Remove surrounding whitespace
    const cleaned = val.trim();

    const date = new Date(cleaned);
    if (!isNaN(date.getTime())) {
      // Return timestamp in hours (more manageable scale)
      return Math.floor(date.getTime() / (1000 * 60 * 60));
    }
    return null;
  }

  /**
   * Extract numeric value from string with units (e.g., "572.634 MB" → 572.634)
   * Does NOT extract numbers from date strings
   */
  parseNumericValue(val: string): number | null {
    if (val === null || val === '') return null;

    // Skip date-like strings - they should be handled separately
    if (this.isDateLike(val)) return null;

    // Try direct parsing first
    const direct = Number(val);
    if (!Number.isNaN(direct)) return direct;

    // Try extracting number from string with units (e.g., "123.45 MB", "99%")
    // But only if it STARTS with a number (not like "Dec 28")
    const match = val.match(/^\s*(-?\d+(?:\.\d+)?)\s*[a-zA-Z%]+/);
    if (match) {
      const num = Number(match[1]);
      if (!Number.isNaN(num)) return num;
    }

    return null;
  }

  /**
   * Parse a CSV line handling quoted fields (commas inside quotes, escaped quotes)
   */
  parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++; // skip escaped quote
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          result.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
    }
    result.push(current.trim());
    return result;
  }

  recode(rows: string[][]) {
    // Filter to only selected columns
    const colIndices = this.selectedColumns
      .map((selected, i) => selected ? i : -1)
      .filter(i => i >= 0);

    // If none selected, use all
    const useIndices = colIndices.length > 0 ? colIndices : rows[0].map((_, i) => i);

    const cols = useIndices.length;
    const maps = Array.from({ length: cols }, () => new Map());
    const nextId = Array.from({ length: cols }, () => 1);

    // First pass: convert selected columns to numeric
    const numericData = rows.map(r => useIndices.map((origIdx, i) => {
      const cell = r[origIdx];
      const val = cell === '' ? null : cell;

      // Try to parse dates as timestamps first
      const timestamp = this.parseDateToTimestamp(val as string);
      if (timestamp !== null) return timestamp;

      // Try to parse as numeric (including values with units like "572.634 MB")
      const numericVal = this.parseNumericValue(val as string);
      if (numericVal !== null) return numericVal;

      // Categorical encoding
      const m = maps[i];
      if (m.has(val)) return m.get(val);
      const id = nextId[i]++;
      m.set(val, id);
      return id;
    }));

    // Second pass: normalize and filter columns
    return this.normalizeData(numericData);
  }

  /**
   * Normalize data using Z-score and filter out constant columns
   * Also applies log transform to highly skewed positive data
   */
  normalizeData(data: number[][]): number[][] {
    if (data.length === 0) return data;

    const cols = data[0].length;
    const n = data.length;

    // Calculate stats for each column
    type ColStat = {
      mean: number; std: number; min: number; max: number;
      isConstant: boolean; useLog: boolean;
      logMean?: number; logStd?: number;
      coeffOfVariation: number; // CV = std/mean - measures relative variability
    };
    const colStats: ColStat[] = [];

    for (let j = 0; j < cols; j++) {
      const colValues = data.map(row => row[j]);
      const min = Math.min(...colValues);
      const max = Math.max(...colValues);
      const mean = colValues.reduce((a, b) => a + b, 0) / n;
      const variance = colValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
      const std = Math.sqrt(variance) || 1e-9;

      // Coefficient of variation - higher means more variability relative to mean
      const coeffOfVariation = mean !== 0 ? std / Math.abs(mean) : 0;

      // Check if column is constant (no variance)
      const isConstant = (max - min) < 1e-9;

      // Check if data is highly skewed and positive (use log transform)
      // Skewness heuristic: if max/min > 100 and all positive
      const useLog = min > 0 && (max / min) > 100;

      let logMean = 0, logStd = 1;
      if (useLog) {
        const logValues = colValues.map(v => Math.log1p(v));
        logMean = logValues.reduce((a, b) => a + b, 0) / n;
        logStd = Math.sqrt(logValues.reduce((a, b) => a + Math.pow(b - logMean, 2), 0) / n) || 1e-9;
      }

      colStats.push({ mean, std, min, max, isConstant, useLog, logMean, logStd, coeffOfVariation });
    }

    // Find non-constant columns, prioritize high-variability columns
    let validCols = colStats
      .map((s, i) => ({ ...s, idx: i }))
      .filter(s => !s.isConstant);

    // If we have columns with very different variability, focus on high-CV ones
    // This helps when timestamps dominate but have low relative variability
    const maxCV = Math.max(...validCols.map(c => c.coeffOfVariation));
    const minCV = Math.min(...validCols.map(c => c.coeffOfVariation));

    // If there's a big difference in variability, filter out low-variability columns
    if (maxCV > minCV * 10 && validCols.length > 1) {
      const cvThreshold = maxCV * 0.1; // Keep columns with CV at least 10% of max
      validCols = validCols.filter(c => c.coeffOfVariation >= cvThreshold);
    }

    if (validCols.length === 0) {
      console.warn('All columns filtered out, using all non-constant columns');
      validCols = colStats.map((s, i) => ({ ...s, idx: i })).filter(s => !s.isConstant);
    }

    console.log('Columns used for analysis:', validCols.map(c => ({
      idx: c.idx,
      cv: c.coeffOfVariation.toFixed(4),
      useLog: c.useLog,
      range: `${c.min.toFixed(2)} - ${c.max.toFixed(2)}`
    })));

    // Normalize only selected columns to [0, 1] range (Min-Max)
    return data.map(row => {
      return validCols.map(col => {
        let val = row[col.idx];

        // Apply log transform for skewed data
        if (col.useLog && val > 0) {
          val = Math.log1p(val);
          const logMin = Math.log1p(col.min);
          const logMax = Math.log1p(col.max);
          const logRange = logMax - logMin || 1e-9;
          return (val - logMin) / logRange;
        }

        // Min-Max normalization to [0, 1]
        const range = col.max - col.min || 1e-9;
        return (val - col.min) / range;
      });
    });
  }

  async run() {
    if (!this.rows.length) {
      this.status = this.translate.instant('STATUS.LOAD_CSV_FIRST');
      this.statusColor = 'warn';
      return;
    }

    this.isLoading = true;
    this.status = this.translate.instant('STATUS.RECODING', { count: this.rows.length.toLocaleString() });
    this.statusColor = 'primary';

    // Small delay to update UI
    await new Promise(resolve => setTimeout(resolve, 100));

    const startTime = Date.now();

    // Filter out excluded rows before recoding
    const includedIndices: number[] = [];
    const includedRows: string[][] = [];
    this.rows.forEach((row, idx) => {
      if (!this.excludedRows.has(idx)) {
        includedIndices.push(idx);
        includedRows.push(row);
      }
    });

    const data = this.recode(includedRows);
    const recodeTime = ((Date.now() - startTime) / 1000).toFixed(2);

    this.status = this.translate.instant('STATUS.RECODE_COMPLETE', { time: recodeTime });
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      const algoStartTime = Date.now();
      const resp: any = await (window as any).api.runIsolation({
        data,
        params: {
          contamination: this.contamination,
          nTrees: this.nTrees,
          sampleSize: this.sampleSize || 0,
          maxFeatures: this.maxFeatures || 1.0,
          maxDepth: this.maxDepth || 0,
          threshold: this.threshold || 0
        }
      });

      if (!resp.success) throw new Error(resp.error || 'Error desconocido');

      const algoTime = ((Date.now() - algoStartTime) / 1000).toFixed(2);

      // Map scores/labels back to full row array (excluded rows get 0/false)
      const resultScores = resp.result.scores || [];
      const resultLabels = resp.result.labels || [];
      this.scores = new Array(this.rows.length).fill(0);
      this.labels = new Array(this.rows.length).fill(false);
      includedIndices.forEach((origIdx, i) => {
        this.scores[origIdx] = resultScores[i] || 0;
        this.labels[origIdx] = resultLabels[i] || false;
      });

      // Calculate healthy baseline from Normal records
      this.calculateHealthyBaseline();

      // Reset to first page after analysis
      this.pageIndex = 0;

      const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
      this.status = this.translate.instant('STATUS.ANALYSIS_COMPLETE', {
        time: totalTime,
        anomalies: this.getAnomalyCount(),
        percentage: this.getAnomalyPercentage()
      });
      this.statusColor = 'accent';
      this.isLoading = false;
    } catch (e: any) {
      this.status = this.translate.instant('STATUS.ERROR', { error: e.message });
      this.statusColor = 'warn';
      this.isLoading = false;
    }
  }

  clear() {
    this.header = [];
    this.rows = [];
    this.scores = [];
    this.labels = [];
    this.status = '';
    this.fileName = '';
    this.displayedColumns = [];
    this.selectedColumns = [];
    this.excludedRows.clear();
    this.healthyBaseline = [];
    this.pageIndex = 0;
    this.pageSize = 50;
  }

  getTableData() {
    return this.rows.map((row, idx) => ({
      values: row,
      score: this.scores[idx] || 0,
      isAnomaly: this.labels[idx] || false,
      originalIndex: idx
    }));
  }

  getFilteredData() {
    const allData = this.getTableData();
    if (this.showOnlyAnomalies && this.scores.length > 0) {
      return allData.filter(item => item.isAnomaly);
    }
    return allData;
  }

  getFilteredDataCount(): number {
    return this.getFilteredData().length;
  }

  getPaginatedData() {
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    const filteredData = this.getFilteredData();
    return filteredData.slice(startIndex, endIndex);
  }

  toggleAnomaliesFilter() {
    this.showOnlyAnomalies = !this.showOnlyAnomalies;
    this.pageIndex = 0; // Reset to first page when filtering
  }

  onPageChange(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  onPageSizeChange() {
    this.pageIndex = 0; // Reset to first page when changing page size
  }

  getAnomalyCount(): number {
    return this.labels.filter(l => l).length;
  }

  getAnomalyPercentage(): string {
    if (this.rows.length === 0) return '0.00';
    return ((this.getAnomalyCount() / this.rows.length) * 100).toFixed(2);
  }

  toggleExcludeRow(index: number): void {
    if (this.excludedRows.has(index)) {
      this.excludedRows.delete(index);
    } else {
      this.excludedRows.add(index);
    }
  }

  clearExcluded(): void {
    this.excludedRows.clear();
  }

  getExcludedCount(): number {
    return this.excludedRows.size;
  }

  calculateHealthyBaseline(): void {
    // Get indices of Normal (non-anomaly, non-excluded) rows
    const normalIndices: number[] = [];
    this.rows.forEach((_, idx) => {
      if (!this.excludedRows.has(idx) && !this.labels[idx]) {
        normalIndices.push(idx);
      }
    });

    if (normalIndices.length === 0) {
      this.healthyBaseline = [];
      return;
    }

    this.healthyBaseline = this.header.map((col, colIdx) => {
      const values = normalIndices
        .map(rowIdx => this.parseNumericValue(this.rows[rowIdx][colIdx]))
        .filter((v): v is number => v !== null);

      if (values.length === 0) {
        return { column: col, median: NaN, mean: NaN };
      }

      values.sort((a, b) => a - b);
      const mid = Math.floor(values.length / 2);
      const median = values.length % 2 !== 0
        ? values[mid]
        : (values[mid - 1] + values[mid]) / 2;
      const mean = values.reduce((a, b) => a + b, 0) / values.length;

      return { column: col, median, mean };
    });
  }

  showAbout() {
    const message = `${this.translate.instant('ABOUT.TITLE')}

${this.translate.instant('ABOUT.DESCRIPTION')}

${this.translate.instant('ABOUT.BASED_ON')}
${this.translate.instant('ABOUT.AUTHORS')}

${this.translate.instant('ABOUT.PROJECT')}
${this.translate.instant('ABOUT.COPYRIGHT')}`;

    alert(message);
  }

  openDocs() {
    // In Electron, you can open external links
    if ((window as any).require) {
      const { shell } = (window as any).require('electron');
      shell.openExternal('https://github.com/yourusername/autoforest');
    } else {
      alert(this.translate.instant('DOCS.MESSAGE'));
    }
  }

  // =====================
  // Auto-Tuning Methods
  // =====================

  async autoTune() {
    if (!this.rows.length) {
      this.status = this.translate.instant('STATUS.LOAD_CSV_FIRST');
      this.statusColor = 'warn';
      return;
    }

    this.isAutoTuning = true;
    this.autoTuneResult = null;
    this.autoTuneProgress = null;
    this.status = this.translate.instant('AUTO_TUNE.RUN') + '...';
    this.statusColor = 'primary';

    try {
      const data = this.recode(this.rows);

      if ((window as any).api && (window as any).api.autoTune) {
        // Use the service so the panel can track state
        const response = await this.autoTunerService.runAutoTune(data, 0.2);

        if (response && response.success && response.result) {
          this.autoTuneResult = response.result;
          this.status = this.translate.instant('AUTO_TUNE.OPTIMAL_PARAMS') + ' ✓';
          this.statusColor = 'accent';

          if (response.result.scores && response.result.labels) {
            this.scores = response.result.scores;
            this.labels = response.result.labels;
            this.pageIndex = 0;
            this.calculateHealthyBaseline();
          }
        } else {
          this.status = this.translate.instant('STATUS.ERROR', { error: (response && response.error) || 'Unknown error' });
          this.statusColor = 'warn';
        }
      } else {
        this.status = 'Auto-tuning only available in Electron';
        this.statusColor = 'warn';
      }
    } catch (e: any) {
      this.status = this.translate.instant('STATUS.ERROR', { error: e.message });
      this.statusColor = 'warn';
    } finally {
      this.isAutoTuning = false;
      this.autoTuneProgress = null;
    }
  }

  onTuningParamsSelected(params: { contamination: number; nTrees: number; maxFeatures: number; maxDepth: number; sampleSize: number; threshold: number }) {
    this.contamination = params.contamination;
    this.nTrees = params.nTrees;
    this.sampleSize = params.sampleSize;
    this.maxFeatures = params.maxFeatures;
    this.maxDepth = params.maxDepth;
    this.threshold = params.threshold;
    this.autoTuneResult = null;
    this.status = this.translate.instant('AUTO_TUNE.APPLY') + ' ✓';
    this.statusColor = 'accent';
  }

  applyAutoTuneParams() {
    if (this.autoTuneResult) {
      this.contamination = this.autoTuneResult.optimalParams.contamination;
      this.nTrees = this.autoTuneResult.optimalParams.nTrees;
      this.sampleSize = this.autoTuneResult.optimalParams.sampleSize;
      this.maxFeatures = this.autoTuneResult.optimalParams.maxFeatures;
      this.maxDepth = this.autoTuneResult.optimalParams.maxDepth;
      this.threshold = this.autoTuneResult.optimalParams.threshold;
      this.autoTuneResult = null;
      this.status = this.translate.instant('AUTO_TUNE.APPLY') + ' ✓';
      this.statusColor = 'accent';
    }
  }
}