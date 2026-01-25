const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // Isolation Forest analysis
    runIsolation: (payload) => ipcRenderer.invoke('run-isolation', payload),

    // Auto-tuning
    autoTune: (payload) => ipcRenderer.invoke('auto-tune', payload),
    onAutoTuneProgress: (callback) => ipcRenderer.on('auto-tune-progress', (event, data) => callback(data)),

    // File operations
    onFileLoaded: (callback) => ipcRenderer.on('file-loaded', (event, data) => callback(data))
});
