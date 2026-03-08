// app.js — Main application controller and router

let currentPage = 'home';

async function initApp() {
    // Open DB first
    await openDB();

    // Register service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(() => { });
    }

    // Route to default page
    navigateTo('home');

    // Setup nav listeners
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => navigateTo(btn.dataset.page));
    });
}

function navigateTo(page) {
    currentPage = page;

    // Hide all sections
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('page--active'));

    // Show target section
    const target = document.getElementById(`page-${page}`);
    if (target) target.classList.add('page--active');

    // Update nav active states
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('nav-btn--active', btn.dataset.page === page);
    });

    // Initialize page-specific content
    switch (page) {

    case 'home':
        renderHomePage();
        break;

    case 'clients':
        renderClientsPage();
        break;

    case 'billing':
        resetBillingForm();
        break;

    case 'history':
        renderHistoryPage();
        initHistorySearch();
        break;

    case 'reports':
        renderReportsPage();
        break;

    case 'settings':
        renderSettingsPage();
        break;
}
}

async function renderHomePage() {
    const bills = await BillDB.getAll();
    const clients = await ClientDB.getAll();
    const contractor = await SettingsDB.getContractor();

    document.getElementById('home-contractor-name').textContent = contractor.name;
    document.getElementById('home-stats-bills').textContent = bills.length;
    document.getElementById('home-stats-clients').textContent = clients.length;

    // Recent bills (last 5)
    const sorted = [...bills].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const recent = sorted.slice(0, 5);
    const recentContainer = document.getElementById('home-recent-bills');

    if (recent.length === 0) {
        recentContainer.innerHTML = `<div class="empty-state"><p>No recent bills.</p></div>`;
        return;
    }

    recentContainer.innerHTML = recent.map(b => {
        const total = parseFloat(b.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
        return `
      <div class="history-card" onclick="openHistoryBill(${b.id})">
        <div class="history-card__header">
          <div class="history-card__client">${escapeHtml(b.clientName || '—')}</div>
          <div class="history-card__amount">₹${total}</div>
        </div>
        <div class="history-card__meta">
          <span class="history-card__bill-no">Bill #${escapeHtml(b.billNumber)}</span>
          <span class="history-card__date">📅 ${escapeHtml(b.dateDisplay || b.date || '—')}</span>
        </div>
      </div>
    `;
    }).join('');
}

async function renderReportsPage() {

    const bills = await BillDB.getAll();

    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    let todayBills = 0;
    let todayIncome = 0;

    let monthBills = 0;
    let monthIncome = 0;

    bills.forEach(bill => {

        const billDate = new Date(bill.date);

        if (bill.date === today) {
            todayBills++;
            todayIncome += parseFloat(bill.total || 0);
        }

        if (
            billDate.getMonth() === currentMonth &&
            billDate.getFullYear() === currentYear
        ) {
            monthBills++;
            monthIncome += parseFloat(bill.total || 0);
        }

    });

    document.getElementById('report-today-bills').textContent = todayBills;

    document.getElementById('report-today-income').textContent =
        todayIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 });

    document.getElementById('report-month-bills').textContent = monthBills;

    document.getElementById('report-month-income').textContent =
        monthIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 });

}

// --- Settings page ---
async function renderSettingsPage() {
    const contractor = await SettingsDB.getContractor();
    document.getElementById('setting-name').value = contractor.name;
    document.getElementById('setting-address').value = contractor.address;
    document.getElementById('setting-phone').value = contractor.phone;

    // Load bill layout
    const layout = await SettingsDB.getBillLayout();
    document.getElementById('layout-subtitle').value = layout.subtitle || '';
    document.getElementById('layout-color').value = layout.headerColor || '#3d2b00';
    document.getElementById('layout-show-vehicle').checked = layout.showVehicleInfo !== false;
    document.getElementById('layout-show-phone').checked = layout.showClientPhone !== false;
    document.getElementById('layout-show-address').checked = layout.showClientAddress !== false;
    document.getElementById('layout-show-stamp').checked = layout.showStampArea !== false;
    document.getElementById('layout-show-thankyou').checked = layout.showThankYou !== false;
    document.getElementById('layout-footer-note').value = layout.footerNote || '';

    // Mark active swatch
    highlightActiveSwatch(layout.headerColor || '#3d2b00');

    // Swatch click listeners
    document.querySelectorAll('.swatch').forEach(btn => {
        btn.onclick = () => {
            document.getElementById('layout-color').value = btn.dataset.color;
            highlightActiveSwatch(btn.dataset.color);
        };
    });
}

function highlightActiveSwatch(color) {
    document.querySelectorAll('.swatch').forEach(btn => {
        btn.classList.toggle('swatch--active', btn.dataset.color === color);
    });
}

async function saveSettings() {
    const name = document.getElementById('setting-name').value.trim();
    const address = document.getElementById('setting-address').value.trim();
    const phone = document.getElementById('setting-phone').value.trim();

    if (!name) {
        showToast('Contractor name is required', 'error');
        return;
    }

    await SettingsDB.setContractor({ name, address, phone });
    showToast('Contractor details saved!');

    // Refresh home
    renderHomePage();
}

async function saveBillLayout() {
    const layout = {
        subtitle: document.getElementById('layout-subtitle').value.trim(),
        headerColor: document.getElementById('layout-color').value || '#3d2b00',
        showVehicleInfo: document.getElementById('layout-show-vehicle').checked,
        showClientPhone: document.getElementById('layout-show-phone').checked,
        showClientAddress: document.getElementById('layout-show-address').checked,
        showStampArea: document.getElementById('layout-show-stamp').checked,
        showThankYou: document.getElementById('layout-show-thankyou').checked,
        footerNote: document.getElementById('layout-footer-note').value.trim(),
    };

    await SettingsDB.setBillLayout(layout);
    showToast('Bill layout saved!');
}



// Boot
document.addEventListener('DOMContentLoaded', initApp);

