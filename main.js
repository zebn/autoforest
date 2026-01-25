const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const isolation = require('./src/isolationEngine');
const autoTuner = require('./src/autoTuner');

let mainWindow;

function createMenu() {
    const template = [
        {
            label: 'Archivo',
            submenu: [
                {
                    label: 'Abrir CSV...',
                    accelerator: 'CmdOrCtrl+O',
                    click: async () => {
                        const result = await dialog.showOpenDialog(mainWindow, {
                            properties: ['openFile'],
                            filters: [
                                { name: 'CSV Files', extensions: ['csv'] },
                                { name: 'All Files', extensions: ['*'] }
                            ]
                        });

                        if (!result.canceled && result.filePaths.length > 0) {
                            const filePath = result.filePaths[0];
                            const content = fs.readFileSync(filePath, 'utf-8');
                            mainWindow.webContents.send('file-loaded', {
                                path: filePath,
                                name: path.basename(filePath),
                                content: content
                            });
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: 'Salir',
                    accelerator: 'CmdOrCtrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Ver',
            submenu: [
                { role: 'reload', label: 'Recargar' },
                { role: 'forceReload', label: 'Forzar recarga' },
                { role: 'toggleDevTools', label: 'Herramientas de desarrollo' },
                { type: 'separator' },
                { role: 'resetZoom', label: 'Zoom actual' },
                { role: 'zoomIn', label: 'Acercar' },
                { role: 'zoomOut', label: 'Alejar' },
                { type: 'separator' },
                { role: 'togglefullscreen', label: 'Pantalla completa' }
            ]
        },
        {
            label: 'Ayuda',
            submenu: [
                {
                    label: 'Acerca de',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'Acerca de AutoForest',
                            message: 'AutoForest - Auto-tuning Isolation Forest',
                            detail: 'Versión 0.2.0\n\nSistema de detección de anomalías con auto-ajuste de hiperparámetros\n\nBasado en la metodología de Saavedra et al. (2024)\n"Multivariate Automatic Tuning of Isolation Forest"\n\nDesarrollado con Electron + Angular\n\nTFM - Máster en Ciberseguridad\n© 2025'
                        });
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 900,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    const angularIndex = path.join(__dirname, 'renderer', 'dist', 'index.html');
    const classicIndex = path.join(__dirname, 'renderer', 'index.html');

    if (fs.existsSync(angularIndex)) {
        // Create a simple local server for ES modules
        const express = require('express');
        const server = express();
        const distPath = path.join(__dirname, 'renderer', 'dist');

        server.use(express.static(distPath));
        server.get('/', (req, res) => {
            res.sendFile(path.join(distPath, 'index.html'));
        });

        const serverInstance = server.listen(0, () => {
            const port = serverInstance.address().port;
            mainWindow.loadURL(`http://localhost:${port}`);
        });

        mainWindow.on('closed', () => {
            serverInstance.close();
        });
    } else {
        mainWindow.loadFile(classicIndex);
    }

    // Open DevTools in development mode (comment out for production)
    // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
    createMenu();
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

// IPC: handle run-isolation request from renderer
ipcMain.handle('run-isolation', async (event, { data, params }) => {
    try {
        const result = await isolation.fitAndScore(data, params);
        return { success: true, result };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

// IPC: handle auto-tuning request from renderer
ipcMain.handle('auto-tune', async (event, { data, options }) => {
    try {
        const result = await autoTuner.autoTune(data, {
            method: options?.method || 'balanced',
            progressCallback: (progress) => {
                // Send progress updates to renderer
                mainWindow.webContents.send('auto-tune-progress', progress);
            }
        });
        return { success: true, result };
    } catch (err) {
        return { success: false, error: err.message };
    }
});
