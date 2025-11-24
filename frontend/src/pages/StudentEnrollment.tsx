import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { studentAPI, CompleteEnrollmentRequest } from '../api/student.api';
import { batchAPI, Batch } from '../api/batch.api';

export const StudentEnrollment: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  const [showOtherSoftwareInput, setShowOtherSoftwareInput] = useState(false);
  const [otherSoftware, setOtherSoftware] = useState('');
  const [selectedSoftwares, setSelectedSoftwares] = useState<string[]>([]);
  const [suggestedBatches, setSuggestedBatches] = useState<Batch[]>([]);

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
      alert(error.response?.data?.message || 'Failed to enroll student. Please check all required fields.');
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
    const formData = new FormData(e.currentTarget);
    
    // Get all selected software checkboxes
    const selectedSoftwares = formData.getAll('softwaresIncluded') as string[];
    let softwaresList = selectedSoftwares.filter(s => s !== 'Other');
    
    // Add other software if specified
    if (showOtherSoftwareInput && otherSoftware.trim()) {
      softwaresList.push(otherSoftware.trim());
    }
    
    const softwaresIncluded = softwaresList.length > 0 ? softwaresList.join(', ') : undefined;
    
    const data: CompleteEnrollmentRequest = {
      // Basic Information
      studentName: formData.get('studentName') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      whatsappNumber: formData.get('whatsappNumber') as string || undefined,
      dateOfAdmission: formData.get('dateOfAdmission') as string,
      
      // Address
      localAddress: formData.get('localAddress') as string || undefined,
      permanentAddress: formData.get('permanentAddress') as string || undefined,
      
      // Emergency Contact
      emergencyContactNumber: formData.get('emergencyContactNumber') as string || undefined,
      emergencyName: formData.get('emergencyName') as string || undefined,
      emergencyRelation: formData.get('emergencyRelation') as string || undefined,
      
      // Course Details
      courseName: formData.get('courseName') as string || undefined,
      batchId: formData.get('batchId') ? parseInt(formData.get('batchId') as string) : undefined,
      softwaresIncluded: softwaresIncluded,
      
      // Financial Details
      totalDeal: formData.get('totalDeal') ? parseFloat(formData.get('totalDeal') as string) : undefined,
      bookingAmount: formData.get('bookingAmount') ? parseFloat(formData.get('bookingAmount') as string) : undefined,
      balanceAmount: formData.get('balanceAmount') ? parseFloat(formData.get('balanceAmount') as string) : undefined,
      emiPlan: formData.get('emiPlan') === 'yes',
      emiPlanDate: formData.get('emiPlanDate') as string || undefined,
      
      // Additional Information
      complimentarySoftware: formData.get('complimentarySoftware') as string || undefined,
      complimentaryGift: formData.get('complimentaryGift') as string || undefined,
      hasReference: formData.get('hasReference') === 'yes',
      referenceDetails: formData.get('referenceDetails') as string || undefined,
      counselorName: formData.get('counselorName') as string || undefined,
      leadSource: formData.get('leadSource') as string || undefined,
      walkinDate: formData.get('walkinDate') as string || undefined,
      masterFaculty: formData.get('masterFaculty') as string || undefined,
    };

    enrollmentMutation.mutate(data);
  };

  const nextStep = () => {
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
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-orange-600 to-orange-500 px-8 py-6">
            <h1 className="text-3xl font-bold text-white">Student Enrollment Form</h1>
            <p className="mt-2 text-orange-100">Complete student registration and enrollment</p>
          </div>

          {/* Progress Steps */}
          <div className="px-8 py-4 bg-gray-50 border-b">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4].map((step) => (
                <React.Fragment key={step}>
                  <div className="flex items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                        currentStep >= step
                          ? 'bg-orange-600 text-white'
                          : 'bg-gray-300 text-gray-600'
                      }`}
                    >
                      {step}
                    </div>
                    <span
                      className={`ml-2 text-sm font-medium ${
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
                      className={`flex-1 h-1 mx-2 ${
                        currentStep > step ? 'bg-orange-600' : 'bg-gray-300'
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="p-8">
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        required
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date of Admission <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        name="dateOfAdmission"
                        required
                        defaultValue={new Date().toISOString().split('T')[0]}
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
                                onClick={() => {
                                  const select = document.querySelector(`select[name="batchId"]`) as HTMLSelectElement;
                                  if (select) select.value = batch.id.toString();
                                }}
                              >
                                <div className="flex justify-between items-center">
                                  <div>
                                    <span className="font-medium">{batch.title}</span>
                                    {batch.software && (
                                      <span className="text-sm text-gray-600 ml-2">- {batch.software}</span>
                                    )}
                                    <span className="text-xs text-gray-500 ml-2">
                                      ({batch.mode}) | Starts: {new Date(batch.startDate).toLocaleDateString()}
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">Select a batch (optional)</option>
                        {suggestedBatches.length > 0 && (
                          <optgroup label="Suggested Batches">
                            {suggestedBatches.map((batch) => (
                              <option key={batch.id} value={batch.id}>
                                {batch.title} {batch.software ? `- ${batch.software}` : ''} ({batch.mode}) - Starts: {new Date(batch.startDate).toLocaleDateString()}
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Lead Source
                        </label>
                        <select
                          name="leadSource"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-6 border-t">
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {currentStep < totalSteps ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-6 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={enrollmentMutation.isPending}
                    className="px-6 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50"
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

