import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { batchAPI, CreateBatchRequest, SuggestedCandidate } from '../api/batch.api';
import { studentAPI } from '../api/student.api';
import { facultyAPI } from '../api/faculty.api';
import { formatDateInputToDDMMYYYY } from '../utils/dateUtils';

// JavaScript getDay() returns: 0=Sunday, 1=Monday, 2=Tuesday, etc.
const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface DaySchedule {
  startTime: string;
  endTime: string;
}

// Software to session count mapping
const softwareSessionMap: Record<string, number> = {
  'Photoshop': 23,
  'Illustrator': 16,
  'InDesign': 16,
  'After Effects': 16,
  'Premiere Pro': 14,
  'Figma': 12,
  'XD': 6,
  'Animate CC': 32,
  'Premiere Audition': 14,
  'HTML Java DW CSS': 24,
  'Ar. MAX + Vray': 48,
  'MAX': 89,
  'Fusion': 10,
  'Real Flow': 10,
  'Fume FX': 8,
  'Nuke': 24,
  'Thinking Particle': 10,
  'Ray Fire': 6,
  'Mocha': 6,
  'Silhouette': 6,
  'PF Track': 6,
  'Vue': 13,
  'Houdni': 12,
  'FCP': 11,
  'Maya': 92,
  'CAD UNITY': 12,
  'Mudbox': 7,
  'Unity Game Design': 24,
  'Z-Brush': 12,
  'Lumion': 6,
  'SketchUp': 12,
  'Unreal': 33,
  'Blender Pro': 72,
  'Cinema 4D': 72,
  'Substance Painter': 6,
  '3D Equalizer': 6,
  'Photography': 10,
  'Auto-Cad': 15,
  'Davinci': 10,
  'Corel': 14,
  'CorelDRAW': 14,
};

// Auto-calculate end date based on start date, software, and schedule
const calculateEndDate = (startDate: string, software: string[], schedule?: Record<string, DaySchedule>): string => {
  if (!startDate || software.length === 0) return '';
  
  // Calculate total number of sessions based on software
  let totalSessions = 0;
  software.forEach(sw => {
    const cleanSoftware = sw.trim();
    // Check for exact matches first
    if (softwareSessionMap[cleanSoftware]) {
      totalSessions += softwareSessionMap[cleanSoftware];
    } else {
      // Check for partial matches (case insensitive)
      const foundSoftware = Object.keys(softwareSessionMap).find(key => 
        key.toLowerCase().includes(cleanSoftware.toLowerCase()) || 
        cleanSoftware.toLowerCase().includes(key.toLowerCase())
      );
      if (foundSoftware) {
        totalSessions += softwareSessionMap[foundSoftware];
      }
    }
  });
  
  if (totalSessions === 0) return startDate; // If no mapping found, return start date
  
  // Calculate end date based on the schedule (number of sessions per week)
  // If schedule is not provided or empty, default to 1 session per day
  if (schedule && Object.keys(schedule).length > 0) {
    // Count how many days per week have scheduled classes
    const daysPerWeek = Object.keys(schedule).length;
    
    // If we have a schedule, calculate based on days per week
    if (daysPerWeek > 0) {
      // Calculate end date by adding the actual number of days needed
      // based on the scheduled days
      const start = new Date(startDate);
      // Set to start of day to avoid timezone issues
      start.setHours(0, 0, 0, 0);
      let currentDate = new Date(start);
      let sessionsScheduled = 0;
      
      // We need to count actual calendar days based on the scheduled days
      // First, make sure we start from a scheduled day
      // If the start date is not a scheduled day, move to the next scheduled day
      let startDayName = DAYS_OF_WEEK[currentDate.getDay()];
      let isStartDayScheduled = false;
      
      // Check if start date is scheduled
      const startDayMatches = [
        startDayName, // Full day name (e.g., "Monday")
        startDayName.substring(0, 3), // Abbreviated day (e.g., "Mon")
        startDayName.toLowerCase(),
        startDayName.substring(0, 3).toLowerCase(),
        currentDate.getDay().toString(), // Numeric day (0-6 where 0 is Sunday)
        (currentDate.getDay() === 0 ? 7 : currentDate.getDay()).toString() // Monday as 1, Sunday as 7
      ];
      isStartDayScheduled = startDayMatches.some(match => match in schedule);
      
      // If start date is not scheduled, find the next scheduled day
      if (!isStartDayScheduled) {
        while (!isStartDayScheduled) {
          currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000); // Add one day
          startDayName = DAYS_OF_WEEK[currentDate.getDay()];
          
          const nextDayMatches = [
            startDayName, // Full day name (e.g., "Monday")
            startDayName.substring(0, 3), // Abbreviated day (e.g., "Mon")
            startDayName.toLowerCase(),
            startDayName.substring(0, 3).toLowerCase(),
            currentDate.getDay().toString(), // Numeric day (0-6 where 0 is Sunday)
            (currentDate.getDay() === 0 ? 7 : currentDate.getDay()).toString() // Monday as 1, Sunday as 7
          ];
          isStartDayScheduled = nextDayMatches.some(match => match in schedule);
        }
      }
      
      // Now start counting from the first scheduled day
      sessionsScheduled = 1; // Count the first scheduled day as the first session
      
      // Continue until we reach the required number of sessions
      while (sessionsScheduled < totalSessions) {
        // Move to next day
        currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000); // Add one day in milliseconds
        
        // Check if this day is in the schedule
        const dayName = DAYS_OF_WEEK[currentDate.getDay()];
        // Check if this day is scheduled (comprehensive matching)
        const dayMatches = [
          dayName, // Full day name (e.g., "Monday")
          dayName.substring(0, 3), // Abbreviated day (e.g., "Mon")
          dayName.toLowerCase(),
          dayName.substring(0, 3).toLowerCase(),
          currentDate.getDay().toString(), // Numeric day (0-6 where 0 is Sunday)
          (currentDate.getDay() === 0 ? 7 : currentDate.getDay()).toString() // Monday as 1, Sunday as 7
        ];
        
        const isDayScheduled = dayMatches.some(match => match in schedule);
        
        if (isDayScheduled) {
          sessionsScheduled++;
        }
      }
      
      return currentDate.toISOString().split('T')[0];
    }
  }
  
  // Fallback: if no schedule or schedule is empty, assume 1 session per day
  const start = new Date(startDate);
  const end = new Date(start);
  end.setDate(start.getDate() + totalSessions);
  
  return end.toISOString().split('T')[0];
};

export const BatchCreate: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [daySchedules, setDaySchedules] = useState<Record<string, DaySchedule>>({});
  const [applyToAll, setApplyToAll] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [exceptionStudentIds, setExceptionStudentIds] = useState<number[]>([]);
  const [selectedFaculty, setSelectedFaculty] = useState<number[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestedCandidates, setSuggestedCandidates] = useState<SuggestedCandidate[]>([]);
  const [showOtherSoftwareInput, setShowOtherSoftwareInput] = useState(false);
  const [otherSoftware, setOtherSoftware] = useState('');
  const [selectedSoftware, setSelectedSoftware] = useState<string>('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [startDateDisplay, setStartDateDisplay] = useState('');
  const [endDateDisplay, setEndDateDisplay] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [batchStatus, setBatchStatus] = useState<string>('active');
  const [facultyAvailability, setFacultyAvailability] = useState<any>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  const checkFacultyAvailability = async (facultyIds: number[]) => {
    if (!startDate || !endDate) return;
    
    setCheckingAvailability(true);
    try {
      const scheduleData = Object.keys(daySchedules).length > 0 ? daySchedules : null;
      const result = await batchAPI.checkFacultyAvailability(facultyIds, startDate, endDate, scheduleData);
      setFacultyAvailability(result.data.availabilityResults);
    } catch (error: any) {
      console.error('Error checking faculty availability:', error);
      alert(error.response?.data?.message || 'Failed to check faculty availability');
    } finally {
      setCheckingAvailability(false);
    }
  };

  // Auto-calculate end date when selected software or schedule changes
  useEffect(() => {
    if (startDate && selectedSoftware) {
      const calculatedEndDate = calculateEndDate(startDate, [selectedSoftware], daySchedules);
      if (calculatedEndDate) {
        setEndDate(calculatedEndDate);
        setEndDateDisplay(formatDateInputToDDMMYYYY(calculatedEndDate));
      }
    }
  }, [startDate, selectedSoftware, daySchedules]);

  // Fetch all students
  const { data: studentsData } = useQuery({
    queryKey: ['students'],
    queryFn: () => studentAPI.getAllStudents(),
  });

  // Fetch all faculty (with high limit to get all)
  const { data: facultyData, isLoading: isLoadingFaculty } = useQuery({
    queryKey: ['faculty'],
    queryFn: () => facultyAPI.getAllFaculty(1000), // Get up to 1000 faculty
  });

  const createBatchMutation = useMutation({
    mutationFn: async (data: CreateBatchRequest) => batchAPI.createBatch(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      alert('Batch created successfully!');
      navigate('/batches');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to create batch');
    },
  });

  const handleDayToggle = (day: string) => {
    setDaySchedules(prev => {
      if (prev[day]) {
        const newSchedules = { ...prev };
        delete newSchedules[day];
        return newSchedules;
      } else {
        return {
          ...prev,
          [day]: { startTime: '', endTime: '' }
        };
      }
    });
  };

  const handleTimeChange = (day: string, field: 'startTime' | 'endTime', value: string) => {
    setDaySchedules(prev => {
      const updated = { ...prev };
      
      if (applyToAll) {
        // Apply to all selected days
        Object.keys(prev).forEach(d => {
          updated[d] = {
            ...prev[d],
            [field]: value
          };
        });
      } else {
        // Apply only to the current day
        updated[day] = {
          ...prev[day],
          [field]: value
        };
      }
      
      return updated;
    });
  };

  const handleCreateBatch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Get software from selected software - REQUIRED
    const softwareValue = selectedSoftware || '';
    
    if (!softwareValue || softwareValue.trim() === '') {
      alert('Please select a software for this batch.');
      return;
    }
    
    // Validate faculty selection
    if (selectedFaculty.length === 0) {
      alert('Please select at least one faculty member to assign to this batch.');
      return;
    }

    // Get status - use state value as fallback if FormData doesn't have it
    const statusValue = (formData.get('status') as string) || batchStatus;
    const finalStatus = statusValue && statusValue.trim() ? statusValue.trim() : 'active';

    const data: CreateBatchRequest = {
      title: (formData.get('title') as string)?.trim() || '',
      software: softwareValue.trim(),
      mode: (formData.get('mode') as string) || '',
      startDate: startDate || (formData.get('startDate') as string) || '',
      endDate: endDate || (formData.get('endDate') as string) || '',
      status: finalStatus,
      schedule: Object.keys(daySchedules).length > 0 ? 
        Object.fromEntries(
          Object.entries(daySchedules).filter(([_, times]) => times.startTime && times.endTime)
        ) : undefined,
      facultyIds: selectedFaculty,
      studentIds: selectedStudents.length > 0 ? selectedStudents : undefined,
      exceptionStudentIds: exceptionStudentIds.length > 0 ? exceptionStudentIds : undefined,
    };
    
    // Debug log to verify status is being sent
    console.log('Creating batch with status:', finalStatus, 'Full data:', data);
    
    createBatchMutation.mutate(data);
  };

  const handleGetSuggestions = async () => {
    const form = document.querySelector('form') as HTMLFormElement;
    if (!form) return;
    
    const formData = new FormData(form);
    const software = selectedSoftware || undefined;
    const actualStartDate = startDate || (formData.get('startDate') as string);
    
    if (!software || !actualStartDate) {
      alert('Please select software and enter start date first to get suggestions');
      return;
    }

    // Get at least one faculty ID for the temporary batch
    let tempFacultyIds: number[] = [];
    if (selectedFaculty.length > 0) {
      // Use selected faculty if available
      tempFacultyIds = selectedFaculty;
    } else if (facultyData?.data?.users && facultyData.data.users.length > 0) {
      // Use the first available faculty
      tempFacultyIds = [facultyData.data.users[0].id];
    } else {
      alert('Please select at least one faculty member first, or ensure faculty data is loaded');
      return;
    }

    // Create a temporary batch to get suggestions
    try {
      // Get status from form or use state value, default to 'active'
      const statusValue = (formData.get('status') as string) || batchStatus || 'active';
      
      const tempData: CreateBatchRequest = {
        title: 'TEMP_FOR_SUGGESTIONS',
        software,
        mode: formData.get('mode') as string || 'online',
        startDate: actualStartDate,
        endDate: formData.get('endDate') as string || actualStartDate,
        status: statusValue,
        facultyIds: tempFacultyIds,
      };
      
      const tempBatch = await batchAPI.createBatch(tempData);
      if (tempBatch.data.batch) {
        const suggestions = await batchAPI.suggestCandidates(tempBatch.data.batch.id);
        console.log('Suggestions received:', suggestions);
        if (suggestions.data && suggestions.data.candidates) {
          setSuggestedCandidates(suggestions.data.candidates);
          setShowSuggestions(true);
          // Don't show alert for empty results, just show the empty state message in UI
        } else {
          console.error('No suggestions data received:', suggestions);
          setSuggestedCandidates([]);
          setShowSuggestions(true);
        }
        // Delete temporary batch
        try {
          await batchAPI.deleteBatch(tempBatch.data.batch.id);
        } catch (err) {
          console.error('Failed to delete temp batch:', err);
        }
      } else {
        alert('Failed to create temporary batch for suggestions');
      }
    } catch (error: any) {
      console.error('Error getting suggestions:', error);
      alert(error.response?.data?.message || 'Failed to get suggestions. Please check console for details.');
    }
  };

  const handleToggleStudent = (studentId: number) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleToggleFaculty = (facultyId: number) => {
    const newSelectedFaculty = selectedFaculty.includes(facultyId) 
      ? selectedFaculty.filter(id => id !== facultyId)
      : [...selectedFaculty, facultyId];
    
    setSelectedFaculty(newSelectedFaculty);
    
    // Check availability when faculty selection changes
    if (newSelectedFaculty.length > 0 && startDate && endDate) {
      checkFacultyAvailability(newSelectedFaculty);
    }
  };

  const handleSelectSuggested = (candidate: SuggestedCandidate) => {
    if (candidate.status === 'available' || candidate.status === 'fees_overdue' || candidate.status === 'pending_fees' || candidate.status === 'no_orientation' || candidate.status === 'time_conflict' || candidate.status === 'day_mismatch') {
      handleToggleStudent(candidate.studentId);
    }
  };

  const handleToggleException = (studentId: number, isException: boolean) => {
    if (isException) {
      setExceptionStudentIds(prev => [...prev, studentId]);
      // Also add to selected students if not already there
      if (!selectedStudents.includes(studentId)) {
        setSelectedStudents(prev => [...prev, studentId]);
      }
    } else {
      setExceptionStudentIds(prev => prev.filter(id => id !== studentId));
    }
  };

  const students = studentsData?.data.students || [];
  const faculty = facultyData?.data?.users || [];

  if (user?.role !== 'admin' && user?.role !== 'superadmin') {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto">
          <div className="bg-white shadow-xl rounded-lg p-6">
            <p className="text-red-600">You don't have permission to create batches.</p>
            <button
              onClick={() => navigate('/batches')}
              className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              Back to Batches
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-orange-600 to-orange-500 px-8 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-white">Create New Batch</h1>
                <p className="mt-2 text-orange-100">Fill in the details to create a new training batch</p>
              </div>
              <button
                onClick={() => navigate('/batches')}
                className="px-4 py-2 bg-white text-orange-600 rounded-lg font-semibold hover:bg-orange-50 transition-colors"
              >
                ← Back
              </button>
            </div>
          </div>

          <div className="p-8 max-h-[calc(100vh-12rem)] overflow-y-auto">
            <form onSubmit={handleCreateBatch} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Batch Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    placeholder="e.g., Digital Art Fundamentals - Batch 1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>


                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Software
                  </label>
                  <div className="border border-gray-300 rounded-lg p-4 max-h-48 overflow-y-auto">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="radio"
                          name="software"
                          value=""
                          checked={selectedSoftware === ''}
                          onChange={() => setSelectedSoftware('')}
                          className="w-4 h-4 text-orange-600 border-gray-300 focus:ring-orange-500"
                        />
                        <span className="text-sm text-gray-700">None</span>
                      </label>
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
                            type="radio"
                            name="software"
                            value={software}
                            checked={selectedSoftware === software}
                            onChange={(e) => {
                              if (software === 'Other') {
                                setShowOtherSoftwareInput(e.target.checked);
                                if (e.target.checked) {
                                  setSelectedSoftware(software);
                                }
                              } else {
                                setSelectedSoftware(software);
                                setShowOtherSoftwareInput(false);
                              }
                            }}
                            className="w-4 h-4 text-orange-600 border-gray-300 focus:ring-orange-500"
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
                          if (value.trim()) {
                            // For single selection, just use the first software from the input
                            const firstSoftware = value.split(',')[0].trim();
                            if (firstSoftware) {
                              setSelectedSoftware(firstSoftware);
                            }
                          } else {
                            setSelectedSoftware('Other');
                          }
                        }}
                        placeholder="Enter software names (comma separated)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  )}
                  {selectedSoftware && (
                    <p className="mt-2 text-xs text-gray-600">
                      Selected: {selectedSoftware}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mode <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="mode"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Select mode</option>
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={startDate}
                    onChange={(e) => {
                      const newStartDate = e.target.value;
                      setStartDate(newStartDate);
                      setStartDateDisplay(formatDateInputToDDMMYYYY(newStartDate));
                      
                      // Auto-calculate end date when start date changes
                      if (selectedSoftware) {
                        const calculatedEndDate = calculateEndDate(newStartDate, [selectedSoftware], daySchedules);
                        if (calculatedEndDate) {
                          setEndDate(calculatedEndDate);
                          setEndDateDisplay(formatDateInputToDDMMYYYY(calculatedEndDate));
                        }
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  {startDateDisplay && (
                    <p className="mt-1 text-sm text-gray-600">Selected: {startDateDisplay}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">Start date must be today or a future date</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    required
                    value={endDate}
                    onChange={(e) => {
                      // Allow manual override of end date
                      const newEndDate = e.target.value;
                      setEndDate(newEndDate);
                      setEndDateDisplay(formatDateInputToDDMMYYYY(newEndDate));
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  {endDateDisplay && (
                    <p className="mt-1 text-sm text-gray-600">Selected: {endDateDisplay}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">Auto-calculated based on software sessions. You can manually override this date.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Capacity
                  </label>
                  <input
                    type="number"
                    name="maxCapacity"
                    min="1"
                    placeholder="e.g., 30"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">Maximum number of students allowed in this batch</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="status"
                    required
                    value={batchStatus}
                    onChange={(e) => setBatchStatus(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Faculty Assignment Section */}
              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Assign Faculty <span className="text-red-500">*</span>
                </h3>
                <p className="text-sm text-gray-600 mb-4">Select at least one faculty member to assign to this batch</p>
                {facultyData?.data?.users && facultyData.data.users.length === 0 ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      No faculty members found. Please create faculty users first.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg p-3 space-y-2">
                      {isLoadingFaculty ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
                          <span className="ml-2 text-sm text-gray-500">Loading faculty...</span>
                        </div>
                      ) : faculty.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">No active faculty members found</p>
                      ) : (
                        faculty
                          .filter((fac) => fac.isActive !== false)
                          .map((fac) => (
                            <label key={fac.id} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedFaculty.includes(fac.id)}
                                onChange={() => handleToggleFaculty(fac.id)}
                                className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500 mr-3"
                              />
                              <div>
                                <span className="font-medium">{fac.name}</span>
                                <span className="text-sm text-gray-600 ml-2">({fac.email})</span>
                                {fac.phone && (
                                  <span className="text-xs text-gray-500 ml-2">• {fac.phone}</span>
                                )}
                              </div>
                            </label>
                          ))
                      )}
                    </div>
                    {checkingAvailability && (
                      <div className="mt-2 flex items-center text-sm text-blue-600">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                        Checking faculty availability...
                      </div>
                    )}
                    {facultyAvailability && facultyAvailability.length > 0 && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Faculty Availability Status:</h4>
                        <div className="space-y-2">
                          {facultyAvailability.map((result: any) => {
                            const faculty = facultyData?.data?.users?.find((f: any) => f.id === result.facultyId);
                            return (
                              <div key={result.facultyId} className={`p-2 rounded ${result.isAvailable ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                                <div className="flex justify-between items-start">
                                  <div>
                                    <span className="font-medium text-gray-900">{faculty?.name || `Faculty ${result.facultyId}`}</span>
                                    <span className={`ml-2 text-xs px-2 py-1 rounded ${result.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                      {result.isAvailable ? 'Available' : 'Unavailable'}
                                    </span>
                                  </div>
                                </div>
                                {!result.isAvailable && result.conflicts.length > 0 && (
                                  <div className="mt-2 text-xs text-gray-600">
                                    <p className="font-medium mb-1">Conflicts:</p>
                                    {result.conflicts.map((conflict: any, idx: number) => (
                                      <div key={idx} className="mb-1">
                                        <p className="text-red-700">• {conflict.batchTitle} (Batch ID: {conflict.batchId})</p>
                                        {conflict.conflictDays.length > 0 && (
                                          <p>Days: {conflict.conflictDays.join(', ')}</p>
                                        )}
                                        {conflict.conflictTimes.length > 0 && (
                                          <ul className="list-disc list-inside ml-2">
                                            {conflict.conflictTimes.map((time: any, timeIdx: number) => (
                                              <li key={timeIdx}>{time.time}</li>
                                            ))}
                                          </ul>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {selectedFaculty.length > 0 ? (
                      <p className="mt-2 text-sm text-green-600 font-medium">
                        ✓ {selectedFaculty.length} faculty member(s) selected
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-red-600">
                        ⚠ Please select at least one faculty member
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Schedule Section */}
              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Schedule (Optional)</h3>
                <p className="text-sm text-gray-600 mb-4">Select days and set start/end times for each day</p>
                
                {/* Quick-select schedule buttons */}
                <div className="mb-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      // Select MWF (Monday, Wednesday, Friday)
                      const mwfDays = ['Monday', 'Wednesday', 'Friday'];
                      const newSchedules = { ...daySchedules };
                      
                      // Add MWF days, keep existing times if they exist
                      mwfDays.forEach(day => {
                        if (!newSchedules[day]) {
                          newSchedules[day] = { startTime: '', endTime: '' };
                        }
                      });
                      
                      // Remove non-MWF days
                      Object.keys(newSchedules).forEach(day => {
                        if (!mwfDays.includes(day)) {
                          delete newSchedules[day];
                        }
                      });
                      
                      setDaySchedules(newSchedules);
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      Object.keys(daySchedules).length === 3 &&
                      ['Monday', 'Wednesday', 'Friday'].every(day => daySchedules[day])
                        ? 'bg-blue-600 text-white' // Selected state
                        : 'bg-blue-100 text-blue-800 hover:bg-blue-200' // Default state
                    }`}
                  >
                    MWF (Mon, Wed, Fri)
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      // Select TTS (Tuesday, Thursday, Saturday)
                      const ttsDays = ['Tuesday', 'Thursday', 'Saturday'];
                      const newSchedules = { ...daySchedules };
                      
                      // Add TTS days, keep existing times if they exist
                      ttsDays.forEach(day => {
                        if (!newSchedules[day]) {
                          newSchedules[day] = { startTime: '', endTime: '' };
                        }
                      });
                      
                      // Remove non-TTS days
                      Object.keys(newSchedules).forEach(day => {
                        if (!ttsDays.includes(day)) {
                          delete newSchedules[day];
                        }
                      });
                      
                      setDaySchedules(newSchedules);
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      Object.keys(daySchedules).length === 3 &&
                      ['Tuesday', 'Thursday', 'Saturday'].every(day => daySchedules[day])
                        ? 'bg-purple-600 text-white' // Selected state
                        : 'bg-purple-100 text-purple-800 hover:bg-purple-200' // Default state
                    }`}
                  >
                    TTS (Tue, Thu, Sat)
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      // Custom schedule - allow user to select any days
                      // For custom, we don't change the schedule, just allow manual selection
                      // Clear the schedule to start fresh for custom selection
                      setDaySchedules({});
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      Object.keys(daySchedules).length > 0 &&
                      !(['Monday', 'Wednesday', 'Friday'].every(day => daySchedules[day]) && Object.keys(daySchedules).length === 3) &&
                      !(['Tuesday', 'Thursday', 'Saturday'].every(day => daySchedules[day]) && Object.keys(daySchedules).length === 3)
                        ? 'bg-green-600 text-white' // Selected state for custom
                        : 'bg-green-100 text-green-800 hover:bg-green-200' // Default state
                    }`}
                  >
                    Custom
                  </button>
                </div>
                
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyToAll}
                      onChange={(e) => setApplyToAll(e.target.checked)}
                      className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      Apply same time to all selected days
                    </span>
                  </label>
                  <p className="ml-6 mt-1 text-xs text-gray-600">
                    When enabled, changing time on any day will update all selected days
                  </p>
                </div>
                
                <div className="space-y-4">
                  {DAYS_OF_WEEK.map((day) => {
                    const isSelected = !!daySchedules[day];
                    const schedule = daySchedules[day] || { startTime: '', endTime: '' };
                    
                    return (
                      <div key={day} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleDayToggle(day)}
                              className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                            />
                            <span className="ml-2 text-sm font-medium text-gray-700">{day}</span>
                          </label>
                        </div>
                        
                        {isSelected && (
                          <div className="grid grid-cols-2 gap-4 mt-3 pl-6">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Start Time
                              </label>
                              <input
                                type="time"
                                value={schedule.startTime}
                                onChange={(e) => handleTimeChange(day, 'startTime', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                End Time
                              </label>
                              <input
                                type="time"
                                value={schedule.endTime}
                                onChange={(e) => handleTimeChange(day, 'endTime', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Student Selection Section */}
              <div className="pt-6 border-t border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Add Students (Optional)</h3>
                  <button
                    type="button"
                    onClick={handleGetSuggestions}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Get Suggested Students
                  </button>
                </div>
                
                {showSuggestions && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">Suggested Students (based on software)</h4>
                    {suggestedCandidates.length > 0 ? (
                      <div className="max-h-40 overflow-y-auto space-y-2">
                        {suggestedCandidates.map((candidate) => (
                          <div
                            key={candidate.studentId}
                            className={`p-2 rounded border cursor-pointer ${
                              candidate.status === 'available' 
                                ? 'bg-green-50 border-green-300 hover:bg-green-100' 
                                : candidate.status === 'fees_overdue'
                                ? 'bg-yellow-50 border-yellow-300 hover:bg-yellow-100'
                                : candidate.status === 'pending_fees'
                                ? 'bg-amber-50 border-amber-300 hover:bg-amber-100'
                                : candidate.status === 'no_orientation'
                                ? 'bg-orange-50 border-orange-300 hover:bg-orange-100'
                                : candidate.status === 'time_conflict'
                                ? 'bg-red-50 border-red-300 hover:bg-red-100'
                                : candidate.status === 'day_mismatch'
                                ? 'bg-red-100 border-red-400 hover:bg-red-200'
                                : 'bg-gray-50 border-gray-300 opacity-50'
                            }`}
                            onClick={() => handleSelectSuggested(candidate)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <span className="font-medium">{candidate.name || `Student #${candidate.studentId}`}</span>
                                {candidate.email && (
                                  <span className="text-xs text-gray-600 ml-2">({candidate.email})</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-1 rounded ${
                                  candidate.status === 'available' 
                                    ? 'bg-green-200 text-green-800'
                                    : candidate.status === 'fees_overdue'
                                    ? 'bg-yellow-200 text-yellow-800'
                                    : candidate.status === 'pending_fees'
                                    ? 'bg-amber-200 text-amber-800'
                                    : candidate.status === 'no_orientation'
                                    ? 'bg-orange-200 text-orange-800'
                                    : candidate.status === 'time_conflict'
                                    ? 'bg-red-200 text-red-800'
                                    : candidate.status === 'day_mismatch'
                                    ? 'bg-red-300 text-red-900 font-semibold'
                                    : 'bg-gray-200 text-gray-800'
                                }`}>
                                  {candidate.statusMessage || candidate.status}
                                </span>
                                {(candidate.status === 'pending_fees' || candidate.status === 'fees_overdue') && (
                                  <label className="flex items-center gap-1 text-xs cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="checkbox"
                                      checked={exceptionStudentIds.includes(candidate.studentId)}
                                      onChange={(e) => {
                                        handleToggleException(candidate.studentId, e.target.checked);
                                        if (e.target.checked && !selectedStudents.includes(candidate.studentId)) {
                                          handleToggleStudent(candidate.studentId);
                                        }
                                      }}
                                      className="w-3 h-3 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                                    />
                                    <span className="text-amber-700 font-medium">Add as Exception</span>
                                  </label>
                                )}
                                <input
                                  type="checkbox"
                                  checked={selectedStudents.includes(candidate.studentId)}
                                  onChange={() => handleToggleStudent(candidate.studentId)}
                                  disabled={candidate.status === 'busy' || candidate.status === 'day_mismatch'}
                                  className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 bg-white border border-blue-200 rounded">
                        <p className="text-sm text-gray-600">
                          No students found with matching software "{selectedSoftware}".
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          Students need to have the software selected in their profile to appear here.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Students to Enroll
                  </label>
                  <div className="mb-3 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search students by name or email..."
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg p-3 space-y-2">
                    {students
                      .filter((student) => {
                        if (!studentSearchQuery.trim()) return true;
                        const query = studentSearchQuery.toLowerCase();
                        return (
                          student.name.toLowerCase().includes(query) ||
                          student.email.toLowerCase().includes(query)
                        );
                      })
                      .map((student) => (
                        <label key={student.id} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(student.id)}
                            onChange={() => handleToggleStudent(student.id)}
                            className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500 mr-3"
                          />
                          <div>
                            <span className="font-medium">{student.name}</span>
                            <span className="text-sm text-gray-600 ml-2">({student.email})</span>
                          </div>
                        </label>
                      ))}
                    {students.filter((student) => {
                      if (!studentSearchQuery.trim()) return false;
                      const query = studentSearchQuery.toLowerCase();
                      return (
                        student.name.toLowerCase().includes(query) ||
                        student.email.toLowerCase().includes(query)
                      );
                    }).length === 0 && studentSearchQuery.trim() && (
                      <p className="text-sm text-gray-500 text-center py-4">No students found matching your search</p>
                    )}
                  </div>
                  {selectedStudents.length > 0 && (
                    <p className="mt-2 text-sm text-gray-600">
                      {selectedStudents.length} student(s) selected
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={createBatchMutation.isPending}
                  className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createBatchMutation.isPending ? 'Creating...' : 'Create Batch'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/batches')}
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


