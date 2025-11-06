import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { TranslateService } from '@ngx-translate/core';

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

          <div style="margin-top: 20px;">
            <button 
              mat-raised-button 
              color="accent" 
              (click)="run()"
              [disabled]="!rows.length || isLoading"
              style="margin-right: 10px;"
            >
              <mat-icon>play_arrow</mat-icon>
              {{ 'CONFIG.RUN' | translate }}
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
              </div>
            </mat-tab>

            <mat-tab [label]="'RESULTS.CHART_TAB' | translate">
              <div style="padding: 20px;">
                <canvas #chartCanvas></canvas>
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
  isLoading = false;
  fileName = '';
  displayedColumns: string[] = [];

  // Pagination
  pageSize = 50;
  pageIndex = 0;
  showOnlyAnomalies = false;

  // i18n
  currentLang = 'es';

  constructor(private translate: TranslateService) {
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

      const rows = lines.map(l => l.split(',').map(s => s.trim()));
      this.header = rows[0];
      this.rows = rows.slice(1);
      this.displayedColumns = [...this.header, 'score', 'anomaly'];
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

  recode(rows: string[][]) {
    const cols = rows[0].length;
    const maps = Array.from({ length: cols }, () => new Map());
    const nextId = Array.from({ length: cols }, () => 1);
    return rows.map(r => r.map((cell, i) => {
      const val = cell === '' ? null : cell;
      const n = Number(val);
      if (!Number.isNaN(n) && val !== '') return n;
      const m = maps[i];
      if (m.has(val)) return m.get(val);
      const id = nextId[i]++;
      m.set(val, id);
      return id;
    }));
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
    const data = this.recode(this.rows);
    const recodeTime = ((Date.now() - startTime) / 1000).toFixed(2);

    this.status = this.translate.instant('STATUS.RECODE_COMPLETE', { time: recodeTime });
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      const algoStartTime = Date.now();
      const resp: any = await (window as any).api.runIsolation({
        data,
        params: {
          contamination: this.contamination,
          nTrees: this.nTrees
        }
      });

      if (!resp.success) throw new Error(resp.error || 'Error desconocido');

      const algoTime = ((Date.now() - algoStartTime) / 1000).toFixed(2);
      this.scores = resp.result.scores || [];
      this.labels = resp.result.labels || [];

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
    this.pageIndex = 0;
    this.pageSize = 50;
  }

  getTableData() {
    return this.rows.map((row, idx) => ({
      values: row,
      score: this.scores[idx] || 0,
      isAnomaly: this.labels[idx] || false
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
}