// VoiceBridge Admin Portal Script

const API = 'http://127.0.0.1:5000'; // ← This only works on YOUR computer


const getAdminToken = () => localStorage.getItem('admin_token');
const setAdminToken = (token) => localStorage.setItem('admin_token', token);
const clearAdminToken = () => localStorage.removeItem('admin_token');
const isAdminLoggedIn = () => !!getAdminToken();

// ── Toast Notifications ────────────────────────────────────────────────────────
const showToast = (message, type = 'info', duration = 4000) => {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
        <span>${message}</span>
    `;
    container.appendChild(toast);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => toast.classList.add('show'));
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 350);
    }, duration);
};

// ── Result Count Helper ────────────────────────────────────────────────────────
const updateResultCount = (elementId, count) => {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = count > 0 ? `${count} result${count !== 1 ? 's' : ''}` : '';
    }
};

// ── Main App ───────────────────────────────────────────────────────────────────
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
    const chatsSearch = document.getElementById('chatsSearch');

    // HTML escape helper
    const escapeHtml = (str) => {
        if (str === null || str === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    };

    const closeLoginBtns = [document.getElementById('closeAdminLogin'), document.getElementById('xCloseAdminLogin')];

    // ── Auth Flow ──────────────────────────────────────────────────────────────
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
        if (!isAdminLoggedIn()) return false;
        try {
            const res = await fetch(`${API}/api/admin/stats`, {
                headers: { 'Authorization': `Bearer ${getAdminToken()}` }
            });
            return res.ok;
        } catch (err) {
            console.error('Admin auth verification failed', err);
            return false;
        }
    };

    const checkAuth = async () => {
        showLogin();
        const valid = await verifyAdminToken();
        if (valid) showDashboard();
    };

    checkAuth();

    closeLoginBtns.forEach(btn => {
        if (btn) btn.addEventListener('click', () => {
            loginModal.style.display = 'flex';
            dashboard.style.display = 'none';
        });
    });

    // ── Login Handler ──────────────────────────────────────────────────────────
    adminLoginBtn.addEventListener('click', async () => {
        const email = adminEmail.value.trim();
        const password = adminPassword.value.trim();

        if (!email || !password) {
            adminError.textContent = 'Email and password are required';
            adminError.style.display = 'block';
            return;
        }

        // Show loading state
        const btnText = adminLoginBtn.querySelector('.btn-text');
        const btnLoader = adminLoginBtn.querySelector('.btn-loader');
        if (btnText) btnText.textContent = 'Signing in...';
        if (btnLoader) btnLoader.style.display = 'inline-block';
        adminLoginBtn.disabled = true;

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
            showToast('Welcome back, Admin!', 'success');
            showDashboard();
        } catch (err) {
            adminError.textContent = 'Cannot connect to server';
            adminError.style.display = 'block';
        } finally {
            if (btnText) btnText.textContent = 'Sign In';
            if (btnLoader) btnLoader.style.display = 'none';
            adminLoginBtn.disabled = false;
        }
    });

    // Enter key to login
    [adminEmail, adminPassword].forEach(input => {
        if (input) input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') adminLoginBtn.click();
        });
    });

    // ── Logout ─────────────────────────────────────────────────────────────────
    adminLogoutBtn.addEventListener('click', () => {
        clearAdminToken();
        sessionStorage.clear();
        localStorage.clear();
        try {
            window.location.href = 'index.html';
        } catch (e) {
            window.location.replace('index.html');
        }
    });

    // ── Table Filter ───────────────────────────────────────────────────────────
    const filterTable = (inputEl, tableId, countId) => {
        if (!inputEl) return;
        const query = inputEl.value.trim().toLowerCase();
        let visibleCount = 0;
        document.querySelectorAll(`#${tableId} tbody tr`).forEach(row => {
            if (row.classList.contains('empty-state')) return;
            const text = row.textContent.toLowerCase();
            const isVisible = text.includes(query);
            row.style.display = isVisible ? '' : 'none';
            if (isVisible) visibleCount++;
        });
        if (countId) updateResultCount(countId, visibleCount);
    };

    usersSearch?.addEventListener('input', () => filterTable(usersSearch, 'usersTable', 'usersCount'));
    transcriptsSearch?.addEventListener('input', () => filterTable(transcriptsSearch, 'transcriptsTable', 'transcriptsCount'));
    chatsSearch?.addEventListener('input', () => filterTable(chatsSearch, 'chatsTable', 'chatsCount'));

    // ── Dashboard Quick Navigation ─────────────────────────────────────────────
    document.querySelectorAll('.admin-table-actions button[data-section]').forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.getAttribute('data-section');
            if (!section) return;
            const link = document.querySelector(`.sidebar-link[data-section="${section}"]`);
            if (link) link.click();
        });
    });

    // ── Sidebar Navigation ─────────────────────────────────────────────────────
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    const sections = document.querySelectorAll('.admin-section');

    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute('data-section');

            sidebarLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            sections.forEach(s => s.classList.remove('active'));
            const target = document.getElementById(`${sectionId}-section`);
            if (target) target.classList.add('active');
        });
    });

    // ── Load Dashboard Stats ───────────────────────────────────────────────────
    const loadDashboardData = async () => {
        try {
            console.log('Fetching dashboard stats...');
            const res = await fetch(`${API}/api/admin/stats`, {
                headers: { 'Authorization': `Bearer ${getAdminToken()}` }
            });
            
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                console.error('Dashboard Stats Error:', res.status, errorData);
                if (res.status === 401 || res.status === 403) {
                    clearAdminToken();
                    showLogin();
                }
                showToast(`Failed to load stats: ${errorData.error || res.statusText}`, 'error');
                return;
            }

            const data = await res.json();
            console.log('Dashboard stats received:', data);

            const animateStat = (id, value) => {
                const el = document.getElementById(id);
                if (!el) return;
                el.textContent = (value !== undefined && value !== null) ? value : 0;
            };

            animateStat('totalUsers', data.total_users);
            animateStat('totalCalls', data.total_calls);
            animateStat('totalChats', data.total_chats);
            animateStat('totalReports', data.total_reports);
        } catch (err) {
            console.error('Failed to load dashboard data', err);
            showToast('Cannot connect to server for dashboard stats', 'error');
        }
    };

    // ── Load Table Data ────────────────────────────────────────────────────────
    const loadTable = async (tableId, endpoint) => {
        const tbody = document.querySelector(`#${tableId} tbody`);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="99"><div class="empty-state-inline"><span class="stat-loader"></span><span>Loading data...</span></div></td></tr>`;
        }

        try {
            console.log(`Fetching ${endpoint} data...`);
            const res = await fetch(`${API}/api/admin/${endpoint}`, {
                headers: { 'Authorization': `Bearer ${getAdminToken()}` }
            });
            
            const data = await res.json().catch(() => null);

            if (res.ok) {
                if (!tbody) return;
                tbody.innerHTML = '';

                if (!Array.isArray(data) || data.length === 0) {
                    tbody.innerHTML = '<tr class="empty-state"><td colspan="99"><div class="empty-state-inline"><span>No Data Available</span></div></td></tr>';
                } else {
                    data.forEach(row => {
                        if (!row) return;
                        const tr = document.createElement('tr');
                        
                        if (tableId === 'usersTable') {
                            const dateObj = row.created_at ? new Date(row.created_at) : null;
                            tr.innerHTML = `
                                <td>${escapeHtml(row.name)}</td>
                                <td>${escapeHtml(row.email)}</td>
                                <td>${dateObj ? dateObj.toLocaleDateString() : '—'}</td>
                                <td>${dateObj ? dateObj.toLocaleTimeString() : '—'}</td>
                            `;
                        } else if (tableId === 'transcriptsTable') {
                            tr.innerHTML = `
                                <td>${row.user_id || '—'}</td>
                                <td>${escapeHtml(row.user_name || 'Unknown')}</td>
                                <td>${row.duration || 0}s</td>
                                <td>${row.started_at ? new Date(row.started_at).toLocaleTimeString() : '—'}</td>
                                <td>${row.ended_at ? new Date(row.ended_at).toLocaleTimeString() : '—'}</td>
                                <td>${escapeHtml(row.feature_used || '—')}</td>
                                <td>${row.date || '—'}</td>
                            `;
                        } else {
                            Object.values(row).forEach(value => {
                                const td = document.createElement('td');
                                td.textContent = (value !== undefined && value !== null) ? value : '—';
                                td.title = String(value ?? '');
                                tr.appendChild(td);
                            });
                        }
                        tbody.appendChild(tr);
                    });
                }

                // Apply existing search filters
                if (tableId === 'usersTable') filterTable(usersSearch, 'usersTable', 'usersCount');
                if (tableId === 'transcriptsTable') filterTable(transcriptsSearch, 'transcriptsTable', 'transcriptsCount');
                if (tableId === 'chatsTable') filterTable(chatsSearch, 'chatsTable', 'chatsCount');
            } else {
                console.error(`API Error for ${endpoint}:`, res.status, data);
                if (res.status === 401 || res.status === 403) {
                    clearAdminToken();
                    showLogin();
                    return;
                }
                showToast(`Failed to load ${endpoint} data: ${data?.error || res.statusText}`, 'error');
                if (tbody) tbody.innerHTML = `<tr class="empty-state"><td colspan="99"><div class="empty-state-inline"><span>Failed to load ${endpoint}: ${data?.error || 'Server Error'}</span></div></td></tr>`;
            }
        } catch (err) {
            console.error(`Fetch Exception for ${endpoint}:`, err);
            showToast('Network error while loading data', 'error');
            if (tbody) {
                tbody.innerHTML = '<tr class="empty-state"><td colspan="99"><div class="empty-state-inline"><span>Check server connection</span></div></td></tr>';
            }
        }
    };

    // ── Reports Display ────────────────────────────────────────────────────────
    const displayReportCard = (report) => {
        const status = report._uiStatus || 'Pending';
        const statusClassMap = { 'Pending': 'pending', 'Verified': 'verified', 'Resolved': 'resolved' };
        const statusClass = statusClassMap[status] || 'pending';

        const card = document.createElement('div');
        card.className = 'report-card-item';
        card.dataset.reportId = report.id;
        card.dataset.status = status;

        const createdDate = new Date(report.created_at || report.time || new Date()).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });

        // Map backend fields: name, type, message
        const userName = report.name || 'Anonymous';
        const issueTitle = report.type || 'General Report';
        const description = report.message || 'No description provided';

        card.innerHTML = `
            <div class="report-card-header">
                <div>
                    <h3 class="report-card-title">${escapeHtml(issueTitle)}</h3>
                    <p class="report-card-subtitle">by ${escapeHtml(userName)}</p>
                </div>
                <span class="status-badge ${statusClass}">
                    <span class="status-dot"></span>
                    ${status}
                </span>
            </div>
            <div class="report-content">
                <p class="report-description">${escapeHtml(description)}</p>
                <div class="report-meta">
                    <div class="report-meta-row">
                        <span><strong>Report ID:</strong> ${report.id}</span>
                        <span><strong>Date:</strong> ${createdDate}</span>
                    </div>
                    <div class="report-meta-row">
                        <span><strong>Type:</strong> ${escapeHtml(issueTitle)}</span>
                        <span><strong>Status:</strong> ${status}</span>
                    </div>
                </div>
            </div>
            <div class="report-actions">
                <button class="report-action-btn primary verify-btn" data-id="${report.id}">✓ Verify</button>
                <button class="report-action-btn resolve-btn" data-id="${report.id}" data-status="Resolved">✓ Mark Resolved</button>
            </div>
        `;

        return card;
    };


    // ── Load Reports ───────────────────────────────────────────────────────────
    const loadReports = async () => {
        const tbody = document.getElementById('reportsTableBody');
        if (!tbody) return;

        // Show loading
        tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state-inline"><span class="stat-loader"></span><span>Loading reports...</span></div></td></tr>`;

        try {
            console.log('Fetching reports...');
            const res = await fetch(`${API}/api/admin/reports`, {
                headers: { 'Authorization': `Bearer ${getAdminToken()}` }
            });
            
            const data = await res.json().catch(() => null);

            if (res.ok) {
                tbody.innerHTML = '';

                if (!Array.isArray(data) || data.length === 0) {
                    tbody.innerHTML = `<tr class="empty-state"><td colspan="8"><div class="empty-state-inline">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        <span>No Data Available</span></div></td></tr>`;
                    updateResultCount('reportsCount', 0);
                    return;
                }

                updateResultCount('reportsCount', data.length);

                data.forEach(report => {
                    if (!report) return;
                    const tr = document.createElement('tr');
                    tr.dataset.reportId = report.id;
                    tr.dataset.status = report.status || 'Pending';
                    
                    const statusClass = (report.status || 'Pending').toLowerCase();
                    const dateStr = report.created_at ? new Date(report.created_at).toLocaleString() : '—';

                    tr.innerHTML = `
                        <td>#${report.id}</td>
                        <td>${escapeHtml(report.name || 'Anonymous')}</td>
                        <td>${escapeHtml(report.email || '—')}</td>
                        <td><span class="report-type-tag">${escapeHtml(report.type || 'General')}</span></td>
                        <td><div class="report-desc-cell">${escapeHtml(report.message || '')}</div></td>
                        <td>${dateStr}</td>
                        <td>
                            <span class="status-badge ${statusClass}">
                                <span class="status-dot"></span>
                                ${report.status || 'Pending'}
                            </span>
                        </td>
                        <td>
                            <div class="report-actions-cell">
                                <button class="action-btn-sm verify-btn" title="Verify" ${report.status === 'Verified' || report.status === 'Resolved' ? 'disabled' : ''}>✓</button>
                                <button class="action-btn-sm resolve-btn" title="Resolve" ${report.status === 'Resolved' ? 'disabled' : ''}>✓✓</button>
                                <button class="action-btn-sm delete-btn" title="Delete">✕</button>
                            </div>
                        </td>
                    `;
                    tbody.appendChild(tr);

                    // Add event listeners for actions
                    tr.querySelector('.verify-btn').addEventListener('click', () => handleReportAction(report.id, 'Verified'));
                    tr.querySelector('.resolve-btn').addEventListener('click', () => handleReportAction(report.id, 'Resolved'));
                    tr.querySelector('.delete-btn').addEventListener('click', () => handleDeleteReport(report.id));
                });
                
                // Apply status filter if any
                if (reportStatusFilter) handleReportFilter(reportStatusFilter.value);
            } else {
                console.error('Reports API Error:', res.status, data);
                if (res.status === 401 || res.status === 403) {
                    clearAdminToken();
                    showLogin();
                    return;
                }
                showToast(`Failed to load reports: ${data?.error || res.statusText}`, 'error');
                tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state-inline"><span>Failed to load reports: ${data?.error || 'Server Error'}</span></div></td></tr>`;
            }
        } catch (err) {
            console.error('Failed to load reports', err);
            showToast('Failed to load reports', 'error');
            tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state-inline"><span>Failed to load reports — check connection</span></div></td></tr>`;
        }
    };

    // ── Handle Report Status Updates ───────────────────────────────────────────
    const handleReportAction = async (reportId, newStatus) => {
        try {
            const res = await fetch(`${API}/api/admin/reports/${reportId}`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${getAdminToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                showToast(`Report #${reportId} marked as ${newStatus}`, 'success');
                loadReports(); // Refresh list
                loadDashboardData(); // Update stats
            } else {
                showToast('Failed to update report status', 'error');
            }
        } catch (err) {
            console.error('Failed to update report status', err);
            showToast('Connection error', 'error');
        }
    };

    const handleDeleteReport = async (reportId) => {
        if (!confirm(`Are you sure you want to delete report #${reportId}?`)) return;

        try {
            const res = await fetch(`${API}/api/admin/reports/${reportId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getAdminToken()}` }
            });

            if (res.ok) {
                showToast(`Report #${reportId} deleted`, 'success');
                loadReports(); // Refresh list
                loadDashboardData(); // Update stats
            } else {
                showToast('Failed to delete report', 'error');
            }
        } catch (err) {
            console.error('Failed to delete report', err);
            showToast('Connection error', 'error');
        }
    };

    // ── Report Status Filter ───────────────────────────────────────────────────
    const reportStatusFilter = document.getElementById('reportStatusFilter');
    if (reportStatusFilter) {
        reportStatusFilter.addEventListener('change', (e) => {
            handleReportFilter(e.target.value);
        });
    }

    const handleReportFilter = (status) => {
        const rows = document.querySelectorAll('#reportsTableBody tr');
        let visibleCount = 0;
        rows.forEach(row => {
            if (row.classList.contains('empty-state')) return;
            const rowStatus = row.dataset.status;
            if (!status || rowStatus === status) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });
        updateResultCount('reportsCount', visibleCount);
    };

    // Refresh button for reports
    const refreshReportsBtn = document.getElementById('refreshReportsBtn');
    if (refreshReportsBtn) {
        refreshReportsBtn.addEventListener('click', () => {
            loadReports();
            showToast('Reports list refreshed', 'info');
        });
    }

    // ── Section Data Loading on Click ──────────────────────────────────────────
    document.addEventListener('click', (e) => {
        const link = e.target.closest('.sidebar-link');
        if (!link) return;

        const section = link.getAttribute('data-section');
        if (section === 'users') loadTable('usersTable', 'users');
        if (section === 'transcripts') loadTable('transcriptsTable', 'calls');
        if (section === 'chats') loadTable('chatsTable', 'chats');
        if (section === 'reports') loadReports();
    });

    // ── Database Viewer ────────────────────────────────────────────────────────
    const tableSelect = document.getElementById('tableSelect');
    const loadTableBtn = document.getElementById('loadTableBtn');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const dbTable = document.getElementById('dbTable');

    const loadTableList = async () => {
        if (!isAdminLoggedIn() || !tableSelect) return;

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
            if (data.tables && Array.isArray(data.tables)) {
                data.tables.forEach(table => {
                    const option = document.createElement('option');
                    option.value = table;
                    option.textContent = table;
                    tableSelect.appendChild(option);
                });
            }
        } catch (err) {
            console.error('Failed to load table list', err);
        }
    };

    if (loadTableBtn) {
        loadTableBtn.addEventListener('click', async () => {
            const tableName = tableSelect?.value;
            if (!tableName) {
                showToast('Please select a table first', 'info');
                return;
            }

            // Show loading
            const tbody = dbTable?.querySelector('tbody');
            const thead = dbTable?.querySelector('thead');
            if (tbody) tbody.innerHTML = '<tr><td colspan="99"><div class="empty-state-inline"><span class="stat-loader"></span><span>Loading...</span></div></td></tr>';
            if (thead) thead.innerHTML = '';

            try {
                const res = await fetch(`${API}/api/admin/table/${tableName}`, {
                    headers: { 'Authorization': `Bearer ${getAdminToken()}` }
                });
                const data = await res.json();

                if (res.ok && data.columns && data.rows) {
                    thead.innerHTML = '';
                    tbody.innerHTML = '';

                    const headerRow = document.createElement('tr');
                    data.columns.forEach(col => {
                        const th = document.createElement('th');
                        th.textContent = col;
                        headerRow.appendChild(th);
                    });
                    thead.appendChild(headerRow);

                    if (data.rows.length === 0) {
                        tbody.innerHTML = `<tr class="empty-state"><td colspan="${data.columns.length}"><div class="empty-state-inline"><span>Table is empty</span></div></td></tr>`;
                    } else {
                        data.rows.forEach(row => {
                            const tr = document.createElement('tr');
                            data.columns.forEach(col => {
                                const td = document.createElement('td');
                                td.textContent = row[col] ?? '—';
                                td.title = String(row[col] ?? '');
                                tr.appendChild(td);
                            });
                            tbody.appendChild(tr);
                        });
                    }

                    showToast(`Loaded ${data.rows.length} rows from "${tableName}"`, 'success');
                } else {
                    showToast('Failed to load table data', 'error');
                }
            } catch (err) {
                console.error('Failed to load table data', err);
                showToast('Failed to load table — check server connection', 'error');
            }
        });
    }

    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', () => {
            if (!dbTable) return;

            const headers = dbTable.querySelectorAll('th');
            if (headers.length === 0) {
                showToast('No data to export. Load a table first.', 'info');
                return;
            }

            let csv = '';
            csv += Array.from(headers).map(h => `"${h.textContent}"`).join(',') + '\n';

            const rows = dbTable.querySelectorAll('tbody tr');
            rows.forEach(row => {
                if (row.classList.contains('empty-state')) return;
                const cells = row.querySelectorAll('td');
                csv += Array.from(cells).map(c => `"${c.textContent.replace(/"/g, '""')}"`).join(',') + '\n';
            });

            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${tableSelect?.value || 'export'}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('CSV exported successfully!', 'success');
        });
    }
});