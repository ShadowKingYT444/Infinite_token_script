<<<<<<< HEAD
const addBtn = document.getElementById('add-btn');
const nameInput = document.getElementById('acct-name');
const urlInput = document.getElementById('acct-url');
const serviceInput = document.getElementById('acct-service');
const serviceTabs = document.querySelectorAll('.service-tab');
const serviceAccounts = document.querySelectorAll('.service-accounts');
const welcomeScreen = document.getElementById('welcome-screen');

let currentService = 'claude';

// Service detection based on URL
function detectService(url) {
  const urlLower = url.toLowerCase();
  if (urlLower.includes('claude.ai')) return 'claude';
  if (urlLower.includes('chat.openai.com') || urlLower.includes('chatgpt')) return 'chatgpt';
  if (urlLower.includes('gemini.google.com')) return 'gemini';
  return 'other';
}

// Switch service tabs
serviceTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const service = tab.dataset.service;
    switchToService(service);
  });
});

function switchToService(service) {
  currentService = service;
  
  // Update active tab
  serviceTabs.forEach(t => {
    if (t.dataset.service === service) {
      t.classList.add('active');
    } else {
      t.classList.remove('active');
    }
  });
  
  // Show corresponding accounts
  serviceAccounts.forEach(sa => {
    if (sa.dataset.service === service) {
      sa.classList.add('active');
    } else {
      sa.classList.remove('active');
    }
  });
}

async function refreshAccounts() {
  const accounts = await window.api.getAccounts();
  
  // Hide welcome screen if there are accounts
  if (accounts.length > 0) {
    welcomeScreen.style.display = 'none';
  } else {
    welcomeScreen.style.display = 'flex';
  }
  
  // Clear all account lists
  serviceAccounts.forEach(container => {
    const list = container.querySelector('.account-list');
    list.innerHTML = '';
  });
  
  // Group accounts by service
  const grouped = {
    claude: [],
    chatgpt: [],
    gemini: [],
    other: []
  };
  
  accounts.forEach(acc => {
    const service = acc.service || detectService(acc.url);
    if (grouped[service]) {
      grouped[service].push(acc);
    } else {
      grouped.other.push(acc);
    }
  });
  
  // Render accounts in their respective tabs
  Object.keys(grouped).forEach(service => {
    const container = document.querySelector(`.service-accounts[data-service="${service}"]`);
    const list = container.querySelector('.account-list');
    
    grouped[service].forEach(acc => {
      const el = document.createElement('div');
      el.className = 'account';
      el.innerHTML = `
        <div class="account-header">
          <div class="account-info">
            <div class="account-name">${escapeHtml(acc.name || 'Unnamed Account')}</div>
            <div class="account-url">${escapeHtml(acc.url)}</div>
          </div>
        </div>
        <div class="account-actions">
          <button class="btn-open" data-action="open" data-id="${acc.id}">Open</button>
          <button class="btn-login" data-action="login" data-id="${acc.id}">Login</button>
          <button class="btn-remove" data-action="remove" data-id="${acc.id}">Remove</button>
        </div>
      `;
      list.appendChild(el);
    });
  });
}

// Handle account actions
document.getElementById('accounts-container').addEventListener('click', async (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  
  const id = btn.dataset.id;
  const action = btn.dataset.action;
  
  if (action === 'open') {
    // Hide welcome screen when opening an account
    welcomeScreen.style.display = 'none';
    await window.api.openAccount(id);
  } else if (action === 'login') {
    await window.api.openLoginWindow(id);
  } else if (action === 'remove') {
    if (confirm('Are you sure you want to remove this account?')) {
      await window.api.removeAccount(id);
      await refreshAccounts();
    }
  }
});

// Add new account
addBtn.addEventListener('click', async () => {
  const name = nameInput.value.trim();
  const url = urlInput.value.trim();
  const service = serviceInput.value;
  
  if (!url) {
    alert('Please enter a login URL (e.g., https://claude.ai)');
    return;
  }
  
  // Validate URL format
  try {
    new URL(url);
  } catch (e) {
    alert('Please enter a valid URL starting with https://');
    return;
  }
  
  // Auto-detect service if not manually selected
  const detectedService = service === 'other' ? detectService(url) : service;
  
  await window.api.addAccount({ name, url, service: detectedService });
  
  // Clear inputs
  nameInput.value = '';
  urlInput.value = '';
  
  // Switch to the service tab where the account was added
  switchToService(detectedService);
  
  await refreshAccounts();
});

// Quick add with Enter key
urlInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addBtn.click();
  }
});

nameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addBtn.click();
  }
});

// Auto-detect service when URL is pasted/typed
urlInput.addEventListener('input', () => {
  const url = urlInput.value.trim();
  if (url) {
    const detected = detectService(url);
    if (detected !== 'other') {
      serviceInput.value = detected;
    }
  }
});

// Helper function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize
refreshAccounts();
=======
const acctListEl = document.getElementById('account-list');
const addBtn = document.getElementById('add-btn');
const nameInput = document.getElementById('acct-name');
const urlInput = document.getElementById('acct-url');

async function refreshAccounts() {
  const accounts = await window.api.getAccounts();
  acctListEl.innerHTML = '';
  accounts.forEach(acc => {
    const el = document.createElement('div');
    el.className = 'account';
    el.innerHTML = `
      <div class="left">
        <div style="font-weight:600;">${acc.name || acc.url}</div>
        <div style="font-size:12px;color:#9fb1d4;">${acc.url}</div>
      </div>
      <div class="right">
        <button data-action="open" data-id="${acc.id}">Open</button>
        <button data-action="login" data-id="${acc.id}">Sign in</button>
        <button data-action="remove" data-id="${acc.id}">Remove</button>
      </div>
    `;
    acctListEl.appendChild(el);
  });
}

acctListEl.addEventListener('click', async (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const id = btn.dataset.id;
  const action = btn.dataset.action;
  if (action === 'open') {
    await window.api.openAccount(id);
  } else if (action === 'login') {
    // Open a login window where user can sign in for this account (first-time)
    await window.api.openLoginWindow(id);
  } else if (action === 'remove') {
    const accounts = await window.api.removeAccount(id);
    await refreshAccounts();
  }
});

addBtn.addEventListener('click', async () => {
  const name = nameInput.value.trim();
  const url = urlInput.value.trim();
  if (!url) {
    alert('Please enter a login URL (e.g., https://claude.ai)');
    return;
  }
  await window.api.addAccount({ name, url });
  nameInput.value = '';
  urlInput.value = '';
  await refreshAccounts();
});

refreshAccounts();
>>>>>>> c4f525457f38a08459c7cf1c217ad9d4ce60c765
