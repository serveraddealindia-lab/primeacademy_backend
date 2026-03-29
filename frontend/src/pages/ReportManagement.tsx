import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '../components/Layout';
import { reportAPI } from '../api/report.api';
import { batchAPI } from '../api/batch.api';
import { facultyAPI } from '../api/faculty.api';
import { attendanceReportAPI } from '../api/attendanceReport.api';
import { formatDateDDMMYYYY } from '../utils/dateUtils';

export const ReportManagement: React.FC = () => {
  const [activeReport, setActiveReport] = useState<
    | 'all-analysis'
    | 'students-without-batch'
    | 'batch-attendance'
    | 'pending-payments'
    | 'portfolio-status'
    | 'faculty-attendance'
    | 'student-attendance'
    | 'punch-summary'
    | 'lecture-punch'
    | 'faculty-occupancy'
    | 'batch-details'
    | 'saved-reports'
    | null
  >(null);
  const [batchAttendanceBatchId, setBatchAttendanceBatchId] = useState<number | null>(null);
  const [batchAttendanceFrom, setBatchAttendanceFrom] = useState<string>('');
  const [batchAttendanceTo, setBatchAttendanceTo] = useState<string>('');

  const [facultyReportFacultyId, setFacultyReportFacultyId] = useState<number | null>(null);
  const [facultyReportBatchId, setFacultyReportBatchId] = useState<number | null>(null);
  const [facultyReportFrom, setFacultyReportFrom] = useState<string>('');
  const [facultyReportTo, setFacultyReportTo] = useState<string>('');

  const [studentReportBatchId, setStudentReportBatchId] = useState<number | null>(null);
  const [studentReportStudentId, setStudentReportStudentId] = useState<number | null>(null);
  const [studentReportFrom, setStudentReportFrom] = useState<string>('');
  const [studentReportTo, setStudentReportTo] = useState<string>('');
  const [studentReportFacultyId, setStudentReportFacultyId] = useState<number | null>(null);
  const [studentReportSoftware, setStudentReportSoftware] = useState<string>('');

  const [punchReportUserId, setPunchReportUserId] = useState<number | null>(null);
  const [punchReportRole, setPunchReportRole] = useState<string>('');
  const [punchReportFrom, setPunchReportFrom] = useState<string>('');
  const [punchReportTo, setPunchReportTo] = useState<string>('');
  const [lecturePunchFacultyId, setLecturePunchFacultyId] = useState<number | null>(null);
  const [lecturePunchBatchId, setLecturePunchBatchId] = useState<number | null>(null);
  const [lecturePunchSoftware, setLecturePunchSoftware] = useState<string>('');
  const [lecturePunchFrom, setLecturePunchFrom] = useState<string>('');
  const [lecturePunchTo, setLecturePunchTo] = useState<string>('');

  const [occupancyFacultyId, setOccupancyFacultyId] = useState<number | null>(null);
  const [occupancyFrom, setOccupancyFrom] = useState<string>('');
  const [occupancyTo, setOccupancyTo] = useState<string>('');

  const [batchDetailsType, setBatchDetailsType] = useState<'present' | 'future'>('present');
  const [batchDetailsFacultyId, setBatchDetailsFacultyId] = useState<number | null>(null);
  const [batchDetailsDays, setBatchDetailsDays] = useState<string>('');

  // Saved Reports state
  const [savedReportsPage, setSavedReportsPage] = useState(1);
  const [savedReportsLimit] = useState(20); // Fixed at 20 per page
  const [savedReportsFilterType, setSavedReportsFilterType] = useState<string>('');
  const [savedReportsFrom, setSavedReportsFrom] = useState<string>('');
  const [savedReportsTo, setSavedReportsTo] = useState<string>('');
  const [selectedReportData, setSelectedReportData] = useState<any>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // Helper function to download CSV
  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate CSV for Students Without Batch
  const generateCSVForStudentsWithoutBatch = (students: any[]) => {
    let csv = 'Student Name,Email,Phone,Date of Joining,Last Software Attended,Last Batch Finished Date,Status,Last Batch Faculty\n';
    students.forEach(student => {
      const row = [
        student.name || '',
        student.email || '',
        student.phone || '',
        formatDateDDMMYYYY(student.doj || student.createdAt),
        student.lastSoftwareAttended || '-',
        student.lastBatchFinishedDate ? formatDateDDMMYYYY(student.lastBatchFinishedDate) : '-',
        student.status || '-',
        student.lastBatchFaculty?.name || '-'
      ].join(',');
      csv += row + '\n';
    });
    return csv;
  };

  // Generate CSV for Batch Attendance - matches UI table exactly
  const generateCSVForBatchAttendance = (data: any) => {
    let csv = 'Student,Present,Absent,Total,Attendance Rate\n';
    if (data.studentStatistics && Array.isArray(data.studentStatistics)) {
      data.studentStatistics.forEach((stat: any) => {
        csv += `Student ${stat.studentId},${stat.present},${stat.absent},${stat.total},${stat.attendanceRate}\n`;
      });
    }
    // Add summary section
    csv += `\n# Summary\n`;
    csv += `Total Sessions,${data.totalSessions || 0}\n`;
    csv += `Total Attendances,${data.totalAttendances || 0}\n`;
    csv += `Batch Title,${data.batch?.title || ''}\n`;
    return csv;
  };

  // Generate CSV for Pending Payments - matches UI table exactly
  const generateCSVForPendingPayments = (data: any) => {
    let csv = 'Student,Amount,Due Date,Status\n';
    if (data.payments && Array.isArray(data.payments)) {
      data.payments.forEach((payment: any) => {
        const status = payment.isOverdue ? 'Overdue' : 'Pending';
        csv += `${payment.student.name},₹${payment.amount.toFixed(2)},${formatDateDDMMYYYY(payment.dueDate)},${status}\n`;
      });
    }
    // Add summary section
    csv += `\n# Summary\n`;
    csv += `Total Pending,${data.summary?.totalPending || 0}\n`;
    csv += `Total Amount,₹${data.summary?.totalPendingAmount || 0}\n`;
    csv += `Overdue Count,${data.summary?.overdue?.count || 0}\n`;
    csv += `Upcoming Count,${data.summary?.upcoming?.count || 0}\n`;
    return csv;
  };

  // Generate CSV for Portfolio Status - matches UI table exactly
  const generateCSVForPortfolioStatus = (data: any) => {
    let csv = 'Student,Batch,Status,Files Count\n';
    if (data.portfolios && Array.isArray(data.portfolios)) {
      data.portfolios.forEach((p: any) => {
        const filesCount = Object.keys(p.files || {}).length;
        csv += `${p.student?.name || ''},${p.batch?.title || ''},${p.status || ''},${filesCount}\n`;
      });
    }
    return csv;
  };

  // Generate CSV for Batch Details - matches UI table exactly
  const generateCSVForBatchDetails = (data: any) => {
    let csv = 'Batch,Students,Schedule (Days),Time,Faculty\n';
    if (data.rows && Array.isArray(data.rows)) {
      data.rows.forEach((r: any) => {
        const schedule = r.schedule || {};
        const days = schedule?.days || '-';
        const time = schedule?.time || '-';
        const facultyName = r.assignedFaculty && r.assignedFaculty.length > 0 
          ? r.assignedFaculty.map((f: any) => f.name).join(', ') 
          : '-';
        csv += `${r.batchName},${r.numberOfStudents || 0},"${days}","${time}","${facultyName}"\n`;
      });
    }
    return csv;
  };

  // Generate CSV for All Analysis Report
  const generateCSVForAllAnalysis = (data: any) => {
    let csv = '# Complete System Analysis Report\n';
    csv += `# Generated: ${new Date().toLocaleString()}\n\n`;
    
    csv += '# STUDENTS SUMMARY\n';
    csv += `Total Students,${data.summary?.students?.total || 0}\n`;
    csv += `With Batch,${data.summary?.students?.withBatch || 0}\n`;
    csv += `Without Batch,${data.summary?.students?.withoutBatch || 0}\n\n`;
    
    csv += '# BATCHES SUMMARY\n';
    csv += `Total Batches,${data.summary?.batches?.total || 0}\n`;
    csv += `Active Batches,${data.summary?.batches?.active || 0}\n`;
    csv += `Ended Batches,${data.summary?.batches?.ended || 0}\n\n`;
    
    csv += '# SESSIONS SUMMARY\n';
    csv += `Total Sessions,${data.summary?.sessions?.total || 0}\n\n`;
    
    csv += '# PAYMENTS SUMMARY\n';
    csv += `Total Transactions,${data.summary?.payments?.total || 0}\n`;
    csv += `Pending Transactions,${data.summary?.payments?.pending || 0}\n`;
    csv += `Total Amount,₹${data.summary?.payments?.totalAmount || 0}\n`;
    csv += `Paid Amount,₹${data.summary?.payments?.paidAmount || 0}\n`;
    csv += `Pending Amount,₹${data.summary?.payments?.pendingAmount || 0}\n\n`;
    
    csv += '# PORTFOLIOS SUMMARY\n';
    csv += `Total Portfolios,${data.summary?.portfolios?.total || 0}\n`;
    csv += `Pending Portfolios,${data.summary?.portfolios?.pending || 0}\n`;
    csv += `Approved Portfolios,${data.summary?.portfolios?.approved || 0}\n`;
    csv += `Rejected Portfolios,${data.summary?.portfolios?.rejected || 0}\n`;
    
    return csv;
  };

  // Fetch batches for batch attendance report
  const { data: batchesData } = useQuery({
    queryKey: ['batches'],
    queryFn: () => batchAPI.getAllBatches(),
  });

  const { data: facultyData } = useQuery({
    queryKey: ['faculty'],
    queryFn: () => facultyAPI.getAllFaculty(),
  });

  // Fetch students without batch report
  const { data: studentsWithoutBatchData, isLoading: isLoadingStudents, refetch: refetchStudentsWithoutBatch, error: studentsError } = useQuery({
    queryKey: ['reports', 'students-without-batch'],
    queryFn: async () => {
      console.log('Fetching students without batch');
      const result = await reportAPI.getStudentsWithoutBatch();
      console.log('Students without batch response:', result);
      return result;
    },
    enabled: false, // Only fetch when Generate button clicked
    retry: false,
  });

  // Fetch batch attendance report
  const { data: batchAttendanceData, isLoading: isLoadingAttendance, refetch: refetchBatchAttendance, error: attendanceError } = useQuery({
    queryKey: ['reports', 'batch-attendance', batchAttendanceBatchId, batchAttendanceFrom, batchAttendanceTo],
    queryFn: async () => {
      console.log('Fetching batch attendance with:', { batchId: batchAttendanceBatchId, from: batchAttendanceFrom, to: batchAttendanceTo });
      const result = await reportAPI.getBatchAttendance(batchAttendanceBatchId!, {
        from: batchAttendanceFrom || undefined,
        to: batchAttendanceTo || undefined,
      });
      console.log('Batch attendance response:', result);
      return result;
    },
    enabled: false, // Only fetch when Generate button clicked
    retry: false,
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
  const { data: allAnalysisData, isLoading: isLoadingAnalysis, refetch: refetchAnalysis } = useQuery({
    queryKey: ['reports', 'all-analysis'],
    queryFn: async () => {
      console.log('Fetching all analysis report');
      const result = await reportAPI.getAllAnalysisReports();
      console.log('All analysis response:', result);
      return result;
    },
    enabled: false, // Only fetch when Generate button clicked
    retry: false,
  });

  const facultyAttendanceFilters = useMemo(
    () => ({
      facultyId: facultyReportFacultyId ?? undefined,
      batchId: facultyReportBatchId ?? undefined,
      from: facultyReportFrom || undefined,
      to: facultyReportTo || undefined,
    }),
    [facultyReportFacultyId, facultyReportBatchId, facultyReportFrom, facultyReportTo]
  );

  const studentAttendanceFilters = useMemo(
    () => ({
      batchId: studentReportBatchId ?? undefined,
      studentId: studentReportStudentId ?? undefined,
      facultyId: studentReportFacultyId ?? undefined,
      software: studentReportSoftware || undefined,
      from: studentReportFrom || undefined,
      to: studentReportTo || undefined,
    }),
    [studentReportBatchId, studentReportStudentId, studentReportFacultyId, studentReportSoftware, studentReportFrom, studentReportTo]
  );

  const punchSummaryFilters = useMemo(
    () => ({
      userId: punchReportUserId ?? undefined,
      role: punchReportRole || undefined,
      from: punchReportFrom || undefined,
      to: punchReportTo || undefined,
    }),
    [punchReportUserId, punchReportRole, punchReportFrom, punchReportTo]
  );

  const { data: facultyAttendanceData, isLoading: isLoadingFacultyAttendance } = useQuery({
    queryKey: [
      'attendance-reports',
      'faculty',
      facultyReportFacultyId,
      facultyReportBatchId,
      facultyReportFrom,
      facultyReportTo,
    ],
    queryFn: () =>
      attendanceReportAPI.getFacultyAttendance(facultyAttendanceFilters),
    enabled: activeReport === 'faculty-attendance',
  });

  const { data: studentAttendanceData, isLoading: isLoadingStudentAttendance } = useQuery({
    queryKey: [
      'attendance-reports',
      'students',
      studentReportBatchId,
      studentReportStudentId,
      studentReportFrom,
      studentReportTo,
    ],
    queryFn: () => attendanceReportAPI.getStudentAttendance(studentAttendanceFilters),
    enabled: activeReport === 'student-attendance',
  });

  const { data: punchSummaryData, isLoading: isLoadingPunchSummary } = useQuery({
    queryKey: ['attendance-reports', 'punches', punchReportUserId, punchReportRole, punchReportFrom, punchReportTo],
    queryFn: () => attendanceReportAPI.getPunchSummary(punchSummaryFilters),
    enabled: activeReport === 'punch-summary',
  });

  const lecturePunchFilters = useMemo(
    () => ({
      software: lecturePunchSoftware || undefined,
      facultyId: lecturePunchFacultyId ?? undefined,
      batchId: lecturePunchBatchId ?? undefined,
      from: lecturePunchFrom || undefined,
      to: lecturePunchTo || undefined,
    }),
    [lecturePunchSoftware, lecturePunchFacultyId, lecturePunchBatchId, lecturePunchFrom, lecturePunchTo]
  );

  const { data: lecturePunchData, isLoading: isLoadingLecturePunch, refetch: refetchLecturePunch } = useQuery({
    queryKey: ['attendance-reports', 'lecture-punches', lecturePunchSoftware, lecturePunchFacultyId, lecturePunchBatchId, lecturePunchFrom, lecturePunchTo],
    queryFn: async () => {
      console.log('Fetching lecture punch with:', lecturePunchFilters);
      const result = await attendanceReportAPI.getLecturePunches(lecturePunchFilters);
      console.log('Lecture punch response:', result);
      return result;
    },
    enabled: false, // Only fetch when Generate button clicked
    retry: false,
  });

  const { data: occupancyData, isLoading: isLoadingOccupancy, refetch: refetchOccupancy, error: occupancyError } = useQuery({
    queryKey: ['reports', 'faculty-occupancy', occupancyFacultyId, occupancyFrom, occupancyTo],
    queryFn: async () => {
      console.log('Fetching faculty occupancy with:', { facultyId: occupancyFacultyId, from: occupancyFrom, to: occupancyTo });
      const result = await reportAPI.getFacultyOccupancy({
        facultyId: occupancyFacultyId ?? undefined,
        from: occupancyFrom || undefined,
        to: occupancyTo || undefined,
      });
      console.log('Faculty occupancy response:', result);
      return result;
    },
    enabled: false, // Only fetch when Generate button clicked
    retry: false,
  });

  const { data: batchDetailsData, isLoading: isLoadingBatchDetails, refetch: refetchBatchDetails, error: batchDetailsError } = useQuery({
    queryKey: ['reports', 'batch-details', batchDetailsType, batchDetailsFacultyId, batchDetailsDays],
    queryFn: async () => {
      console.log('Fetching batch details with:', { type: batchDetailsType, facultyId: batchDetailsFacultyId, days: batchDetailsDays });
      const result = await reportAPI.getBatchDetails({
        type: batchDetailsType,
        facultyId: batchDetailsFacultyId ?? undefined,
        days: batchDetailsDays || undefined,
      });
      console.log('Batch details response:', result);
      return result;
    },
    enabled: false, // Only fetch when Generate button clicked
    retry: false,
  });

  // Fetch saved reports
  const { data: savedReportsData, isLoading: isLoadingSavedReports } = useQuery({
    queryKey: ['reports', 'saved', savedReportsPage, savedReportsLimit, savedReportsFilterType, savedReportsFrom, savedReportsTo],
    queryFn: async () => {
      const result = await reportAPI.getSavedReports({
        page: savedReportsPage,
        limit: savedReportsLimit,
        reportType: savedReportsFilterType || undefined,
        from: savedReportsFrom || undefined,
        to: savedReportsTo || undefined,
      });
      console.log('Saved reports response:', result);
      return result;
    },
    enabled: activeReport === 'saved-reports',
  });

  // Function to view complete report data
  const handleViewReport = async (reportId: number) => {
    try {
      console.log('Fetching report details for ID:', reportId);
      const response = await reportAPI.getSavedReportDetails(reportId);
      console.log('Received report data:', response.data);
      setSelectedReportData(response.data);
      setShowReportModal(true);
    } catch (error) {
      console.error('Failed to load report details:', error);
      alert('Failed to load report details');
    }
  };

  const batches = batchesData?.data || [];
  const faculties = facultyData?.data.users || [];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-orange-600 to-orange-500 px-4 md:px-8 py-4 md:py-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Reports</h1>
              <p className="mt-2 text-sm md:text-base text-orange-100">View reports</p>
            </div>
          </div>

          <div className="p-4 md:p-6">
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-8 gap-4">
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
              <button
                onClick={() => setActiveReport('faculty-attendance')}
                className={`px-4 py-3 rounded-lg font-semibold transition-colors ${
                  activeReport === 'faculty-attendance'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Faculty Attendance
              </button>
              <button
                onClick={() => setActiveReport('student-attendance')}
                className={`px-4 py-3 rounded-lg font-semibold transition-colors ${
                  activeReport === 'student-attendance'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Student Attendance
              </button>
              <button
                onClick={() => setActiveReport('punch-summary')}
                className={`px-4 py-3 rounded-lg font-semibold transition-colors ${
                  activeReport === 'punch-summary'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Punch Summary
              </button>
              <button
                onClick={() => setActiveReport('lecture-punch')}
                className={`px-4 py-3 rounded-lg font-semibold transition-colors ${
                  activeReport === 'lecture-punch'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Lecture Punch In/Out
              </button>
              <button
                onClick={() => setActiveReport('faculty-occupancy')}
                className={`px-4 py-3 rounded-lg font-semibold transition-colors ${
                  activeReport === 'faculty-occupancy'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Faculty Occupancy
              </button>
              <button
                onClick={() => setActiveReport('batch-details')}
                className={`px-4 py-3 rounded-lg font-semibold transition-colors ${
                  activeReport === 'batch-details'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Batch Details
              </button>
              <button
                onClick={() => setActiveReport('saved-reports')}
                className={`px-4 py-3 rounded-lg font-semibold transition-colors ${
                  activeReport === 'saved-reports'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Saved Reports (Database)
              </button>
            </div>

            {activeReport === 'faculty-occupancy' && (
              <div>
                <div className="flex flex-wrap gap-4 mb-4">
                  <select
                    value={occupancyFacultyId || ''}
                    onChange={(e) => setOccupancyFacultyId(e.target.value ? Number(e.target.value) : null)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">All Faculty</option>
                    {faculties.map((faculty) => (
                      <option key={faculty.id} value={faculty.id}>
                        {faculty.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={occupancyFrom}
                    onChange={(e) => setOccupancyFrom(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <input
                    type="date"
                    value={occupancyTo}
                    onChange={(e) => setOccupancyTo(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <button
                    onClick={() => refetchOccupancy()}
                    className="px-6 py-2 bg-orange-600 text-white font-semibold rounded-md hover:bg-orange-700 transition-colors inline-flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Generate Report
                  </button>
                </div>

                {isLoadingOccupancy ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                  </div>
                ) : occupancyError ? (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 font-semibold">Error loading report</p>
                    <p className="text-sm text-red-600 mt-2">{(occupancyError as Error).message || 'Failed to fetch faculty occupancy'}</p>
                  </div>
                ) : occupancyData?.data ? (
                  <div>
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">Working Hours</div>
                        <div className="font-semibold">{occupancyData.data.summary.workingHours}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Occupied Hours</div>
                        <div className="font-semibold">{occupancyData.data.summary.occupiedHours}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Free Hours</div>
                        <div className="font-semibold">{occupancyData.data.summary.freeHours}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Occupancy %</div>
                        <div className="font-semibold">{occupancyData.data.summary.occupancyPercent}%</div>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Faculty</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Working</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Occupied</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Free</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Occupancy %</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {occupancyData.data.rows.map((r) => (
                            <tr key={r.facultyId} className="hover:bg-gray-50">
                              <td className="px-6 py-4 text-sm text-gray-900">{r.facultyName}</td>
                              <td className="px-6 py-4 text-sm text-gray-700">{r.workingHours}</td>
                              <td className="px-6 py-4 text-sm text-gray-700">{r.occupiedHours}</td>
                              <td className="px-6 py-4 text-sm text-gray-700">{r.freeHours}</td>
                              <td className="px-6 py-4 text-sm text-gray-900 font-semibold">{r.occupancyPercent}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-12">No occupancy data for selected filters.</p>
                )}
              </div>
            )}

            {activeReport === 'batch-details' && (
              <div>
                <div className="flex flex-wrap gap-4 mb-4">
                  <select
                    value={batchDetailsType}
                    onChange={(e) => setBatchDetailsType(e.target.value as 'present' | 'future')}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="present">Present Batches</option>
                    <option value="future">Future Batches</option>
                  </select>
                  <select
                    value={batchDetailsFacultyId || ''}
                    onChange={(e) => setBatchDetailsFacultyId(e.target.value ? Number(e.target.value) : null)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">All Faculty</option>
                    {faculties.map((faculty) => (
                      <option key={faculty.id} value={faculty.id}>
                        {faculty.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Days (e.g. monday)"
                    value={batchDetailsDays}
                    onChange={(e) => setBatchDetailsDays(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <button
                    onClick={() => refetchBatchDetails()}
                    className="px-6 py-2 bg-orange-600 text-white font-semibold rounded-md hover:bg-orange-700 transition-colors inline-flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Generate Report
                  </button>
                </div>

                {isLoadingBatchDetails ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                  </div>
                ) : batchDetailsError ? (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 font-semibold">Error loading report</p>
                    <p className="text-sm text-red-600 mt-2">{(batchDetailsError as Error).message || 'Failed to fetch batch details'}</p>
                  </div>
                ) : batchDetailsData?.data ? (
                  <div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Students</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Schedule (Days)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Faculty</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {batchDetailsData.data.rows && batchDetailsData.data.rows.length > 0 ? (
                            batchDetailsData.data.rows.map((r: any) => {
                              // Parse schedule to extract days and time
                              const schedule = r.schedule || {};
                              const days = schedule?.days || '-';
                              const time = schedule?.time || '-';
                              const facultyName = r.assignedFaculty && r.assignedFaculty.length > 0 
                                ? r.assignedFaculty.map((f: any) => f.name).join(', ') 
                                : '-';
                              
                              return (
                                <tr key={r.batchId} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 text-sm text-gray-900">{r.batchName}</td>
                                  <td className="px-6 py-4 text-sm text-gray-700">{r.numberOfStudents || 0}</td>
                                  <td className="px-6 py-4 text-sm text-gray-700">{days}</td>
                                  <td className="px-6 py-4 text-sm text-gray-700">{time}</td>
                                  <td className="px-6 py-4 text-sm text-gray-700">{facultyName}</td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                No batch details found. Click "Generate Report" to fetch data.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="mb-4 flex gap-2 mt-4">
                    <button
                      onClick={() => {
                        const csvContent = generateCSVForBatchDetails(batchDetailsData.data);
                        downloadCSV(csvContent, `batch-details_${batchDetailsType}_${new Date().toISOString().split('T')[0]}.csv`);
                      }}
                      className="px-6 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors inline-flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download CSV
                    </button>
                  </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-12">No batch details data for selected filters.</p>
                )}
              </div>
            )}

            {activeReport === 'students-without-batch' && (
              <div>
                <div className="mb-4 flex gap-2">
                  <button
                    onClick={() => {
                      console.log('Generate students without batch clicked');
                      refetchStudentsWithoutBatch();
                    }}
                    className="px-6 py-2 bg-orange-600 text-white font-semibold rounded-md hover:bg-orange-700 transition-colors inline-flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Generate Report
                  </button>
                  {studentsWithoutBatchData?.data?.students && studentsWithoutBatchData.data.students.length > 0 && (
                    <button
                      onClick={() => {
                        const csvContent = generateCSVForStudentsWithoutBatch(studentsWithoutBatchData.data.students);
                        downloadCSV(csvContent, `students-without-batch_${new Date().toISOString().split('T')[0]}.csv`);
                      }}
                      className="px-6 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors inline-flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download CSV
                    </button>
                  )}
                </div>
                {isLoadingStudents ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                  </div>
                ) : studentsError ? (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 font-semibold">Error loading report</p>
                    <p className="text-sm text-red-600 mt-2">{(studentsError as Error).message || 'Failed to fetch students without batch'}</p>
                  </div>
                ) : studentsWithoutBatchData?.data?.students && studentsWithoutBatchData.data.students.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DOJ</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Software Attended</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Batch Finished</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Batch Faculty</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {studentsWithoutBatchData.data.students.map((student) => (
                          <tr key={student.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">{student.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{formatDateDDMMYYYY((student as any).doj || student.createdAt)}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{(student as any).lastSoftwareAttended || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{(student as any).lastBatchFinishedDate ? formatDateDDMMYYYY((student as any).lastBatchFinishedDate) : '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{(student as any).status || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{(student as any).lastBatchFaculty?.name || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-4 text-sm text-gray-600">
                      Total: {studentsWithoutBatchData?.data.totalCount || 0} students
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-12">No students found without batch assignment</p>
                )}
              </div>
            )}

            {activeReport === 'batch-attendance' && (
              <div>
                <div className="mb-4 flex gap-4">
                  <select
                    value={batchAttendanceBatchId || ''}
                    onChange={(e) => setBatchAttendanceBatchId(e.target.value ? parseInt(e.target.value) : null)}
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
                    value={batchAttendanceFrom}
                    onChange={(e) => setBatchAttendanceFrom(e.target.value)}
                    placeholder="From Date"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <input
                    type="date"
                    value={batchAttendanceTo}
                    onChange={(e) => setBatchAttendanceTo(e.target.value)}
                    placeholder="To Date"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <button
                    onClick={() => {
                      console.log('Generate button clicked, batchId:', batchAttendanceBatchId);
                      refetchBatchAttendance();
                    }}
                    disabled={!batchAttendanceBatchId}
                    className="px-6 py-2 bg-orange-600 text-white font-semibold rounded-md hover:bg-orange-700 transition-colors inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Generate Report
                  </button>
                </div>
                {isLoadingAttendance ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                  </div>
                ) : attendanceError ? (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 font-semibold">Error loading report</p>
                    <p className="text-sm text-red-600 mt-2">{(attendanceError as Error).message || 'Failed to fetch batch attendance'}</p>
                  </div>
                ) : batchAttendanceData?.data ? (
                  <div>
                    <div className="mb-4 flex gap-2">
                      <div className="text-sm text-gray-600 self-center">
                        Batch: <span className="font-semibold">{batchAttendanceData.data.batch.title}</span> | 
                        Sessions: <span className="font-semibold">{batchAttendanceData.data.totalSessions}</span> | 
                        Attendances: <span className="font-semibold">{batchAttendanceData.data.totalAttendances}</span>
                      </div>
                      <button
                        onClick={() => {
                          const csvContent = generateCSVForBatchAttendance(batchAttendanceData.data);
                          downloadCSV(csvContent, `batch-attendance_${batchAttendanceData.data.batch.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
                        }}
                        className="px-6 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors inline-flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download CSV
                      </button>
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
                          {batchAttendanceData.data.studentStatistics && batchAttendanceData.data.studentStatistics.length > 0 ? (
                            batchAttendanceData.data.studentStatistics.map((stat) => (
                              <tr key={stat.studentId} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">Student {stat.studentId}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{stat.present}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{stat.absent}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{stat.total}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{stat.attendanceRate}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No attendance records found for selected filters</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-12">Select a batch and click Generate Report to view attendance</p>
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
                    <div className="mb-4 flex gap-2">
                      <button
                        onClick={() => {
                          const csvContent = generateCSVForPendingPayments(pendingPaymentsData.data);
                          downloadCSV(csvContent, `pending-payments_${new Date().toISOString().split('T')[0]}.csv`);
                        }}
                        className="px-6 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors inline-flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download CSV
                      </button>
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
                              <td className="px-6 py-4 whitespace-nowrap">{formatDateDDMMYYYY(payment.dueDate)}</td>
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
                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                      <div className="inline-block min-w-full align-middle sm:px-0">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Batch</th>
                              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Files</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {portfolioStatusData.data.portfolios.map((portfolio) => (
                              <tr key={portfolio.id} className="hover:bg-gray-50">
                                <td className="px-3 sm:px-6 py-4">
                                  <div className="text-xs sm:text-sm font-medium text-gray-900">{portfolio.student.name}</div>
                                  <div className="text-xs text-gray-500 md:hidden mt-1">{portfolio.batch.title}</div>
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap hidden md:table-cell">
                                  <div className="text-xs sm:text-sm text-gray-900">{portfolio.batch.title}</div>
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                    portfolio.status === 'approved' ? 'bg-green-100 text-green-800' :
                                    portfolio.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {portfolio.status}
                                  </span>
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                                  <div className="text-xs sm:text-sm text-gray-900">{Object.keys(portfolio.files || {}).length}</div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="mb-4 flex gap-2">
                        <button
                          onClick={() => {
                            const csvContent = generateCSVForPortfolioStatus(portfolioStatusData.data);
                            downloadCSV(csvContent, `portfolio-status_${new Date().toISOString().split('T')[0]}.csv`);
                          }}
                          className="px-6 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors inline-flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download CSV
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {activeReport === 'all-analysis' && (
              <div>
                <div className="mb-4 flex gap-2">
                  <button
                    onClick={() => refetchAnalysis()}
                    className="px-6 py-2 bg-orange-600 text-white font-semibold rounded-md hover:bg-orange-700 transition-colors inline-flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Generate Report
                  </button>
                  {allAnalysisData?.data && (
                    <button
                      onClick={() => {
                        const csvContent = generateCSVForAllAnalysis(allAnalysisData.data);
                        downloadCSV(csvContent, `all-analysis_${new Date().toISOString().split('T')[0]}.csv`);
                      }}
                      className="px-6 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors inline-flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download CSV
                    </button>
                  )}
                </div>
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

            {activeReport === 'faculty-attendance' && (
              <div>
                <div className="flex flex-wrap gap-4 mb-4">
                  <select
                    value={facultyReportFacultyId || ''}
                    onChange={(e) => setFacultyReportFacultyId(e.target.value ? Number(e.target.value) : null)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">All Faculty</option>
                    {faculties.map((faculty) => (
                      <option key={faculty.id} value={faculty.id}>
                        {faculty.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={facultyReportBatchId || ''}
                    onChange={(e) => setFacultyReportBatchId(e.target.value ? Number(e.target.value) : null)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">All Batches</option>
                    {batches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.title}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={facultyReportFrom}
                    onChange={(e) => setFacultyReportFrom(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <input
                    type="date"
                    value={facultyReportTo}
                    onChange={(e) => setFacultyReportTo(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <button
                    onClick={() => attendanceReportAPI.downloadFacultyAttendanceCsv(facultyAttendanceFilters)}
                    className="px-4 py-2 bg-orange-600 text-white rounded-md font-semibold hover:bg-orange-700 transition-colors"
                  >
                    Download CSV
                  </button>
                </div>
                {isLoadingFacultyAttendance ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                  </div>
                ) : facultyAttendanceData ? (
                  <div>
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg flex flex-wrap gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Sessions</p>
                        <p className="font-semibold text-gray-900">{facultyAttendanceData.summary.sessions}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Total Present</p>
                        <p className="font-semibold text-green-700">{facultyAttendanceData.summary.totalPresent}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Total Absent</p>
                        <p className="font-semibold text-red-600">{facultyAttendanceData.summary.totalAbsent}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Average Rate</p>
                        <p className="font-semibold text-blue-600">{facultyAttendanceData.summary.averageRate}%</p>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Faculty</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Present</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Absent</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {facultyAttendanceData.rows.map((row) => (
                            <tr key={row.sessionId} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatDateDDMMYYYY(row.date)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{row.batchTitle}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{row.facultyName}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-green-700">{row.present}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{row.absent}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.attendanceRate}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-12">Select filters to view faculty attendance.</p>
                )}
              </div>
            )}

            {activeReport === 'student-attendance' && (
              <div>
                <div className="flex flex-wrap gap-4 mb-4">
                  <select
                    value={studentReportBatchId || ''}
                    onChange={(e) => setStudentReportBatchId(e.target.value ? Number(e.target.value) : null)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select Batch</option>
                    {batches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.title}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Student ID (optional)"
                    value={studentReportStudentId || ''}
                    onChange={(e) => setStudentReportStudentId(e.target.value ? Number(e.target.value) : null)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 w-48"
                  />
                  <select
                    value={studentReportFacultyId || ''}
                    onChange={(e) => setStudentReportFacultyId(e.target.value ? Number(e.target.value) : null)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">All Faculty</option>
                    {faculties.map((faculty) => (
                      <option key={faculty.id} value={faculty.id}>
                        {faculty.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Software (optional)"
                    value={studentReportSoftware}
                    onChange={(e) => setStudentReportSoftware(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 w-56"
                  />
                  <input
                    type="date"
                    value={studentReportFrom}
                    onChange={(e) => setStudentReportFrom(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <input
                    type="date"
                    value={studentReportTo}
                    onChange={(e) => setStudentReportTo(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <button
                    onClick={() => attendanceReportAPI.downloadStudentAttendanceCsv(studentAttendanceFilters)}
                    className="px-4 py-2 bg-orange-600 text-white rounded-md font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50"
                  >
                    Download CSV
                  </button>
                </div>
                {isLoadingStudentAttendance ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                  </div>
                ) : studentAttendanceData ? (
                  <div>
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg flex flex-wrap gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Students</p>
                        <p className="font-semibold text-gray-900">{studentAttendanceData.summary.students}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Average Rate</p>
                        <p className="font-semibold text-blue-600">{studentAttendanceData.summary.averageRate}%</p>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Present</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LATE</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ONLINE</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Absent</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {studentAttendanceData.rows.map((row) => (
                            <tr key={row.studentId} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <div className="font-semibold">{row.studentName}</div>
                                <div className="text-xs text-gray-500">{row.studentEmail}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-green-700">{row.present}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600">{(row as any).LATE ?? row.manualPresent}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">{(row as any).ONLINE ?? 0}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{row.absent}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.total}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.attendanceRate}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {activeReport === 'lecture-punch' && (
              <div>
                <div className="flex flex-wrap gap-4 mb-4">
                  <input
                    type="text"
                    placeholder="Software"
                    value={lecturePunchSoftware}
                    onChange={(e) => setLecturePunchSoftware(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <select
                    value={lecturePunchFacultyId || ''}
                    onChange={(e) => setLecturePunchFacultyId(e.target.value ? Number(e.target.value) : null)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">All Faculty</option>
                    {faculties.map((faculty) => (
                      <option key={faculty.id} value={faculty.id}>
                        {faculty.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={lecturePunchBatchId || ''}
                    onChange={(e) => setLecturePunchBatchId(e.target.value ? Number(e.target.value) : null)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">All Batches</option>
                    {batches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.title}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={lecturePunchFrom}
                    onChange={(e) => setLecturePunchFrom(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <input
                    type="date"
                    value={lecturePunchTo}
                    onChange={(e) => setLecturePunchTo(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <button
                    onClick={() => refetchLecturePunch()}
                    className="px-6 py-2 bg-orange-600 text-white font-semibold rounded-md hover:bg-orange-700 transition-colors inline-flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Generate Report
                  </button>
                  <button
                    onClick={() => attendanceReportAPI.downloadLecturePunchesCsv(lecturePunchFilters)}
                    className="px-4 py-2 bg-orange-600 text-white rounded-md font-semibold hover:bg-orange-700 transition-colors"
                  >
                    Download CSV
                  </button>
                </div>
                {isLoadingLecturePunch ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                  </div>
                ) : lecturePunchData ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Software</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Faculty</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Punch In</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Punch Out</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {lecturePunchData.rows.map((row) => (
                          <tr key={row.sessionId} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDateDDMMYYYY(row.date)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{row.software || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{row.facultyName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{row.batchTitle}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{row.punchInAt ? new Date(row.punchInAt).toLocaleTimeString() : '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{row.punchOutAt ? new Date(row.punchOutAt).toLocaleTimeString() : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-12">No lecture punch data for the selected filters.</p>
                )}
              </div>
            )}

            {activeReport === 'punch-summary' && (
              <div>
                <div className="flex flex-wrap gap-4 mb-4">
                  <input
                    type="number"
                    placeholder="User ID"
                    value={punchReportUserId || ''}
                    onChange={(e) => setPunchReportUserId(e.target.value ? Number(e.target.value) : null)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 w-40"
                  />
                  <select
                    value={punchReportRole}
                    onChange={(e) => setPunchReportRole(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">All Roles</option>
                    <option value="faculty">Faculty</option>
                    <option value="employee">Employee</option>
                  </select>
                  <input
                    type="date"
                    value={punchReportFrom}
                    onChange={(e) => setPunchReportFrom(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <input
                    type="date"
                    value={punchReportTo}
                    onChange={(e) => setPunchReportTo(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <button
                    onClick={() => attendanceReportAPI.downloadPunchSummaryCsv(punchSummaryFilters)}
                    className="px-4 py-2 bg-orange-600 text-white rounded-md font-semibold hover:bg-orange-700 transition-colors"
                  >
                    Download CSV
                  </button>
                </div>
                {isLoadingPunchSummary ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                  </div>
                ) : punchSummaryData ? (
                  <div>
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg flex flex-wrap gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Punches</p>
                        <p className="font-semibold text-gray-900">{punchSummaryData.summary.punches}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Total Hours</p>
                        <p className="font-semibold text-blue-600">{punchSummaryData.summary.totalHours}</p>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Punch In</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Punch Out</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {punchSummaryData.rows.map((row, idx) => (
                            <tr key={`${row.userName}-${row.date}-${idx}`} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatDateDDMMYYYY(row.date)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{row.userName}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.role}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                {row.punchInAt ? new Date(row.punchInAt).toLocaleTimeString() : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                {row.punchOutAt ? new Date(row.punchOutAt).toLocaleTimeString() : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.hours}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-12">No punch data for the selected filters.</p>
                )}  
              </div>
            )}
            
            {/* Saved Reports Section */}
            {activeReport === 'saved-reports' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Saved Reports (Database)</h2>
                  <p className="text-gray-600 mb-4">View and download all reports that have been generated and saved to the database.</p>
                              
                  {/* Filters */}
                  <div className="flex flex-wrap gap-4 mb-4">
                    <select
                      value={savedReportsFilterType}
                      onChange={(e) => setSavedReportsFilterType(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">All Report Types</option>
                      <option value="batch-attendance">Batch Attendance</option>
                      <option value="pending-payments">Pending Payments</option>
                      <option value="portfolio-status">Portfolio Status</option>
                      <option value="all-analysis">All Analysis</option>
                      <option value="faculty-occupancy">Faculty Occupancy</option>
                      <option value="batch-details">Batch Details</option>
                      <option value="faculty-attendance">Faculty Attendance</option>
                      <option value="student-attendance">Student Attendance</option>
                    </select>
                    <input
                      type="date"
                      value={savedReportsFrom}
                      onChange={(e) => setSavedReportsFrom(e.target.value)}
                      placeholder="From Date"
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <input
                      type="date"
                      value={savedReportsTo}
                      onChange={(e) => setSavedReportsTo(e.target.value)}
                      placeholder="To Date"
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <button
                      onClick={() => {
                        setSavedReportsFilterType('');
                        setSavedReportsFrom('');
                        setSavedReportsTo('');
                        setSavedReportsPage(1);
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
            
                {isLoadingSavedReports ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                    <p className="mt-4 text-gray-600">Loading saved reports...</p>
                  </div>
                ) : savedReportsData?.data.reports && savedReportsData.data.reports.length > 0 ? (
                  <div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generated By</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Records</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {savedReportsData.data.reports.map((report) => (
                            <tr key={report.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">#{report.id}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{report.reportName}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.reportType}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {report.generator?.name || `User #${report.generatedBy}`}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{report.recordCount || 'N/A'}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                  report.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  report.status === 'failed' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {report.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(report.createdAt).toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                <button
                                  onClick={() => handleViewReport(report.id)}
                                  className="text-blue-600 hover:text-blue-900 inline-flex items-center gap-1"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  Show
                                </button>
                                <button
                                  onClick={async () => {
                                    try {
                                      const blob = await reportAPI.downloadReportCSV(report.id);
                                      const url = window.URL.createObjectURL(blob);
                                      const link = document.createElement('a');
                                      link.href = url;
                                      link.download = `${report.reportType}_${report.id}.csv`;
                                      link.click();
                                      window.URL.revokeObjectURL(url);
                                    } catch (error) {
                                      console.error('Download failed:', error);
                                      alert('Failed to download report');
                                    }
                                  }}
                                  className="text-orange-600 hover:text-orange-900 inline-flex items-center gap-1"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                  Download CSV
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
            
                    {/* Pagination */}
                    {savedReportsData?.data?.pagination && savedReportsData.data.pagination.totalPages > 1 && (
                      <div className="flex items-center justify-between mt-6">
                        <div className="text-sm text-gray-700">
                          Showing {((savedReportsData.data.pagination.page - 1) * savedReportsData.data.pagination.limit) + 1} to{' '}
                          {Math.min(savedReportsData.data.pagination.page * savedReportsData.data.pagination.limit, savedReportsData.data.pagination.total)} of{' '}
                          {savedReportsData.data.pagination.total} reports
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSavedReportsPage(p => Math.max(1, p - 1))}
                            disabled={savedReportsData.data.pagination.page === 1}
                            className="px-4 py-2 bg-orange-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-700"
                          >
                            Previous
                          </button>
                          <span className="px-4 py-2 text-gray-700">
                            Page {savedReportsData.data.pagination.page} of {savedReportsData.data.pagination.totalPages}
                          </span>
                          <button
                            onClick={() => setSavedReportsPage(p => Math.min(savedReportsData.data.pagination.totalPages, p + 1))}
                            disabled={savedReportsData.data.pagination.page === savedReportsData.data.pagination.totalPages}
                            className="px-4 py-2 bg-orange-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-700"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500 text-lg">No saved reports found</p>
                    <p className="text-sm text-gray-400 mt-2">Generate some reports first, then they will appear here</p>
                  </div>
                )}
              </div>
            )}

            {/* Report Detail Modal */}
            {showReportModal && selectedReportData && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                  {/* Modal Header */}
                  <div className="bg-gradient-to-r from-orange-600 to-orange-500 px-6 py-4 flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-bold text-white">{selectedReportData.reportName}</h2>
                      <p className="text-sm text-orange-100">Type: {selectedReportData.reportType} | Generated by: {selectedReportData.generator?.name || `User #${selectedReportData.generatedBy}`}</p>
                    </div>
                    <button
                      onClick={() => setShowReportModal(false)}
                      className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Modal Body - Scrollable Content */}
                  <div className="flex-1 overflow-y-auto p-6">
                    {/* Report Meta Info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 pb-6 border-b">
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Status</p>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          selectedReportData.status === 'completed' ? 'bg-green-100 text-green-800' :
                          selectedReportData.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {selectedReportData.status}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Records</p>
                        <p className="text-sm font-medium text-gray-900">{selectedReportData.recordCount || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Generated</p>
                        <p className="text-sm text-gray-700">{new Date(selectedReportData.createdAt).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Updated</p>
                        <p className="text-sm text-gray-700">{new Date(selectedReportData.updatedAt).toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Parameters Used */}
                    {selectedReportData.parameters && Object.keys(selectedReportData.parameters).length > 0 && (
                      <div className="mb-6 pb-6 border-b">
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Filters Applied:</h3>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(selectedReportData.parameters).map(([key, value]) => (
                            <span key={key} className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                              {key}: {String(value)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Summary Section (if available) */}
                    {selectedReportData.summary && (
                      <div className="mb-6 pb-6 border-b">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Summary Statistics:</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {Object.entries(selectedReportData.summary).map(([key, value]) => (
                            <div key={key} className="bg-gray-50 p-3 rounded-lg">
                              <p className="text-xs text-gray-500 uppercase mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                              <p className="text-lg font-bold text-gray-900">
                                {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Main Data Display */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Complete Report Data:</h3>
                      
                      {/* Handle different data structures */}
                      {(() => {
                        const data = selectedReportData.data;
                        
                        // Case 1: Array data (rows, payments, portfolios, students, etc.)
                        if (Array.isArray(data)) {
                          return (
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    {Object.keys(data[0]).map((header) => (
                                      <th key={header} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {header.replace(/([A-Z])/g, ' $1').trim()}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {data.slice(0, 100).map((row, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                      {Object.values(row).map((value: any, vIdx) => (
                                        <td key={vIdx} className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {data.length > 100 && (
                                <p className="mt-2 text-sm text-gray-500">Showing first 100 of {data.length} records. Download CSV for complete data.</p>
                              )}
                            </div>
                          );
                        }
                        
                        // Case 2: Nested structure (like batch attendance with sessions)
                        if (data.sessions && Array.isArray(data.sessions)) {
                          return (
                            <div className="space-y-4">
                              {data.sessions.map((session: any, idx: number) => (
                                <div key={idx} className="border rounded-lg p-4 bg-gray-50">
                                  <div className="font-semibold text-gray-900 mb-2">
                                    Session: {session.session?.date} at {session.session?.startTime}
                                  </div>
                                  <div className="text-sm text-gray-600 mb-2">
                                    Topic: {session.session?.topic || 'N/A'} | Status: {session.session?.status}
                                  </div>
                                  {session.attendances && session.attendances.length > 0 && (
                                    <div className="overflow-x-auto mt-2">
                                      <table className="min-w-full text-sm">
                                        <thead className="bg-gray-100">
                                          <tr>
                                            <th className="px-2 py-1 text-left">Student</th>
                                            <th className="px-2 py-1 text-left">Status</th>
                                            <th className="px-2 py-1 text-left">Marked At</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {session.attendances.map((att: any, attIdx: number) => (
                                            <tr key={attIdx} className="border-t">
                                              <td className="px-2 py-1">{att.studentName}</td>
                                              <td className="px-2 py-1">
                                                <span className={`px-2 py-0.5 text-xs rounded-full ${
                                                  att.status === 'present' ? 'bg-green-100 text-green-800' :
                                                  att.status === 'absent' ? 'bg-red-100 text-red-800' :
                                                  'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                  {att.status}
                                                </span>
                                              </td>
                                              <td className="px-2 py-1 text-gray-500">{att.markedAt ? new Date(att.markedAt).toLocaleString() : 'N/A'}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          );
                        }
                        
                        // Case 3: Generic object - display as formatted JSON
                        return (
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <pre className="text-xs text-gray-700 overflow-auto max-h-96">
                              {JSON.stringify(data, null, 2)}
                            </pre>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="border-t px-6 py-4 flex justify-end gap-3">
                    <button
                      onClick={() => setShowReportModal(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const blob = await reportAPI.downloadReportCSV(selectedReportData.id);
                          const url = window.URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `${selectedReportData.reportType}_${selectedReportData.id}.csv`;
                          link.click();
                          window.URL.revokeObjectURL(url);
                        } catch (error) {
                          console.error('Download failed:', error);
                          alert('Failed to download report');
                        }
                      }}
                      className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors inline-flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download CSV
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {!activeReport && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg mb-4">Select a report type to view</p>
                <p className="text-sm text-gray-400">
                  Available reports: All Analysis, Students Without Batch, Batch Attendance, Pending Payments, Portfolio Status, Faculty Attendance,
                  Student Attendance, Punch Summary, Lecture Punch In/Out
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

