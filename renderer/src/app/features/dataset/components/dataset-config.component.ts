import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IIsolationForestParams } from '../../../core';

@Component({
    selector: 'app-dataset-config',
    template: `
    <mat-card>
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
            (change)="onFileSelected($event)" 
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
              [(ngModel)]="params.contamination" 
              (ngModelChange)="onParamsChange()"
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
              [(ngModel)]="params.nTrees"
              (ngModelChange)="onParamsChange()"
            />
            <mat-hint>{{ 'CONFIG.N_TREES_HINT' | translate }}</mat-hint>
          </mat-form-field>
        </div>

        <div style="margin-top: 20px;">
          <button 
            mat-raised-button 
            color="accent" 
            (click)="onRunAnalysis()"
            [disabled]="!canRun || isLoading"
            style="margin-right: 10px;"
          >
            <mat-icon>play_arrow</mat-icon>
            {{ 'CONFIG.RUN' | translate }}
          </button>
          
          <button 
            mat-button 
            (click)="onClear()"
            [disabled]="!canClear"
          >
            <mat-icon>clear</mat-icon>
            {{ 'CONFIG.CLEAR' | translate }}
          </button>
        </div>
      </mat-card-content>
    </mat-card>
  `,
    styles: []
})
export class DatasetConfigComponent {
    @Input() fileName: string = '';
    @Input() canRun: boolean = false;
    @Input() canClear: boolean = false;
    @Input() isLoading: boolean = false;
    @Input() params: IIsolationForestParams = {
        contamination: 0.05,
        nTrees: 100
    };

    @Output() fileSelected = new EventEmitter<File>();
    @Output() runAnalysis = new EventEmitter<void>();
    @Output() clear = new EventEmitter<void>();
    @Output() paramsChanged = new EventEmitter<IIsolationForestParams>();

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            this.fileSelected.emit(input.files[0]);
        }
    }

    onRunAnalysis(): void {
        this.runAnalysis.emit();
    }

    onClear(): void {
        this.clear.emit();
    }

    onParamsChange(): void {
        this.paramsChanged.emit(this.params);
    }
}
