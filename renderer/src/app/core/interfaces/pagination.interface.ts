/**
 * Interface for Pagination Configuration
 */
export interface IPaginationConfig {
    pageSize: number;
    pageIndex: number;
    totalItems: number;
    pageSizeOptions: number[];
}

/**
 * Interface for Pagination State
 */
export interface IPaginationState {
    currentPage: number;
    itemsPerPage: number;
    totalPages: number;
    startIndex: number;
    endIndex: number;
}

/**
 * Interface for Filter Configuration
 */
export interface IFilterConfig {
    showOnlyAnomalies: boolean;
    searchTerm?: string;
    columnFilters?: Map<string, string>;
}
