import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface Notice {
  id: number;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  color: string;
  createdAt: string;
  updatedAt: string;
}

type FilterType = 'all' | 'urgent' | 'high' | 'medium' | 'low';

const NoticeBoard: React.FC = () => {
  const { user, logout } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedColor, setSelectedColor] = useState('blue');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'medium' as Notice['priority']
  });

  const colors = [
    { name: 'blue', value: '#3b82f6' },
    { name: 'green', value: '#10b981' },
    { name: 'yellow', value: '#f59e0b' },
    { name: 'red', value: '#ef4444' },
    { name: 'purple', value: '#8b5cf6' },
    { name: 'pink', value: '#ec4899' },
    { name: 'indigo', value: '#6366f1' },
    { name: 'gray', value: '#6b7280' }
  ];

  useEffect(() => {
    loadNotices();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowForm(false);
      }
      if (event.ctrlKey && event.key === 'n') {
        event.preventDefault();
        setShowForm(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadNotices = () => {
    const saved = localStorage.getItem('professional_notices');
    if (saved) {
      setNotices(JSON.parse(saved));
    } else {
      const initialNotices: Notice[] = [
        {
          id: 1,
          title: "Welcome to Your Professional Notice Board",
          content: "This is your centralized hub for managing tasks, notices, and important information. Use the intuitive interface to create, organize, and track your professional activities.",
          priority: "high",
          color: "blue",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 2,
          title: "Getting Started Guide",
          content: "Click 'Add New Notice' to create your first task. Use color coding and priority levels to organize your work effectively. The search and filter options help you find information quickly.",
          priority: "medium",
          color: "green",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      setNotices(initialNotices);
      saveNotices(initialNotices);
    }
  };

  const saveNotices = (noticesToSave: Notice[]) => {
    localStorage.setItem('professional_notices', JSON.stringify(noticesToSave));
  };

  const addNotice = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('Please fill in all fields');
      return;
    }

    const newNotice: Notice = {
      id: Date.now(),
      title: formData.title.trim(),
      content: formData.content.trim(),
      priority: formData.priority,
      color: selectedColor,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedNotices = [newNotice, ...notices];
    setNotices(updatedNotices);
    saveNotices(updatedNotices);
    
    // Reset form
    setFormData({ title: '', content: '', priority: 'medium' });
    setSelectedColor('blue');
    setShowForm(false);
  };

  const deleteNotice = (id: number) => {
    if (window.confirm('Are you sure you want to delete this notice?')) {
      const updatedNotices = notices.filter(notice => notice.id !== id);
      setNotices(updatedNotices);
      saveNotices(updatedNotices);
    }
  };

  const getFilteredNotices = () => {
    let filtered = notices;
    
    if (activeFilter !== 'all') {
      filtered = filtered.filter(notice => notice.priority === activeFilter);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(notice => 
        notice.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notice.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  };

  const getStats = () => {
    const total = notices.length;
    const urgent = notices.filter(n => n.priority === 'urgent').length;
    const today = new Date().toDateString();
    const createdToday = notices.filter(n => 
      new Date(n.createdAt).toDateString() === today
    ).length;
    
    return { total, urgent, createdToday };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPriorityIcon = (priority: string) => {
    const icons = {
      low: '📉',
      medium: '➖',
      high: '📈',
      urgent: '🚨'
    };
    return icons[priority as keyof typeof icons] || '➖';
  };

  const getBorderColor = (color: string) => {
    const colorMap: { [key: string]: string } = {
      blue: 'border-l-blue-500',
      green: 'border-l-green-500',
      yellow: 'border-l-yellow-500',
      red: 'border-l-red-500',
      purple: 'border-l-purple-500',
      pink: 'border-l-pink-500',
      indigo: 'border-l-indigo-500',
      gray: 'border-l-gray-500'
    };
    return colorMap[color] || 'border-l-blue-500';
  };

  const getPriorityClass = (priority: string) => {
    const classes = {
      low: 'bg-green-100 text-green-800 border border-green-200',
      medium: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      high: 'bg-orange-100 text-orange-800 border border-orange-200',
      urgent: 'bg-red-100 text-red-800 border border-red-200 animate-pulse'
    };
    return classes[priority as keyof typeof classes] || classes.medium;
  };

  const filteredNotices = getFilteredNotices();
  const stats = getStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                📋 Digital Notice Board
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Welcome back, {user?.firstName || user?.username}! Manage your professional tasks and notices.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className="text-gray-500 hover:text-gray-700 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                🏠 Dashboard
              </Link>
              <button
                onClick={logout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-l-blue-500">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Notices</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-l-red-500">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{stats.urgent}</div>
              <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Urgent Tasks</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-l-green-500">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{stats.createdToday}</div>
              <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Created Today</div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              ➕ Add New Notice
            </button>
            
            <div className="flex flex-wrap items-center gap-3">
              {['all', 'urgent', 'high', 'medium', 'low'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter as FilterType)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                    activeFilter === filter
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
              
              <input
                type="text"
                placeholder="Search notices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 w-64"
              />
            </div>
          </div>
        </div>

        {/* Notice Form */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    📝 Create New Notice
                  </h3>
                  <button
                    onClick={() => setShowForm(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              <form onSubmit={addNotice} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      📝 Title
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                      placeholder="Enter notice title"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ⚡ Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({...formData, priority: e.target.value as Notice['priority']})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📄 Content
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 h-32 resize-vertical"
                    placeholder="Enter notice content..."
                    required
                  />
                </div>
                
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    🎨 Choose Color
                  </label>
                  <div className="flex gap-3 flex-wrap">
                    {colors.map((color) => (
                      <button
                        key={color.name}
                        type="button"
                        onClick={() => setSelectedColor(color.name)}
                        className={`w-8 h-8 rounded-lg transition-all duration-200 border-2 ${
                          selectedColor === color.name
                            ? 'border-gray-800 scale-110'
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.value }}
                      >
                        {selectedColor === color.name && (
                          <span className="text-white font-bold">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                  >
                    ❌ Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    💾 Add Notice
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Notices Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNotices.length === 0 ? (
            <div className="col-span-full text-center py-16">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-2xl font-semibold text-white mb-2">No notices found</h3>
              <p className="text-white/80 mb-6">
                {notices.length === 0 
                  ? "Create your first notice to get started with professional task management" 
                  : "Try adjusting your filters or search terms"
                }
              </p>
              {notices.length === 0 && (
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-white text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  ➕ Create First Notice
                </button>
              )}
            </div>
          ) : (
            filteredNotices.map((notice) => (
              <div
                key={notice.id}
                className={`bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-l-4 ${getBorderColor(notice.color)} overflow-hidden group`}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      📝 {notice.title}
                    </h3>
                    <button
                      onClick={() => deleteNotice(notice.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1 rounded"
                      title="Delete notice"
                    >
                      🗑️
                    </button>
                  </div>
                  
                  <p className="text-gray-600 mb-4 leading-relaxed">{notice.content}</p>
                  
                  <div className="flex justify-between items-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${getPriorityClass(notice.priority)}`}>
                      {getPriorityIcon(notice.priority)} {notice.priority.toUpperCase()}
                    </span>
                    
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      🕒 {formatDate(notice.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NoticeBoard;
