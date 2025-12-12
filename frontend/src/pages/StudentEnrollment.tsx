import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { studentAPI, CompleteEnrollmentRequest } from '../api/student.api';
import { batchAPI, Batch } from '../api/batch.api';
import { formatDateDDMMYYYY } from '../utils/dateUtils';
import { uploadAPI } from '../api/upload.api';
import { getImageUrl } from '../utils/imageUtils';

export const StudentEnrollment: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  const [showOtherSoftwareInput, setShowOtherSoftwareInput] = useState(false);
  const [otherSoftware, setOtherSoftware] = useState('');
  const [selectedSoftwares, setSelectedSoftwares] = useState<string[]>([]);
  const [suggestedBatches, setSuggestedBatches] = useState<Batch[]>([]);
  
  // Form data state to preserve values across steps
  const [formData, setFormData] = useState<Partial<CompleteEnrollmentRequest>>({
    dateOfAdmission: new Date().toISOString().split('T')[0],
    emiInstallments: [],
  });
  const [uploadedDocuments, setUploadedDocuments] = useState<Array<{ name: string; url: string; size?: number }>>([]);
  const [uploadingDocuments, setUploadingDocuments] = useState(false);
  
  // Update form data when input changes
  const handleInputChange = (field: keyof CompleteEnrollmentRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle document upload
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingDocuments(true);
    try {
      const fileArray = Array.from(files);
      const uploadResponse = await uploadAPI.uploadMultipleFiles(fileArray);
      
      if (uploadResponse.data && uploadResponse.data.files) {
        const newDocuments = uploadResponse.data.files.map((file, index) => ({
          name: file.originalName,
          url: file.url,
          size: file.size,
        }));
        setUploadedDocuments(prev => [...prev, ...newDocuments]);
        alert(`${newDocuments.length} document(s) uploaded successfully!`);
      } else {
        throw new Error('No files returned from upload');
      }
    } catch (error: any) {
      console.error('Document upload error:', error);
      alert(error.response?.data?.message || error.message || 'Failed to upload documents');
    } finally {
      setUploadingDocuments(false);
      // Reset file input
      e.target.value = '';
    }
  };

  // Remove document
  const handleRemoveDocument = (index: number) => {
    setUploadedDocuments(prev => prev.filter((_, i) => i !== index));
  };

  // Fetch batches for enrollment
  const { data: batchesData } = useQuery({
    queryKey: ['batches'],
    queryFn: () => batchAPI.getAllBatches(),
  });

  const enrollmentMutation = useMutation({
    mutationFn: (data: CompleteEnrollmentRequest) => studentAPI.completeEnrollment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      alert('Student enrolled successfully!');
      navigate('/students');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to enroll student. Please check all required fields.';
      console.error('Enrollment error:', error);
      console.error('Error response:', error.response?.data);
      alert(errorMessage);
    },
  });

  const batches = batchesData?.data || [];

  // Filter batches based on selected software
  useEffect(() => {
    if (selectedSoftwares.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const suggested = batches.filter(batch => {
        // Check if batch hasn't started yet
        const batchStartDate = new Date(batch.startDate);
        batchStartDate.setHours(0, 0, 0, 0);
        if (batchStartDate < today) return false;
        
        // Check if batch software matches any selected software
        if (batch.software) {
          const batchSoftwareLower = batch.software.toLowerCase();
          return selectedSoftwares.some(sw => 
            batchSoftwareLower.includes(sw.toLowerCase()) || 
            sw.toLowerCase().includes(batchSoftwareLower)
          );
        }
        return false;
      });
      
      setSuggestedBatches(suggested);
    } else {
      setSuggestedBatches([]);
    }
  }, [selectedSoftwares, batches]);

  const handleSoftwareChange = (software: string, checked: boolean) => {
    if (checked) {
      setSelectedSoftwares(prev => [...prev, software]);
    } else {
      setSelectedSoftwares(prev => prev.filter(s => s !== software));
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validation - check required fields
    if (!formData.studentName || !formData.studentName.trim()) {
      alert('Student Name is required');
      setCurrentStep(1);
      return;
    }
    
    if (!formData.phone || !formData.phone.trim()) {
      alert('Phone number is required');
      setCurrentStep(1);
      return;
    }
    
    // Get all selected software checkboxes from state
    let softwaresList = [...selectedSoftwares];
    
    // Add other software if specified
    if (showOtherSoftwareInput && otherSoftware.trim()) {
      softwaresList.push(otherSoftware.trim());
    }
    
    const softwaresIncluded = softwaresList.length > 0 ? softwaresList.join(', ') : undefined;
    
    // Combine form data with software list, ensuring required fields are present
    const data: CompleteEnrollmentRequest = {
      studentName: formData.studentName.trim(),
      phone: formData.phone.trim(),
      email: formData.email?.trim() || undefined,
      whatsappNumber: formData.whatsappNumber?.trim() || undefined,
      dateOfAdmission: formData.dateOfAdmission || undefined,
      localAddress: formData.localAddress?.trim() || undefined,
      permanentAddress: formData.permanentAddress?.trim() || undefined,
      emergencyContactNumber: formData.emergencyContactNumber?.trim() || undefined,
      emergencyName: formData.emergencyName?.trim() || undefined,
      emergencyRelation: formData.emergencyRelation?.trim() || undefined,
      courseName: formData.courseName?.trim() || undefined,
      batchId: formData.batchId || undefined,
      softwaresIncluded: softwaresIncluded,
      totalDeal: formData.totalDeal || undefined,
      bookingAmount: formData.bookingAmount || undefined,
      balanceAmount: formData.balanceAmount || undefined,
      emiPlan: formData.emiPlan || false,
      emiPlanDate: formData.emiPlanDate || undefined,
      emiInstallments: formData.emiInstallments && formData.emiInstallments.length > 0 ? formData.emiInstallments : undefined,
      complimentarySoftware: formData.complimentarySoftware?.trim() || undefined,
      complimentaryGift: formData.complimentaryGift?.trim() || undefined,
      hasReference: formData.hasReference || false,
      referenceDetails: formData.referenceDetails?.trim() || undefined,
      counselorName: formData.counselorName?.trim() || undefined,
      leadSource: formData.leadSource || undefined,
      walkinDate: formData.walkinDate || undefined,
      masterFaculty: formData.masterFaculty?.trim() || undefined,
      enrollmentDocuments: uploadedDocuments.length > 0 ? uploadedDocuments.map(doc => doc.url) : undefined,
    };

    console.log('Submitting enrollment data:', data);
    enrollmentMutation.mutate(data);
  };

  const nextStep = () => {
    // Validate required fields on step 1 before proceeding
    if (currentStep === 1) {
      if (!formData.studentName || !formData.studentName.trim()) {
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

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-orange-600 to-orange-500 px-4 md:px-8 py-4 md:py-6">
            <h1 className="text-2xl md:text-3xl font-bold text-white">Student Enrollment Form</h1>
            <p className="mt-2 text-sm md:text-base text-orange-100">Complete student registration and enrollment</p>
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
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Basic Information</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Student Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="studentName"
                        required
                        value={formData.studentName || ''}
                        onChange={(e) => handleInputChange('studentName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
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
                        name="phone"
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
                        name="whatsappNumber"
                        value={formData.whatsappNumber || ''}
                        onChange={(e) => handleInputChange('whatsappNumber', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date of Admission
                      </label>
                      <input
                        type="date"
                        name="dateOfAdmission"
                        value={formData.dateOfAdmission || new Date().toISOString().split('T')[0]}
                        onChange={(e) => handleInputChange('dateOfAdmission', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Contact & Address */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Contact & Address Information</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Local Address
                      </label>
                      <textarea
                        name="localAddress"
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
                        name="permanentAddress"
                        rows={3}
                        value={formData.permanentAddress || ''}
                        onChange={(e) => handleInputChange('permanentAddress', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Emergency Contact Number
                        </label>
                        <input
                          type="tel"
                          name="emergencyContactNumber"
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
                          name="emergencyName"
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
                          name="emergencyRelation"
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
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Course & Financial Details</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Course Name
                      </label>
                      <input
                        type="text"
                        name="courseName"
                        value={formData.courseName || ''}
                        onChange={(e) => handleInputChange('courseName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Select Batch
                      </label>
                      
                      {/* Suggested Batches */}
                      {suggestedBatches.length > 0 && (
                        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm font-semibold text-blue-900 mb-2">
                            💡 Suggested Batches (based on your software selection)
                          </p>
                          <div className="space-y-2">
                            {suggestedBatches.map((batch) => (
                              <div
                                key={batch.id}
                                className="p-2 bg-white border border-blue-300 rounded hover:bg-blue-50 cursor-pointer"
                                onClick={() => handleInputChange('batchId', batch.id)}
                              >
                                <div className="flex justify-between items-center">
                                  <div>
                                    <span className="font-medium">{batch.title}</span>
                                    {batch.software && (
                                      <span className="text-sm text-gray-600 ml-2">- {batch.software}</span>
                                    )}
                                    <span className="text-xs text-gray-500 ml-2">
                                      ({batch.mode}) | Starts: {formatDateDDMMYYYY(batch.startDate)}
                                    </span>
                                  </div>
                                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                    Suggested
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <select
                        name="batchId"
                        value={formData.batchId?.toString() || ''}
                        onChange={(e) => handleInputChange('batchId', e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">Select a batch (optional)</option>
                        {suggestedBatches.length > 0 && (
                          <optgroup label="Suggested Batches">
                            {suggestedBatches.map((batch) => (
                              <option key={batch.id} value={batch.id}>
                                {batch.title} {batch.software ? `- ${batch.software}` : ''} ({batch.mode}) - Starts: {formatDateDDMMYYYY(batch.startDate)}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {suggestedBatches.length > 0 && batches.length > suggestedBatches.length && (
                          <optgroup label="All Batches">
                            {batches.filter(b => !suggestedBatches.some(sb => sb.id === b.id)).map((batch) => (
                              <option key={batch.id} value={batch.id}>
                                {batch.title} {batch.software ? `- ${batch.software}` : ''} ({batch.mode})
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {suggestedBatches.length === 0 && batches.map((batch) => (
                          <option key={batch.id} value={batch.id}>
                            {batch.title} {batch.software ? `- ${batch.software}` : ''} ({batch.mode})
                          </option>
                        ))}
                      </select>
                      {suggestedBatches.length > 0 && (
                        <p className="mt-1 text-xs text-blue-600">
                          Batches matching your software selection are shown above
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Softwares Included
                      </label>
                      <div className="border border-gray-300 rounded-md p-4 max-h-48 overflow-y-auto">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {[
                            'Photoshop',
                            'Illustrator',
                            'InDesign',
                            'After Effects',
                            'Premiere Pro',
                            'Figma',
                            'Sketch',
                            'Blender',
                            'Maya',
                            '3ds Max',
                            'Cinema 4D',
                            'Lightroom',
                            'CorelDRAW',
                            'AutoCAD',
                            'SolidWorks',
                            'Revit',
                            'SketchUp',
                            'Unity',
                            'Unreal Engine',
                            'DaVinci Resolve',
                            'Final Cut Pro',
                            'Procreate',
                            'Affinity Designer',
                            'Affinity Photo',
                            'Canva Pro',
                            'Other',
                          ].map((software) => (
                            <label 
                              key={software} 
                              className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                            >
                              <input
                                type="checkbox"
                                name="softwaresIncluded"
                                value={software}
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
                              <span className="text-sm text-gray-700">{software}</span>
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
                              // Update selected softwares when other software is entered
                              if (value.trim()) {
                                const trimmed = value.trim();
                                if (!selectedSoftwares.includes(trimmed)) {
                                  setSelectedSoftwares(prev => [...prev, trimmed]);
                                }
                              }
                            }}
                            placeholder="Enter software names (comma separated)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                      )}
                      <p className="mt-2 text-xs text-gray-500">Select all applicable software</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Total Deal Amount (₹)
                        </label>
                        <input
                          type="number"
                          name="totalDeal"
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
                          name="bookingAmount"
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
                          name="balanceAmount"
                          step="0.01"
                          value={formData.balanceAmount || ''}
                          onChange={(e) => handleInputChange('balanceAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          EMI Plan
                        </label>
                        <select
                          name="emiPlan"
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
                          name="emiPlanDate"
                          value={formData.emiPlanDate || ''}
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
                                        value={installment.dueDate || ''}
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
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Additional Information</h2>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Complimentary Software
                        </label>
                        <input
                          type="text"
                          name="complimentarySoftware"
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
                          name="complimentaryGift"
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
                        name="hasReference"
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
                        name="referenceDetails"
                        rows={3}
                        value={formData.referenceDetails || ''}
                        onChange={(e) => handleInputChange('referenceDetails', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Counselor Name
                        </label>
                        <input
                          type="text"
                          name="counselorName"
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
                          name="leadSource"
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Walk-in Date
                        </label>
                        <input
                          type="date"
                          name="walkinDate"
                          value={formData.walkinDate || ''}
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
                          name="masterFaculty"
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
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                e.stopPropagation();
                              }
                            }}
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
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleRemoveDocument(index);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          e.stopPropagation();
                                        }
                                      }}
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
                    disabled={enrollmentMutation.isPending}
                    className="w-full sm:w-auto px-6 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50"
                  >
                    {enrollmentMutation.isPending ? 'Submitting...' : 'Submit Enrollment'}
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

