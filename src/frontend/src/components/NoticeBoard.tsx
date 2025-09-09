import React from 'react';

const NoticeBoard: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Notice Board</h1>
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-gray-600">
            Notice board functionality will be implemented here. This includes:
          </p>
          <ul className="mt-4 space-y-2 text-gray-600">
            <li>• Create, edit, and delete notices</li>
            <li>• Share notices with other users</li>
            <li>• Real-time updates via WebSocket</li>
            <li>• Comment on notices</li>
            <li>• Filter and search notices</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default NoticeBoard;
