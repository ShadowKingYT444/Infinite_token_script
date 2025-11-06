<<<<<<< HEAD
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getAccounts: () => ipcRenderer.invoke('get-accounts'),
  addAccount: (payload) => ipcRenderer.invoke('add-account', payload),
  removeAccount: (id) => ipcRenderer.invoke('remove-account', id),
  openAccount: (id) => ipcRenderer.invoke('open-account-in-views', id),
  openLoginWindow: (id) => ipcRenderer.invoke('open-login-window', id)
});
=======
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getAccounts: () => ipcRenderer.invoke('get-accounts'),
  addAccount: (payload) => ipcRenderer.invoke('add-account', payload),
  removeAccount: (id) => ipcRenderer.invoke('remove-account', id),
  openAccount: (id) => ipcRenderer.invoke('open-account-in-views', id),
  openLoginWindow: (id) => ipcRenderer.invoke('open-login-window', id)
});
>>>>>>> c4f525457f38a08459c7cf1c217ad9d4ce60c765
