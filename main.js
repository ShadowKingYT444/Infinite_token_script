const { app, BrowserWindow, ipcMain, BrowserView, dialog } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { v4: uuidv4 } = require('uuid');

const store = new Store({
  name: 'accounts',
  defaults: { accounts: [] } // each: { id, name, url, partition }
});

let mainWindow = null;
const views = new Map(); // id -> BrowserView

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // When app starts, create views for saved accounts but do not show them yet
  const accounts = store.get('accounts') || [];
  accounts.forEach(acc => {
    createViewForAccount(acc);
  });
}

function createViewForAccount(acc) {
  if (views.has(acc.id)) return views.get(acc.id);

  const partition = acc.partition || `persist:${acc.id}`;
  const view = new BrowserView({
    webPreferences: {
      partition: partition,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  // BrowserView initial size (will be attached to mainWindow when shown)
  view.setBounds({ x: 300, y: 0, width: 900, height: 800 });
  view.setAutoResize({ width: true, height: true });

  // Keep a reference for later
  views.set(acc.id, { view, acc });
  return { view, acc };
}

ipcMain.handle('get-accounts', async () => {
  return store.get('accounts') || [];
});

ipcMain.handle('add-account', async (event, { name, url }) => {
  const id = uuidv4();
  const partition = `persist:${id}`;
  const acc = { id, name, url, partition, createdAt: Date.now() };
  const accounts = store.get('accounts').concat([acc]);
  store.set('accounts', accounts);
  createViewForAccount(acc);
  return acc;
});

ipcMain.handle('remove-account', async (event, id) => {
  // destroy view and remove from store
  if (views.has(id)) {
    const { view } = views.get(id);
    try { view.webContents.destroy(); } catch(e){ /* ignore */ }
    views.delete(id);
  }
  const accounts = (store.get('accounts') || []).filter(a => a.id !== id);
  store.set('accounts', accounts);
  return accounts;
});

ipcMain.handle('open-account-in-views', async (event, id) => {
  // attach the chosen view to the window area (popup style)
  const rec = views.get(id);
  if (!rec) {
    // Maybe account exists in store but view not created yet
    const accounts = store.get('accounts') || [];
    const acc = accounts.find(a => a.id === id);
    if (acc) createViewForAccount(acc);
  }
  // remove any existing attached view (we assume only one visible at a time)
  for (const [k, v] of views.entries()) {
    if (v.attached) {
      try {
        mainWindow.removeBrowserView(v.view);
      } catch (e) {}
      v.attached = false;
    }
  }

  const { view, acc } = views.get(id);
  // Attach view with a left sidebar reserved for account list (300px)
  mainWindow.addBrowserView(view);
  const [w, h] = mainWindow.getContentSize();
  view.setBounds({ x: 300, y: 0, width: w - 300, height: h });
  view.setAutoResize({ width: true, height: true });
  view.webContents.loadURL(acc.url);
  views.set(id, { view, acc, attached: true });
  return { success: true };
});

ipcMain.handle('open-login-window', async (event, id) => {
  // open a temporary window to let the user login for this account (easier UX)
  const rec = views.get(id);
  if (!rec) throw new Error('Account not found');
  const { acc } = rec;

  const w = new BrowserWindow({
    width: 1100,
    height: 800,
    webPreferences: {
      partition: acc.partition,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  w.loadURL(acc.url);
  // The user will login there; when they close the window, session is persisted in the partition
  return { success: true };
});

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  // on Windows, quit
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
