const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getAccounts: () => ipcRenderer.invoke('get-accounts'),
  addAccount: (payload) => ipcRenderer.invoke('add-account', payload),
  removeAccount: (id) => ipcRenderer.invoke('remove-account', id),
  openAccount: (id) => ipcRenderer.invoke('open-account-in-views', id),
  openLoginWindow: (id) => ipcRenderer.invoke('open-login-window', id)
});
