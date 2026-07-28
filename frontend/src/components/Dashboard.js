import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { AuthContext } from '../context/AuthContext';
import TimeEntryModal from './TimeEntryModal';
import BulkEntryModal from './BulkEntryModal';
import PlanHours from './PlanHours';
import ExportModal from './ExportModal';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const Dashboard = () => {
  const { user, updateRequiredHours } = useContext(AuthContext);
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showPlanHours, setShowPlanHours] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [selectedEntriesMonth, setSelectedEntriesMonth] = useState('ALL');
  const [selectedEntryIds, setSelectedEntryIds] = useState(new Set());
  const [editingRequiredHours, setEditingRequiredHours] = useState(false);
  const [requiredHoursDraft, setRequiredHoursDraft] = useState(user?.requiredHours || 0);
  

  useEffect(() => {
    fetchEntries();
    fetchSummary();
  }, []);

  useEffect(() => {
    if (user?.requiredHours !== undefined) {
      setRequiredHoursDraft(user.requiredHours);
    }
  }, [user?.requiredHours]);

  const fetchEntries = async () => {
    try {
      const response = await axios.get('/api/time-entries');
      setEntries(response.data);
    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await axios.get('/api/time-entries/summary');
      setSummary(response.data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const handleAddEntry = () => {
    setEditingEntry(null);
    setShowModal(true);
  };

  const handleAddBulkEntries = () => {
    setShowBulkModal(true);
  };

  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    setShowModal(true);
  };

  const handleSaveEntry = async (formData) => {
    try {
      if (editingEntry) {
        await axios.put(`/api/time-entries/${editingEntry._id}`, formData);
      } else {
        await axios.post('/api/time-entries', formData);
      }
      fetchEntries();
      fetchSummary();
      setShowModal(false);
    } catch (error) {
      alert(error.response?.data?.message || 'Error saving entry');
    }
  };

  const handleBulkSaveEntry = async (formData) => {
    try {
      await axios.post('/api/time-entries', formData);
      await fetchEntries();
      await fetchSummary();
    } catch (error) {
      console.error('Error saving bulk entry:', error);
      throw error;
    }
  };

  // Helper: format task with placeholder if empty
  const formatTask = (task) => task && task.trim() ? task : 'N/A';

  const handleMergeEntries = async () => {
    if (selectedEntryIds.size < 2) {
      alert('Please select at least 2 entries to merge');
      return;
    }

    if (!window.confirm(`Merge ${selectedEntryIds.size} entries into one?`)) {
      return;
    }

    try {
      const entriesToMerge = entries.filter(e => selectedEntryIds.has(e._id));
      const sortedByTime = entriesToMerge.sort((a, b) => 
        new Date(`2000-01-01 ${a.startTime}`).getTime() - new Date(`2000-01-01 ${b.startTime}`).getTime()
      );

      // Sum up the actual hours from all entries to preserve total work time
      const totalHours = entriesToMerge.reduce((sum, e) => sum + e.hours, 0);
      
      // Calculate what break time we need so that: (end time - start time) - break = total hours
      const earliestStart = sortedByTime[0].startTime;
      const latestEnd = sortedByTime[sortedByTime.length - 1].endTime;
      
      const start = new Date(`2000-01-01 ${earliestStart}`);
      const end = new Date(`2000-01-01 ${latestEnd}`);
      const grossHours = (end - start) / (1000 * 60 * 60);
      const breakNeeded = Math.round((grossHours - totalHours) * 60); // in minutes

      // Merge tasks - remove duplicates and filter out empty ones
      const uniqueTasks = [...new Set(entriesToMerge.map(e => e.task?.trim()).filter(t => t))];
      const mergedTask = uniqueTasks.length > 0 ? uniqueTasks.join(' + ') : 'N/A';

      const merged = {
        date: entriesToMerge[0].date,
        startTime: earliestStart,
        endTime: latestEnd,
        breakMinutes: Math.max(0, breakNeeded),
        task: mergedTask,
        category: entriesToMerge[0].category,
        notes: entriesToMerge.map(e => e.notes).filter(Boolean).join('; '),
        isDTRMode: true  // Enable DTR mode so break time is deducted
      };

      // Delete old entries
      await Promise.all(Array.from(selectedEntryIds).map(id => 
        axios.delete(`/api/time-entries/${id}`)
      ));

      // Create merged entry
      await axios.post('/api/time-entries', merged);

      setSelectedEntryIds(new Set());
      fetchEntries();
      fetchSummary();
      alert(`Entries merged successfully! Total: ${Math.floor(totalHours)}h ${Math.round((totalHours % 1) * 60)}m`);
    } catch (error) {
      alert('Error merging entries: ' + error.message);
    }
  };

  const toggleEntrySelection = (id) => {
    const newSet = new Set(selectedEntryIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedEntryIds(newSet);
  };

  const handleDeleteEntry = async (id) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      try {
        await axios.delete(`/api/time-entries/${id}`);
        fetchEntries();
        fetchSummary();
      } catch (error) {
        alert('Error deleting entry');
      }
    }
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
  };

  const handleRequiredHoursSave = async () => {
    const parsedHours = Number(requiredHoursDraft);
    if (!Number.isFinite(parsedHours) || parsedHours < 0) {
      alert('Please enter a valid number of hours');
      return;
    }

    try {
      await updateRequiredHours(parsedHours);
      await fetchSummary();
      setEditingRequiredHours(false);
    } catch (error) {
      alert(error.response?.data?.message || 'Error updating required hours');
    }
  };

  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const localDateStr = new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
        .toISOString()
        .split('T')[0];
      
      const dayEntries = entries.filter(entry => {
        const entryDate = new Date(entry.date);
        const entryLocalDateStr = new Date(entryDate.getTime() - (entryDate.getTimezoneOffset() * 60000))
          .toISOString()
          .split('T')[0];
        return entryLocalDateStr === localDateStr;
      });

      if (dayEntries.length > 0) {
        const categories = [...new Set(dayEntries.map(e => e.category))];
        return (
          <div className="absolute bottom-0 left-0 right-0 flex gap-0.5 px-1">
            {categories.map((category, idx) => (
              <div
                key={idx}
                className="flex-1 h-1 rounded-full"
                style={{ backgroundColor: categoryColors[category] }}
              />
            ))}
          </div>
        );
      }
    }
    return null;
  };

  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      const today = new Date();
      const isToday = date.toDateString() === today.toDateString();
      const isSelected = date.toDateString() === selectedDate.toDateString();
      
      if (isSelected) {
        return 'selected-date';
      }
      if (isToday) {
        return 'today-date';
      }
    }
    return null;
  };

    const categoryColors = {
      'Coding': '#A7C7E7',
      'Data Entry / Encoding': '#628141',
      'Documentation': '#FFD6A5',
      'Debugging / Troubleshooting': '#FFB6C1',
      'Testing': '#B5E7A0',
      'Other': '#D3D3D3'
    };

  // Get entries for selected date
  const getEntriesForSelectedDate = () => {
    const localDateStr = new Date(selectedDate.getTime() - (selectedDate.getTimezoneOffset() * 60000))
      .toISOString()
      .split('T')[0];
    
    return entries.filter(entry => {
      const entryDate = new Date(entry.date);
      const entryLocalDateStr = new Date(entryDate.getTime() - (entryDate.getTimezoneOffset() * 60000))
        .toISOString()
        .split('T')[0];
      return entryLocalDateStr === localDateStr;
    });
  };

  // Filter entries by category and month
  const getFilteredEntries = () => {
    let filtered = entries;
    
    // Filter by category
    if (categoryFilter !== 'ALL') {
      filtered = filtered.filter(e => e.category === categoryFilter);
    }
    
    // Filter by month
    if (selectedEntriesMonth !== 'ALL') {
      filtered = filtered.filter(entry => {
        const entryMonth = new Date(entry.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        return entryMonth === selectedEntriesMonth;
      });
    }
    
    return filtered;
  };

  // Get unique months from entries
  const getUniqueMonths = () => {
    const months = entries.map(entry => {
      return new Date(entry.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    });
    return ['ALL', ...new Set(months)];
  };

  // Filter chart data by month
  const getChartDataByMonth = () => {
    if (selectedMonth === 'ALL') {
      return summary?.byCategory ? 
        Object.entries(summary.byCategory).map(([name, value]) => ({
          name,
          value: parseFloat(value.toFixed(2))
        })) : [];
    } else {
      const monthEntries = entries.filter(entry => {
        const entryMonth = new Date(entry.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        return entryMonth === selectedMonth;
      });
      
      const byCategory = monthEntries.reduce((acc, entry) => {
        acc[entry.category] = (acc[entry.category] || 0) + entry.hours;
        return acc;
      }, {});
      
      return Object.entries(byCategory).map(([name, value]) => ({
        name,
        value: parseFloat(value.toFixed(2))
      }));
    }
  };

  const chartData = getChartDataByMonth();
  const selectedDateEntries = getEntriesForSelectedDate();
  const filteredEntries = getFilteredEntries();
  const progressValue = Number(summary?.progress || 0);
  const remainingHours = Math.max(0, Number(summary?.requiredHours || 0) - Number(summary?.approvedHours || 0));
  const progressStatus = progressValue >= 100
    ? (progressValue > 100 ? 'Target exceeded' : 'Target completed')
    : `${remainingHours.toFixed(0)} hrs remaining`;
  const progressStatusColor = progressValue >= 100
    ? (progressValue > 100 ? '#dc2626' : '#16a34a')
    : 'var(--text-secondary)';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl font-semibold text-gray-700">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8" style={{ color: 'var(--text-primary)' }}>
      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Welcome back, {user?.name}!</h2>
        <p style={{ color: 'var(--text-secondary)' }} className="mt-2">Track your OJT hours and progress</p>
      </div>

    {summary && (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="rounded-lg shadow-md p-4 sm:p-6" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
          <h3 className="text-xs sm:text-sm font-medium uppercase mb-2" style={{ color: 'var(--text-secondary)' }}>Total Hours Logged</h3>
          <div className="text-3xl sm:text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {Math.floor(summary.totalHours)}h {Math.round((summary.totalHours % 1) * 60)}m
          </div>
        </div>

        <div className="rounded-lg shadow-md p-4 sm:p-6" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs sm:text-sm font-medium uppercase mb-2" style={{ color: 'var(--text-secondary)' }}>Required Hours</h3>
            {!editingRequiredHours && (
              <button
                type="button"
                onClick={() => {
                  setRequiredHoursDraft(summary?.requiredHours ?? user?.requiredHours ?? 0);
                  setEditingRequiredHours(true);
                }}
                className="text-xs font-medium hover:opacity-70"
                style={{ color: 'var(--text-accent)' }}
              >
                Edit
              </button>
            )}
          </div>
          {editingRequiredHours ? (
            <div className="mt-1">
              <input
                type="number"
                min="0"
                value={requiredHoursDraft}
                onChange={(e) => setRequiredHoursDraft(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
              />
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={handleRequiredHoursSave}
                  className="px-3 py-1.5 text-sm rounded-lg font-semibold text-white"
                  style={{ backgroundColor: '#2563eb' }}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingRequiredHours(false);
                    setRequiredHoursDraft(user?.requiredHours ?? summary?.requiredHours ?? 0);
                  }}
                  className="px-3 py-1.5 text-sm rounded-lg font-semibold"
                  style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-3xl sm:text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>{summary.requiredHours}</div>
              <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>hrs</div>
            </>
          )}
        </div>

        <div className="rounded-lg shadow-md p-4 sm:p-6" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
          <h3 className="text-xs sm:text-sm font-medium uppercase mb-2" style={{ color: 'var(--text-secondary)' }}>Progress</h3>
          <div className="text-3xl sm:text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>{summary.progress}%</div>
          <div className="w-full bg-gray-200 rounded-full h-3 sm:h-4 mt-4" style={{ backgroundColor: 'var(--border-color)' }}>
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 sm:h-4 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(summary.progress, 100)}%` }}
            />
          </div>
          <div className="text-sm mt-2 font-medium" style={{ color: progressStatusColor }}>
            {progressStatus}
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg shadow-md p-4 sm:p-6 text-white cursor-pointer hover:shadow-lg transition duration-200" onClick={() => setShowPlanHours(true)}>
          <h3 className="text-xs sm:text-sm font-medium uppercase mb-2">Plan Future Hours</h3>
          <div className="text-3xl sm:text-4xl font-bold">📅</div>
          <div className="text-sm mt-2">Click to plan your schedule</div>
        </div>
      </div>
    )}

      

      <div className="rounded-lg shadow-md p-4 sm:p-6 mb-6 sm:mb-8" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <h3 className="text-lg sm:text-xl font-bold mb-4 text-center" style={{ color: 'var(--text-primary)' }}>Calendar View</h3>
        <div className="calendar-wrapper">
          <Calendar
            onChange={handleDateClick}
            value={selectedDate}
            tileContent={tileContent}
            tileClassName={tileClassName}
            className="border-none w-full"
          />
        </div>
          <div className="mt-4 flex flex-wrap gap-2 sm:gap-3 justify-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full" style={{ backgroundColor: '#A7C7E7' }}></div>
              <span className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>Coding</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full" style={{ backgroundColor: '#628141' }}></div>
              <span className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>Data Entry / Encoding</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full" style={{ backgroundColor: '#FFD6A5' }}></div>
              <span className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>Documentation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full" style={{ backgroundColor: '#FFB6C1' }}></div>
              <span className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>Debugging / Troubleshooting</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full" style={{ backgroundColor: '#B5E7A0' }}></div>
              <span className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>Testing</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full" style={{ backgroundColor: '#D3D3D3' }}></div>
              <span className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>Other</span>
            </div>
          </div>

          {/* Selected Date Entries */}
          {selectedDate && (
            <div className="mt-6 border-t pt-4" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                  {selectedDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </h4>
                {selectedDateEntries.length > 0 && (
                  <div className="text-right">
                    <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Hours</div>
                    <div className="text-xl font-bold text-blue-600">
                      {(() => {
                        const total = selectedDateEntries.reduce((sum, entry) => sum + entry.hours, 0);
                        const hours = Math.floor(total);
                        const minutes = Math.round((total % 1) * 60);
                        return `${hours}h ${minutes}m`;
                      })()}
                    </div>
                  </div>
                )}
              </div>
              {selectedDateEntries.length > 0 ? (
            <div className="space-y-2">
              {selectedDateEntries.map((entry) => (
                <div key={entry._id} className="rounded-lg p-3 text-sm" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{formatTask(entry.task)}</div>
                      <div style={{ color: 'var(--text-secondary)' }} className="text-xs mt-1">
                        {entry.startTime} - {entry.endTime} • {Math.floor(entry.hours)}h {Math.round((entry.hours % 1) * 60)}m
                      </div>
                    </div>
                    <span 
                      className="px-2 py-1 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: categoryColors[entry.category] }}
                    >
                      {entry.category}
                    </span>
                  </div>
                  </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
                          No entries logged for this date
                        </div>
                      )}
                    </div>
                  )}
                </div>

      {chartData.length > 0 && (
        <div className="rounded-lg shadow-md p-4 sm:p-6 mb-6 sm:mb-8" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h3 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Hours by Category</h3>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto text-sm"
              style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
            >
              {getUniqueMonths().map(month => (
                <option key={month} value={month} style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>{month}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Pie Chart */}
            <div className="flex-1 chart-container" style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ value }) => {
                      const hours = Math.floor(value);
                      const minutes = Math.round((value % 1) * 60);
                      return `${hours}h ${minutes}m`;
                    }}
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={categoryColors[entry.name] || '#64748b'} 
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg shadow-md p-4 sm:p-6" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <div className="flex flex-col lg:flex-row justify-between items-start gap-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
            <h3 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Recent Time Entries ({filteredEntries.length})</h3>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto text-sm"
                style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
              >
                <option value="ALL" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>All Categories</option>
                <option value="Coding" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>Coding</option>
                <option value="Data Entry / Encoding" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>Data Entry / Encoding</option>
                <option value="Documentation" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>Documentation</option>
                <option value="Debugging / Troubleshooting" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>Debugging / Troubleshooting</option>
                <option value="Testing" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>Testing</option>
                <option value="Other" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>Other</option>
              </select>
              <select
                value={selectedEntriesMonth}
                onChange={(e) => setSelectedEntriesMonth(e.target.value)}
                className="px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto text-sm"
                style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
              >
                {getUniqueMonths().map(month => (
                  <option key={month} value={month} style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>{month}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 w-full lg:w-auto flex-wrap justify-end btn-group">
            <button 
              onClick={handleAddEntry} 
              className="bg-green-500 hover:bg-green-600 text-white font-semibold px-4 sm:px-6 py-2 rounded-lg transition duration-200 text-sm"
            >
              + Add Entry
            </button>
            <button 
              onClick={handleAddBulkEntries} 
              className="bg-teal-500 hover:bg-teal-600 text-white font-semibold px-4 sm:px-6 py-2 rounded-lg transition duration-200 text-sm"
            >
              📋 Bulk Add
            </button>
            {selectedEntryIds.size > 1 && (
              <button 
                onClick={handleMergeEntries} 
                className="bg-purple-500 hover:bg-purple-600 text-white font-semibold px-4 sm:px-6 py-2 rounded-lg transition duration-200 text-sm"
              >
                🔗 Merge ({selectedEntryIds.size})
              </button>
            )}
            <button 
              onClick={() => setShowExport(true)} 
              className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-4 sm:px-6 py-2 rounded-lg transition duration-200 text-sm"
            >
              📤 Export
            </button>
          </div>
        </div>

          {filteredEntries.length === 0 ? (
            <div className="text-center py-12">
              <p style={{ color: 'var(--text-secondary)' }} className="mb-2">No time entries found.</p>
              <p style={{ color: 'var(--text-secondary)' }}>
                {categoryFilter !== 'ALL' || selectedEntriesMonth !== 'ALL'
                  ? `No entries found with selected filters.` 
                  : 'Click "Add Entry" to log your first OJT hours!'}
              </p>
            </div>
        ) : (
          <div className="space-y-4">
            {(() => {
              // Group entries by day for daily summary view
              const groupedByDay = {};
              filteredEntries.forEach(entry => {
                const dateKey = new Date(entry.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  timeZone: 'UTC'
                });
                if (!groupedByDay[dateKey]) {
                  groupedByDay[dateKey] = [];
                }
                groupedByDay[dateKey].push(entry);
              });

              return Object.entries(groupedByDay).map(([dateKey, dayEntries]) => {
                const totalHours = dayEntries.reduce((sum, e) => sum + e.hours, 0);
                const hours = Math.floor(totalHours);
                const minutes = Math.round((totalHours % 1) * 60);
                const dayEntriesSelected = dayEntries.filter(e => selectedEntryIds.has(e._id));
                const allDayEntriesSelected = dayEntriesSelected.length === dayEntries.length;

                return (
                  <div key={dateKey} className="border rounded-lg p-4 hover:shadow-lg transition duration-200" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                    {/* Day Header with Summary */}
                    <div className="flex justify-between items-center mb-3 pb-3 border-b-2" style={{ borderColor: 'var(--border-color)' }}>
                      <div className="flex items-center gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={allDayEntriesSelected && dayEntries.length > 0}
                          onChange={() => {
                            const newSet = new Set(selectedEntryIds);
                            if (allDayEntriesSelected) {
                              dayEntries.forEach(e => newSet.delete(e._id));
                            } else {
                              dayEntries.forEach(e => newSet.add(e._id));
                            }
                            setSelectedEntryIds(newSet);
                          }}
                          className="w-4 h-4 accent-purple-500"
                          disabled={dayEntries.length === 1}
                        />
                        <div>
                          <div className="font-bold" style={{ color: 'var(--text-primary)' }}>{dateKey}</div>
                          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {dayEntries.length} {dayEntries.length === 1 ? 'entry' : 'entries'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-blue-600 text-lg">{hours}h {minutes}m</div>
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Total</div>
                      </div>
                    </div>

                    {/* Entries for the day */}
                    <div className="space-y-2 ml-8">
                      {dayEntries.map((entry) => (
                        <div key={entry._id} className="flex items-start gap-3 ml-0 sm:ml-2">
                          <input
                            type="checkbox"
                            checked={selectedEntryIds.has(entry._id)}
                            onChange={() => toggleEntrySelection(entry._id)}
                            disabled={dayEntries.length === 1}
                            className="w-4 h-4 mt-1 accent-purple-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{formatTask(entry.task)}</div>
                            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                              {entry.startTime} - {entry.endTime} • {Math.floor(entry.hours)}h {Math.round((entry.hours % 1) * 60)}m
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span 
                                className="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white"
                                style={{ backgroundColor: categoryColors[entry.category] }}
                              >
                                {entry.category}
                              </span>
                              {entry.isDTRMode && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full dark:bg-indigo-900 dark:text-indigo-300">
                                  📋 DTR {entry.breakMinutes > 0 ? `• ${entry.breakMinutes}m break` : ''}
                                </span>
                              )}
                            </div>
                            {entry.notes && (
                              <div className="mt-1 text-xs p-1.5 rounded" style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' }}>
                                Note: {entry.notes}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1 flex-shrink-0 flex-col sm:flex-row">
                            <button 
                              onClick={() => handleEditEntry(entry)}
                              className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium transition duration-200"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteEntry(entry._id)}
                              className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs font-medium transition duration-200"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>

      {showModal && (
        <TimeEntryModal
          entry={editingEntry}
          onClose={() => setShowModal(false)}
          onSave={handleSaveEntry}
          defaultDate={selectedDate}
          existingEntries={entries}
        />
      )}

      {showBulkModal && (
        <BulkEntryModal
          onClose={() => setShowBulkModal(false)}
          onSave={handleBulkSaveEntry}
        />
      )}

      {showPlanHours && (
        <PlanHours onClose={() => setShowPlanHours(false)} />
      )}

      {showExport && (
        <ExportModal onClose={() => setShowExport(false)} />
      )}
    </div>
  );
};

export default Dashboard;
