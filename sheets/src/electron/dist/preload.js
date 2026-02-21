"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Открываем доступ к ipcRenderer из renderer процесса
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    ipcRenderer: {
        invoke: (channel, data) => electron_1.ipcRenderer.invoke(channel, data),
        on: (channel, func) => {
            electron_1.ipcRenderer.on(channel, (event, ...args) => func(...args));
        },
        send: (channel, data) => electron_1.ipcRenderer.send(channel, data),
    },
    require: (module) => {
        if (module === 'electron') {
            return { ipcRenderer: electron_1.ipcRenderer };
        }
    }
});
//# sourceMappingURL=preload.js.map