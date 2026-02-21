import { contextBridge, ipcRenderer } from 'electron';

// Открываем доступ к ipcRenderer из renderer процесса
contextBridge.exposeInMainWorld('electronAPI', {
  ipcRenderer: {
    invoke: (channel: string, data: any) => ipcRenderer.invoke(channel, data),
    on: (channel: string, func: (...args: any[]) => void) => {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    },
    send: (channel: string, data: any) => ipcRenderer.send(channel, data),
  },
  require: (module: string) => {
    if (module === 'electron') {
      return { ipcRenderer };
    }
  }
});
