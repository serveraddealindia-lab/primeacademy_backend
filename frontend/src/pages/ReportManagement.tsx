import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '../components/Layout';
import { reportAPI } from '../api/report.api';
import { batchAPI } from '../api/batch.api';

export const ReportManagement: React.FC = () => {
  const [activeReport, setActiveReport] = useState<'all-analysis' | 'students-without-batch' | 'batch-attendance' | 'pending-payments' | 'portfolio-status' | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Fetch batches for batch attendance report
  const { data: batchesData } = useQuery({
    queryKey: ['batches'],
    queryFn: () => batchAPI.getAllBatches(),
  });

  // Fetch students without batch report
  const { data: studentsWithoutBatchData, isLoading: isLoadingStudents } = useQuery({
    queryKey: ['reports', 'students-without-batch'],
    queryFn: () => reportAPI.getStudentsWithoutBatch(),
    enabled: activeReport === 'students-without-batch',
  });

  // Fetch batch attendance report
  const { data: batchAttendanceData, isLoading: isLoadingAttendance } = useQuery({
    queryKey: ['reports', 'batch-attendance', selectedBatchId, dateFrom, dateTo],
    queryFn: () => reportAPI.getBatchAttendance(selectedBatchId!, { from: dateFrom || undefined, to: dateTo || undefined }),
    enabled: activeReport === 'batch-attendance' && selectedBatchId !== null,
  });

  // Fetch pending payments report
  const { data: pendingPaymentsData, isLoading: isLoadingPayments } = useQuery({
    queryKey: ['reports', 'pending-payments'],
    queryFn: () => reportAPI.getPendingPayments(),
    enabled: activeReport === 'pending-payments',
  });

  // Fetch portfolio status report
  const { data: portfolioStatusData, isLoading: isLoadingPortfolio } = useQuery({
    queryKey: ['reports', 'portfolio-status'],
    queryFn: () => reportAPI.getPortfolioStatus(),
    enabled: activeReport === 'portfolio-status',
  });

  // Fetch all analysis reports
  const { data: allAnalysisData, isLoading: isLoadingAnalysis } = useQuery({
    queryKey: ['reports', 'all-analysis'],
    queryFn: () => reportAPI.getAllAnalysisReports(),
    enabled: activeReport === 'all-analysis',
  });

  const batches = batchesData?.data || [];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-orange-600 to-orange-500 px-8 py-6">
            <div>
              <h1 className="text-3xl font-bold text-white">Reports</h1>
              <p className="mt-2 text-orange-100">View reports</p>
            </div>
          </div>

          <div className="p-6">
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <button
                onClick={() => setActiveReport('all-analysis')}
                className={`px-4 py-3 rounded-lg font-semibold transition-colors ${
                  activeReport === 'all-analysis'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Analysis
              </button>
              <button
                onClick={() => setActiveReport('students-without-batch')}
                className={`px-4 py-3 rounded-lg font-semibold transition-colors ${
                  activeReport === 'students-without-batch'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Students Without Batch
              </button>
              <button
                onClick={() => setActiveReport('batch-attendance')}
                className={`px-4 py-3 rounded-lg font-semibold transition-colors ${
                  activeReport === 'batch-attendance'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Batch Attendance
              </button>
              <button
                onClick={() => setActiveReport('pending-payments')}
                className={`px-4 py-3 rounded-lg font-semibold transition-colors ${
                  activeReport === 'pending-payments'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pending Payments
              </button>
              <button
                onClick={() => setActiveReport('portfolio-status')}
                className={`px-4 py-3 rounded-lg font-semibold transition-colors ${
                  activeReport === 'portfolio-status'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Portfolio Status
              </button>
            </div>

            {activeReport === 'students-without-batch' && (
              <div>
                {isLoadingStudents ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined Date</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {studentsWithoutBatchData?.data.students.map((student) => (
                          <tr key={student.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">{student.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{student.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{student.phone || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{new Date(student.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-4 text-sm text-gray-600">
                      Total: {studentsWithoutBatchData?.data.totalCount || 0} students
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeReport === 'batch-attendance' && (
              <div>
                <div className="mb-4 flex gap-4">
                  <select
                    value={selectedBatchId || ''}
                    onChange={(e) => setSelectedBatchId(e.target.value ? parseInt(e.target.value) : null)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select a batch</option>
                    {batches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.title}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    placeholder="From Date"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    placeholder="To Date"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                {isLoadingAttendance ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                  </div>
                ) : batchAttendanceData?.data ? (
                  <div>
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-semibold mb-2">{batchAttendanceData.data.batch.title}</h3>
                      <p className="text-sm text-gray-600">
                        Total Sessions: {batchAttendanceData.data.totalSessions} | Total Attendances: {batchAttendanceData.data.totalAttendances}
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Present</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Absent</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {batchAttendanceData.data.studentStatistics.map((stat) => (
                            <tr key={stat.studentId} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">Student {stat.studentId}</td>
                              <td className="px-6 py-4 whitespace-nowrap">{stat.present}</td>
                              <td className="px-6 py-4 whitespace-nowrap">{stat.absent}</td>
                              <td className="px-6 py-4 whitespace-nowrap">{stat.total}</td>
                              <td className="px-6 py-4 whitespace-nowrap">{stat.attendanceRate}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-12">Select a batch to view attendance report</p>
                )}
              </div>
            )}

            {activeReport === 'pending-payments' && (
              <div>
                {isLoadingPayments ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                  </div>
                ) : pendingPaymentsData?.data ? (
                  <div>
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-semibold mb-2">Summary</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Total Pending</p>
                          <p className="font-semibold">{pendingPaymentsData.data.summary.totalPending}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Total Amount</p>
                          <p className="font-semibold">₹{pendingPaymentsData.data.summary.totalPendingAmount}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Overdue</p>
                          <p className="font-semibold">{pendingPaymentsData.data.summary.overdue.count}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Upcoming</p>
                          <p className="font-semibold">{pendingPaymentsData.data.summary.upcoming.count}</p>
                        </div>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {pendingPaymentsData.data.payments.map((payment) => (
                            <tr key={payment.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">{payment.student.name}</td>
                              <td className="px-6 py-4 whitespace-nowrap">₹{payment.amount.toFixed(2)}</td>
                              <td className="px-6 py-4 whitespace-nowrap">{new Date(payment.dueDate).toLocaleDateString()}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                  payment.isOverdue ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {payment.isOverdue ? 'Overdue' : 'Pending'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {activeReport === 'portfolio-status' && (
              <div>
                {isLoadingPortfolio ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                  </div>
                ) : portfolioStatusData?.data ? (
                  <div>
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-semibold mb-2">Summary</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Total</p>
                          <p className="font-semibold">{portfolioStatusData.data.summary.total}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Pending</p>
                          <p className="font-semibold">{portfolioStatusData.data.summary.pending}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Approved</p>
                          <p className="font-semibold">{portfolioStatusData.data.summary.approved}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Rejected</p>
                          <p className="font-semibold">{portfolioStatusData.data.summary.rejected}</p>
                        </div>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Files</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {portfolioStatusData.data.portfolios.map((portfolio) => (
                            <tr key={portfolio.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">{portfolio.student.name}</td>
                              <td className="px-6 py-4 whitespace-nowrap">{portfolio.batch.title}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                  portfolio.status === 'approved' ? 'bg-green-100 text-green-800' :
                                  portfolio.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {portfolio.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">{Object.keys(portfolio.files || {}).length}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {activeReport === 'all-analysis' && (
              <div>
                {isLoadingAnalysis ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                  </div>
                ) : allAnalysisData?.data ? (
                  <div className="space-y-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">
                        Generated at: {new Date(allAnalysisData.data.generatedAt).toLocaleString()}
                      </p>
                    </div>
                    
                    {/* Students Summary */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-4">Students Summary</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-600">Total Students</p>
                          <p className="text-2xl font-bold text-blue-600">{allAnalysisData.data.summary.students.total}</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-600">With Batch</p>
                          <p className="text-2xl font-bold text-green-600">{allAnalysisData.data.summary.students.withBatch}</p>
                        </div>
                        <div className="bg-yellow-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-600">Without Batch</p>
                          <p className="text-2xl font-bold text-yellow-600">{allAnalysisData.data.summary.students.withoutBatch}</p>
                        </div>
                      </div>
                    </div>

                    {/* Batches Summary */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-4">Batches Summary</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-600">Total Batches</p>
                          <p className="text-2xl font-bold text-blue-600">{allAnalysisData.data.summary.batches.total}</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-600">Active Batches</p>
                          <p className="text-2xl font-bold text-green-600">{allAnalysisData.data.summary.batches.active}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-600">Ended Batches</p>
                          <p className="text-2xl font-bold text-gray-600">{allAnalysisData.data.summary.batches.ended}</p>
                        </div>
                      </div>
                    </div>

                    {/* Sessions Summary */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-4">Sessions Summary</h3>
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Total Sessions</p>
                        <p className="text-2xl font-bold text-purple-600">{allAnalysisData.data.summary.sessions.total}</p>
                      </div>
                    </div>

                    {/* Payments Summary */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-4">Payments Summary</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-600">Total Payments</p>
                          <p className="text-2xl font-bold text-blue-600">{allAnalysisData.data.summary.payments.total}</p>
                        </div>
                        <div className="bg-yellow-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-600">Pending</p>
                          <p className="text-2xl font-bold text-yellow-600">{allAnalysisData.data.summary.payments.pending}</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-600">Total Amount</p>
                          <p className="text-lg font-bold text-green-600">₹{allAnalysisData.data.summary.payments.totalAmount.toFixed(2)}</p>
                        </div>
                        <div className="bg-teal-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-600">Paid Amount</p>
                          <p className="text-lg font-bold text-teal-600">₹{allAnalysisData.data.summary.payments.paidAmount.toFixed(2)}</p>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-600">Pending Amount</p>
                          <p className="text-lg font-bold text-red-600">₹{allAnalysisData.data.summary.payments.pendingAmount.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Portfolios Summary */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-4">Portfolios Summary</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-600">Total Portfolios</p>
                          <p className="text-2xl font-bold text-blue-600">{allAnalysisData.data.summary.portfolios.total}</p>
                        </div>
                        <div className="bg-yellow-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-600">Pending</p>
                          <p className="text-2xl font-bold text-yellow-600">{allAnalysisData.data.summary.portfolios.pending}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {!activeReport && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg mb-4">Select a report type to view</p>
                <p className="text-sm text-gray-400">Available reports: All Analysis, Students Without Batch, Batch Attendance, Pending Payments, Portfolio Status</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

