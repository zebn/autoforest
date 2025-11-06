import { Component, Input } from '@angular/core';
import { StatusType } from '../../../core';

@Component({
    selector: 'app-status-message',
    template: `
    <div style="margin-top: 15px;" *ngIf="message">
      <mat-chip-listbox>
        <mat-chip [color]="type" selected>
          <mat-icon *ngIf="isLoading">hourglass_empty</mat-icon>
          {{ message }}
        </mat-chip>
      </mat-chip-listbox>
    </div>
  `,
    styles: []
})
export class StatusMessageComponent {
    @Input() message: string = '';
    @Input() type: StatusType = StatusType.INFO;
    @Input() isLoading: boolean = false;
}
