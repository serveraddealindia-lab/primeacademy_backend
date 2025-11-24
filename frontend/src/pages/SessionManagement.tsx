import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { sessionAPI, Session, CreateSessionRequest } from '../api/session.api';
import { batchAPI } from '../api/batch.api';
import { facultyAPI } from '../api/faculty.api';
import { attendanceAPI } from '../api/attendance.api';

export const SessionManagement: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  
  // Filter states
  const [filterBatchId, setFilterBatchId] = useState<number | ''>('');
  const [filterFacultyId, setFilterFacultyId] = useState<number | ''>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');

  // Fetch sessions with filters
  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ['sessions', filterBatchId, filterFacultyId, filterStatus],
    queryFn: () => sessionAPI.getAllSessions({
      batchId: filterBatchId ? Number(filterBatchId) : undefined,
      facultyId: filterFacultyId ? Number(filterFacultyId) : undefined,
      status: filterStatus || undefined,
    }),
  });

  // Fetch attendance for selected session
  const { data: attendanceData, isLoading: isLoadingAttendance } = useQuery({
    queryKey: ['attendance', selectedSession?.id],
    queryFn: () => attendanceAPI.getSessionAttendance(selectedSession!.id),
    enabled: !!selectedSession && isAttendanceModalOpen,
  });

  // Fetch batches and faculty for form
  const { data: batchesData } = useQuery({
    queryKey: ['batches'],
    queryFn: () => batchAPI.getAllBatches(),
  });

  const { data: facultyData } = useQuery({
    queryKey: ['faculty'],
    queryFn: () => facultyAPI.getAllFaculty(),
  });

  const createSessionMutation = useMutation({
    mutationFn: (data: CreateSessionRequest) => sessionAPI.createSession(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setIsCreateModalOpen(false);
      alert('Session created successfully!');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to create session');
    },
  });


  const checkOutMutation = useMutation({
    mutationFn: (id: number) => sessionAPI.checkOutSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      alert('Session checked out successfully!');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to check out session');
    },
  });

  const checkInMutation = useMutation({
    mutationFn: (id: number) => sessionAPI.checkInSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      alert('Session checked in successfully!');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to check in session');
    },
  });

  let sessions = sessionsData?.data.sessions || [];
  const batches = batchesData?.data || [];
  const faculty = facultyData?.data.users || [];

  // Apply date filters
  if (filterDateFrom || filterDateTo) {
    sessions = sessions.filter(session => {
      const sessionDate = new Date(session.date);
      if (filterDateFrom && sessionDate < new Date(filterDateFrom)) return false;
      if (filterDateTo && sessionDate > new Date(filterDateTo)) return false;
      return true;
    });
  }

  const handleCreateSession = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: CreateSessionRequest = {
      batchId: parseInt(formData.get('batchId') as string),
      facultyId: parseInt(formData.get('facultyId') as string),
      date: formData.get('date') as string,
      startTime: formData.get('startTime') as string,
      endTime: formData.get('endTime') as string,
      topic: formData.get('topic') as string || undefined,
      isBackup: formData.get('isBackup') === 'true',
    };
    createSessionMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-orange-600 to-orange-500 px-8 py-6">
            <div className="flex justify-between items-center">
               <div>
                 <h1 className="text-3xl font-bold text-white">Session Management</h1>
                 <p className="mt-2 text-orange-100">Manage class sessions</p>
               </div>
              {(user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'faculty') && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-4 py-2 bg-white text-orange-600 rounded-lg font-semibold hover:bg-orange-50 transition-colors"
                >
                  + Create Session
                </button>
              )}
            </div>
          </div>

          <div className="p-6">
            {/* Filters */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Filter by Batch</label>
                <select
                  value={filterBatchId}
                  onChange={(e) => setFilterBatchId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">All Batches</option>
                  {batches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Filter by Faculty</label>
                <select
                  value={filterFacultyId}
                  onChange={(e) => setFilterFacultyId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">All Faculty</option>
                  {faculty.map((fac) => (
                    <option key={fac.id} value={fac.id}>
                      {fac.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Filter by Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">All Status</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Summary Stats */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold text-blue-600">{sessions.length}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {sessions.filter(s => s.status === 'completed').length}
                </p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Ongoing</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {sessions.filter(s => s.status === 'ongoing').length}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Scheduled</p>
                <p className="text-2xl font-bold text-gray-600">
                  {sessions.filter(s => s.status === 'scheduled').length}
                </p>
              </div>
            </div>

            {sessions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No sessions found</p>
                <p className="text-sm text-gray-400 mt-2">Try adjusting your filters or create a new session</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Faculty</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Topic</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sessions.map((session) => (
                      <tr key={session.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{new Date(session.date).toLocaleDateString()}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{session.startTime} - {session.endTime}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{session.batch?.title || `Batch ${session.batchId}`}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{session.faculty?.name || `Faculty ${session.facultyId}`}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-500">{session.topic || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            session.status === 'completed' ? 'bg-green-100 text-green-800' :
                            session.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
                            session.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {session.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            {session.status === 'scheduled' && (user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'faculty') && (
                              <button
                                onClick={() => checkInMutation.mutate(session.id)}
                                disabled={checkInMutation.isPending}
                                className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors disabled:opacity-50 text-xs"
                              >
                                Check In
                              </button>
                            )}
                            {session.status === 'ongoing' && (user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'faculty') && (
                              <>
                                <button
                                  onClick={() => checkOutMutation.mutate(session.id)}
                                  disabled={checkOutMutation.isPending}
                                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 text-xs"
                                >
                                  Check Out
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedSession(session);
                                    setIsAttendanceModalOpen(true);
                                  }}
                                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs"
                                >
                                  View Attendance
                                </button>
                              </>
                            )}
                            {(session.status === 'completed' || session.status === 'ongoing') && (
                              <button
                                onClick={() => {
                                  setSelectedSession(session);
                                  setIsAttendanceModalOpen(true);
                                }}
                                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs"
                              >
                                View Attendance
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Session Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Create New Session</h2>
            <form onSubmit={handleCreateSession}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Batch *</label>
                <select
                  name="batchId"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select a batch</option>
                  {batches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Faculty *</label>
                <select
                  name="facultyId"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select a faculty</option>
                  {faculty.map((fac) => (
                    <option key={fac.id} value={fac.id}>
                      {fac.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  name="date"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
                <input
                  type="time"
                  name="startTime"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
                <input
                  type="time"
                  name="endTime"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                <input
                  type="text"
                  name="topic"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="isBackup"
                    value="true"
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Is Backup Session</span>
                </label>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={createSessionMutation.isPending}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  {createSessionMutation.isPending ? 'Creating...' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {isAttendanceModalOpen && selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-2xl font-bold">Session Attendance</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedSession.batch?.title} - {new Date(selectedSession.date).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsAttendanceModalOpen(false);
                  setSelectedSession(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {isLoadingAttendance ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
              </div>
            ) : attendanceData?.data.attendances && attendanceData.data.attendances.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marked At</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {attendanceData.data.attendances.map((attendance) => (
                      <tr key={attendance.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {attendance.student?.name || `Student ${attendance.studentId}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {attendance.student?.email || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            attendance.status === 'present' || attendance.status === 'manual_present'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {attendance.status === 'manual_present' ? 'Present (Manual)' : attendance.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {attendance.isManual ? 'Manual' : 'Automatic'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {attendance.markedAt ? new Date(attendance.markedAt).toLocaleString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 text-sm text-gray-600">
                  Total: {attendanceData.data.attendances.length} attendance records
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No attendance records found for this session</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
};

