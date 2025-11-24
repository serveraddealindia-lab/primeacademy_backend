import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { portfolioAPI, Portfolio, CreatePortfolioRequest, ApprovePortfolioRequest } from '../api/portfolio.api';
import { studentAPI } from '../api/student.api';
import { batchAPI } from '../api/batch.api';
import { uploadAPI } from '../api/upload.api';

export const PortfolioManagement: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [imageLinks, setImageLinks] = useState<string[]>(['']);
  const [videoLinks, setVideoLinks] = useState<string[]>(['']);
  const [isUploading, setIsUploading] = useState(false);
  const addingImageLinkRef = useRef(false);
  const addingVideoLinkRef = useRef(false);

  // Fetch portfolios
  const { data: portfoliosData, isLoading } = useQuery({
    queryKey: ['portfolios'],
    queryFn: () => portfolioAPI.getAllPortfolios(),
  });

  // Fetch students and batches for form
  const { data: studentsData } = useQuery({
    queryKey: ['students'],
    queryFn: () => studentAPI.getAllStudents(),
  });

  const { data: batchesData } = useQuery({
    queryKey: ['batches'],
    queryFn: () => batchAPI.getAllBatches(),
  });

  const createPortfolioMutation = useMutation({
    mutationFn: ({ studentId, data }: { studentId: number; data: CreatePortfolioRequest }) =>
      portfolioAPI.createPortfolio(studentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      setIsCreateModalOpen(false);
      alert('Portfolio created successfully!');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to create portfolio');
    },
  });

  const approvePortfolioMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ApprovePortfolioRequest }) =>
      portfolioAPI.approvePortfolio(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      setIsApproveModalOpen(false);
      setSelectedPortfolio(null);
      alert('Portfolio status updated successfully!');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to update portfolio');
    },
  });

  const portfolios = portfoliosData?.data.portfolios || [];
  const students = studentsData?.data.students || [];
  const batches = batchesData?.data || [];

  const handleCreatePortfolio = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Collect image links
    const imageUrls = imageLinks
      .map(link => link.trim())
      .filter(link => link.length > 0);
    
    // Collect video links
    const videoUrls = videoLinks
      .map(link => link.trim())
      .filter(link => link.length > 0);
    
    // Validate that at least one link is provided
    if (imageUrls.length === 0 && videoUrls.length === 0) {
      alert('Please provide at least one image or video link');
      return;
    }
    
    // Build files array from image links (backend expects array of URLs)
    const filesArray = imageUrls.length > 0 ? imageUrls : undefined;
    
    // Get first video URL (backend accepts youtubeUrl as single string)
    const youtubeUrl = videoUrls.length > 0 ? videoUrls[0] : undefined;
    
    const data: CreatePortfolioRequest = {
      batchId: parseInt(formData.get('batchId') as string),
      files: filesArray, // Send as array - backend will convert to JSON
      youtubeUrl,
    };
    
    createPortfolioMutation.mutate({
      studentId: parseInt(formData.get('studentId') as string),
      data,
    });
  };
  
  const addImageLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (addingImageLinkRef.current) return;
    addingImageLinkRef.current = true;
    
    setImageLinks(prev => [...prev, '']);
    
    // Reset flag after state update
    setTimeout(() => {
      addingImageLinkRef.current = false;
    }, 100);
  };
  
  const removeImageLink = (index: number) => {
    setImageLinks(prev => prev.filter((_, i) => i !== index));
  };
  
  const updateImageLink = (index: number, value: string) => {
    setImageLinks(prev => {
      const newLinks = [...prev];
      newLinks[index] = value;
      return newLinks;
    });
  };
  
  const addVideoLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (addingVideoLinkRef.current) return;
    addingVideoLinkRef.current = true;
    
    setVideoLinks(prev => [...prev, '']);
    
    // Reset flag after state update
    setTimeout(() => {
      addingVideoLinkRef.current = false;
    }, 100);
  };
  
  const removeVideoLink = (index: number) => {
    setVideoLinks(prev => prev.filter((_, i) => i !== index));
  };
  
  const updateVideoLink = (index: number, value: string) => {
    setVideoLinks(prev => {
      const newLinks = [...prev];
      newLinks[index] = value;
      return newLinks;
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Validate file size (50MB = 50 * 1024 * 1024 bytes)
    const maxSize = 50 * 1024 * 1024;
    const invalidFiles = Array.from(files).filter(file => file.size > maxSize);
    
    if (invalidFiles.length > 0) {
      alert(`Some files exceed 50MB limit: ${invalidFiles.map(f => f.name).join(', ')}`);
      return;
    }

    // Validate file types (images only)
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const invalidTypes = Array.from(files).filter(file => !validTypes.includes(file.type));
    
    if (invalidTypes.length > 0) {
      alert(`Some files are not valid images: ${invalidTypes.map(f => f.name).join(', ')}`);
      return;
    }

    setIsUploading(true);
    try {
      const fileArray = Array.from(files);
      const response = await uploadAPI.uploadMultipleFiles(fileArray);
      
      // Add uploaded URLs to image links
      const newUrls = response.data.urls;
      setImageLinks(prev => [...prev, ...newUrls]);
      
      alert(`${fileArray.length} image(s) uploaded successfully!`);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to upload images');
    } finally {
      setIsUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleApprovePortfolio = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPortfolio) return;
    const formData = new FormData(e.currentTarget);
    const data: ApprovePortfolioRequest = {
      approve: formData.get('approve') === 'true',
    };
    approvePortfolioMutation.mutate({ id: selectedPortfolio.id, data });
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
                <h1 className="text-3xl font-bold text-white">Portfolio Management</h1>
                <p className="mt-2 text-orange-100">Student portfolios</p>
              </div>
              {(user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'student') && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-4 py-2 bg-white text-orange-600 rounded-lg font-semibold hover:bg-orange-50 transition-colors"
                >
                  + Create Portfolio
                </button>
              )}
            </div>
          </div>

          <div className="p-6">
            {portfolios.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No portfolios found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {portfolios.map((portfolio) => (
                  <div key={portfolio.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{portfolio.student?.name || `Student ${portfolio.studentId}`}</h3>
                        <p className="text-sm text-gray-600">{portfolio.batch?.title || `Batch ${portfolio.batchId}`}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        portfolio.status === 'approved' ? 'bg-green-100 text-green-800' :
                        portfolio.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {portfolio.status}
                      </span>
                    </div>
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Files:</span> {Object.keys(portfolio.files || {}).length}
                      </p>
                      {portfolio.approvedAt && (
                        <p className="text-xs text-gray-500">
                          Approved: {new Date(portfolio.approvedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {(user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'faculty') && portfolio.status === 'pending' && (
                      <button
                        onClick={() => {
                          setSelectedPortfolio(portfolio);
                          setIsApproveModalOpen(true);
                        }}
                        className="w-full px-3 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 transition-colors"
                      >
                        Review
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Portfolio Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Create Portfolio</h2>
            <form onSubmit={handleCreatePortfolio}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Student *</label>
                <select
                  name="studentId"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select a student</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name} ({student.email})
                    </option>
                  ))}
                </select>
              </div>
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
              {/* Image Upload */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Images (Max 50MB per file)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  multiple
                  onChange={handleImageUpload}
                  disabled={isUploading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                />
                {isUploading && (
                  <p className="text-xs text-orange-600 mt-1">Uploading images...</p>
                )}
                <p className="text-xs text-gray-500 mt-1">Upload image files (JPG, PNG, GIF, WebP) - Max 50MB per file</p>
              </div>

              {/* Image Links */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image Links (or enter URLs manually)
                </label>
                {imageLinks.map((link, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="url"
                      value={link}
                      onChange={(e) => updateImageLink(index, e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    {imageLinks.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeImageLink(index);
                        }}
                        className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addImageLink}
                  className="mt-2 px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                >
                  + Add Image Link
                </button>
                <p className="text-xs text-gray-500 mt-1">Or enter image URLs manually</p>
              </div>

              {/* Video Links */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Video Links (YouTube)
                </label>
                {videoLinks.map((link, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="url"
                      value={link}
                      onChange={(e) => updateVideoLink(index, e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    {videoLinks.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeVideoLink(index);
                        }}
                        className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addVideoLink}
                  className="mt-2 px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                >
                  + Add Video Link
                </button>
                <p className="text-xs text-gray-500 mt-1">Enter YouTube video URLs</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={createPortfolioMutation.isPending}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  {createPortfolioMutation.isPending ? 'Creating...' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setImageLinks(['']);
                    setVideoLinks(['']);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approve Portfolio Modal */}
      {isApproveModalOpen && selectedPortfolio && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Review Portfolio</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <span className="font-medium">Student:</span> {selectedPortfolio.student?.name || `Student ${selectedPortfolio.studentId}`}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <span className="font-medium">Batch:</span> {selectedPortfolio.batch?.title || `Batch ${selectedPortfolio.batchId}`}
              </p>
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Files:</p>
                <div className="bg-gray-50 p-3 rounded max-h-40 overflow-y-auto">
                  {Object.entries(selectedPortfolio.files || {}).map(([key, url]) => (
                    <div key={key} className="text-xs text-gray-600 mb-1">
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">
                        {key}: {url}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <form onSubmit={handleApprovePortfolio}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Action *</label>
                <select
                  name="approve"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="true">Approve</option>
                  <option value="false">Reject</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={approvePortfolioMutation.isPending}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  {approvePortfolioMutation.isPending ? 'Updating...' : 'Submit'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsApproveModalOpen(false);
                    setSelectedPortfolio(null);
                  }}
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

