import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useSocket } from '../hooks/useSocket';

interface Notice {
  noticeId: string;
  title: string;
  content: string;
  priority: 'EMERGENCY' | 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  visibleFrom: string;
  visibleUntil: string;
  targetAudience: string[];
  channels: string[];
  createdAt: string;
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
  };
}

const EnhancedNoticeBoard: React.FC = () => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [displayId] = useState(`display_${Math.random().toString(36).substr(2, 9)}`);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showStats, setShowStats] = useState(false);

  const socket = useSocket();

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Fetch display notices
  const fetchNotices = useCallback(async () => {
    try {
      const response = await axios.get(`/api/enhanced-notices/display/${displayId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setNotices(response.data.notices);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch notices');
      setLoading(false);
    }
  }, [displayId]);

  // Fetch system statistics
  const fetchSystemStats = useCallback(async () => {
    try {
      const response = await axios.get('/api/enhanced-notices/system/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setSystemStats(response.data);
    } catch (err: any) {
      console.error('Failed to fetch system stats:', err);
    }
  }, []);

  // Setup real-time updates
  useEffect(() => {
    if (socket) {
      // Listen for new notices
      socket.on('notice:new', (notice: Notice) => {
        if (notice.channels.includes('web') || notice.channels.includes('display')) {
          setNotices(prev => {
            // Handle emergency notices (preemption)
            if (notice.priority === 'EMERGENCY') {
              return [notice, ...prev];
            }
            return [...prev, notice];
          });
        }
      });

      // Listen for notice updates
      socket.on('notice:updated', (updatedNotice: Notice) => {
        setNotices(prev => prev.map(notice => 
          notice.noticeId === updatedNotice.noticeId ? updatedNotice : notice
        ));
      });

      // Listen for notice deletions/expirations
      socket.on('notice:expired', (noticeId: string) => {
        setNotices(prev => prev.filter(notice => notice.noticeId !== noticeId));
      });

      return () => {
        socket.off('notice:new');
        socket.off('notice:updated');
        socket.off('notice:expired');
      };
    }
  }, [socket]);

  // Initial fetch
  useEffect(() => {
    fetchNotices();
    fetchSystemStats();
    
    // Refresh notices every 30 seconds
    const interval = setInterval(fetchNotices, 30000);
    
    // Refresh stats every 60 seconds
    const statsInterval = setInterval(fetchSystemStats, 60000);
    
    return () => {
      clearInterval(interval);
      clearInterval(statsInterval);
    };
  }, [fetchNotices, fetchSystemStats]);

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'EMERGENCY': return 'bg-red-600 border-red-700 text-white animate-pulse';
      case 'URGENT': return 'bg-orange-500 border-orange-600 text-white';
      case 'HIGH': return 'bg-yellow-400 border-yellow-500 text-gray-900';
      case 'NORMAL': return 'bg-blue-100 border-blue-300 text-blue-900';
      case 'LOW': return 'bg-gray-100 border-gray-300 text-gray-700';
      default: return 'bg-gray-100 border-gray-300 text-gray-700';
    }
  };

  const getPriorityIcon = (priority: string): string => {
    switch (priority) {
      case 'EMERGENCY': return '🚨';
      case 'URGENT': return '⚠️';
      case 'HIGH': return '🔺';
      case 'NORMAL': return '📢';
      case 'LOW': return '📝';
      default: return '📝';
    }
  };

  const formatTime = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const isNoticeActive = (notice: Notice): boolean => {
    const now = currentTime.getTime();
    const visibleFrom = new Date(notice.visibleFrom).getTime();
    const visibleUntil = new Date(notice.visibleUntil).getTime();
    return now >= visibleFrom && now <= visibleUntil;
  };

  const getTimeRemaining = (notice: Notice): string => {
    const now = currentTime.getTime();
    const visibleUntil = new Date(notice.visibleUntil).getTime();
    const remaining = visibleUntil - now;
    
    if (remaining <= 0) return 'Expired';
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes}m remaining`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-600 text-center">
          <h2 className="text-2xl font-bold mb-2">Error</h2>
          <p>{error}</p>
          <button 
            onClick={fetchNotices}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                🔔 Enhanced Digital Notice Board
              </h1>
              <p className="text-sm text-gray-500">
                Display ID: {displayId} | Last updated: {currentTime.toLocaleString()}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowStats(!showStats)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                {showStats ? 'Hide Stats' : 'Show System Stats'}
              </button>
              <button
                onClick={fetchNotices}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                🔄 Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* System Statistics Panel */}
      {showStats && systemStats && (
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">System Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Audience Targeting Stats */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">🎯 Audience Targeting</h3>
                <div className="space-y-1 text-sm">
                  <div>Users: {systemStats.audienceTargeting.totalUsers}</div>
                  <div>Departments: {systemStats.audienceTargeting.totalDepartments}</div>
                  <div>Roles: {systemStats.audienceTargeting.totalRoles}</div>
                  <div>Locations: {systemStats.audienceTargeting.totalLocations}</div>
                  <div>Bloom Filter: {systemStats.audienceTargeting.bloomFilterElements} items</div>
                </div>
              </div>

              {/* Scheduler Stats */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-medium text-green-900 mb-2">⏰ Scheduler</h3>
                <div className="space-y-1 text-sm">
                  <div>Queue Size: {systemStats.scheduler.queueSize}</div>
                  <div>Active Notices: {systemStats.scheduler.activeNotices}</div>
                  <div>Display Buffers: {systemStats.scheduler.displayBuffers}</div>
                  <div>Pending Deliveries: {systemStats.scheduler.pendingDeliveries}</div>
                  <div>Timer Wheel Slots: {systemStats.scheduler.timerWheelSlots}</div>
                </div>
              </div>

              {/* State Machine Stats */}
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-medium text-purple-900 mb-2">🔄 State Machine</h3>
                <div className="space-y-1 text-sm">
                  <div>Total Notices: {systemStats.stateMachine.totalNotices}</div>
                  <div>Transitions: {systemStats.stateMachine.totalTransitions}</div>
                  <div>Valid: {systemStats.stateMachine.validTransitions}</div>
                  <div>Invalid: {systemStats.stateMachine.invalidTransitions}</div>
                  <div className="mt-2">
                    <div className="font-medium">State Distribution:</div>
                    {Object.entries(systemStats.stateMachine.stateDistribution).map(([state, count]) => (
                      <div key={state} className="ml-2 text-xs">
                        {state}: {count}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {notices.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📭</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No Active Notices</h2>
            <p className="text-gray-500">Check back later for updates</p>
          </div>
        ) : (
          <div className="space-y-6">
            {notices
              .filter(isNoticeActive)
              .sort((a, b) => {
                // Sort by priority first (emergency first)
                const priorityOrder = { 'EMERGENCY': 0, 'URGENT': 1, 'HIGH': 2, 'NORMAL': 3, 'LOW': 4 };
                const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder];
                const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder];
                
                if (aPriority !== bPriority) {
                  return aPriority - bPriority;
                }
                
                // Then by creation time (newest first)
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
              })
              .map((notice, index) => (
                <div
                  key={notice.noticeId}
                  className={`relative p-6 rounded-lg border-2 shadow-lg transition-all duration-300 ${getPriorityColor(notice.priority)}`}
                  style={{
                    zIndex: notice.priority === 'EMERGENCY' ? 1000 : 100 - index
                  }}
                >
                  {/* Priority Badge */}
                  <div className="absolute top-4 right-4 flex items-center space-x-2">
                    <span className="text-2xl">{getPriorityIcon(notice.priority)}</span>
                    <span className="font-bold text-sm uppercase tracking-wider">
                      {notice.priority}
                    </span>
                  </div>

                  {/* Emergency Banner */}
                  {notice.priority === 'EMERGENCY' && (
                    <div className="absolute -top-2 -left-2 -right-2 bg-red-700 text-white text-center py-1 text-sm font-bold uppercase tracking-wider rounded-t-lg">
                      🚨 EMERGENCY NOTICE 🚨
                    </div>
                  )}

                  {/* Content */}
                  <div className="mb-4" style={{ marginTop: notice.priority === 'EMERGENCY' ? '1rem' : '0' }}>
                    <h3 className="text-2xl font-bold mb-3 leading-tight">
                      {notice.title}
                    </h3>
                    <div className="text-lg leading-relaxed whitespace-pre-wrap">
                      {notice.content}
                    </div>
                  </div>

                  {/* Footer Info */}
                  <div className="flex justify-between items-center text-sm opacity-75 border-t pt-3 mt-4">
                    <div className="space-x-4">
                      <span>📅 {formatTime(notice.visibleFrom)}</span>
                      <span>👥 {notice.targetAudience.length} targets</span>
                    </div>
                    <div className="font-medium">
                      ⏱️ {getTimeRemaining(notice)}
                    </div>
                  </div>

                  {/* Channels */}
                  <div className="mt-2 flex space-x-2">
                    {notice.channels.map(channel => (
                      <span
                        key={channel}
                        className="px-2 py-1 text-xs rounded-full bg-black bg-opacity-20"
                      >
                        📡 {channel}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Expired Notices Count */}
        {notices.filter(notice => !isNoticeActive(notice)).length > 0 && (
          <div className="mt-8 text-center text-gray-500">
            <p>{notices.filter(notice => !isNoticeActive(notice)).length} expired notice(s) hidden</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedNoticeBoard;
