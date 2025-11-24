import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { softwareCompletionAPI, SoftwareCompletion, SoftwareCompletionStatus, CreateCompletionRequest } from '../api/softwareCompletion.api';
import { batchAPI } from '../api/batch.api';
import { studentAPI } from '../api/student.api';

export const SoftwareCompletionManagement: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCompletion, setSelectedCompletion] = useState<SoftwareCompletion | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  // Fetch completions
  const { data: completionsData, isLoading } = useQuery({
    queryKey: ['software-completions', user?.role, user?.userId],
    queryFn: () => softwareCompletionAPI.getCompletions(),
  });

  // Fetch batches for dropdown
  const { data: batchesData } = useQuery({
    queryKey: ['batches'],
    queryFn: () => batchAPI.getAllBatches(),
  });

  // Fetch students for dropdown
  const { data: studentsData } = useQuery({
    queryKey: ['students'],
    queryFn: () => studentAPI.getAllStudents(),
  });

  const createCompletionMutation = useMutation({
    mutationFn: (data: CreateCompletionRequest) => softwareCompletionAPI.createCompletion(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['software-completions'] });
      setIsCreateModalOpen(false);
      alert('Software completion record created successfully!');
    },
  });

  const updateCompletionMutation = useMutation({
    mutationFn: ({ id, status, endDate }: { id: number; status?: 'in_progress' | 'completed'; endDate?: string }) =>
      softwareCompletionAPI.updateCompletion(id, { status, endDate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['software-completions'] });
      setIsUpdateModalOpen(false);
      setSelectedCompletion(null);
      alert('Software completion record updated successfully!');
    },
  });

  const completions = completionsData?.data.completions || [];
  const batches = batchesData?.data || [];
  const students = studentsData?.data?.students || [];

  const getStatusBadge = (status: SoftwareCompletionStatus) => {
    const colors = {
      [SoftwareCompletionStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
      [SoftwareCompletionStatus.COMPLETED]: 'bg-green-100 text-green-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors[status]}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const handleUpdate = (completion: SoftwareCompletion) => {
    setSelectedCompletion(completion);
    setIsUpdateModalOpen(true);
  };

  const handleSubmitUpdate = (status: 'in_progress' | 'completed', endDate?: string) => {
    if (selectedCompletion) {
      updateCompletionMutation.mutate({ id: selectedCompletion.id, status, endDate });
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-orange-600 to-orange-500 px-8 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-white">Software Completion Management</h1>
                <p className="mt-2 text-orange-100">Track software completion for students</p>
              </div>
              {(user?.role === 'faculty' || user?.role === 'admin' || user?.role === 'superadmin') && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-4 py-2 bg-white text-orange-600 rounded-lg font-semibold hover:bg-orange-50 transition-colors"
                >
                  + Add Completion
                </button>
              )}
            </div>
          </div>

          <div className="p-6">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Batch
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Software
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Faculty
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Start Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        End Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      {(user?.role === 'faculty' || user?.role === 'admin' || user?.role === 'superadmin') && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {completions.map((completion) => (
                      <tr key={completion.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{completion.student?.name}</div>
                          <div className="text-sm text-gray-500">{completion.student?.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {completion.batch?.title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {completion.softwareName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {completion.faculty?.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(completion.startDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(completion.endDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(completion.status)}</td>
                        {(user?.role === 'faculty' || user?.role === 'admin' || user?.role === 'superadmin') && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleUpdate(completion)}
                              className="text-orange-600 hover:text-orange-900"
                            >
                              Update
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {completions.length === 0 && (
                  <div className="text-center py-12 text-gray-500">No software completion records found</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Completion Modal */}
      {isCreateModalOpen && (
        <CreateCompletionModal
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={(data) => createCompletionMutation.mutate(data)}
          batches={batches}
          students={students}
          currentUser={user}
        />
      )}

      {/* Update Completion Modal */}
      {isUpdateModalOpen && selectedCompletion && (
        <UpdateCompletionModal
          completion={selectedCompletion}
          onClose={() => {
            setIsUpdateModalOpen(false);
            setSelectedCompletion(null);
          }}
          onSubmit={handleSubmitUpdate}
        />
      )}
    </Layout>
  );
};

// Create Completion Modal Component
const CreateCompletionModal: React.FC<{
  onClose: () => void;
  onSubmit: (data: CreateCompletionRequest) => void;
  batches: any[];
  students: any[];
  currentUser: any;
}> = ({ onClose, onSubmit, batches, students, currentUser }) => {
  const [formData, setFormData] = useState<CreateCompletionRequest>({
    studentId: 0,
    batchId: 0,
    softwareName: '',
    startDate: '',
    endDate: '',
    facultyId: currentUser?.role === 'faculty' ? currentUser.userId : 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.studentId && formData.batchId && formData.softwareName && formData.startDate && formData.endDate && formData.facultyId) {
      onSubmit(formData);
    } else {
      alert('Please fill in all required fields');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Add Software Completion</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
            <select
              value={formData.studentId}
              onChange={(e) => setFormData({ ...formData, studentId: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            >
              <option value="">Select Student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
            <select
              value={formData.batchId}
              onChange={(e) => setFormData({ ...formData, batchId: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            >
              <option value="">Select Batch</option>
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Software Name</label>
            <input
              type="text"
              value={formData.softwareName}
              onChange={(e) => setFormData({ ...formData, softwareName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          {currentUser?.role !== 'faculty' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Faculty</label>
              <input
                type="number"
                value={formData.facultyId}
                onChange={(e) => setFormData({ ...formData, facultyId: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Update Completion Modal Component
const UpdateCompletionModal: React.FC<{
  completion: SoftwareCompletion;
  onClose: () => void;
  onSubmit: (status: 'in_progress' | 'completed', endDate?: string) => void;
}> = ({ completion, onClose, onSubmit }) => {
  const [status, setStatus] = useState<'in_progress' | 'completed'>(completion.status);
  const [endDate, setEndDate] = useState(completion.endDate);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(status, endDate);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Update Software Completion</h2>
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            <strong>Student:</strong> {completion.student?.name}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Software:</strong> {completion.softwareName}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'in_progress' | 'completed')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              Update
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};






