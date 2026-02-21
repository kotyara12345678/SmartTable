import { contextBridge, ipcRenderer } from 'electron';
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
            return { ipcRenderer };
        }
    }
});
//# sourceMappingURL=preload.js.map