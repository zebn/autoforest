const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    runIsolation: (payload) => ipcRenderer.invoke('run-isolation', payload),
    onFileLoaded: (callback) => ipcRenderer.on('file-loaded', (event, data) => callback(data))
});
