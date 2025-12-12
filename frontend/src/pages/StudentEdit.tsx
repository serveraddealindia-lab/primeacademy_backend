import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { userAPI, UpdateUserRequest, UpdateStudentProfileRequest } from '../api/user.api';
import { studentAPI, StudentDetails } from '../api/student.api';
import { uploadAPI } from '../api/upload.api';
import { getImageUrl } from '../utils/imageUtils';
import { batchAPI } from '../api/batch.api';

export const StudentEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedSoftwares, setSelectedSoftwares] = useState<string[]>([]);
  const [showOtherSoftwareInput, setShowOtherSoftwareInput] = useState(false);
  const [otherSoftware, setOtherSoftware] = useState('');
  const [uploadedDocuments, setUploadedDocuments] = useState<Array<{ name: string; url: string; size?: number }>>([]);
  const [uploadingDocuments, setUploadingDocuments] = useState(false);

  // Form data state
  const [formData, setFormData] = useState<{
    // Basic Info
    name?: string;
    email?: string;
    phone?: string;
    whatsappNumber?: string;
    dateOfAdmission?: string;
    isActive?: boolean;
    // Contact & Address
    localAddress?: string;
    permanentAddress?: string;
    emergencyContactNumber?: string;
    emergencyName?: string;
    emergencyRelation?: string;
    // Course & Financial
    courseName?: string;
    batchId?: number;
    totalDeal?: number;
    bookingAmount?: number;
    balanceAmount?: number;
    emiPlan?: boolean;
    emiPlanDate?: string;
    emiInstallments?: Array<{
      month: number;
      amount: number;
      dueDate?: string;
    }>;
    // Additional Info
    complimentarySoftware?: string;
    complimentaryGift?: string;
    hasReference?: boolean;
    referenceDetails?: string;
    counselorName?: string;
    leadSource?: string;
    walkinDate?: string;
    masterFaculty?: string;
    // Profile fields
    dob?: string;
    address?: string;
    enrollmentDate?: string;
    status?: string;
    softwareList?: string[];
  }>({});

  // Fetch student data
  const {
    data: studentDetailsResponse,
    isLoading,
    error: queryError,
    refetch: refetchStudentDetails,
  } = useQuery<StudentDetails>({
    queryKey: ['student-details', id],
    queryFn: async () => {
      if (!id) throw new Error('Student ID is required');
      try {
        const response = await studentAPI.getStudentDetails(Number(id));
        if (response?.data?.student) return response.data.student;
      } catch (detailsError: any) {
        console.log('Student details endpoint failed, trying getUserById:', detailsError);
      }
      
      const userResponse = await userAPI.getUser(Number(id));
      if (!userResponse?.data?.user) throw new Error('Student data not found');
      
      const user = userResponse.data.user;
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        studentProfile: user.studentProfile || null,
        enrollments: [],
      };
    },
    enabled: !!id && !!user && isAdmin,
    retry: 1,
  });

  const studentData = studentDetailsResponse;

  // Initialize form data when student data loads
  useEffect(() => {
    if (studentData) {
      const profile = studentData.studentProfile;
      const documents = profile?.documents;
      const enrollmentMetadata = documents && typeof documents === 'object' && 'enrollmentMetadata' in documents
        ? (documents as any).enrollmentMetadata
        : null;

      setFormData({
        // Basic Info
        name: studentData.name || '',
        email: studentData.email || '',
        phone: studentData.phone || '',
        whatsappNumber: enrollmentMetadata?.whatsappNumber || '',
        dateOfAdmission: enrollmentMetadata?.dateOfAdmission || profile?.enrollmentDate || '',
        isActive: studentData.isActive ?? true,
        // Contact & Address
        localAddress: enrollmentMetadata?.localAddress || profile?.address || '',
        permanentAddress: enrollmentMetadata?.permanentAddress || '',
        emergencyContactNumber: enrollmentMetadata?.emergencyContact?.number || '',
        emergencyName: enrollmentMetadata?.emergencyContact?.name || '',
        emergencyRelation: enrollmentMetadata?.emergencyContact?.relation || '',
        // Course & Financial
        courseName: enrollmentMetadata?.courseName || '',
        totalDeal: enrollmentMetadata?.totalDeal,
        bookingAmount: enrollmentMetadata?.bookingAmount,
        balanceAmount: enrollmentMetadata?.balanceAmount,
        emiPlan: enrollmentMetadata?.emiPlan || false,
        emiPlanDate: enrollmentMetadata?.emiPlanDate || '',
        emiInstallments: enrollmentMetadata?.emiInstallments || [],
        enrollmentDocuments: enrollmentMetadata?.enrollmentDocuments || [],
        // Additional Info
        complimentarySoftware: enrollmentMetadata?.complimentarySoftware || '',
        complimentaryGift: enrollmentMetadata?.complimentaryGift || '',
        hasReference: enrollmentMetadata?.hasReference || false,
        referenceDetails: enrollmentMetadata?.referenceDetails || '',
        counselorName: enrollmentMetadata?.counselorName || '',
        leadSource: enrollmentMetadata?.leadSource || '',
        walkinDate: enrollmentMetadata?.walkinDate || '',
        masterFaculty: enrollmentMetadata?.masterFaculty || '',
        // Profile fields
        dob: profile?.dob || '',
        address: profile?.address || '',
        enrollmentDate: profile?.enrollmentDate || '',
        status: profile?.status || 'active',
        softwareList: profile?.softwareList || [],
      });

      // Load existing documents
      if (enrollmentMetadata?.enrollmentDocuments && Array.isArray(enrollmentMetadata.enrollmentDocuments)) {
        const docs = enrollmentMetadata.enrollmentDocuments.map((url: string) => ({
          name: url.split('/').pop() || 'Document',
          url: url,
        }));
        setUploadedDocuments(docs);
      }

      // Set software list
      if (profile?.softwareList && Array.isArray(profile.softwareList)) {
        setSelectedSoftwares(profile.softwareList);
      }

      // Set image preview
      if (profile?.photoUrl || studentData.avatarUrl) {
        setImagePreview(profile?.photoUrl || studentData.avatarUrl || null);
      }
    }
  }, [studentData]);

  // Fetch batches
  const { data: batchesData } = useQuery({
    queryKey: ['batches'],
    queryFn: () => batchAPI.getAllBatches(),
  });


  const batches = batchesData?.data || [];

  const updateUserMutation = useMutation({
    mutationFn: (data: UpdateUserRequest) => userAPI.updateUser(Number(id!), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-details', id] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to update user information');
    },
  });

  const updateStudentProfileMutation = useMutation({
    mutationFn: (data: UpdateStudentProfileRequest) => userAPI.updateStudentProfile(Number(id!), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-details', id] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to update student profile');
    },
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSoftwareChange = (software: string, checked: boolean) => {
    if (checked) {
      setSelectedSoftwares(prev => [...prev, software]);
    } else {
      setSelectedSoftwares(prev => prev.filter(s => s !== software));
    }
  };

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!studentData) {
      alert('Student data is not loaded. Please try again.');
      return;
    }

    // Combine all selected software
    let softwaresList = [...selectedSoftwares];
    if (showOtherSoftwareInput && otherSoftware.trim()) {
      softwaresList.push(otherSoftware.trim());
    }

    // Prepare enrollmentMetadata
    const enrollmentMetadata: any = {};
    if (formData.whatsappNumber) enrollmentMetadata.whatsappNumber = formData.whatsappNumber;
    if (formData.localAddress) enrollmentMetadata.localAddress = formData.localAddress;
    if (formData.permanentAddress) enrollmentMetadata.permanentAddress = formData.permanentAddress;
    if (formData.emergencyContactNumber || formData.emergencyName || formData.emergencyRelation) {
      enrollmentMetadata.emergencyContact = {
        number: formData.emergencyContactNumber || null,
        name: formData.emergencyName || null,
        relation: formData.emergencyRelation || null,
      };
    }
    if (formData.courseName) enrollmentMetadata.courseName = formData.courseName;
    if (formData.totalDeal !== undefined) enrollmentMetadata.totalDeal = formData.totalDeal;
    if (formData.bookingAmount !== undefined) enrollmentMetadata.bookingAmount = formData.bookingAmount;
    if (formData.balanceAmount !== undefined) enrollmentMetadata.balanceAmount = formData.balanceAmount;
    if (formData.emiPlan !== undefined) enrollmentMetadata.emiPlan = formData.emiPlan;
    if (formData.emiPlanDate) enrollmentMetadata.emiPlanDate = formData.emiPlanDate;
    if (formData.emiInstallments && formData.emiInstallments.length > 0) {
      enrollmentMetadata.emiInstallments = formData.emiInstallments;
    }
    if (uploadedDocuments.length > 0) {
      enrollmentMetadata.enrollmentDocuments = uploadedDocuments.map(doc => doc.url);
    }
    if (formData.complimentarySoftware) enrollmentMetadata.complimentarySoftware = formData.complimentarySoftware;
    if (formData.complimentaryGift) enrollmentMetadata.complimentaryGift = formData.complimentaryGift;
    if (formData.hasReference !== undefined) enrollmentMetadata.hasReference = formData.hasReference;
    if (formData.referenceDetails) enrollmentMetadata.referenceDetails = formData.referenceDetails;
    if (formData.counselorName) enrollmentMetadata.counselorName = formData.counselorName;
    if (formData.leadSource) enrollmentMetadata.leadSource = formData.leadSource;
    if (formData.walkinDate) enrollmentMetadata.walkinDate = formData.walkinDate;
    if (formData.masterFaculty) enrollmentMetadata.masterFaculty = formData.masterFaculty;
    if (formData.dateOfAdmission) enrollmentMetadata.dateOfAdmission = formData.dateOfAdmission;

    // Update user information
    const userData: UpdateUserRequest = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      isActive: formData.isActive,
      avatarUrl: imagePreview && imagePreview.startsWith('http') ? imagePreview : undefined,
    };

    // Update student profile
    const profileData: UpdateStudentProfileRequest = {
      dob: formData.dob,
      address: formData.localAddress || formData.address,
      enrollmentDate: formData.enrollmentDate || formData.dateOfAdmission,
      status: formData.status,
      softwareList: softwaresList.length > 0 ? softwaresList : undefined,
      documents: {
        enrollmentMetadata: enrollmentMetadata,
      },
    };

    try {
      await updateUserMutation.mutateAsync(userData);
      await updateStudentProfileMutation.mutateAsync(profileData);
      alert('Student updated successfully!');
      navigate('/students');
    } catch (error) {
      console.error('Error updating student:', error);
    }
  };

  const nextStep = () => {
    if (currentStep === 1) {
      if (!formData.name || !formData.name.trim()) {
        alert('Student Name is required');
        return;
      }
      if (!formData.phone || !formData.phone.trim()) {
        alert('Phone number is required');
        return;
      }
    }
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Permission checks
  if (!user) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          <div className="bg-white shadow-xl rounded-lg p-6">
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
            <p className="text-center text-gray-600 mt-4">Loading user information...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          <div className="bg-white shadow-xl rounded-lg p-6">
            <p className="text-red-600 text-lg font-semibold">You don't have permission to edit students.</p>
            <p className="text-gray-600 mt-2">Only administrators can edit student information.</p>
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
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          <div className="bg-white shadow-xl rounded-lg p-6">
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
            <p className="text-center text-gray-600 mt-4">Loading student data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (queryError || !studentData) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          <div className="bg-white shadow-xl rounded-lg p-6">
            <p className="text-red-600 text-lg font-semibold">Error loading student data</p>
            <p className="text-gray-600 mt-2">{queryError instanceof Error ? queryError.message : 'Student not found'}</p>
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => refetchStudentDetails()}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                Retry
              </button>
              <button
                onClick={() => navigate('/students')}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Back to Students
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-orange-600 to-orange-500 px-4 md:px-8 py-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">Edit Student</h1>
                <p className="mt-2 text-orange-100 text-sm md:text-base">Update student information</p>
              </div>
              <button
                onClick={() => navigate('/students')}
                className="px-4 py-2 bg-white text-orange-600 rounded-lg font-semibold hover:bg-orange-50 transition-colors text-sm md:text-base"
              >
                ← Back
              </button>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="px-4 md:px-8 py-4 bg-gray-50 border-b">
            <div className="flex items-center justify-between overflow-x-auto">
              {[1, 2, 3, 4].map((step) => (
                <React.Fragment key={step}>
                  <div className="flex items-center min-w-0 flex-shrink-0">
                    <div
                      className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-semibold text-sm md:text-base ${
                        currentStep >= step
                          ? 'bg-orange-600 text-white'
                          : 'bg-gray-300 text-gray-600'
                      }`}
                    >
                      {step}
                    </div>
                    <span
                      className={`ml-2 text-xs md:text-sm font-medium hidden sm:inline ${
                        currentStep >= step ? 'text-orange-600' : 'text-gray-500'
                      }`}
                    >
                      {step === 1 && 'Basic Info'}
                      {step === 2 && 'Contact & Address'}
                      {step === 3 && 'Course & Financial'}
                      {step === 4 && 'Additional Info'}
                    </span>
                  </div>
                  {step < totalSteps && (
                    <div
                      className={`flex-1 h-1 mx-1 md:mx-2 min-w-[20px] ${
                        currentStep > step ? 'bg-orange-600' : 'bg-gray-300'
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <form onSubmit={(e) => {
            // Only allow form submission when explicitly clicking the submit button
            // Prevent any other form submission triggers
            e.preventDefault();
          }} onKeyDown={(e) => {
            // Prevent form submission when Enter is pressed in any input field
            // Only allow submission via the submit button
            if (e.key === 'Enter') {
              const target = e.target as HTMLElement;
              // Allow Enter in textareas (they handle it naturally)
              if (target.tagName === 'TEXTAREA') {
                return; // Let textarea handle Enter normally
              }
              // Prevent Enter in all other cases (input fields, selects, etc.)
              e.preventDefault();
              e.stopPropagation();
            }
          }}>
            <div className="p-4 md:p-8 max-h-[calc(100vh-12rem)] overflow-y-auto">
              {/* Step 1: Basic Information */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6">Basic Information</h2>
                  
                  {/* Student Photo */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-4">Student Photo</h3>
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                      {(() => {
                        const photoUrl = imagePreview || studentData?.studentProfile?.photoUrl || studentData?.avatarUrl;
                        const studentName = formData.name || studentData?.name || 'Student';
                        if (photoUrl) {
                          return (
                            <img
                              src={getImageUrl(photoUrl) || photoUrl}
                              alt={studentName}
                              className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-orange-500 shadow-lg"
                              crossOrigin="anonymous"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZmY5NTAwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSI0OCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPnt7c3R1ZGVudE5hbWUuY2hhckF0KDApfX08L3RleHQ+PC9zdmc+';
                              }}
                            />
                          );
                        } else {
                          return (
                            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-2xl md:text-3xl shadow-lg">
                              {studentName.charAt(0).toUpperCase()}
                            </div>
                          );
                        }
                      })()}
                      <div className="flex-1 w-full sm:w-auto">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Upload Photo</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
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
                              if (uploadResponse.data?.files?.[0]?.url) {
                                const imageUrl = uploadResponse.data.files[0].url;
                                setImagePreview(getImageUrl(imageUrl) || imageUrl);
                                await userAPI.updateUser(Number(id!), { avatarUrl: imageUrl });
                                if (studentData?.studentProfile) {
                                  await userAPI.updateStudentProfile(Number(id!), { photoUrl: imageUrl });
                                }
                                queryClient.invalidateQueries({ queryKey: ['student-details', id] });
                                alert('Photo uploaded successfully!');
                              }
                            } catch (error: any) {
                              alert(error.response?.data?.message || 'Failed to upload image');
                            } finally {
                              setUploadingImage(false);
                            }
                          }}
                          disabled={uploadingImage}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                        />
                        {uploadingImage && <p className="mt-1 text-xs text-gray-500">Uploading...</p>}
                        <p className="mt-1 text-xs text-gray-500">JPG, PNG, WEBP, GIF - Max 5MB</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Student Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name || ''}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email || ''}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.phone || ''}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        WhatsApp Number
                      </label>
                      <input
                        type="tel"
                        value={formData.whatsappNumber || ''}
                        onChange={(e) => handleInputChange('whatsappNumber', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={formatDateForInput(formData.dob)}
                        onChange={(e) => handleInputChange('dob', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date of Admission
                      </label>
                      <input
                        type="date"
                        value={formatDateForInput(formData.dateOfAdmission)}
                        onChange={(e) => handleInputChange('dateOfAdmission', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Status <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.isActive ? 'true' : 'false'}
                        onChange={(e) => handleInputChange('isActive', e.target.value === 'true')}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Profile Status
                      </label>
                      <select
                        value={formData.status || 'active'}
                        onChange={(e) => handleInputChange('status', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="on-hold">On Hold</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Contact & Address */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6">Contact & Address Information</h2>
                  
                  <div className="space-y-4 md:space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Local Address
                      </label>
                      <textarea
                        rows={3}
                        value={formData.localAddress || ''}
                        onChange={(e) => handleInputChange('localAddress', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Permanent Address
                      </label>
                      <textarea
                        rows={3}
                        value={formData.permanentAddress || ''}
                        onChange={(e) => handleInputChange('permanentAddress', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Emergency Contact Number
                        </label>
                        <input
                          type="tel"
                          value={formData.emergencyContactNumber || ''}
                          onChange={(e) => handleInputChange('emergencyContactNumber', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Emergency Contact Name
                        </label>
                        <input
                          type="text"
                          value={formData.emergencyName || ''}
                          onChange={(e) => handleInputChange('emergencyName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Relation
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., Father, Mother, Guardian"
                          value={formData.emergencyRelation || ''}
                          onChange={(e) => handleInputChange('emergencyRelation', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Course & Financial Details */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6">Course & Financial Details</h2>
                  
                  <div className="space-y-4 md:space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Course Name
                      </label>
                      <input
                        type="text"
                        value={formData.courseName || ''}
                        onChange={(e) => handleInputChange('courseName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Select Batch
                      </label>
                      <select
                        value={formData.batchId?.toString() || ''}
                        onChange={(e) => handleInputChange('batchId', e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">Select a batch (optional)</option>
                        {batches.map((batch) => (
                          <option key={batch.id} value={batch.id}>
                            {batch.title} {batch.software ? `- ${batch.software}` : ''} ({batch.mode})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Softwares Included
                      </label>
                      <div className="border border-gray-300 rounded-md p-3 md:p-4 max-h-64 overflow-y-auto">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
                          {[
                            'Photoshop', 'Illustrator', 'InDesign', 'After Effects', 'Premiere Pro',
                            'Figma', 'Sketch', 'Blender', 'Maya', '3ds Max', 'Cinema 4D', 'Lightroom',
                            'CorelDRAW', 'AutoCAD', 'SolidWorks', 'Revit', 'SketchUp', 'Unity',
                            'Unreal Engine', 'DaVinci Resolve', 'Final Cut Pro', 'Procreate',
                            'Affinity Designer', 'Affinity Photo', 'Canva Pro', 'Other',
                          ].map((software) => (
                            <label 
                              key={software} 
                              className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 md:p-2 rounded text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={software === 'Other' ? showOtherSoftwareInput : selectedSoftwares.includes(software)}
                                onChange={(e) => {
                                  if (software === 'Other') {
                                    setShowOtherSoftwareInput(e.target.checked);
                                  } else {
                                    handleSoftwareChange(software, e.target.checked);
                                  }
                                }}
                                className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                              />
                              <span className="text-xs md:text-sm text-gray-700">{software}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      {showOtherSoftwareInput && (
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Specify Other Software
                          </label>
                          <input
                            type="text"
                            value={otherSoftware}
                            onChange={(e) => {
                              const value = e.target.value;
                              setOtherSoftware(value);
                              if (value.trim() && !selectedSoftwares.includes(value.trim())) {
                                setSelectedSoftwares(prev => [...prev, value.trim()]);
                              }
                            }}
                            placeholder="Enter software names (comma separated)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Total Deal Amount (₹)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.totalDeal || ''}
                          onChange={(e) => handleInputChange('totalDeal', e.target.value ? parseFloat(e.target.value) : undefined)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Booking Amount (₹)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.bookingAmount || ''}
                          onChange={(e) => handleInputChange('bookingAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Balance Amount (₹)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.balanceAmount || ''}
                          onChange={(e) => handleInputChange('balanceAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          EMI Plan
                        </label>
                        <select
                          value={formData.emiPlan ? 'yes' : 'no'}
                          onChange={(e) => handleInputChange('emiPlan', e.target.value === 'yes')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          EMI Plan Date
                        </label>
                        <input
                          type="date"
                          value={formatDateForInput(formData.emiPlanDate)}
                          onChange={(e) => handleInputChange('emiPlanDate', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>

                    {/* EMI Installments Table */}
                    {formData.emiPlan && (
                      <div className="mt-6">
                        <div className="flex justify-between items-center mb-3">
                          <label className="block text-sm font-medium text-gray-700">
                            EMI Installments (Month-wise)
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const installments = formData.emiInstallments || [];
                              const nextMonth = installments.length > 0 
                                ? Math.max(...installments.map(i => i.month)) + 1 
                                : 1;
                              handleInputChange('emiInstallments', [
                                ...installments,
                                { month: nextMonth, amount: 0, dueDate: '' }
                              ]);
                            }}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                          >
                            + Add Installment
                          </button>
                        </div>
                        {formData.emiInstallments && formData.emiInstallments.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Month</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Amount (₹)</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Due Date</th>
                                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-700 uppercase">Action</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {formData.emiInstallments.map((installment, index) => (
                                  <tr key={index}>
                                    <td className="px-4 py-2">
                                      <input
                                        type="number"
                                        min="1"
                                        value={installment.month}
                                        onChange={(e) => {
                                          const installments = [...(formData.emiInstallments || [])];
                                          installments[index].month = parseInt(e.target.value) || 1;
                                          handleInputChange('emiInstallments', installments);
                                        }}
                                        className="w-20 px-2 py-1 border border-gray-300 rounded-md"
                                      />
                                    </td>
                                    <td className="px-4 py-2">
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={installment.amount}
                                        onChange={(e) => {
                                          const installments = [...(formData.emiInstallments || [])];
                                          installments[index].amount = parseFloat(e.target.value) || 0;
                                          handleInputChange('emiInstallments', installments);
                                        }}
                                        className="w-32 px-2 py-1 border border-gray-300 rounded-md"
                                      />
                                    </td>
                                    <td className="px-4 py-2">
                                      <input
                                        type="date"
                                        value={formatDateForInput(installment.dueDate)}
                                        onChange={(e) => {
                                          const installments = [...(formData.emiInstallments || [])];
                                          installments[index].dueDate = e.target.value;
                                          handleInputChange('emiInstallments', installments);
                                        }}
                                        className="w-full px-2 py-1 border border-gray-300 rounded-md"
                                      />
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const installments = formData.emiInstallments || [];
                                          installments.splice(index, 1);
                                          handleInputChange('emiInstallments', installments);
                                        }}
                                        className="px-2 py-1 text-sm text-red-600 hover:text-red-800"
                                      >
                                        Remove
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No installments added. Click "Add Installment" to add month-wise EMI details.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 4: Additional Information */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6">Additional Information</h2>
                  
                  <div className="space-y-4 md:space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Complimentary Software
                        </label>
                        <input
                          type="text"
                          value={formData.complimentarySoftware || ''}
                          onChange={(e) => handleInputChange('complimentarySoftware', e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.stopPropagation();
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Complimentary Gift
                        </label>
                        <input
                          type="text"
                          value={formData.complimentaryGift || ''}
                          onChange={(e) => handleInputChange('complimentaryGift', e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.stopPropagation();
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Has Reference
                      </label>
                      <select
                        value={formData.hasReference ? 'yes' : 'no'}
                        onChange={(e) => handleInputChange('hasReference', e.target.value === 'yes')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reference Details
                      </label>
                      <textarea
                        rows={3}
                        value={formData.referenceDetails || ''}
                        onChange={(e) => handleInputChange('referenceDetails', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Counselor Name
                        </label>
                        <input
                          type="text"
                          value={formData.counselorName || ''}
                          onChange={(e) => handleInputChange('counselorName', e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.stopPropagation();
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Lead Source
                        </label>
                        <select
                          value={formData.leadSource || ''}
                          onChange={(e) => handleInputChange('leadSource', e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.stopPropagation();
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="">Select lead source</option>
                          <option value="Walk-in">Walk-in</option>
                          <option value="Online">Online</option>
                          <option value="Reference">Reference</option>
                          <option value="Social Media">Social Media</option>
                          <option value="Advertisement">Advertisement</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Walk-in Date
                        </label>
                        <input
                          type="date"
                          value={formatDateForInput(formData.walkinDate)}
                          onChange={(e) => handleInputChange('walkinDate', e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.stopPropagation();
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Master Faculty
                        </label>
                        <input
                          type="text"
                          value={formData.masterFaculty || ''}
                          onChange={(e) => handleInputChange('masterFaculty', e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.stopPropagation();
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>

                    {/* Documents Upload Section */}
                    <div className="border-t pt-6 mt-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Enrollment Documents</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Upload Documents (PDF, Images, etc.)
                          </label>
                          <input
                            type="file"
                            multiple
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                            onChange={handleDocumentUpload}
                            disabled={uploadingDocuments}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            You can upload multiple files. Supported formats: PDF, JPG, PNG, DOC, DOCX (Max 10MB per file)
                          </p>
                          {uploadingDocuments && (
                            <p className="mt-2 text-sm text-blue-600">Uploading documents...</p>
                          )}
                        </div>

                        {uploadedDocuments.length > 0 && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Uploaded Documents ({uploadedDocuments.length})
                            </label>
                            <div className="space-y-2">
                              {uploadedDocuments.map((doc, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md"
                                >
                                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                                    <div className="flex-shrink-0">
                                      {doc.url.toLowerCase().endsWith('.pdf') ? (
                                        <span className="text-2xl">📄</span>
                                      ) : doc.url.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/) ? (
                                        <span className="text-2xl">🖼️</span>
                                      ) : (
                                        <span className="text-2xl">📎</span>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                                      {doc.size && (
                                        <p className="text-xs text-gray-500">
                                          {(doc.size / 1024).toFixed(2)} KB
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <a
                                      href={getImageUrl(doc.url) || doc.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded hover:bg-blue-50"
                                    >
                                      View
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveDocument(index)}
                                      className="px-3 py-1 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded hover:bg-red-50"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6 md:mt-8 pt-6 border-t">
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className="w-full sm:w-auto px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {currentStep < totalSteps ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="w-full sm:w-auto px-6 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // Create a synthetic form event to call handleSubmit
                      const form = e.currentTarget.closest('form');
                      if (form) {
                        const syntheticEvent = {
                          preventDefault: () => {},
                          currentTarget: form,
                          target: form,
                        } as unknown as React.FormEvent<HTMLFormElement>;
                        handleSubmit(syntheticEvent);
                      }
                    }}
                    disabled={updateUserMutation.isPending || updateStudentProfileMutation.isPending}
                    className="w-full sm:w-auto px-6 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50"
                  >
                    {updateUserMutation.isPending || updateStudentProfileMutation.isPending ? 'Saving...' : 'Save All Changes'}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};
