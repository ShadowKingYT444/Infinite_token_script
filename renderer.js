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
