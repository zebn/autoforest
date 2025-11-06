import { Component, Output, EventEmitter, Input } from '@angular/core';

@Component({
    selector: 'app-toolbar',
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
        <button mat-menu-item (click)="onLanguageChange('es')">
          <span [style.font-weight]="currentLang === 'es' ? 'bold' : 'normal'">🇪🇸 Español</span>
        </button>
        <button mat-menu-item (click)="onLanguageChange('en')">
          <span [style.font-weight]="currentLang === 'en' ? 'bold' : 'normal'">🇬🇧 English</span>
        </button>
      </mat-menu>
      
      <button mat-icon-button [matMenuTriggerFor]="menu">
        <mat-icon>more_vert</mat-icon>
      </button>
      <mat-menu #menu="matMenu">
        <button mat-menu-item (click)="onShowAbout()">
          <mat-icon>info</mat-icon>
          <span>{{ 'MENU.ABOUT' | translate }}</span>
        </button>
        <button mat-menu-item (click)="onOpenDocs()">
          <mat-icon>help</mat-icon>
          <span>{{ 'MENU.DOCS' | translate }}</span>
        </button>
      </mat-menu>
    </mat-toolbar>
  `,
    styles: []
})
export class ToolbarComponent {
    @Input() currentLang: string = 'es';
    @Output() languageChange = new EventEmitter<string>();
    @Output() showAbout = new EventEmitter<void>();
    @Output() openDocs = new EventEmitter<void>();

    onLanguageChange(lang: string): void {
        this.languageChange.emit(lang);
    }

    onShowAbout(): void {
        this.showAbout.emit();
    }

    onOpenDocs(): void {
        this.openDocs.emit();
    }
}
