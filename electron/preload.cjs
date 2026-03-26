const { contextBridge, ipcRenderer } = require('electron');

// Expose safe APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Add any IPC methods here if needed
  // For example:
  // sendMessage: (message) => ipcRenderer.send('message', message),
});
