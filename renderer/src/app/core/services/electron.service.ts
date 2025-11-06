import { Injectable } from '@angular/core';
import { IFileLoadedData } from '../interfaces/electron.interface';

/**
 * Service for Electron IPC Communication
 */
@Injectable({
    providedIn: 'root'
})
export class ElectronService {
    constructor() { }

    /**
     * Check if running in Electron
     */
    isElectron(): boolean {
        return !!(window && window.api);
    }

    /**
     * Listen for file loaded events from main process
     */
    onFileLoaded(callback: (data: IFileLoadedData) => void): void {
        if (this.isElectron() && window.api) {
            window.api.onFileLoaded(callback);
        }
    }

    /**
     * Open external link in default browser
     */
    openExternal(url: string): void {
        if (window.require) {
            try {
                const { shell } = window.require('electron');
                shell.openExternal(url);
            } catch (error) {
                console.error('Failed to open external link:', error);
                window.open(url, '_blank');
            }
        } else {
            window.open(url, '_blank');
        }
    }

    /**
     * Get platform information
     */
    getPlatform(): string {
        return navigator.platform;
    }

    /**
     * Check if running on Windows
     */
    isWindows(): boolean {
        return this.getPlatform().indexOf('Win') > -1;
    }

    /**
     * Check if running on Mac
     */
    isMac(): boolean {
        return this.getPlatform().indexOf('Mac') > -1;
    }

    /**
     * Check if running on Linux
     */
    isLinux(): boolean {
        return this.getPlatform().indexOf('Linux') > -1;
    }
}
