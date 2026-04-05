import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

// ngx-translate
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

// Angular Material
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ScrollingModule } from '@angular/cdk/scrolling';

import { AppComponent } from './app.component';

// Feature Components
import { DatasetConfigComponent } from './features/dataset/components/dataset-config.component';
import { DataTableComponent } from './features/analysis/components/data-table.component';
import { StatisticsPanelComponent } from './features/analysis/components/statistics-panel.component';
import { AutoTunerPanelComponent } from './features/tuning/components/auto-tuner-panel.component';
import { TuningChartComponent } from './features/tuning/components/tuning-chart.component';

// Layout Components
import { ToolbarComponent } from './layout/components/toolbar.component';

// Shared Components
import { StatusMessageComponent } from './shared/components/status-message.component';

// TranslateLoader factory
export function HttpLoaderFactory(http: HttpClient) {
    return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
    declarations: [
        AppComponent,
        // Feature Components
        DatasetConfigComponent,
        DataTableComponent,
        StatisticsPanelComponent,
        AutoTunerPanelComponent,
        TuningChartComponent,
        // Layout Components
        ToolbarComponent,
        // Shared Components
        StatusMessageComponent
    ],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        FormsModule,
        HttpClientModule,
        TranslateModule.forRoot({
            defaultLanguage: 'es',
            loader: {
                provide: TranslateLoader,
                useFactory: HttpLoaderFactory,
                deps: [HttpClient]
            }
        }),
        // Material modules
        MatToolbarModule,
        MatButtonModule,
        MatCardModule,
        MatInputModule,
        MatFormFieldModule,
        MatTableModule,
        MatProgressSpinnerModule,
        MatProgressBarModule,
        MatIconModule,
        MatTabsModule,
        MatChipsModule,
        MatPaginatorModule,
        MatMenuModule,
        MatSelectModule,
        MatExpansionModule,
        MatCheckboxModule,
        ScrollingModule
    ],
    providers: [],
    bootstrap: [AppComponent]
})
export class AppModule { }
