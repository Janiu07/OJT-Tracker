import React, { useState } from 'react';
import axios from 'axios';

const categoryColors = {
  'Coding': '#A7C7E7',
  'Data Entry / Encoding': '#628141',
  'Documentation': '#FFD6A5',
  'Debugging / Troubleshooting': '#FFB6C1',
  'Testing': '#B5E7A0',
  'Other': '#D3D3D3'
};

const fmtHours = (h) => {
  const hrs = Math.floor(h);
  const mins = Math.round((h % 1) * 60);
  return `${hrs}h ${mins}m`;
};

const fmtDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC'
  });
};

const groupByDay = (entries) => {
  const map = {};
  entries.forEach(e => {
    const dateKey = new Date(e.date).toISOString().split('T')[0];
    if (!map[dateKey]) {
      map[dateKey] = {
        date: e.date, dateKey,
        totalHours: 0, tasks: [], categories: new Set(),
        timeIns: [], timeOuts: [], notes: [], entryCount: 0
      };
    }
    const day = map[dateKey];
    day.totalHours += e.hours;
    day.tasks.push(e.task);
    day.categories.add(e.category);
    day.timeIns.push(e.startTime);
    day.timeOuts.push(e.endTime);
    if (e.notes) day.notes.push(e.notes);
    day.entryCount++;
  });
  return Object.values(map).sort((a, b) => new Date(a.date) - new Date(b.date));
};

// All available columns with labels and descriptions
const ALL_COLUMNS = [
  { key: 'no',         label: '#',           desc: 'Row number',               required: true },
  { key: 'date',       label: 'Date',         desc: 'Date of entry',            required: true },
  { key: 'timeIn',     label: 'Time In',      desc: 'Earliest time in',         required: false },
  { key: 'timeOut',    label: 'Time Out',     desc: 'Latest time out',          required: false },
  { key: 'hours',      label: 'Total Hours',  desc: 'Net hours for the day',    required: true },
  { key: 'task',       label: 'Tasks',        desc: 'Activities done',          required: false },
  { key: 'category',   label: 'Category',     desc: 'Task categories',          required: false },
  { key: 'notes',      label: 'Notes',        desc: 'Additional notes',         required: false },
  { key: 'entryCount', label: 'Entry Count',  desc: 'Number of entries merged', required: false },
];

const ExportModal = ({ onClose }) => {
  const [exportType, setExportType] = useState('all');
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Selected columns — all on by default
  const [selectedCols, setSelectedCols] = useState(
    () => new Set(ALL_COLUMNS.map(c => c.key))
  );

  const toggleCol = (key) => {
    setSelectedCols(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const buildQuery = () => {
    if (exportType === 'month') return `?month=${month}`;
    if (exportType === 'range' && startDate && endDate) return `?startDate=${startDate}&endDate=${endDate}`;
    return '';
  };

  // Helper: get visible columns in order
  const visibleCols = ALL_COLUMNS.filter(c => selectedCols.has(c.key));

  // Get cell value for a day row
  const getCellValue = (col, day, idx) => {
    const earliestIn = day.timeIns.sort()[0];
    const latestOut  = day.timeOuts.sort().reverse()[0];
    switch (col.key) {
      case 'no':          return idx + 1;
      case 'date':        return fmtDate(day.date);
      case 'timeIn':      return earliestIn;
      case 'timeOut':     return latestOut;
      case 'hours':       return fmtHours(day.totalHours);
      case 'task':        return day.tasks.join(' | ');
      case 'category':    return [...day.categories].join(', ');
      case 'notes':       return day.notes.join(' | ');
      case 'entryCount':  return day.entryCount;
      default:            return '';
    }
  };

  // ── CSV Export ──────────────────────────────────────────────────────────────
  const exportCSV = async () => {
    setLoading(true); setError('');
    try {
      const res = await axios.get(`/api/time-entries/export${buildQuery()}`);
      const { entries, user, totalHours } = res.data;
      const days = groupByDay(entries);

      const rows = [
        ['OJT Hours Report - ' + user.name],
        ['Required Hours:', user.requiredHours, 'Total Logged:', totalHours.toFixed(2), 'Total Days:', days.length],
        [],
        visibleCols.map(c => c.label)
      ];

      days.forEach((day, idx) => {
        rows.push(visibleCols.map(col => getCellValue(col, day, idx)));
      });

      const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ojt-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Export failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── PDF Export ──────────────────────────────────────────────────────────────
  const exportPDF = async () => {
    setLoading(true); setError('');
    try {
      const res = await axios.get(`/api/time-entries/export${buildQuery()}`);
      const { entries, user, totalHours, exportDate } = res.data;
      const days = groupByDay(entries);
      const progress = ((totalHours / user.requiredHours) * 100).toFixed(1);

      const byMonth = entries.reduce((acc, e) => {
        const key = new Date(e.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', timeZone: 'UTC' });
        acc[key] = (acc[key] || 0) + e.hours;
        return acc;
      }, {});

      const byCategory = entries.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.hours;
        return acc;
      }, {});

      // Build PDF cell HTML per column
      const renderCell = (col, day, idx) => {
        const earliestIn = day.timeIns.sort()[0];
        const latestOut  = day.timeOuts.sort().reverse()[0];
        const isMulti    = day.entryCount > 1;
        switch (col.key) {
          case 'no':
            return `<td style="color:#aaa;font-size:11px">${idx + 1}</td>`;
          case 'date':
            return `<td><strong>${fmtDate(day.date)}</strong></td>`;
          case 'timeIn':
            return `<td>${earliestIn}</td>`;
          case 'timeOut':
            return `<td>${latestOut}</td>`;
          case 'hours':
            return `<td class="hours-cell">
              ${fmtHours(day.totalHours)}
              ${isMulti ? `<br><span class="multi-badge">${day.entryCount} entries merged</span>` : ''}
            </td>`;
          case 'task':
            return `<td>
              <ul class="task-list">${day.tasks.map(t => `<li>${t}</li>`).join('')}</ul>
              ${day.notes.length && selectedCols.has('notes') ? '' : day.notes.length ? `<div style="color:#888;font-size:10px;margin-top:3px">${day.notes.join(' • ')}</div>` : ''}
            </td>`;
          case 'category':
            return `<td>${[...day.categories].map(c => `<span class="cat-pill" style="background:${categoryColors[c]||'#eee'}">${c}</span>`).join('')}</td>`;
          case 'notes':
            return `<td style="font-size:11px;color:#555">${day.notes.join(' • ') || '—'}</td>`;
          case 'entryCount':
            return `<td style="text-align:center">${day.entryCount}</td>`;
          default:
            return `<td></td>`;
        }
      };

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>OJT Report - ${user.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background: #fff; }
    .cover { padding: 60px 50px 40px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%); color: white; }
    .cover h1 { font-size: 32px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 6px; }
    .cover .sub { font-size: 15px; opacity: 0.75; margin-bottom: 30px; }
    .cover-stats { display: flex; gap: 30px; margin-top: 20px; flex-wrap: wrap; }
    .cover-stat { background: rgba(255,255,255,0.1); border-radius: 10px; padding: 14px 20px; }
    .cover-stat .val { font-size: 28px; font-weight: 700; }
    .cover-stat .lbl { font-size: 11px; opacity: 0.7; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }
    .progress-bar-wrap { margin-top: 24px; }
    .progress-bar-bg { background: rgba(255,255,255,0.2); border-radius: 99px; height: 10px; }
    .progress-bar-fill { background: #e94560; border-radius: 99px; height: 10px; }
    .progress-label { font-size: 12px; opacity: 0.8; margin-top: 6px; }
    .body { padding: 30px 50px 50px; }
    h2 { font-size: 18px; font-weight: 700; color: #0f3460; margin: 28px 0 12px; border-left: 4px solid #e94560; padding-left: 10px; }
    .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 10px; }
    .summary-box { background: #f8f9fa; border-radius: 8px; padding: 14px; }
    .summary-box .label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
    .summary-box .value { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
    thead tr { background: #0f3460; color: white; }
    thead th { padding: 9px 10px; text-align: left; font-weight: 600; }
    tbody tr:nth-child(even) { background: #f8f9fa; }
    td { padding: 8px 10px; border-bottom: 1px solid #eee; vertical-align: top; }
    .hours-cell { font-weight: 700; color: #0f3460; white-space: nowrap; }
    .task-list { list-style: none; }
    .task-list li { padding: 1px 0; }
    .task-list li::before { content: "• "; color: #e94560; }
    .cat-pill { display: inline-block; padding: 1px 7px; border-radius: 20px; font-size: 10px; font-weight: 600; color: #333; margin: 1px; }
    .multi-badge { background: #fef3c7; color: #92400e; font-size: 10px; padding: 1px 5px; border-radius: 4px; }
    .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #aaa; border-top: 1px solid #eee; padding-top: 16px; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="cover">
    <div style="font-size:12px;opacity:0.6;margin-bottom:8px;text-transform:uppercase;letter-spacing:2px;">OJT Hours Report</div>
    <h1>${user.name}</h1>
    <div class="sub">Generated on ${new Date(exportDate).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}</div>
    <div class="cover-stats">
      <div class="cover-stat"><div class="val">${fmtHours(totalHours)}</div><div class="lbl">Total Logged</div></div>
      <div class="cover-stat"><div class="val">${user.requiredHours}h</div><div class="lbl">Required</div></div>
      <div class="cover-stat"><div class="val">${days.length}</div><div class="lbl">Days Logged</div></div>
      <div class="cover-stat"><div class="val">${entries.length}</div><div class="lbl">Total Entries</div></div>
    </div>
    <div class="progress-bar-wrap">
      <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${Math.min(parseFloat(progress),100)}%"></div></div>
      <div class="progress-label">${progress}% of required hours completed</div>
    </div>
  </div>

  <div class="body">
    ${selectedCols.has('category') ? `
    <h2>Summary by Category</h2>
    <div class="summary-grid">
      ${Object.entries(byCategory).map(([c, h]) => `
        <div class="summary-box">
          <div class="label" style="color:${categoryColors[c]||'#888'}">${c}</div>
          <div class="value">${fmtHours(h)}</div>
        </div>`).join('')}
    </div>` : ''}

    <h2>Summary by Month</h2>
    <div class="summary-grid">
      ${Object.entries(byMonth).map(([m, h]) => `
        <div class="summary-box">
          <div class="label">${m}</div>
          <div class="value">${fmtHours(h)}</div>
        </div>`).join('')}
    </div>

    <h2>Daily Time Record — ${days.length} Day${days.length !== 1 ? 's' : ''}</h2>
    <table>
      <thead>
        <tr>${visibleCols.map(c => `<th>${c.label}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${days.map((day, idx) =>
          `<tr>${visibleCols.map(col => renderCell(col, day, idx)).join('')}</tr>`
        ).join('')}
      </tbody>
    </table>

    <div class="footer">OJT Tracker &nbsp;•&nbsp; ${user.name} &nbsp;•&nbsp; ${new Date(exportDate).toLocaleDateString()}</div>
  </div>
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

      const win = window.open('', '_blank');
      win.document.write(html);
      win.document.close();
    } catch (err) {
      setError('Export failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="rounded-xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()} style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>📤 Export Records</h3>
            <button onClick={onClose} className="text-2xl leading-none hover:opacity-70" style={{ color: 'var(--text-secondary)' }}>×</button>
          </div>

          {/* Range selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Export Range</label>
            <div className="flex gap-2">
              {[['all', 'All Time'], ['month', 'By Month'], ['range', 'Date Range']].map(([val, label]) => (
                <button key={val} onClick={() => setExportType(val)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition ${
                    exportType === val ? 'bg-blue-500 text-white border-blue-500' : ''
                  }`}
                  style={exportType === val ? {} : { backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                >{label}</button>
              ))}
            </div>
          </div>

          {exportType === 'month' && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Select Month</label>
              <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }} />
            </div>
          )}

          {exportType === 'range' && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Start Date</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>End Date</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }} />
              </div>
            </div>
          )}

          {/* ── Column picker ─────────────────────────────────────── */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Columns to Include</label>
              <div className="flex gap-2">
                <button onClick={() => setSelectedCols(new Set(ALL_COLUMNS.map(c => c.key)))}
                  className="text-xs font-medium hover:opacity-70" style={{ color: '#3b82f6' }}>All</button>
                <span style={{ color: 'var(--border-color)' }}>|</span>
                <button onClick={() => setSelectedCols(new Set(ALL_COLUMNS.filter(c => c.required).map(c => c.key)))}
                  className="text-xs font-medium hover:opacity-70" style={{ color: 'var(--text-secondary)' }}>Required only</button>
              </div>
            </div>
            <div className="rounded-lg overflow-hidden divide-y" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
              {ALL_COLUMNS.map(col => (
                <label key={col.key}
                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition ${
                    col.required ? 'cursor-not-allowed' : 'hover:opacity-80'
                  }`}
                  style={{ backgroundColor: col.required ? 'var(--bg-secondary)' : 'var(--bg-primary)' }}
                >
                  <input
                    type="checkbox"
                    checked={selectedCols.has(col.key)}
                    onChange={() => !col.required && toggleCol(col.key)}
                    disabled={col.required}
                    className="w-4 h-4 accent-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{col.label}</span>
                      {col.required && (
                        <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>required</span>
                      )}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{col.desc}</div>
                  </div>
                  {selectedCols.has(col.key) && !col.required && (
                    <span className="text-green-500 text-xs">✓</span>
                  )}
                </label>
              ))}
            </div>
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-secondary)' }}>
              {visibleCols.length} of {ALL_COLUMNS.length} columns selected
            </p>
          </div>

          {/* Merge note */}
          <div className="mb-4 p-3 rounded-lg text-xs" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
            📋 Multiple entries on the same day are automatically <strong>merged into one row</strong> per day.
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca', color: '#dc2626' }}>{error}</div>
          )}

          {/* Export buttons */}
          <div className="space-y-3">
            <button onClick={exportPDF} disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition">
              <span className="text-xl">📄</span>
              <div className="text-left">
                <div className="text-sm font-bold">Export as PDF</div>
                <div className="text-xs opacity-80">Opens print dialog — save as PDF</div>
              </div>
            </button>
            <button onClick={exportCSV} disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition">
              <span className="text-xl">📊</span>
              <div className="text-left">
                <div className="text-sm font-bold">Export as CSV</div>
                <div className="text-xs opacity-80">Open in Excel, Google Sheets</div>
              </div>
            </button>
          </div>

          {loading && <div className="mt-4 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>Preparing export...</div>}
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
