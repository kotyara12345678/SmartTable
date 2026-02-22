"use strict";
// Preload script - CommonJS синтаксис для Electron
/* eslint-disable @typescript-eslint/no-explicit-any */
const { contextBridge, ipcRenderer } = require('electron');
// Открываем доступ к ipcRenderer из renderer процесса
contextBridge.exposeInMainWorld('electronAPI', {
    ipcRenderer: {
        invoke: (channel, data) => ipcRenderer.invoke(channel, data),
        on: (channel, func) => {
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        },
        send: (channel, data) => ipcRenderer.send(channel, data),
    },
    require: (module) => {
        if (module === 'electron') {
            return require('electron');
        }
    }
});
//# sourceMappingURL=preload.js.map