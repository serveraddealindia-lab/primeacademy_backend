import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { userAPI, UpdateUserRequest, UpdateStudentProfileRequest } from '../api/user.api';

export const StudentEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  console.log('StudentEdit component rendered, id:', id, 'user:', user);

  // Fetch student data
  const { data: studentData, isLoading, error: queryError } = useQuery({
    queryKey: ['student', id],
    queryFn: async () => {
      if (!id) {
        throw new Error('Student ID is required');
      }
      try {
        console.log('Fetching student data for ID:', id);
        const response = await userAPI.getUser(Number(id));
        console.log('User response:', response);
        if (response?.data?.user) {
          return response.data.user;
        } else {
          throw new Error('Invalid response structure');
        }
      } catch (error: any) {
        console.error('Error fetching student data:', error);
        console.error('Error response:', error.response?.data);
        throw error;
      }
    },
    enabled: !!id && !!user,
    retry: 1,
  });

  const [softwareListInput, setSoftwareListInput] = useState<string>('');

  const updateUserMutation = useMutation({
    mutationFn: (data: UpdateUserRequest) => userAPI.updateUser(Number(id!), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', id] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to update user information');
    },
  });

  const updateStudentProfileMutation = useMutation({
    mutationFn: (data: UpdateStudentProfileRequest) => userAPI.updateStudentProfile(Number(id!), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', id] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student-profile'] });
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to update student profile');
    },
  });

  // Check if user is loaded
  if (!user) {
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

  if (user?.role !== 'admin' && user?.role !== 'superadmin') {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto">
          <div className="bg-white shadow-xl rounded-lg p-6">
            <p className="text-red-600">You don't have permission to edit students.</p>
            <button
              onClick={() => navigate('/students')}
              className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              Back to Students
            </button>
          </div>
        </div>
      </Layout>
    );
  }

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

  if (queryError) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto">
          <div className="bg-white shadow-xl rounded-lg p-6">
            <p className="text-red-600">Error loading student data: {queryError instanceof Error ? queryError.message : 'Unknown error'}</p>
            <button
              onClick={() => navigate('/students')}
              className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              Back to Students
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (!studentData) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto">
          <div className="bg-white shadow-xl rounded-lg p-6">
            <p className="text-red-600">Student not found or data is still loading.</p>
            <p className="text-gray-500 mt-2">ID: {id}</p>
            <button
              onClick={() => navigate('/students')}
              className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              Back to Students
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // Helper function to format date for input
  const formatDateForInput = (dateString: string | undefined | null): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (e) {
      console.error('Error parsing date:', e);
    }
    return '';
  };

  React.useEffect(() => {
    if (studentData?.studentProfile?.softwareList && Array.isArray(studentData.studentProfile.softwareList)) {
      setSoftwareListInput(studentData.studentProfile.softwareList.join(', '));
    } else {
      setSoftwareListInput('');
    }
  }, [studentData]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!studentData) {
      alert('Student data is not loaded. Please try again.');
      return;
    }
    
    const formData = new FormData(e.currentTarget);
    
    // Update user information
    const userData: UpdateUserRequest = {
      name: formData.get('name') as string || undefined,
      email: formData.get('email') as string || undefined,
      phone: formData.get('phone') as string || undefined,
      isActive: formData.get('isActive') === 'true',
      avatarUrl: formData.get('avatarUrl') as string || undefined,
    };

    // Update student profile information
    const profileData: UpdateStudentProfileRequest = {
      dob: formData.get('dob') as string || undefined,
      address: formData.get('address') as string || undefined,
      photoUrl: formData.get('photoUrl') as string || undefined,
      softwareList: softwareListInput ? softwareListInput.split(',').map(s => s.trim()).filter(s => s.length > 0) : undefined,
      enrollmentDate: formData.get('enrollmentDate') as string || undefined,
      status: formData.get('profileStatus') as string || undefined,
    };

    try {
      await updateUserMutation.mutateAsync(userData);
      if (studentData?.studentProfile || Object.values(profileData).some(v => v !== undefined && v !== '')) {
        await updateStudentProfileMutation.mutateAsync(profileData);
      }
      alert('Student updated successfully!');
      navigate('/students');
    } catch (error) {
      // Error handling is done in mutation onError
      console.error('Error updating student:', error);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-orange-600 to-orange-500 px-8 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-white">Edit Student</h1>
                <p className="mt-2 text-orange-100">Update student information</p>
              </div>
              <button
                onClick={() => navigate('/students')}
                className="px-4 py-2 bg-white text-orange-600 rounded-lg font-semibold hover:bg-orange-50 transition-colors"
              >
                ← Back
              </button>
            </div>
          </div>

          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Student Photo */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-6">Student Photo</h2>
                <div className="flex items-center gap-6">
                  {(() => {
                    const photoUrl = studentData?.studentProfile?.photoUrl || studentData?.avatarUrl;
                    const studentName = studentData?.name || 'Student';
                    if (photoUrl) {
                      return (
                        <img
                          src={photoUrl}
                          alt={studentName}
                          className="w-32 h-32 rounded-full object-cover border-4 border-orange-500 shadow-lg"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(studentName) + '&background=orange&color=fff&size=128';
                          }}
                        />
                      );
                    } else {
                      return (
                        <div className="w-32 h-32 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-3xl shadow-lg">
                          {studentName.charAt(0).toUpperCase()}
                        </div>
                      );
                    }
                  })()}
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Avatar URL</label>
                    <input
                      type="url"
                      name="avatarUrl"
                      defaultValue={studentData?.avatarUrl || ''}
                      placeholder="https://example.com/photo.jpg"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">URL for student's profile photo</p>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo URL</label>
                    <input
                      type="url"
                      name="photoUrl"
                      defaultValue={studentData?.studentProfile?.photoUrl || ''}
                      placeholder="https://example.com/photo.jpg"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">Alternative photo URL in student profile</p>
                  </div>
                </div>
              </div>

              {/* Basic Information */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-6 border-b pb-2">Basic Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                    <input
                      type="text"
                      name="name"
                      defaultValue={studentData?.name || ''}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                    <input
                      type="email"
                      name="email"
                      defaultValue={studentData?.email || ''}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      defaultValue={studentData?.phone || ''}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Account Status *</label>
                    <select
                      name="isActive"
                      defaultValue={studentData?.isActive ? 'true' : 'false'}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                  {studentData?.createdAt && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Account Created</label>
                      <p className="text-sm text-gray-900 py-3">{new Date(studentData.createdAt).toLocaleString()}</p>
                    </div>
                  )}
                  {studentData?.updatedAt && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Last Updated</label>
                      <p className="text-sm text-gray-900 py-3">{new Date(studentData.updatedAt).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Student Profile Information */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-6 border-b pb-2">Student Profile Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                    <input
                      type="date"
                      name="dob"
                      defaultValue={formatDateForInput(studentData?.studentProfile?.dob)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Enrollment Date</label>
                    <input
                      type="date"
                      name="enrollmentDate"
                      defaultValue={formatDateForInput(studentData?.studentProfile?.enrollmentDate)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Profile Status</label>
                    <select
                      name="profileStatus"
                      defaultValue={studentData?.studentProfile?.status || ''}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Select Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="on-hold">On Hold</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                    <textarea
                      name="address"
                      rows={3}
                      defaultValue={studentData?.studentProfile?.address || ''}
                      placeholder="Enter full address"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Software List</label>
                    <input
                      type="text"
                      value={softwareListInput}
                      onChange={(e) => setSoftwareListInput(e.target.value)}
                      placeholder="Photoshop, Illustrator, InDesign (comma-separated)"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">Enter software names separated by commas</p>
                    {studentData?.studentProfile?.softwareList && Array.isArray(studentData.studentProfile.softwareList) && studentData.studentProfile.softwareList.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {studentData.studentProfile.softwareList.map((software: string, index: number) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {software}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {studentData?.studentProfile?.documents && Object.keys(studentData.studentProfile.documents).length > 0 && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Documents (Read-only)</label>
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <pre className="text-xs text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                          {JSON.stringify(studentData.studentProfile.documents, null, 2)}
                        </pre>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">Documents are managed through the enrollment process</p>
                    </div>
                  )}
                  {studentData?.studentProfile?.createdAt && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Profile Created</label>
                      <p className="text-sm text-gray-900 py-3">{new Date(studentData.studentProfile.createdAt).toLocaleString()}</p>
                    </div>
                  )}
                  {studentData?.studentProfile?.updatedAt && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Profile Updated</label>
                      <p className="text-sm text-gray-900 py-3">{new Date(studentData.studentProfile.updatedAt).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={updateUserMutation.isPending || updateStudentProfileMutation.isPending}
                  className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  {updateUserMutation.isPending || updateStudentProfileMutation.isPending ? 'Saving...' : 'Save All Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/students')}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
};

