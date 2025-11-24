import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { employeeAPI, EmployeeProfile } from '../api/employee.api';
import { userAPI, UpdateUserRequest } from '../api/user.api';
import api from '../api/axios';

export const EmployeeEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  // Fetch employee data
  const { data: employeeData, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: async () => {
      const userResponse = await api.get(`/users/${id}`);
      const profileResponse = await employeeAPI.getEmployeeProfile(Number(id));
      return {
        user: userResponse.data.data.user,
        profile: profileResponse.data.employeeProfile,
      };
    },
    enabled: !!id,
  });

  const updateUserMutation = useMutation({
    mutationFn: (data: UpdateUserRequest) => userAPI.updateUser(Number(id!), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: Partial<EmployeeProfile>) => employeeAPI.updateEmployeeProfile(Number(id!), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      alert('Employee updated successfully!');
      navigate('/employees');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to update employee profile');
    },
  });

  if (user?.role !== 'admin' && user?.role !== 'superadmin') {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto">
          <div className="bg-white shadow-xl rounded-lg p-6">
            <p className="text-red-600">You don't have permission to edit employees.</p>
            <button
              onClick={() => navigate('/employees')}
              className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              Back to Employees
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

  if (!employeeData) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto">
          <div className="bg-white shadow-xl rounded-lg p-6">
            <p className="text-red-600">Employee not found.</p>
            <button
              onClick={() => navigate('/employees')}
              className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              Back to Employees
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const { user: employeeUser, profile } = employeeData;

  const handleStep1Submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: UpdateUserRequest = {
      name: formData.get('name') as string || undefined,
      email: formData.get('email') as string || undefined,
      phone: formData.get('phone') as string || undefined,
      isActive: formData.get('isActive') === 'true',
    };
    updateUserMutation.mutate(data, {
      onSuccess: () => {
        setCurrentStep(2);
      },
    });
  };

  const handleStep2Submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: Partial<EmployeeProfile> = {
      employeeId: formData.get('employeeId') as string || undefined,
      gender: formData.get('gender') as string || undefined,
      dateOfBirth: formData.get('dateOfBirth') as string || undefined,
      nationality: formData.get('nationality') as string || undefined,
      maritalStatus: formData.get('maritalStatus') as string || undefined,
    };
    updateProfileMutation.mutate(data);
  };

  const handleStep3Submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: Partial<EmployeeProfile> = {
      department: formData.get('department') as string || undefined,
      designation: formData.get('designation') as string || undefined,
      dateOfJoining: formData.get('dateOfJoining') as string || undefined,
      employmentType: formData.get('employmentType') as string || undefined,
      reportingManager: formData.get('reportingManager') as string || undefined,
      workLocation: formData.get('workLocation') as string || undefined,
    };
    updateProfileMutation.mutate(data);
  };

  const handleStep4Submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: Partial<EmployeeProfile> = {
      bankName: formData.get('bankName') as string || undefined,
      accountNumber: formData.get('accountNumber') as string || undefined,
      ifscCode: formData.get('ifscCode') as string || undefined,
      branch: formData.get('branch') as string || undefined,
      panNumber: formData.get('panNumber') as string || undefined,
      city: formData.get('city') as string || undefined,
      state: formData.get('state') as string || undefined,
      postalCode: formData.get('postalCode') as string || undefined,
    };
    updateProfileMutation.mutate(data);
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-orange-600 to-orange-500 px-8 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-white">Edit Employee</h1>
                <p className="mt-2 text-orange-100">Update employee information</p>
              </div>
              <button
                onClick={() => navigate('/employees')}
                className="px-4 py-2 bg-white text-orange-600 rounded-lg font-semibold hover:bg-orange-50 transition-colors"
              >
                ← Back
              </button>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="px-8 py-4 bg-gray-50 border-b">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                        currentStep >= step
                          ? 'bg-orange-600 text-white'
                          : 'bg-gray-300 text-gray-600'
                      }`}
                    >
                      {step}
                    </div>
                    <span className="mt-2 text-xs text-gray-600">
                      {step === 1 && 'Basic Info'}
                      {step === 2 && 'Personal Info'}
                      {step === 3 && 'Employment'}
                      {step === 4 && 'Bank Details'}
                    </span>
                  </div>
                  {step < totalSteps && (
                    <div
                      className={`flex-1 h-1 mx-2 ${
                        currentStep > step ? 'bg-orange-600' : 'bg-gray-300'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="p-8">
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <form onSubmit={handleStep1Submit} className="space-y-6">
                <h2 className="text-2xl font-bold mb-6">Basic Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                    <input
                      type="text"
                      name="name"
                      defaultValue={employeeUser.name}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                    <input
                      type="email"
                      name="email"
                      defaultValue={employeeUser.email}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      defaultValue={employeeUser.phone || ''}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
                    <select
                      name="isActive"
                      defaultValue={employeeUser.isActive ? 'true' : 'false'}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-4 pt-6">
                  <button
                    type="submit"
                    disabled={updateUserMutation.isPending}
                    className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50"
                  >
                    {updateUserMutation.isPending ? 'Saving...' : 'Save & Continue'}
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: Personal Information */}
            {currentStep === 2 && (
              <form onSubmit={handleStep2Submit} className="space-y-6">
                <h2 className="text-2xl font-bold mb-6">Personal Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Employee ID *</label>
                    <input
                      type="text"
                      name="employeeId"
                      defaultValue={profile?.employeeId || ''}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                    <select
                      name="gender"
                      defaultValue={profile?.gender || ''}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      defaultValue={profile?.dateOfBirth ? profile.dateOfBirth.split('T')[0] : ''}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nationality</label>
                    <input
                      type="text"
                      name="nationality"
                      defaultValue={profile?.nationality || ''}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Marital Status</label>
                    <select
                      name="maritalStatus"
                      defaultValue={profile?.maritalStatus || ''}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Select</option>
                      <option value="single">Single</option>
                      <option value="married">Married</option>
                      <option value="divorced">Divorced</option>
                      <option value="widowed">Widowed</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-4 pt-6">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50"
                  >
                    {updateProfileMutation.isPending ? 'Saving...' : 'Save & Continue'}
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: Employment Details */}
            {currentStep === 3 && (
              <form onSubmit={handleStep3Submit} className="space-y-6">
                <h2 className="text-2xl font-bold mb-6">Employment Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                    <input
                      type="text"
                      name="department"
                      defaultValue={profile?.department || ''}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Designation</label>
                    <input
                      type="text"
                      name="designation"
                      defaultValue={profile?.designation || ''}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date of Joining</label>
                    <input
                      type="date"
                      name="dateOfJoining"
                      defaultValue={profile?.dateOfJoining ? profile.dateOfJoining.split('T')[0] : ''}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Employment Type</label>
                    <select
                      name="employmentType"
                      defaultValue={profile?.employmentType || ''}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Select</option>
                      <option value="full-time">Full-time</option>
                      <option value="part-time">Part-time</option>
                      <option value="contract">Contract</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Reporting Manager</label>
                    <input
                      type="text"
                      name="reportingManager"
                      defaultValue={profile?.reportingManager || ''}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Work Location</label>
                    <input
                      type="text"
                      name="workLocation"
                      defaultValue={profile?.workLocation || ''}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
                <div className="flex gap-4 pt-6">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50"
                  >
                    {updateProfileMutation.isPending ? 'Saving...' : 'Save & Continue'}
                  </button>
                </div>
              </form>
            )}

            {/* Step 4: Bank Details */}
            {currentStep === 4 && (
              <form onSubmit={handleStep4Submit} className="space-y-6">
                <h2 className="text-2xl font-bold mb-6">Bank Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                    <input
                      type="text"
                      name="bankName"
                      defaultValue={profile?.bankName || ''}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
                    <input
                      type="text"
                      name="accountNumber"
                      defaultValue={profile?.accountNumber || ''}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">IFSC Code</label>
                    <input
                      type="text"
                      name="ifscCode"
                      defaultValue={profile?.ifscCode || ''}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
                    <input
                      type="text"
                      name="branch"
                      defaultValue={profile?.branch || ''}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">PAN Number</label>
                    <input
                      type="text"
                      name="panNumber"
                      defaultValue={profile?.panNumber || ''}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                    <input
                      type="text"
                      name="city"
                      defaultValue={profile?.city || ''}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                    <input
                      type="text"
                      name="state"
                      defaultValue={profile?.state || ''}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Postal Code</label>
                    <input
                      type="text"
                      name="postalCode"
                      defaultValue={profile?.postalCode || ''}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
                <div className="flex gap-4 pt-6">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50"
                  >
                    {updateProfileMutation.isPending ? 'Saving...' : 'Save & Finish'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

