// VoiceBridge Admin Portal Script

const API = 'http://127.0.0.1:5000';

const getAdminToken = () => localStorage.getItem('admin_token');
const setAdminToken = (token) => localStorage.setItem('admin_token', token);
const clearAdminToken = () => localStorage.removeItem('admin_token');
const isAdminLoggedIn = () => !!getAdminToken();

const showToast = (message) => {
    // Simple toast
    alert(message);
};

document.addEventListener('DOMContentLoaded', () => {
    const loginModal = document.getElementById('adminLoginModal');
    const dashboard = document.getElementById('adminDashboard');
    const adminEmail = document.getElementById('adminEmail');
    const adminPassword = document.getElementById('adminPassword');
    const adminError = document.getElementById('adminError');
    const adminLoginBtn = document.getElementById('adminLoginBtn');
    const adminLogoutBtn = document.getElementById('adminLogoutBtn');
    const usersSearch = document.getElementById('usersSearch');
    const transcriptsSearch = document.getElementById('transcriptsSearch');

    const closeLoginBtns = [document.getElementById('closeAdminLogin'), document.getElementById('xCloseAdminLogin')];

    const showLogin = () => {
        clearAdminToken();
        adminError.style.display = 'none';
        adminPassword.value = '';
        loginModal.style.display = 'flex';
        dashboard.style.display = 'none';
    };

    const showDashboard = () => {
        loginModal.style.display = 'none';
        dashboard.style.display = 'block';
        loadDashboardData();
        loadTableList();
    };

    const verifyAdminToken = async () => {
        if (!isAdminLoggedIn()) {
            return false;
        }

        try {
            const res = await fetch(`${API}/api/admin/stats`, {
                headers: { 'Authorization': `Bearer ${getAdminToken()}` }
            });

            if (res.ok) {
                return true;
            }

            return false;
        } catch (err) {
            console.error('Admin auth verification failed', err);
            return false;
        }
    };

    const checkAuth = async () => {
        showLogin();
        const valid = await verifyAdminToken();
        if (valid) {
            showDashboard();
        }
    };

    checkAuth();

    closeLoginBtns.forEach(btn => btn.addEventListener('click', () => {
        loginModal.style.display = 'flex';
        dashboard.style.display = 'none';
    }));

    adminLoginBtn.addEventListener('click', async () => {
        const email = adminEmail.value.trim();
        const password = adminPassword.value.trim();

        if (!email || !password) {
            adminError.textContent = 'Email and password are required';
            adminError.style.display = 'block';
            return;
        }

        try {
            const res = await fetch(`${API}/api/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();

            if (!res.ok) {
                adminError.textContent = data.error || 'Login failed';
                adminError.style.display = 'block';
                return;
            }

            setAdminToken(data.token);
            showDashboard();
        } catch (err) {
            adminError.textContent = 'Cannot connect to server';
            adminError.style.display = 'block';
        }
    });

    adminLogoutBtn.addEventListener('click', () => {
        clearAdminToken();
        window.location.href = 'nagish.html';
    });

    const filterTable = (inputEl, tableId) => {
        if (!inputEl) return;
        const query = inputEl.value.trim().toLowerCase();
        document.querySelectorAll(`#${tableId} tbody tr`).forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(query) ? '' : 'none';
        });
    };

    usersSearch?.addEventListener('input', () => filterTable(usersSearch, 'usersTable'));
    transcriptsSearch?.addEventListener('input', () => filterTable(transcriptsSearch, 'transcriptsTable'));

    document.querySelectorAll('.admin-table-actions button[data-section]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const section = btn.getAttribute('data-section');
            if (!section) return;
            const link = document.querySelector(`.sidebar-link[data-section="${section}"]`);
            if (link) link.click();
        });
    });

    // Sidebar navigation
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    const sections = document.querySelectorAll('.admin-section');

    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute('data-section');

            sidebarLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            sections.forEach(s => s.classList.remove('active'));
            document.getElementById(`${sectionId}-section`).classList.add('active');
        });
    });

    // Load dashboard data
    const loadDashboardData = async () => {
        try {
            const res = await fetch(`${API}/api/admin/stats`, {
                headers: { 'Authorization': `Bearer ${getAdminToken()}` }
            });
            const data = await res.json();

            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    clearAdminToken();
                    showLogin();
                }
                return;
            }

            document.getElementById('totalUsers').textContent = data.total_users || 0;
            document.getElementById('totalCalls').textContent = data.total_calls || 0;
            document.getElementById('totalChats').textContent = data.total_chats || 0;
            document.getElementById('totalReports').textContent = data.total_reports || 0;
        } catch (err) {
            console.error('Failed to load dashboard data', err);
        }
    };

    // Load table data
    const loadTable = async (tableId, endpoint) => {
        try {
            const res = await fetch(`${API}/api/admin/${endpoint}`, {
                headers: { 'Authorization': `Bearer ${getAdminToken()}` }
            });
            const data = await res.json();

            if (res.ok) {
                const tbody = document.querySelector(`#${tableId} tbody`);
                tbody.innerHTML = '';

                data.forEach(row => {
                    const tr = document.createElement('tr');
                    Object.values(row).forEach(value => {
                        const td = document.createElement('td');
                        td.textContent = value;
                        tr.appendChild(td);
                    });
                    tbody.appendChild(tr);
                });

                if (tableId === 'usersTable') {
                    filterTable(usersSearch, 'usersTable');
                }
                if (tableId === 'transcriptsTable') {
                    filterTable(transcriptsSearch, 'transcriptsTable');
                }
            }
        } catch (err) {
            console.error(`Failed to load ${tableId}`);
        }
    };

    // Load data when sections are activated
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('sidebar-link')) {
            const section = e.target.getAttribute('data-section');
            if (section === 'users') loadTable('usersTable', 'users');
            if (section === 'transcripts') loadTable('transcriptsTable', 'calls');
            if (section === 'chats') loadTable('chatsTable', 'chats');
            if (section === 'reports') loadTable('reportsTable', 'reports');
        }
    });

    // Database viewer
    const tableSelect = document.getElementById('tableSelect');
    const loadTableBtn = document.getElementById('loadTableBtn');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const dbTable = document.getElementById('dbTable');

    // Load table list
    const loadTableList = async () => {
        if (!isAdminLoggedIn()) {
            return;
        }

        try {
            const res = await fetch(`${API}/api/admin/tables`, {
                headers: { 'Authorization': `Bearer ${getAdminToken()}` }
            });
            const data = await res.json();

            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    clearAdminToken();
                    showLogin();
                }
                return;
            }

            tableSelect.innerHTML = '<option value="">Select Table</option>';
            data.tables.forEach(table => {
                const option = document.createElement('option');
                option.value = table;
                option.textContent = table;
                tableSelect.appendChild(option);
            });
        } catch (err) {
            console.error('Failed to load table list', err);
        }
    };

    // do not load table list until login succeeds

    loadTableBtn.addEventListener('click', async () => {
        const tableName = tableSelect.value;
        if (!tableName) return;

        try {
            const res = await fetch(`${API}/api/admin/table/${tableName}`, {
                headers: { 'Authorization': `Bearer ${getAdminToken()}` }
            });
            const data = await res.json();

            if (res.ok) {
                const thead = dbTable.querySelector('thead');
                const tbody = dbTable.querySelector('tbody');

                thead.innerHTML = '';
                tbody.innerHTML = '';

                if (data.columns && data.rows) {
                    // Header
                    const headerRow = document.createElement('tr');
                    data.columns.forEach(col => {
                        const th = document.createElement('th');
                        th.textContent = col;
                        headerRow.appendChild(th);
                    });
                    thead.appendChild(headerRow);

                    // Rows
                    data.rows.forEach(row => {
                        const tr = document.createElement('tr');
                        data.columns.forEach(col => {
                            const td = document.createElement('td');
                            td.textContent = row[col];
                            tr.appendChild(td);
                        });
                        tbody.appendChild(tr);
                    });
                }
            }
        } catch (err) {
            console.error('Failed to load table data');
        }
    });

    exportCsvBtn.addEventListener('click', () => {
        const table = dbTable;
        let csv = '';

        // Headers
        const headers = table.querySelectorAll('th');
        csv += Array.from(headers).map(h => h.textContent).join(',') + '\n';

        // Rows
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            csv += Array.from(cells).map(c => `"${c.textContent}"`).join(',') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'export.csv';
        a.click();
        URL.revokeObjectURL(url);
    });
});