import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './hooks/useAuth';
import Login from './components/Login';
import Register from './components/Register';
import EnhancedNoticeBoard from './components/EnhancedNoticeBoard';
import EnhancedAdminPanel from './components/EnhancedAdminPanel';

// Navigation component
const Navigation: React.FC = () => {
  const { user, logout } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <nav className="bg-white shadow-lg border-b-2 border-blue-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-2xl">🔔</span>
              <span className="text-xl font-bold text-gray-900">Enhanced Notice Board</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              <div className="font-medium">{currentTime.toLocaleString()}</div>
              <div className="text-xs">Live System Time</div>
            </div>

            <div className="flex items-center space-x-4">
              <Link
                to="/"
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                📊 Notice Board
              </Link>
              
              {user?.role === 'ADMIN' || user?.role === 'MODERATOR' ? (
                <Link
                  to="/admin"
                  className="px-3 py-2 rounded-md text-sm font-medium text-blue-700 hover:text-blue-900 hover:bg-blue-50"
                >
                  🛠️ Admin Panel
                </Link>
              ) : null}

              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-gray-600">Live</span>
                </div>
                
                <div className="text-sm text-gray-700">
                  Welcome, <span className="font-medium">{user?.username}</span>
                </div>
                
                <button
                  onClick={logout}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({ 
  children, 
  adminOnly = false 
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== 'ADMIN' && user.role !== 'MODERATOR') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">You don't have permission to access this page.</p>
          <Link
            to="/"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Notice Board
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navigation />
      {children}
    </>
  );
};

// Footer component
const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-800 text-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">🔔 Enhanced Notice Board</h3>
            <p className="text-gray-300 text-sm">
              A sophisticated digital notice board system implementing advanced computer science concepts including 
              data structures, operating systems principles, and theory of computation.
            </p>
          </div>
          
          <div>
            <h4 className="text-md font-semibold mb-3">🧮 Computer Science Concepts</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Hash Maps & Bloom Filters</li>
              <li>• Priority Queues & Heaps</li>
              <li>• Roaring Bitmaps</li>
              <li>• Finite State Machines</li>
              <li>• Circular Buffers</li>
              <li>• Timing Wheels</li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-md font-semibold mb-3">⚙️ System Features</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Real-time audience targeting</li>
              <li>• Priority-based scheduling</li>
              <li>• State machine workflows</li>
              <li>• Delivery guarantees</li>
              <li>• Emergency preemption</li>
              <li>• System observability</li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-700 mt-8 pt-4 text-center text-gray-400 text-sm">
          <p>
            Enhanced Notice Board System - Demonstrating CS Fundamentals in Practice
          </p>
          <p className="mt-1">
            Built with React, TypeScript, Express.js, and advanced data structures
          </p>
        </div>
      </div>
    </footer>
  );
};

// Main App component
const AppEnhanced: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Loading Enhanced System</h2>
          <p className="text-gray-600">Initializing data structures and state machines...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              iconTheme: {
                primary: '#4ade80',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />

        <main className="flex-1">
          <Routes>
            {/* Public routes */}
            <Route 
              path="/login" 
              element={
                user ? <Navigate to="/" replace /> : 
                <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
                  <Login />
                </div>
              } 
            />
            <Route 
              path="/register" 
              element={
                user ? <Navigate to="/" replace /> : 
                <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
                  <Register />
                </div>
              } 
            />

            {/* Protected routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <EnhancedNoticeBoard />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly>
                  <EnhancedAdminPanel />
                </ProtectedRoute>
              }
            />

            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {user && <Footer />}
      </div>
    </Router>
  );
};

export default AppEnhanced;
