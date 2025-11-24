import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import api from '../api/axios';
import { employeeAPI, CreateEmployeeProfileRequest } from '../api/employee.api';

interface RegisterUserRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: 'employee';
}

export const EmployeeRegistration: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 6;
  const [createdUserId, setCreatedUserId] = useState<number | null>(null);

  // Register user first
  const registerUserMutation = useMutation({
    mutationFn: async (data: RegisterUserRequest) => {
      const response = await api.post('/auth/register', data);
      return response.data;
    },
    onSuccess: (data) => {
      setCreatedUserId(data.data.user.id);
      setCurrentStep(2); // Move to next step after user creation
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to create user account');
    },
  });

  // Create employee profile
  const createEmployeeProfileMutation = useMutation({
    mutationFn: (data: CreateEmployeeProfileRequest) => employeeAPI.createEmployeeProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      alert('Employee registration completed successfully!');
      navigate('/employees');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to create employee profile');
    },
  });

  const handleUserRegistration = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const userData: RegisterUserRequest = {
      name: formData.get('fullName') as string,
      email: formData.get('email') as string,
      phone: formData.get('contactNumber') as string,
      password: formData.get('password') as string,
      role: 'employee',
    };

    registerUserMutation.mutate(userData);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    if (!createdUserId) {
      alert('Please complete user registration first');
      return;
    }

    // Get selected documents
    const documents = formData.getAll('documents') as string[];
    
    const data: CreateEmployeeProfileRequest & { 
      address?: string;
      emergencyContactName?: string;
      emergencyRelationship?: string;
      emergencyPhoneNumber?: string;
      emergencyAlternatePhone?: string;
      documentsSubmitted?: string;
    } = {
      userId: createdUserId,
      employeeId: formData.get('employeeId') as string,
      gender: formData.get('gender') as string || undefined,
      dateOfBirth: formData.get('dateOfBirth') as string || undefined,
      nationality: formData.get('nationality') as string || undefined,
      maritalStatus: formData.get('maritalStatus') as string || undefined,
      department: formData.get('department') as string || undefined,
      designation: formData.get('designation') as string || undefined,
      dateOfJoining: formData.get('dateOfJoining') as string || undefined,
      employmentType: formData.get('employmentType') as string || undefined,
      reportingManager: formData.get('reportingManager') as string || undefined,
      workLocation: formData.get('workLocation') as string || undefined,
      bankName: formData.get('bankName') as string || undefined,
      accountNumber: formData.get('accountNumber') as string || undefined,
      ifscCode: formData.get('ifscCode') as string || undefined,
      branch: formData.get('branch') as string || undefined,
      panNumber: formData.get('panNumber') as string || undefined,
      city: formData.get('city') as string || undefined,
      state: formData.get('state') as string || undefined,
      postalCode: formData.get('postalCode') as string || undefined,
      address: formData.get('address') as string || undefined,
      emergencyContactName: formData.get('emergencyContactName') as string || undefined,
      emergencyRelationship: formData.get('emergencyRelationship') as string || undefined,
      emergencyPhoneNumber: formData.get('emergencyPhoneNumber') as string || undefined,
      emergencyAlternatePhone: formData.get('emergencyAlternatePhone') as string || undefined,
      documentsSubmitted: documents.join(', ') || undefined,
    };

    createEmployeeProfileMutation.mutate(data);
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
            <h1 className="text-3xl font-bold text-white">Employee Registration Form</h1>
            <p className="mt-2 text-orange-100">Complete employee registration and profile setup</p>
          </div>

          {/* Progress Steps */}
          <div className="px-8 py-4 bg-gray-50 border-b">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4, 5, 6].map((step) => (
                <React.Fragment key={step}>
                  <div className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                        currentStep >= step
                          ? 'bg-orange-600 text-white'
                          : 'bg-gray-300 text-gray-600'
                      }`}
                    >
                      {step}
                    </div>
                    <span
                      className={`ml-1 text-xs font-medium ${
                        currentStep >= step ? 'text-orange-600' : 'text-gray-500'
                      }`}
                    >
                      {step === 1 && 'Account'}
                      {step === 2 && 'Personal'}
                      {step === 3 && 'Employment'}
                      {step === 4 && 'Bank'}
                      {step === 5 && 'Emergency'}
                      {step === 6 && 'Documents'}
                    </span>
                  </div>
                  {step < totalSteps && (
                    <div
                      className={`flex-1 h-1 mx-1 ${
                        currentStep > step ? 'bg-orange-600' : 'bg-gray-300'
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Step 1: User Account Creation */}
          {currentStep === 1 && (
            <form onSubmit={handleUserRegistration} className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Step 1: Create User Account</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
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
                    Contact Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="contactNumber"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    name="password"
                    required
                    minLength={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={registerUserMutation.isPending}
                    className="px-6 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50"
                  >
                    {registerUserMutation.isPending ? 'Creating Account...' : 'Create Account & Continue'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Steps 2-6: Profile Information */}
          {currentStep > 1 && (
            <form onSubmit={handleSubmit}>
              <div className="p-8">
                {/* Step 2: Personal Information */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Step 2: Personal Information</h2>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Employee ID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="employeeId"
                        required
                        placeholder="e.g., EMP001"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                        <div className="flex gap-4 mt-2">
                          <label className="flex items-center">
                            <input type="radio" name="gender" value="male" className="mr-2" />
                            <span>Male</span>
                          </label>
                          <label className="flex items-center">
                            <input type="radio" name="gender" value="female" className="mr-2" />
                            <span>Female</span>
                          </label>
                          <label className="flex items-center">
                            <input type="radio" name="gender" value="other" className="mr-2" />
                            <span>Other</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                        <input
                          type="date"
                          name="dateOfBirth"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
                        <input
                          type="text"
                          name="nationality"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Marital Status</label>
                        <div className="flex gap-4 mt-2">
                          <label className="flex items-center">
                            <input type="radio" name="maritalStatus" value="single" className="mr-2" />
                            <span>Single</span>
                          </label>
                          <label className="flex items-center">
                            <input type="radio" name="maritalStatus" value="married" className="mr-2" />
                            <span>Married</span>
                          </label>
                          <label className="flex items-center">
                            <input type="radio" name="maritalStatus" value="other" className="mr-2" />
                            <span>Other</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <textarea
                        name="address"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                        <input
                          type="text"
                          name="city"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">State/Province</label>
                        <input
                          type="text"
                          name="state"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                        <input
                          type="text"
                          name="postalCode"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Employment Information */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Step 3: Employment Information</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                        <input
                          type="text"
                          name="department"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Designation / Job Title</label>
                        <input
                          type="text"
                          name="designation"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date of Joining</label>
                      <input
                        type="date"
                        name="dateOfJoining"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                        <label className="flex items-center">
                          <input type="radio" name="employmentType" value="full-time" className="mr-2" />
                          <span>Full-Time</span>
                        </label>
                        <label className="flex items-center">
                          <input type="radio" name="employmentType" value="part-time" className="mr-2" />
                          <span>Part-Time</span>
                        </label>
                        <label className="flex items-center">
                          <input type="radio" name="employmentType" value="contract" className="mr-2" />
                          <span>Contract</span>
                        </label>
                        <label className="flex items-center">
                          <input type="radio" name="employmentType" value="intern" className="mr-2" />
                          <span>Intern</span>
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reporting Manager</label>
                        <input
                          type="text"
                          name="reportingManager"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Work Location</label>
                        <input
                          type="text"
                          name="workLocation"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4: Bank Details */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Step 4: Bank Details</h2>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                      <input
                        type="text"
                        name="bankName"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                      <input
                        type="text"
                        name="accountNumber"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">IFSC / Routing Number</label>
                      <input
                        type="text"
                        name="ifscCode"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                      <input
                        type="text"
                        name="branch"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">PAN / Tax ID</label>
                      <input
                        type="text"
                        name="panNumber"
                        maxLength={10}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                )}

                {/* Step 5: Emergency Contact Information */}
                {currentStep === 5 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Step 5: Emergency Contact Information</h2>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                      <input
                        type="text"
                        name="emergencyContactName"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                      <input
                        type="text"
                        name="emergencyRelationship"
                        placeholder="e.g., Father, Mother, Spouse, Guardian"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                        <input
                          type="tel"
                          name="emergencyPhoneNumber"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Alternate Phone Number</label>
                        <input
                          type="tel"
                          name="emergencyAlternatePhone"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 6: Documents & Declaration */}
                {currentStep === 6 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Step 6: Documents & Declaration</h2>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Documents Submitted</label>
                      <div className="space-y-2 border border-gray-300 rounded-md p-4">
                        {[
                          'Resume',
                          'ID Proof',
                          'Previous Salary Payslip',
                          'Educational Certificates',
                          'Experience Certificates',
                          'Relieving letter',
                        ].map((doc) => (
                          <label key={doc} className="flex items-center">
                            <input
                              type="checkbox"
                              name="documents"
                              value={doc}
                              className="mr-2"
                            />
                            <span>{doc}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="border-t pt-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Declaration</h3>
                      <p className="text-sm text-gray-700 mb-4">
                        I hereby declare that the above information is true and correct to the best of my knowledge.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Employee Signature
                          </label>
                          <div className="border-b-2 border-gray-400 h-10"></div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                          <input
                            type="date"
                            defaultValue={new Date().toISOString().split('T')[0]}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                            readOnly
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
                    disabled={currentStep === 2}
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
                      disabled={createEmployeeProfileMutation.isPending}
                      className="px-6 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50"
                    >
                      {createEmployeeProfileMutation.isPending ? 'Submitting...' : 'Submit Registration'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
};
