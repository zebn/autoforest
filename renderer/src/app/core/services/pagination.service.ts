import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { IDatasetRow } from '../interfaces/dataset.interface';
import { IPaginationConfig, IFilterConfig, IPaginationState } from '../interfaces/pagination.interface';

/**
 * Service for Data Pagination and Filtering
 */
@Injectable({
    providedIn: 'root'
})
export class PaginationService {
    private paginationConfigSubject = new BehaviorSubject<IPaginationConfig>({
        pageSize: 50,
        pageIndex: 0,
        totalItems: 0,
        pageSizeOptions: [10, 25, 50, 100, 500]
    });
    public paginationConfig$: Observable<IPaginationConfig> = this.paginationConfigSubject.asObservable();

    private filterConfigSubject = new BehaviorSubject<IFilterConfig>({
        showOnlyAnomalies: false
    });
    public filterConfig$: Observable<IFilterConfig> = this.filterConfigSubject.asObservable();

    constructor() { }

    /**
     * Update pagination configuration
     */
    updatePaginationConfig(config: Partial<IPaginationConfig>): void {
        const currentConfig = this.paginationConfigSubject.value;
        this.paginationConfigSubject.next({ ...currentConfig, ...config });
    }

    /**
     * Update filter configuration
     */
    updateFilterConfig(config: Partial<IFilterConfig>): void {
        const currentConfig = this.filterConfigSubject.value;
        this.filterConfigSubject.next({ ...currentConfig, ...config });

        // Reset to first page when filter changes
        this.updatePaginationConfig({ pageIndex: 0 });
    }

    /**
     * Get current pagination config
     */
    getPaginationConfig(): IPaginationConfig {
        return this.paginationConfigSubject.value;
    }

    /**
     * Get current filter config
     */
    getFilterConfig(): IFilterConfig {
        return this.filterConfigSubject.value;
    }

    /**
     * Apply filters to dataset
     */
    applyFilters(data: IDatasetRow[]): IDatasetRow[] {
        const filterConfig = this.getFilterConfig();
        let filteredData = data;

        // Filter by anomalies
        if (filterConfig.showOnlyAnomalies) {
            filteredData = filteredData.filter(row => row.isAnomaly);
        }

        // Add more filters here (search, column filters, etc.)

        return filteredData;
    }

    /**
     * Apply pagination to dataset
     */
    applyPagination(data: IDatasetRow[]): IDatasetRow[] {
        const config = this.getPaginationConfig();
        const startIndex = config.pageIndex * config.pageSize;
        const endIndex = startIndex + config.pageSize;

        return data.slice(startIndex, endIndex);
    }

    /**
     * Get paginated and filtered data
     */
    getPaginatedData(data: IDatasetRow[]): IDatasetRow[] {
        const filtered = this.applyFilters(data);
        this.updatePaginationConfig({ totalItems: filtered.length });
        return this.applyPagination(filtered);
    }

    /**
     * Get pagination state
     */
    getPaginationState(): IPaginationState {
        const config = this.getPaginationConfig();
        const totalPages = Math.ceil(config.totalItems / config.pageSize);
        const startIndex = config.pageIndex * config.pageSize;
        const endIndex = Math.min(startIndex + config.pageSize, config.totalItems);

        return {
            currentPage: config.pageIndex + 1,
            itemsPerPage: config.pageSize,
            totalPages,
            startIndex,
            endIndex
        };
    }

    /**
     * Reset pagination and filters
     */
    reset(): void {
        this.paginationConfigSubject.next({
            pageSize: 50,
            pageIndex: 0,
            totalItems: 0,
            pageSizeOptions: [10, 25, 50, 100, 500]
        });

        this.filterConfigSubject.next({
            showOnlyAnomalies: false
        });
    }

    /**
     * Change page
     */
    changePage(pageIndex: number): void {
        this.updatePaginationConfig({ pageIndex });
    }

    /**
     * Change page size
     */
    changePageSize(pageSize: number): void {
        this.updatePaginationConfig({ pageSize, pageIndex: 0 });
    }

    /**
     * Toggle anomaly filter
     */
    toggleAnomalyFilter(): void {
        const current = this.getFilterConfig().showOnlyAnomalies;
        this.updateFilterConfig({ showOnlyAnomalies: !current });
    }
}
