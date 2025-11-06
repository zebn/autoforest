/**
 * Enum for Status Message Types
 */
export enum StatusType {
    INFO = 'primary',
    SUCCESS = 'accent',
    WARNING = 'warn',
    ERROR = 'warn'
}

/**
 * Enum for Analysis Status
 */
export enum AnalysisStatus {
    IDLE = 'IDLE',
    LOADING_FILE = 'LOADING_FILE',
    PARSING = 'PARSING',
    RECODING = 'RECODING',
    ANALYZING = 'ANALYZING',
    COMPLETED = 'COMPLETED',
    ERROR = 'ERROR'
}
