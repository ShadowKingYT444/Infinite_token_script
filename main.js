<<<<<<< HEAD
const { app, BrowserWindow, ipcMain, BrowserView } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { v4: uuidv4 } = require('uuid');

const store = new Store({
  name: 'accounts',
  defaults: { accounts: [] }
});

let mainWindow = null;
const views = new Map(); // id -> { view, acc, attached }
let currentViewId = null;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    backgroundColor: '#0f1419',
    titleBarStyle: 'default',
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Show window when ready to prevent flashing
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window resize to update BrowserView bounds
  mainWindow.on('resize', () => {
    if (currentViewId && views.has(currentViewId)) {
      const { view } = views.get(currentViewId);
      updateViewBounds(view);
    }
  });

  mainWindow.on('closed', () => {
    // Clean up all views
    views.forEach(({ view }) => {
      try {
        if (view && view.webContents && !view.webContents.isDestroyed()) {
          view.webContents.destroy();
        }
      } catch (e) {
        console.error('Error destroying view:', e);
      }
    });
    views.clear();
    mainWindow = null;
  });

  // Pre-create views for existing accounts
  const accounts = store.get('accounts') || [];
  accounts.forEach(acc => {
    createViewForAccount(acc);
  });
}

function updateViewBounds(view) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  
  const [width, height] = mainWindow.getContentSize();
  const sidebarWidth = 320;
  
  view.setBounds({
    x: sidebarWidth,
    y: 0,
    width: Math.max(width - sidebarWidth, 0),
    height: height
  });
}

function createViewForAccount(acc) {
  if (views.has(acc.id)) {
    return views.get(acc.id);
  }

  const partition = acc.partition || `persist:${acc.id}`;
  
  const view = new BrowserView({
    webPreferences: {
      partition: partition,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // Enable web features needed for AI services
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  // Set initial bounds (will be updated when attached)
  if (mainWindow && !mainWindow.isDestroyed()) {
    updateViewBounds(view);
  }

  // Enable auto-resize
  view.setAutoResize({
    width: true,
    height: true,
    horizontal: false,
    vertical: false
  });

  // Store view reference
  views.set(acc.id, { view, acc, attached: false });
  
  return { view, acc };
}

// IPC Handlers
ipcMain.handle('get-accounts', async () => {
  return store.get('accounts') || [];
});

ipcMain.handle('add-account', async (event, { name, url, service }) => {
  const id = uuidv4();
  const partition = `persist:${id}`;
  const acc = { 
    id, 
    name, 
    url, 
    service: service || 'other',
    partition, 
    createdAt: Date.now() 
  };
  
  const accounts = store.get('accounts').concat([acc]);
  store.set('accounts', accounts);
  
  // Create view immediately
  createViewForAccount(acc);
  
  return acc;
});

ipcMain.handle('remove-account', async (event, id) => {
  // Detach view if it's currently shown
  if (currentViewId === id) {
    const { view } = views.get(id);
    try {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.removeBrowserView(view);
      }
    } catch (e) {
      console.error('Error removing view:', e);
    }
    currentViewId = null;
  }
  
  // Destroy view
  if (views.has(id)) {
    const { view } = views.get(id);
    try {
      if (view && view.webContents && !view.webContents.isDestroyed()) {
        view.webContents.destroy();
      }
    } catch (e) {
      console.error('Error destroying view:', e);
    }
    views.delete(id);
  }
  
  // Remove from store
  const accounts = (store.get('accounts') || []).filter(a => a.id !== id);
  store.set('accounts', accounts);
  
  return accounts;
});

ipcMain.handle('open-account-in-views', async (event, id) => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return { success: false, error: 'Main window not available' };
  }

  // Get or create view for this account
  let viewData = views.get(id);
  if (!viewData) {
    const accounts = store.get('accounts') || [];
    const acc = accounts.find(a => a.id === id);
    if (!acc) {
      return { success: false, error: 'Account not found' };
    }
    viewData = createViewForAccount(acc);
  }

  const { view, acc } = viewData;

  // Remove currently attached view
  if (currentViewId && currentViewId !== id) {
    const currentView = views.get(currentViewId);
    if (currentView) {
      try {
        mainWindow.removeBrowserView(currentView.view);
        currentView.attached = false;
      } catch (e) {
        console.error('Error removing current view:', e);
      }
    }
  }

  // Attach the new view
  try {
    mainWindow.addBrowserView(view);
    updateViewBounds(view);
    
    // Load URL if not already loaded
    if (view.webContents.getURL() !== acc.url) {
      view.webContents.loadURL(acc.url);
    }
    
    views.set(id, { view, acc, attached: true });
    currentViewId = id;
    
    return { success: true };
  } catch (error) {
    console.error('Error attaching view:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-login-window', async (event, id) => {
  const viewData = views.get(id);
  if (!viewData) {
    const accounts = store.get('accounts') || [];
    const acc = accounts.find(a => a.id === id);
    if (!acc) {
      return { success: false, error: 'Account not found' };
    }
    createViewForAccount(acc);
  }

  const { acc } = views.get(id);

  // Create a separate login window
  const loginWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    webPreferences: {
      partition: acc.partition,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    },
    parent: mainWindow,
    modal: false,
    backgroundColor: '#ffffff'
  });

  loginWindow.loadURL(acc.url);
  
  // Optional: Close login window after successful login detection
  // You could add logic here to detect when login is complete
  
  return { success: true };
});

// App lifecycle
app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Prevent default behavior for external links
app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    // Open external links in default browser
    if (url.startsWith('http://') || url.startsWith('https://')) {
      require('electron').shell.openExternal(url);
    }
    return { action: 'deny' };
  });
});
=======
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
>>>>>>> c4f525457f38a08459c7cf1c217ad9d4ce60c765
