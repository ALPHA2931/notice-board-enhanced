import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface NoticeFormData {
  title: string;
  content: string;
  priority: 'EMERGENCY' | 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  visibleFrom: string;
  visibleUntil: string;
  channels: string[];
  audienceRule: {
    departments: string[];
    roles: string[];
    locations: string[];
    tags: string[];
    topics: string[];
  };
  isPublic: boolean;
  tags: string[];
  color: string;
}

interface Notice {
  id: string;
  title: string;
  content: string;
  priority: string;
  status: string;
  createdAt: string;
  author: {
    username: string;
  };
  state?: string;
  validTransitions?: string[];
}

interface SystemStats {
  audienceTargeting: {
    totalUsers: number;
    totalDepartments: number;
    totalRoles: number;
    totalLocations: number;
    totalTopics: number;
    totalIndexTerms: number;
    bloomFilterElements: number;
  };
  scheduler: {
    queueSize: number;
    activeNotices: number;
    totalIntervals: number;
    displayBuffers: number;
    pendingDeliveries: number;
    timerWheelSlots: number;
  };
  stateMachine: {
    totalNotices: number;
    totalTransitions: number;
    validTransitions: number;
    invalidTransitions: number;
    stateDistribution: Record<string, number>;
    fsmValidation: {
      isValid: boolean;
      issues: string[];
    };
  };
}

const EnhancedAdminPanel: React.FC = () => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [activeTab, setActiveTab] = useState<'create' | 'manage' | 'stats' | 'fsm'>('create');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<NoticeFormData>({
    title: '',
    content: '',
    priority: 'NORMAL',
    visibleFrom: new Date().toISOString().slice(0, 16),
    visibleUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    channels: ['web'],
    audienceRule: {
      departments: [],
      roles: [],
      locations: [],
      tags: [],
      topics: []
    },
    isPublic: false,
    tags: [],
    color: '#3B82F6'
  });
  const [fsmGraph, setFsmGraph] = useState<string>('');

  // Predefined options for audience targeting
  const departments = ['Engineering', 'Marketing', 'HR', 'Finance', 'Operations'];
  const roles = ['Manager', 'Developer', 'Designer', 'Analyst', 'Director'];
  const locations = ['Building A', 'Building B', 'Remote', 'Campus North', 'Campus South'];
  const availableChannels = ['web', 'mobile', 'display', 'email', 'sms'];
  const tagSuggestions = ['urgent', 'meeting', 'deadline', 'update', 'announcement'];

  useEffect(() => {
    fetchNotices();
    fetchSystemStats();
    fetchFSMGraph();
  }, []);

  const fetchNotices = async () => {
    try {
      const response = await axios.get('/api/notices', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setNotices(response.data.notices);
    } catch (error) {
      console.error('Failed to fetch notices:', error);
    }
  };

  const fetchSystemStats = async () => {
    try {
      const response = await axios.get('/api/enhanced-notices/system/stats', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setSystemStats(response.data);
    } catch (error) {
      console.error('Failed to fetch system stats:', error);
    }
  };

  const fetchFSMGraph = async () => {
    try {
      const response = await axios.get('/api/enhanced-notices/system/fsm-graph', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setFsmGraph(response.data.dotGraph);
    } catch (error) {
      console.error('Failed to fetch FSM graph:', error);
    }
  };

  const registerUser = async () => {
    try {
      await axios.post('/api/enhanced-notices/register-user', {
        userId: 'demo-user-' + Math.random().toString(36).substr(2, 9),
        role: roles[Math.floor(Math.random() * roles.length)],
        department: departments[Math.floor(Math.random() * departments.length)],
        location: locations[Math.floor(Math.random() * locations.length)],
        language: 'en',
        deviceCapabilities: ['web', 'mobile'],
        tags: tagSuggestions.slice(0, Math.floor(Math.random() * 3) + 1)
      }, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      fetchSystemStats();
      alert('Demo user registered successfully!');
    } catch (error) {
      console.error('Failed to register user:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post('/api/enhanced-notices', formData, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      alert('Notice created successfully!');
      setFormData({
        title: '',
        content: '',
        priority: 'NORMAL',
        visibleFrom: new Date().toISOString().slice(0, 16),
        visibleUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
        channels: ['web'],
        audienceRule: {
          departments: [],
          roles: [],
          locations: [],
          tags: [],
          topics: []
        },
        isPublic: false,
        tags: [],
        color: '#3B82F6'
      });
      fetchNotices();
    } catch (error: any) {
      alert('Failed to create notice: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleStateTransition = async (noticeId: string, action: string) => {
    try {
      let endpoint = '';
      switch (action) {
        case 'submit':
          endpoint = `/api/enhanced-notices/${noticeId}/submit`;
          break;
        case 'approve':
          endpoint = `/api/enhanced-notices/${noticeId}/approve`;
          break;
        case 'reject':
          endpoint = `/api/enhanced-notices/${noticeId}/reject`;
          break;
        case 'emergency':
          endpoint = `/api/enhanced-notices/${noticeId}/emergency`;
          break;
        default:
          return;
      }

      await axios.post(endpoint, {}, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      fetchNotices();
      fetchSystemStats();
      alert(`Notice ${action}ed successfully!`);
    } catch (error: any) {
      alert(`Failed to ${action} notice: ` + (error.response?.data?.message || error.message));
    }
  };

  const addToArray = (field: keyof NoticeFormData, value: string) => {
    if (field === 'audienceRule') return;
    
    setFormData(prev => {
      const currentArray = prev[field] as string[];
      if (!currentArray.includes(value)) {
        return {
          ...prev,
          [field]: [...currentArray, value]
        };
      }
      return prev;
    });
  };

  const removeFromArray = (field: keyof NoticeFormData, value: string) => {
    if (field === 'audienceRule') return;
    
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).filter(item => item !== value)
    }));
  };

  const addToAudienceRule = (field: keyof NoticeFormData['audienceRule'], value: string) => {
    setFormData(prev => ({
      ...prev,
      audienceRule: {
        ...prev.audienceRule,
        [field]: prev.audienceRule[field].includes(value) 
          ? prev.audienceRule[field]
          : [...prev.audienceRule[field], value]
      }
    }));
  };

  const removeFromAudienceRule = (field: keyof NoticeFormData['audienceRule'], value: string) => {
    setFormData(prev => ({
      ...prev,
      audienceRule: {
        ...prev.audienceRule,
        [field]: prev.audienceRule[field].filter(item => item !== value)
      }
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="border-b border-gray-200">
            <div className="px-6 py-4">
              <h1 className="text-2xl font-bold text-gray-900">
                🛠️ Enhanced Notice Board Admin Panel
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage notices with advanced data structures and state machines
              </p>
            </div>
            
            {/* Tabs */}
            <div className="flex space-x-8 px-6">
              {(['create', 'manage', 'stats', 'fsm'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {tab === 'create' && ' Notice'}
                  {tab === 'manage' && ' Notices'}
                  {tab === 'stats' && ' System Stats'}
                  {tab === 'fsm' && ' State Machine'}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'create' && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Title</label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Content</label>
                      <textarea
                        required
                        rows={4}
                        value={formData.content}
                        onChange={(e) => setFormData({...formData, content: e.target.value})}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Priority</label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData({...formData, priority: e.target.value as any})}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="LOW">🟢 Low</option>
                        <option value="NORMAL">🔵 Normal</option>
                        <option value="HIGH">🟡 High</option>
                        <option value="URGENT">🟠 Urgent</option>
                        <option value="EMERGENCY">🔴 Emergency</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Visible From</label>
                        <input
                          type="datetime-local"
                          value={formData.visibleFrom}
                          onChange={(e) => setFormData({...formData, visibleFrom: e.target.value})}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Visible Until</label>
                        <input
                          type="datetime-local"
                          value={formData.visibleUntil}
                          onChange={(e) => setFormData({...formData, visibleUntil: e.target.value})}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Audience Targeting */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">🎯 Audience Targeting</h3>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isPublic"
                        checked={formData.isPublic}
                        onChange={(e) => setFormData({...formData, isPublic: e.target.checked})}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-900">
                        Public Notice (visible to everyone)
                      </label>
                    </div>

                    {!formData.isPublic && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Departments</label>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {departments.map(dept => (
                              <button
                                key={dept}
                                type="button"
                                onClick={() => formData.audienceRule.departments.includes(dept) 
                                  ? removeFromAudienceRule('departments', dept)
                                  : addToAudienceRule('departments', dept)
                                }
                                className={`px-3 py-1 text-sm rounded-full ${
                                  formData.audienceRule.departments.includes(dept)
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {dept}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Roles</label>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {roles.map(role => (
                              <button
                                key={role}
                                type="button"
                                onClick={() => formData.audienceRule.roles.includes(role) 
                                  ? removeFromAudienceRule('roles', role)
                                  : addToAudienceRule('roles', role)
                                }
                                className={`px-3 py-1 text-sm rounded-full ${
                                  formData.audienceRule.roles.includes(role)
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {role}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Locations</label>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {locations.map(location => (
                              <button
                                key={location}
                                type="button"
                                onClick={() => formData.audienceRule.locations.includes(location) 
                                  ? removeFromAudienceRule('locations', location)
                                  : addToAudienceRule('locations', location)
                                }
                                className={`px-3 py-1 text-sm rounded-full ${
                                  formData.audienceRule.locations.includes(location)
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {location}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Channels</label>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {availableChannels.map(channel => (
                          <button
                            key={channel}
                            type="button"
                            onClick={() => formData.channels.includes(channel) 
                              ? removeFromArray('channels', channel)
                              : addToArray('channels', channel)
                            }
                            className={`px-3 py-1 text-sm rounded-full ${
                              formData.channels.includes(channel)
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            📡 {channel}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tags</label>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {tagSuggestions.map(tag => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => formData.tags.includes(tag) 
                              ? removeFromArray('tags', tag)
                              : addToArray('tags', tag)
                            }
                            className={`px-3 py-1 text-sm rounded-full ${
                              formData.tags.includes(tag)
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            🏷️ {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={registerUser}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    👤 Register Demo User
                  </button>
                  
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : '📝 Create Notice'}
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'manage' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Manage Notices</h3>
                  <button
                    onClick={fetchNotices}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    🔄 Refresh
                  </button>
                </div>
                
                <div className="grid gap-4">
                  {notices.map(notice => (
                    <div key={notice.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{notice.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{notice.content.slice(0, 100)}...</p>
                          <div className="flex space-x-4 mt-2 text-xs text-gray-500">
                            <span>Priority: {notice.priority}</span>
                            <span>Status: {notice.status}</span>
                            <span>Author: {notice.author.username}</span>
                            <span>Created: {new Date(notice.createdAt).toLocaleDateString()}</span>
                          </div>
                          {notice.state && (
                            <div className="mt-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                State: {notice.state}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex space-x-2 ml-4">
                          {notice.validTransitions?.includes('submit') && (
                            <button
                              onClick={() => handleStateTransition(notice.id, 'submit')}
                              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Submit
                            </button>
                          )}
                          {notice.validTransitions?.includes('approve') && (
                            <button
                              onClick={() => handleStateTransition(notice.id, 'approve')}
                              className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              Approve
                            </button>
                          )}
                          {notice.validTransitions?.includes('reject') && (
                            <button
                              onClick={() => handleStateTransition(notice.id, 'reject')}
                              className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              Reject
                            </button>
                          )}
                          <button
                            onClick={() => handleStateTransition(notice.id, 'emergency')}
                            className="px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700"
                          >
                            🚨 Emergency
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'stats' && systemStats && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">📊 System Statistics</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-blue-50 p-6 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-4">🎯 Audience Targeting</h4>
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt className="text-sm text-blue-700">Total Users:</dt>
                        <dd className="text-sm font-medium text-blue-900">{systemStats.audienceTargeting.totalUsers}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-blue-700">Departments:</dt>
                        <dd className="text-sm font-medium text-blue-900">{systemStats.audienceTargeting.totalDepartments}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-blue-700">Roles:</dt>
                        <dd className="text-sm font-medium text-blue-900">{systemStats.audienceTargeting.totalRoles}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-blue-700">Locations:</dt>
                        <dd className="text-sm font-medium text-blue-900">{systemStats.audienceTargeting.totalLocations}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-blue-700">Bloom Filter Items:</dt>
                        <dd className="text-sm font-medium text-blue-900">{systemStats.audienceTargeting.bloomFilterElements}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="bg-green-50 p-6 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-4">⏰ Scheduler</h4>
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt className="text-sm text-green-700">Queue Size:</dt>
                        <dd className="text-sm font-medium text-green-900">{systemStats.scheduler.queueSize}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-green-700">Active Notices:</dt>
                        <dd className="text-sm font-medium text-green-900">{systemStats.scheduler.activeNotices}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-green-700">Display Buffers:</dt>
                        <dd className="text-sm font-medium text-green-900">{systemStats.scheduler.displayBuffers}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-green-700">Pending Deliveries:</dt>
                        <dd className="text-sm font-medium text-green-900">{systemStats.scheduler.pendingDeliveries}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-green-700">Timer Wheel Slots:</dt>
                        <dd className="text-sm font-medium text-green-900">{systemStats.scheduler.timerWheelSlots}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="bg-purple-50 p-6 rounded-lg">
                    <h4 className="font-medium text-purple-900 mb-4">🔄 State Machine</h4>
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt className="text-sm text-purple-700">Total Notices:</dt>
                        <dd className="text-sm font-medium text-purple-900">{systemStats.stateMachine.totalNotices}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-purple-700">Total Transitions:</dt>
                        <dd className="text-sm font-medium text-purple-900">{systemStats.stateMachine.totalTransitions}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-purple-700">Valid Transitions:</dt>
                        <dd className="text-sm font-medium text-purple-900">{systemStats.stateMachine.validTransitions}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-purple-700">Invalid Transitions:</dt>
                        <dd className="text-sm font-medium text-purple-900">{systemStats.stateMachine.invalidTransitions}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-purple-700">FSM Valid:</dt>
                        <dd className={`text-sm font-medium ${systemStats.stateMachine.fsmValidation.isValid ? 'text-green-900' : 'text-red-900'}`}>
                          {systemStats.stateMachine.fsmValidation.isValid ? '✅ Yes' : '❌ No'}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-4">State Distribution</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(systemStats.stateMachine.stateDistribution).map(([state, count]) => (
                      <div key={state} className="text-center">
                        <div className="text-2xl font-bold text-gray-900">{count}</div>
                        <div className="text-sm text-gray-600">{state}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'fsm' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">🔄 Finite State Machine</h3>
                  <button
                    onClick={fetchFSMGraph}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    🔄 Refresh Graph
                  </button>
                </div>
                
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-4">DOT Graph Definition</h4>
                  <pre className="text-sm bg-white p-4 rounded border overflow-x-auto">
                    {fsmGraph}
                  </pre>
                </div>

                <div className="bg-blue-50 p-6 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-4">State Transitions Explained</h4>
                  <div className="text-sm text-blue-800 space-y-2">
                    <div><strong>DRAFT</strong> → <strong>SUBMITTED</strong>: User submits notice for review</div>
                    <div><strong>SUBMITTED</strong> → <strong>MODERATION_PENDING</strong>: Moderator starts review</div>
                    <div><strong>MODERATION_PENDING</strong> → <strong>APPROVED</strong>: Moderator approves notice</div>
                    <div><strong>APPROVED</strong> → <strong>SCHEDULED</strong>: System schedules notice for display</div>
                    <div><strong>SCHEDULED</strong> → <strong>ACTIVE</strong>: Notice becomes visible to users</div>
                    <div><strong>ACTIVE</strong> → <strong>EXPIRED</strong>: Notice reaches end of visibility period</div>
                    <div><strong>EXPIRED</strong> → <strong>ARCHIVED</strong>: Notice is archived for record keeping</div>
                    <div><strong>ARCHIVED/REJECTED</strong> → <strong>REINSTATED</strong>: Admin can reinstate notices</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedAdminPanel;
