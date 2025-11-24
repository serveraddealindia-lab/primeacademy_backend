import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const allModules = [
    { name: 'Batches', path: '/batches', icon: '📚', description: 'Manage training batches' },
    { name: 'Students', path: '/students', icon: '👥', description: 'Manage students' },
    { name: 'Faculty', path: '/faculty', icon: '👨‍🏫', description: 'Manage faculty members' },
    { name: 'Employees', path: '/employees', icon: '💼', description: 'Manage employees' },
    { name: 'Attendance', path: '/attendance', icon: '✅', description: 'Track attendance' },
    ...(user?.role !== 'student' ? [{ name: 'My Attendance', path: '/student-attendance', icon: '📸', description: 'Punch in/out with photo and fingerprint' }] : []),
    { name: 'Payments', path: '/payments', icon: '💰', description: 'Manage payments' },
    { name: 'Portfolios', path: '/portfolios', icon: '📁', description: 'Student portfolios' },
    { name: 'Reports', path: '/reports', icon: '📊', description: 'View reports' },
    { name: 'Approvals', path: '/approvals', icon: '✓', description: 'Manage approvals' },
    { name: 'Leave Management', path: '/leaves', icon: '🏖️', description: 'Manage leave requests for all users' },
    { name: 'Batch Extensions', path: '/batch-extensions', icon: '⏱️', description: 'Manage batch extensions' },
    { name: 'Users', path: '/users', icon: '👤', description: 'Manage users' },
  ];

  const modules = allModules;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Welcome back, {user?.name}!</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {modules.map((module) => (
            <div
              key={module.path}
              onClick={() => navigate(module.path)}
              className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow border border-gray-200 hover:border-orange-500"
            >
              <div className="text-4xl mb-4">{module.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{module.name}</h3>
              <p className="text-sm text-gray-600">{module.description}</p>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

