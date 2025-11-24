import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { attendanceAPI, MarkAttendanceRequest } from '../api/attendance.api';
import { sessionAPI } from '../api/session.api';

export const AttendanceManagement: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [isMarkModalOpen, setIsMarkModalOpen] = useState(false);


  // Fetch sessions
  const { data: sessionsData } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => sessionAPI.getAllSessions(),
  });

  // Fetch attendance for selected session
  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ['attendance', selectedSessionId],
    queryFn: () => attendanceAPI.getSessionAttendance(selectedSessionId!),
    enabled: selectedSessionId !== null,
  });

  const markAttendanceMutation = useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: number; data: MarkAttendanceRequest }) =>
      attendanceAPI.markAttendance(sessionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', selectedSessionId] });
      setIsMarkModalOpen(false);
      alert('Attendance marked successfully!');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to mark attendance');
    },
  });

  const sessions = sessionsData?.data.sessions || [];
  const attendances = attendanceData?.data.attendances || [];

  const handleMarkAttendance = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedSessionId) return;
    const formData = new FormData(e.currentTarget);
    const data: MarkAttendanceRequest = {
      studentId: parseInt(formData.get('studentId') as string),
      status: formData.get('status') as 'present' | 'absent' | 'manual_present',
      isManual: formData.get('isManual') === 'true',
    };
    markAttendanceMutation.mutate({ sessionId: selectedSessionId, data });
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-orange-600 to-orange-500 px-8 py-6">
            <div>
              <h1 className="text-3xl font-bold text-white">Attendance Management</h1>
              <p className="mt-2 text-orange-100">Track attendance</p>
            </div>
          </div>

          <div className="p-6">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Session</label>
              <select
                value={selectedSessionId || ''}
                onChange={(e) => setSelectedSessionId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Select a session</option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {new Date(session.date).toLocaleDateString()} - {session.startTime} ({session.batch?.title || `Batch ${session.batchId}`})
                  </option>
                ))}
              </select>
            </div>

            {selectedSessionId && (
              <>
                {(user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'faculty') && (
                  <div className="mb-4">
                    <button
                      onClick={() => setIsMarkModalOpen(true)}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors"
                    >
                      + Mark Attendance
                    </button>
                  </div>
                )}

                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                  </div>
                ) : attendances.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 text-lg">No attendance records found for this session</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marked At</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {attendances.map((attendance) => (
                          <tr key={attendance.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{attendance.student?.name || `Student ${attendance.studentId}`}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{attendance.student?.email || '-'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                attendance.status === 'present' || attendance.status === 'manual_present'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {attendance.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                attendance.isManual ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {attendance.isManual ? 'Manual' : 'Auto'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                                {attendance.markedAt ? new Date(attendance.markedAt).toLocaleString() : '-'}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mark Attendance Modal */}
      {isMarkModalOpen && selectedSessionId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Mark Attendance</h2>
            <form onSubmit={handleMarkAttendance}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Student ID *</label>
                <input
                  type="number"
                  name="studentId"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                <select
                  name="status"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="manual_present">Manual Present</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="isManual"
                    value="true"
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Manual Marking</span>
                </label>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={markAttendanceMutation.isPending}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  {markAttendanceMutation.isPending ? 'Marking...' : 'Mark Attendance'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsMarkModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

