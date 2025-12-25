import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { facultyAPI, FacultyUser } from '../api/faculty.api';
import { userAPI } from '../api/user.api';
import { uploadAPI } from '../api/upload.api';
import { getImageUrl } from '../utils/imageUtils';
import { formatDateDDMMYYYY } from '../utils/dateUtils';

export const FacultyManagement: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedFaculty, setSelectedFaculty] = useState<FacultyUser | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch faculty
  const { data: facultyData, isLoading, error: facultyError } = useQuery({
    queryKey: ['faculty'],
    queryFn: () => facultyAPI.getAllFaculty(),
    retry: 1,
  });

  // Fetch full faculty data with profile for view modal
  const { data: facultyProfileData, isLoading: isLoadingProfile, error: profileError, refetch: refetchFacultyProfile } = useQuery({
    queryKey: ['faculty-profile', selectedFaculty?.id],
    queryFn: async () => {
      if (!selectedFaculty?.id) {
        console.warn('No faculty ID provided for profile fetch');
        return null;
      }
      
      // Always fetch fresh data from backend to ensure we get complete profile
      try {
        const userResponse = await userAPI.getUser(selectedFaculty.id);
        console.log('Faculty profile API response:', userResponse);
        if (userResponse?.data?.user) {
          const user = userResponse.data.user;
          let profile = user.facultyProfile || null;
          
          // If profile exists but might be incomplete, ensure we have all data
          // The profile should already be included in the user response
          if (profile && typeof profile === 'object') {
            // Profile is already included, use it
            console.log('Faculty user data:', user);
            console.log('Faculty profile data:', profile);
            console.log('Profile documents:', profile.documents);
            return {
              user: user,
              profile: profile,
            };
          }
          
          // If profile is missing, try to get it from the selected faculty
          if (!profile && selectedFaculty.facultyProfile) {
            profile = selectedFaculty.facultyProfile;
          }
          
          return {
            user: user,
            profile: profile,
          };
        }
        // Fallback to existing data
        console.warn('Unexpected response structure, using fallback faculty data:', selectedFaculty);
        return {
          user: selectedFaculty,
          profile: selectedFaculty.facultyProfile || null,
        };
      } catch (error: any) {
        console.error('Error fetching faculty profile:', error);
        // Return existing data as fallback
        console.warn('Using fallback faculty data due to error:', error?.message);
        return {
          user: selectedFaculty,
          profile: selectedFaculty.facultyProfile || null,
        };
      }
    },
    enabled: !!selectedFaculty?.id && isViewModalOpen,
    retry: 2, // Retry more times to ensure we get data
    staleTime: 0, // Always refetch when modal opens
    gcTime: 0, // Don't cache, always get fresh data
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  // Refresh faculty profile when view modal opens
  React.useEffect(() => {
    if (isViewModalOpen && selectedFaculty) {
      // Invalidate and refetch the faculty profile data
      queryClient.invalidateQueries({ queryKey: ['faculty-profile', selectedFaculty.id] });
      queryClient.invalidateQueries({ queryKey: ['faculty', selectedFaculty.id] });
      queryClient.invalidateQueries({ queryKey: ['faculty'] });
      queryClient.invalidateQueries({ queryKey: ['users', selectedFaculty.id] });
      // Refetch the profile data after a short delay to ensure invalidation is processed
      setTimeout(() => {
        refetchFacultyProfile();
      }, 100);
    }
  }, [isViewModalOpen, selectedFaculty, queryClient, refetchFacultyProfile]);

  // Also refresh when component mounts (useful when returning from edit page)
  React.useEffect(() => {
    // Invalidate queries on mount to ensure fresh data
    queryClient.invalidateQueries({ queryKey: ['faculty'] });
  }, [queryClient]);

  const deleteUserMutation = useMutation({
    mutationFn: (id: number) => userAPI.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faculty'] });
      setIsDeleteModalOpen(false);
      setSelectedFaculty(null);
      alert('Faculty deleted successfully!');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to delete faculty');
    },
  });

  const updateUserImageMutation = useMutation({
    mutationFn: ({ userId, avatarUrl }: { userId: number; avatarUrl: string }) =>
      userAPI.updateUser(userId, { avatarUrl }),
    onSuccess: (_, variables) => {
      // Invalidate and refetch faculty list
      queryClient.invalidateQueries({ queryKey: ['faculty'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      // Update the selected faculty's avatarUrl immediately
      if (selectedFaculty) {
        setSelectedFaculty({ ...selectedFaculty, avatarUrl: variables.avatarUrl });
      }
      setUploadingImage(false);
      setIsImageModalOpen(false);
      setSelectedFaculty(null);
      setImagePreview(null);
      alert('Image updated successfully!');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to update image');
      setUploadingImage(false);
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedFaculty) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setUploadingImage(true);
    try {
      const uploadResponse = await uploadAPI.uploadFile(file);
      console.log('Upload response:', uploadResponse);
      if (uploadResponse.data && uploadResponse.data.files && uploadResponse.data.files.length > 0) {
        const imageUrl = uploadResponse.data.files[0].url;
        console.log('Uploaded image URL:', imageUrl);
        // Get cleaned full URL for preview
        const fullImageUrl = getImageUrl(imageUrl) || imageUrl;
        // Update preview with the cleaned full URL
        setImagePreview(fullImageUrl);
        // Update user with relative URL (backend will serve it)
        updateUserImageMutation.mutate({
          userId: selectedFaculty.id,
          avatarUrl: imageUrl,
        });
      } else {
        throw new Error('No files returned from upload');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      alert(error.response?.data?.message || error.message || 'Failed to upload image');
      setUploadingImage(false);
      setImagePreview(null);
    }
  };

  const allFaculty = facultyData?.data.users || [];
  
  // Filter faculty based on search query
  const faculty = allFaculty.filter((facultyMember) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      facultyMember.name?.toLowerCase().includes(query) ||
      facultyMember.email?.toLowerCase().includes(query) ||
      facultyMember.phone?.toLowerCase().includes(query)
    );
  });

  const handleDelete = (facultyMember: FacultyUser) => {
    setSelectedFaculty(facultyMember);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedFaculty) {
      deleteUserMutation.mutate(selectedFaculty.id);
    }
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

  if (facultyError) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto">
          <div className="bg-white shadow-xl rounded-lg p-6">
            <div className="text-center py-12">
              <p className="text-red-600 text-lg mb-4">Error loading faculty data</p>
              <p className="text-gray-500 text-sm">
                {(facultyError as any)?.response?.data?.message || (facultyError as any)?.message || 'Unknown error'}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-orange-600 to-orange-500 px-4 md:px-8 py-4 md:py-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">Faculty Management</h1>
                <p className="mt-2 text-sm md:text-base text-orange-100">Manage faculty members</p>
              </div>
              {(user?.role === 'admin' || user?.role === 'superadmin') && (
                <button
                  onClick={() => window.location.href = '/faculty/register'}
                  className="px-4 py-2 bg-white text-orange-600 rounded-lg font-semibold hover:bg-orange-50 transition-colors text-sm md:text-base whitespace-nowrap"
                >
                  + New Faculty Registration
                </button>
              )}
            </div>
          </div>

          <div className="p-4 md:p-6">
            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search faculty by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {searchQuery && (
                <p className="mt-2 text-sm text-gray-600">
                  Showing {faculty.length} of {allFaculty.length} faculty members
                </p>
              )}
            </div>

            {faculty.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">
                  {searchQuery ? 'No faculty members found matching your search' : 'No faculty members found'}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-2 text-orange-600 hover:text-orange-700 text-sm"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S.No</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Photo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expertise</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Availability</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      {(user?.role === 'admin' || user?.role === 'superadmin') && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {faculty.map((facultyMember, index) => (
                      <tr key={facultyMember.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{index + 1}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {facultyMember.avatarUrl ? (
                              <img
                                src={getImageUrl(facultyMember.avatarUrl) || ''}
                                alt={facultyMember.name}
                                className="h-12 w-12 rounded-full object-cover border-2 border-gray-200"
                                crossOrigin="anonymous"
                                key={facultyMember.avatarUrl}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2ZmOTUwMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiNmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj57e2ZhY3VsdHlNZW1iZXIubmFtZS5jaGFyQXQoMCl9fTwvdGV4dD48L3N2Zz4=';
                                }}
                              />
                            ) : (
                              <div className="h-12 w-12 rounded-full bg-orange-500 flex items-center justify-center text-white font-semibold text-lg">
                                {facultyMember.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{facultyMember.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{facultyMember.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{facultyMember.phone || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{facultyMember.facultyProfile?.expertise || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{facultyMember.facultyProfile?.availability || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            facultyMember.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {facultyMember.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        {(user?.role === 'admin' || user?.role === 'superadmin') && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex flex-col gap-2">
                              <button
                                onClick={() => {
                                  setSelectedFaculty(facultyMember);
                                  setIsViewModalOpen(true);
                                }}
                                className="text-blue-600 hover:text-blue-900 text-xs"
                                title="View Faculty"
                              >
                                👁️ View
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedFaculty(facultyMember);
                                  setImagePreview(facultyMember.avatarUrl || null);
                                  setIsImageModalOpen(true);
                                }}
                                className="text-orange-600 hover:text-orange-900 text-xs"
                                title="Update Photo"
                              >
                                📷 Update Photo
                              </button>
                              <button
                                onClick={() => navigate(`/faculty/${facultyMember.id}/edit`)}
                                className="text-orange-600 hover:text-orange-900 text-xs"
                                title="Edit Faculty"
                              >
                                ✏️ Edit
                              </button>
                              {user?.role === 'superadmin' && (
                                <button
                                  onClick={() => handleDelete(facultyMember)}
                                  className="text-red-600 hover:text-red-900 text-xs"
                                  title="Delete Faculty"
                                >
                                  🗑️ Delete
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedFaculty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4 text-red-600">Delete Faculty</h2>
            <p className="mb-4 text-gray-700">
              Are you sure you want to delete <strong>{selectedFaculty.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleConfirmDelete}
                disabled={deleteUserMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 text-sm sm:text-base"
              >
                {deleteUserMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedFaculty(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors text-sm sm:text-base"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Upload Modal */}
      {isImageModalOpen && selectedFaculty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Update Faculty Photo</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Faculty:</strong> {selectedFaculty.name}
              </p>
              <div className="flex justify-center mb-4">
                {imagePreview ? (
                  <img
                    src={imagePreview.startsWith('data:') ? imagePreview : (getImageUrl(imagePreview) || imagePreview)}
                    alt="Preview"
                    className="h-32 w-32 rounded-full object-cover border-4 border-orange-500"
                    key={imagePreview}
                    crossOrigin="anonymous"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZmY5NTAwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSI0OCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPnt7c2VsZWN0ZWRGYWN1bHR5Lm5hbWUuY2hhckF0KDApfX08L3RleHQ+PC9zdmc+';
                    }}
                  />
                ) : selectedFaculty?.avatarUrl ? (
                  <img
                    src={getImageUrl(selectedFaculty.avatarUrl) || ''}
                    alt="Current"
                    className="h-32 w-32 rounded-full object-cover border-4 border-orange-500"
                    crossOrigin="anonymous"
                    key={selectedFaculty.avatarUrl}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZmY5NTAwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSI0OCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPnt7c2VsZWN0ZWRGYWN1bHR5Lm5hbWUuY2hhckF0KDApfX08L3RleHQ+PC9zdmc+';
                    }}
                  />
                ) : (
                  <div className="h-32 w-32 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400">No image</span>
                  </div>
                )}
              </div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Image (JPG, PNG - Max 5MB)
              </label>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                onChange={handleImageUpload}
                disabled={uploadingImage}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsImageModalOpen(false);
                  setSelectedFaculty(null);
                  setImagePreview(null);
                }}
                disabled={uploadingImage}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                {uploadingImage ? 'Uploading...' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Faculty Modal */}
      {isViewModalOpen && selectedFaculty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
              <h2 className="text-2xl font-bold text-gray-900">Faculty Details</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    // Invalidate all related queries first
                    queryClient.invalidateQueries({ queryKey: ['faculty-profile', selectedFaculty?.id] });
                    queryClient.invalidateQueries({ queryKey: ['faculty', selectedFaculty?.id] });
                    queryClient.invalidateQueries({ queryKey: ['faculty'] });
                    queryClient.invalidateQueries({ queryKey: ['users', selectedFaculty?.id] });
                    // Then refetch
                    await refetchFacultyProfile();
                  }}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  title="Refresh Faculty Data"
                >
                  🔄 Refresh
                </button>
                <button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    setSelectedFaculty(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6">
              {isLoadingProfile ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Loading faculty details...</p>
                </div>
              ) : profileError ? (
                <div className="text-center py-8">
                  <p className="text-red-600 font-semibold mb-2">Failed to load faculty details</p>
                  <p className="text-sm text-gray-600 mb-4">
                    {(profileError as any)?.response?.data?.message || (profileError as any)?.message || 'An error occurred while fetching faculty details'}
                  </p>
                  <button
                    onClick={() => {
                      queryClient.invalidateQueries({ queryKey: ['faculty-profile', selectedFaculty?.id] });
                      refetchFacultyProfile();
                    }}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                  >
                    Retry
                  </button>
                </div>
              ) : facultyProfileData && facultyProfileData.user ? (
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Photo</label>
                        <div className="mt-2">
                          {facultyProfileData.user.avatarUrl ? (
                            <img
                              src={getImageUrl(facultyProfileData.user.avatarUrl) || ''}
                              alt={facultyProfileData.user.name}
                              className="h-24 w-24 rounded-full object-cover border-2 border-gray-200"
                              crossOrigin="anonymous"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2ZmOTUwMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMzYiIGZpbGw9IiNmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj57e2ZhY3VsdHlQcm9maWxlRGF0YS51c2VyLm5hbWUuY2hhckF0KDApfX08L3RleHQ+PC9zdmc+';
                              }}
                            />
                          ) : (
                            <div className="h-24 w-24 rounded-full bg-orange-500 flex items-center justify-center text-white font-semibold text-2xl">
                              {facultyProfileData.user.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Name</label>
                        <p className="mt-1 text-sm text-gray-900">{facultyProfileData.user.name}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <p className="mt-1 text-sm text-gray-900">{facultyProfileData.user.email}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Phone</label>
                        <p className="mt-1 text-sm text-gray-900">{facultyProfileData.user.phone || '-'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Status</label>
                        <p className="mt-1">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            facultyProfileData.user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {facultyProfileData.user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Faculty Profile Information */}
                  {facultyProfileData.profile ? (
                    <>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Faculty Profile</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {facultyProfileData.profile.expertise && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Expertise</label>
                              <p className="mt-1 text-sm text-gray-900">
                                {typeof facultyProfileData.profile.expertise === 'string' 
                                  ? facultyProfileData.profile.expertise 
                                  : JSON.stringify(facultyProfileData.profile.expertise)}
                              </p>
                            </div>
                          )}
                          {facultyProfileData.profile.availability && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Availability</label>
                              <p className="mt-1 text-sm text-gray-900">
                                {typeof facultyProfileData.profile.availability === 'string' 
                                  ? facultyProfileData.profile.availability 
                                  : JSON.stringify(facultyProfileData.profile.availability)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Parse and display additional profile information from documents */}
                      {(() => {
                        const documents = facultyProfileData.profile?.documents;
                        let parsedDocuments: any = null;
                        
                        if (documents) {
                          if (typeof documents === 'string') {
                            try {
                              parsedDocuments = JSON.parse(documents);
                            } catch (e) {
                              console.error('Error parsing documents:', e);
                            }
                          } else if (typeof documents === 'object' && documents !== null) {
                            parsedDocuments = documents;
                          }
                        }

                        const personalInfo = parsedDocuments?.personalInfo || {};
                        const employmentInfo = parsedDocuments?.employmentInfo || {};
                        const bankInfo = parsedDocuments?.bankInfo || {};
                        const emergencyInfo = parsedDocuments?.emergencyInfo || {};
                        const softwareProficiency = parsedDocuments?.softwareProficiency || '';
                        
                        // Also check profile.dateOfBirth if not in personalInfo
                        if (!personalInfo.dateOfBirth && facultyProfileData.profile?.dateOfBirth) {
                          personalInfo.dateOfBirth = facultyProfileData.profile.dateOfBirth;
                        }

                        const hasPersonalInfo = Object.keys(personalInfo).length > 0 || !!facultyProfileData.profile?.dateOfBirth;
                        const hasEmploymentInfo = Object.keys(employmentInfo).length > 0;
                        const hasBankInfo = Object.keys(bankInfo).length > 0;
                        const hasEmergencyInfo = Object.keys(emergencyInfo).length > 0;
                        const hasSoftware = softwareProficiency && softwareProficiency.trim() !== '';
                        const hasExpertise = !!facultyProfileData.profile?.expertise;
                        const hasAvailability = !!facultyProfileData.profile?.availability;

                        if (!hasPersonalInfo && !hasEmploymentInfo && !hasBankInfo && !hasEmergencyInfo && !hasSoftware && !hasExpertise && !hasAvailability) {
                          return null;
                        }

                        return (
                          <>
                            {/* Personal Information */}
                            {hasPersonalInfo && (
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Personal Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {personalInfo.gender && (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700">Gender</label>
                                      <p className="mt-1 text-sm text-gray-900">{personalInfo.gender}</p>
                                    </div>
                                  )}
                                  {(personalInfo.dateOfBirth || facultyProfileData.profile?.dateOfBirth) && (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                                      <p className="mt-1 text-sm text-gray-900">
                                        {formatDateDDMMYYYY(personalInfo.dateOfBirth || facultyProfileData.profile?.dateOfBirth)}
                                      </p>
                                    </div>
                                  )}
                                  {personalInfo.nationality && (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700">Nationality</label>
                                      <p className="mt-1 text-sm text-gray-900">{personalInfo.nationality}</p>
                                    </div>
                                  )}
                                  {personalInfo.maritalStatus && (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700">Marital Status</label>
                                      <p className="mt-1 text-sm text-gray-900">{personalInfo.maritalStatus}</p>
                                    </div>
                                  )}
                                  {personalInfo.address && (
                                    <div className="md:col-span-2">
                                      <label className="block text-sm font-medium text-gray-700">Address</label>
                                      <p className="mt-1 text-sm text-gray-900">{personalInfo.address}</p>
                                    </div>
                                  )}
                                  {personalInfo.city && (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700">City</label>
                                      <p className="mt-1 text-sm text-gray-900">{personalInfo.city}</p>
                                    </div>
                                  )}
                                  {personalInfo.state && (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700">State</label>
                                      <p className="mt-1 text-sm text-gray-900">{personalInfo.state}</p>
                                    </div>
                                  )}
                                  {personalInfo.postalCode && (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700">Postal Code</label>
                                      <p className="mt-1 text-sm text-gray-900">{personalInfo.postalCode}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Employment Information */}
                            {hasEmploymentInfo && (
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Employment Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {employmentInfo.department && (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700">Department</label>
                                      <p className="mt-1 text-sm text-gray-900">{employmentInfo.department}</p>
                                    </div>
                                  )}
                                  {employmentInfo.designation && (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700">Designation</label>
                                      <p className="mt-1 text-sm text-gray-900">{employmentInfo.designation}</p>
                                    </div>
                                  )}
                                  {employmentInfo.dateOfJoining && (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700">Date of Joining</label>
                                      <p className="mt-1 text-sm text-gray-900">{formatDateDDMMYYYY(employmentInfo.dateOfJoining)}</p>
                                    </div>
                                  )}
                                  {employmentInfo.employmentType && (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700">Employment Type</label>
                                      <p className="mt-1 text-sm text-gray-900">{employmentInfo.employmentType}</p>
                                    </div>
                                  )}
                                  {employmentInfo.reportingManager && (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700">Reporting Manager</label>
                                      <p className="mt-1 text-sm text-gray-900">{employmentInfo.reportingManager}</p>
                                    </div>
                                  )}
                                  {employmentInfo.workLocation && (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700">Work Location</label>
                                      <p className="mt-1 text-sm text-gray-900">{employmentInfo.workLocation}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Bank Information */}
                            {hasBankInfo && (
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Bank Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {bankInfo.bankName && (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700">Bank Name</label>
                                      <p className="mt-1 text-sm text-gray-900">{bankInfo.bankName}</p>
                                    </div>
                                  )}
                                  {bankInfo.accountNumber && (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700">Account Number</label>
                                      <p className="mt-1 text-sm text-gray-900">{bankInfo.accountNumber}</p>
                                    </div>
                                  )}
                                  {bankInfo.ifscCode && (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700">IFSC Code</label>
                                      <p className="mt-1 text-sm text-gray-900">{bankInfo.ifscCode}</p>
                                    </div>
                                  )}
                                  {bankInfo.branch && (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700">Branch</label>
                                      <p className="mt-1 text-sm text-gray-900">{bankInfo.branch}</p>
                                    </div>
                                  )}
                                  {bankInfo.panNumber && (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700">PAN Number</label>
                                      <p className="mt-1 text-sm text-gray-900">{bankInfo.panNumber}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Emergency Contact Information */}
                            {hasEmergencyInfo && (
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Emergency Contact</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {(emergencyInfo.emergencyContactName || emergencyInfo.name) && (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700">Emergency Contact Name</label>
                                      <p className="mt-1 text-sm text-gray-900">{emergencyInfo.emergencyContactName || emergencyInfo.name}</p>
                                    </div>
                                  )}
                                  {(emergencyInfo.emergencyPhoneNumber || emergencyInfo.number) && (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700">Emergency Contact Number</label>
                                      <p className="mt-1 text-sm text-gray-900">{emergencyInfo.emergencyPhoneNumber || emergencyInfo.number}</p>
                                    </div>
                                  )}
                                  {(emergencyInfo.emergencyRelationship || emergencyInfo.relation) && (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700">Relationship</label>
                                      <p className="mt-1 text-sm text-gray-900">{emergencyInfo.emergencyRelationship || emergencyInfo.relation}</p>
                                    </div>
                                  )}
                                  {emergencyInfo.emergencyAlternatePhone && (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700">Alternate Phone Number</label>
                                      <p className="mt-1 text-sm text-gray-900">{emergencyInfo.emergencyAlternatePhone}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Software Proficiency */}
                            {hasSoftware && (
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Software Proficiency</h3>
                                <div className="flex flex-wrap gap-2">
                                  {softwareProficiency.split(',').map((software: string, idx: number) => (
                                    <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                                      {software.trim()}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </>
                  ) : (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Profile Details</h3>
                      <div className="text-center py-8 bg-gray-50 rounded-lg">
                        <p className="text-gray-500">No faculty profile information available.</p>
                        <p className="text-sm text-gray-400 mt-2">Please edit the faculty to add profile information.</p>
                      </div>
                    </div>
                  )}

                  {/* Documents Section */}
                  {(() => {
                    // Only show documents section if profile exists
                    if (!facultyProfileData.profile) {
                      return null;
                    }

                    const documents = facultyProfileData.profile?.documents;
                    let parsedDocuments: any = null;
                    
                    if (documents) {
                      if (typeof documents === 'string') {
                        try {
                          parsedDocuments = JSON.parse(documents);
                        } catch (e) {
                          console.error('Error parsing documents:', e);
                        }
                      } else if (typeof documents === 'object') {
                        parsedDocuments = documents;
                      }
                    }

                    if (parsedDocuments && (
                      parsedDocuments.photo || 
                      parsedDocuments.panCard || 
                      parsedDocuments.aadharCard || 
                      (parsedDocuments.otherDocuments && Array.isArray(parsedDocuments.otherDocuments) && parsedDocuments.otherDocuments.length > 0)
                    )) {
                      return (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Documents</h3>
                          <div className="space-y-4">
                            {/* Photo */}
                            {parsedDocuments.photo && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Photo</label>
                                <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                  <div className="flex-shrink-0">
                                    {parsedDocuments.photo.url && (
                                      <img
                                        src={getImageUrl(parsedDocuments.photo.url) || ''}
                                        alt="Photo"
                                        className="h-16 w-16 object-cover rounded border border-gray-300"
                                        crossOrigin="anonymous"
                                      />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{parsedDocuments.photo.name || 'Photo'}</p>
                                    <p className="text-xs text-gray-500">Image File</p>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    {parsedDocuments.photo.url && (
                                      <>
                                        <a
                                          href={getImageUrl(parsedDocuments.photo.url) || ''}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded hover:bg-blue-50"
                                        >
                                          👁️ View
                                        </a>
                                        <a
                                          href={getImageUrl(parsedDocuments.photo.url) || ''}
                                          download
                                          className="px-3 py-1.5 text-sm text-green-600 hover:text-green-800 border border-green-300 rounded hover:bg-green-50"
                                        >
                                          ⬇️ Download
                                        </a>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* PAN Card */}
                            {parsedDocuments.panCard && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">PAN Card</label>
                                <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                  <div className="flex-shrink-0">
                                    {parsedDocuments.panCard.url && (
                                      <img
                                        src={getImageUrl(parsedDocuments.panCard.url) || ''}
                                        alt="PAN Card"
                                        className="h-16 w-16 object-cover rounded border border-gray-300"
                                        crossOrigin="anonymous"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                        }}
                                      />
                                    )}
                                    <div className="h-16 w-16 bg-gray-200 rounded border border-gray-300 flex items-center justify-center hidden">
                                      <span className="text-2xl">📄</span>
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{parsedDocuments.panCard.name || 'PAN Card'}</p>
                                    <p className="text-xs text-gray-500">
                                      {parsedDocuments.panCard.url?.endsWith('.pdf') ? 'PDF Document' : 'Image File'}
                                    </p>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    {parsedDocuments.panCard.url && (
                                      <>
                                        <a
                                          href={getImageUrl(parsedDocuments.panCard.url) || ''}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded hover:bg-blue-50"
                                        >
                                          👁️ View
                                        </a>
                                        <a
                                          href={getImageUrl(parsedDocuments.panCard.url) || ''}
                                          download
                                          className="px-3 py-1.5 text-sm text-green-600 hover:text-green-800 border border-green-300 rounded hover:bg-green-50"
                                        >
                                          ⬇️ Download
                                        </a>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Aadhar Card */}
                            {parsedDocuments.aadharCard && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Aadhar Card</label>
                                <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                  <div className="flex-shrink-0">
                                    {parsedDocuments.aadharCard.url && (
                                      <img
                                        src={getImageUrl(parsedDocuments.aadharCard.url) || ''}
                                        alt="Aadhar Card"
                                        className="h-16 w-16 object-cover rounded border border-gray-300"
                                        crossOrigin="anonymous"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                        }}
                                      />
                                    )}
                                    <div className="h-16 w-16 bg-gray-200 rounded border border-gray-300 flex items-center justify-center hidden">
                                      <span className="text-2xl">📄</span>
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{parsedDocuments.aadharCard.name || 'Aadhar Card'}</p>
                                    <p className="text-xs text-gray-500">
                                      {parsedDocuments.aadharCard.url?.endsWith('.pdf') ? 'PDF Document' : 'Image File'}
                                    </p>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    {parsedDocuments.aadharCard.url && (
                                      <>
                                        <a
                                          href={getImageUrl(parsedDocuments.aadharCard.url) || ''}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded hover:bg-blue-50"
                                        >
                                          👁️ View
                                        </a>
                                        <a
                                          href={getImageUrl(parsedDocuments.aadharCard.url) || ''}
                                          download
                                          className="px-3 py-1.5 text-sm text-green-600 hover:text-green-800 border border-green-300 rounded hover:bg-green-50"
                                        >
                                          ⬇️ Download
                                        </a>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Other Documents */}
                            {parsedDocuments.otherDocuments && Array.isArray(parsedDocuments.otherDocuments) && parsedDocuments.otherDocuments.length > 0 && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Other Documents</label>
                                <div className="space-y-2">
                                  {parsedDocuments.otherDocuments.map((doc: any, docIndex: number) => {
                                    const docUrl = typeof doc === 'string' ? doc : doc.url;
                                    const docName = typeof doc === 'string' ? `Document ${docIndex + 1}` : (doc.name || `Document ${docIndex + 1}`);
                                    const fullUrl = getImageUrl(docUrl) || '';
                                    const isPdf = docUrl?.endsWith('.pdf') || docUrl?.includes('application/pdf');
                                    const isImage = docUrl?.match(/\.(jpg|jpeg|png|gif|webp)$/i);

                                    return (
                                      <div key={docIndex} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                        <div className="flex-shrink-0">
                                          {isImage && docUrl ? (
                                            <img
                                              src={fullUrl}
                                              alt={docName}
                                              className="h-16 w-16 object-cover rounded border border-gray-300"
                                              crossOrigin="anonymous"
                                              onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                              }}
                                            />
                                          ) : (
                                            <div className="h-16 w-16 bg-gray-200 rounded border border-gray-300 flex items-center justify-center">
                                              <span className="text-2xl">{isPdf ? '📄' : '📎'}</span>
                                            </div>
                                          )}
                                          <div className="h-16 w-16 bg-gray-200 rounded border border-gray-300 flex items-center justify-center hidden">
                                            <span className="text-2xl">📎</span>
                                          </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-gray-900 truncate" title={docName}>
                                            {docName}
                                          </p>
                                          <p className="text-xs text-gray-500 mt-0.5">
                                            {isPdf ? 'PDF Document' : isImage ? 'Image File' : 'Document'}
                                          </p>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <a
                                            href={fullUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded hover:bg-blue-50"
                                            title="View Document"
                                          >
                                            👁️ View
                                          </a>
                                          <a
                                            href={fullUrl}
                                            download
                                            className="px-3 py-1.5 text-sm text-green-600 hover:text-green-800 border border-green-300 rounded hover:bg-green-50"
                                            title="Download Document"
                                          >
                                            ⬇️ Download
                                          </a>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    // Show message when profile exists but no documents
                    return (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Documents</h3>
                        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-gray-500 mb-2">No documents uploaded for this faculty.</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Failed to load faculty details.</p>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end">
              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  setSelectedFaculty(null);
                }}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

