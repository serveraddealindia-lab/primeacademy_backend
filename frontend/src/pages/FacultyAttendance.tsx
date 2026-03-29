import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '../components/Layout';
import {
  sessionAPI,
  FacultyBatch,
  StudentAttendanceEntry,
  AttendanceOption,
  AttendanceDraftPayload,
  SessionSummary,
} from '../api/session.api';
import { useAuth } from '../context/AuthContext';
import { Notification } from '../components/Notification';
import { taskAPI, Task, TaskAttendanceStatus } from '../api/task.api';

type AttendanceState = Record<number, AttendanceOption | null>;

const getTodayScheduleTimes = (batch: FacultyBatch['batch']) => {
  const schedule = batch.schedule;
  if (!schedule) return null;
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const todayKey = dayNames[new Date().getDay()];
  const times = (schedule as any)[todayKey];
  if (!times?.startTime && !times?.endTime) return null;
  return { startTime: times?.startTime || null, endTime: times?.endTime || null };
};

const timeToMinutes = (t: string | null) => {
  if (!t) return null;
  const parts = t.split(':').map((x) => Number(x));
  if (parts.length < 2 || parts.some((n) => Number.isNaN(n))) return null;
  const [h, m] = parts;
  return h * 60 + m;
};

const buildDraftKey = (sessionId: number) => `attendanceDraft:${sessionId}`;
const completedSubjectKey = (batchId: number) => `completedSubjects:${batchId}`;

const extractSubjectsFromSoftware = (software: unknown): string[] => {
  if (!software) return [];
  if (Array.isArray(software)) {
    return software.map((s) => String(s).trim()).filter(Boolean);
  }
  if (typeof software === 'string') {
    return software.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
};

export const FacultyAttendance: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedBatch, setSelectedBatch] = useState<FacultyBatch | null>(null);
  const [attendanceState, setAttendanceState] = useState<AttendanceState>({});
  const [showAttendancePanel, setShowAttendancePanel] = useState(false);
  const [isFetchingStudents, setIsFetchingStudents] = useState(false);
  const [students, setStudents] = useState<StudentAttendanceEntry[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const autosaveTimerRef = useRef<number | null>(null);
  const lastAutosaveRef = useRef<number>(0);
  const [attendanceSession, setAttendanceSession] = useState<SessionSummary | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [delayReasonRequired, setDelayReasonRequired] = useState(false);
  const [delayReasonInput, setDelayReasonInput] = useState('');
  const [delayReasonSaving, setDelayReasonSaving] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskAttendance, setTaskAttendance] = useState<Record<number, TaskAttendanceStatus | null>>({});
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showTaskCreateModal, setShowTaskCreateModal] = useState(false);
  const [isLoadingTaskStudents, setIsLoadingTaskStudents] = useState(false);
  const [taskCreateSubject, setTaskCreateSubject] = useState<string>('');
  const [taskCreateDate, setTaskCreateDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [taskCreateTime, setTaskCreateTime] = useState<string>('10:00');
  const [taskCreateStudentOptions, setTaskCreateStudentOptions] = useState<StudentAttendanceEntry[]>([]);
  const [taskCreateStudentIds, setTaskCreateStudentIds] = useState<number[]>([]);

  const [showStartSessionModal, setShowStartSessionModal] = useState(false);
  const [startSessionBatch, setStartSessionBatch] = useState<FacultyBatch['batch'] | null>(null);
  const [startSessionSubject, setStartSessionSubject] = useState<string>('');
  const [startSessionCustomTopic, setStartSessionCustomTopic] = useState<string>('');
  const [startSessionUseCustom, setStartSessionUseCustom] = useState(false);

  const {
    data: facultyBatches,
    isLoading: loadingBatches,
    error: batchesError,
  } = useQuery({
    queryKey: ['faculty-batches'],
    queryFn: () => sessionAPI.getDashboardBatches(),
  });

  const { data: myTasks } = useQuery({
    queryKey: ['tasks', 'faculty-dashboard'],
    queryFn: () => taskAPI.facultyDashboard(),
    enabled: !!user && (user.role === 'faculty' || user.role === 'admin' || user.role === 'superadmin'),
  });

  const submitTaskAttendanceMutation = useMutation({
    mutationFn: (payload: { taskId: number; attendance: Array<{ studentId: number; status: TaskAttendanceStatus | null }> }) =>
      taskAPI.submitAttendance(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'faculty-dashboard'] });
      setShowTaskModal(false);
      setSelectedTask(null);
      setTaskAttendance({});
    },
    onError: (error: any) => {
      setNotification(error.response?.data?.message || 'Failed to submit task attendance');
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (payload: { subject: string; date: string; time: string; studentIds: number[] }) =>
      taskAPI.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'faculty-dashboard'] });
      setShowTaskCreateModal(false);
      setTaskCreateStudentIds([]);
      setNotification('Task created (pending superadmin approval).');
    },
    onError: (error: any) => {
      setNotification(error.response?.data?.message || 'Failed to create task');
    },
  });

  const sortedFacultyBatches = useMemo(() => {
    if (!facultyBatches) return [];
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();

    return [...facultyBatches].sort((a, b) => {
      const aTimes = getTodayScheduleTimes(a.batch);
      const bTimes = getTodayScheduleTimes(b.batch);
      const aDue = timeToMinutes(aTimes?.startTime ?? null) ?? 24 * 60 + 1;
      const bDue = timeToMinutes(bTimes?.startTime ?? null) ?? 24 * 60 + 1;
      if (aDue !== bDue) return aDue - bDue;

      // Tie-breaker: upcoming first
      const aIsUpcoming = aDue >= nowMin;
      const bIsUpcoming = bDue >= nowMin;
      if (aIsUpcoming !== bIsUpcoming) return aIsUpcoming ? -1 : 1;
      return a.batch.title.localeCompare(b.batch.title);
    });
  }, [facultyBatches]);

  const saveDraft = useCallback(
    async (sessionId: number, batchId: number, state: AttendanceState) => {
      const payload: AttendanceDraftPayload = {
        version: 1,
        sessionId,
        batchId,
        updatedAt: new Date().toISOString(),
        attendance: state,
      };

      try {
        localStorage.setItem(buildDraftKey(sessionId), JSON.stringify(payload));
      } catch {
        // ignore storage failures
      }

      try {
        await sessionAPI.saveAttendanceDraft(sessionId, payload);
      } catch (e: any) {
        setNotification(e?.response?.data?.message || 'Draft autosave failed (will keep local copy).');
      }
    },
    []
  );

  const restoreDraft = useCallback(async (sessionId: number): Promise<AttendanceDraftPayload | null> => {
    // Prefer localStorage first (fast), then backend (recover across devices)
    try {
      const raw = localStorage.getItem(buildDraftKey(sessionId));
      if (raw) {
        const parsed = JSON.parse(raw) as AttendanceDraftPayload;
        if (parsed?.version === 1 && parsed?.sessionId === sessionId) return parsed;
      }
    } catch {
      // ignore
    }
    try {
      return await sessionAPI.getAttendanceDraft(sessionId);
    } catch {
      return null;
    }
  }, []);

  const startSessionMutation = useMutation({
    mutationFn: ({ batchId, topicValue }: { batchId: number; topicValue?: string }) =>
      sessionAPI.startSession(batchId, topicValue ? { topic: topicValue } : undefined),
    onSuccess: async (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['faculty-batches'] });
      // Auto-open attendance immediately using the session id returned by the API
      const startedSession = _data as SessionSummary;
      const startedBatch = (sortedFacultyBatches || []).find((b) => b.batch.id === variables.batchId) || null;
      if (startedBatch) {
        await loadStudents(startedBatch, { autoOpen: true, sessionOverride: startedSession });
      }
    },
    onError: (error: any) => {
      setNotification(error.response?.data?.message || 'Failed to start session');
    },
  });

  const endSessionMutation = useMutation({
    mutationFn: (sessionId: number) => sessionAPI.endSession(sessionId),
    onSuccess: () => {
      // If topic corresponds to selected subject, keep it disabled for this batch going forward.
      try {
        const batchId = selectedBatch?.batch.id;
        const topic = attendanceSession?.topic?.trim();
        if (batchId && topic) {
          const key = completedSubjectKey(batchId);
          const current = JSON.parse(localStorage.getItem(key) || '[]') as string[];
          if (!current.includes(topic)) {
            localStorage.setItem(key, JSON.stringify([...current, topic]));
          }
        }
      } catch {
        // ignore
      }
      queryClient.invalidateQueries({ queryKey: ['faculty-batches'] });
      setShowAttendancePanel(false);
      setSelectedBatch(null);
      setAttendanceSession(null);
    },
    onError: (error: any) => {
      setNotification(error.response?.data?.message || 'Failed to end session');
    },
  });

  const submitAttendanceMutation = useMutation({
    mutationFn: ({ sessionId, payload }: { sessionId: number; payload: AttendanceState }) =>
      sessionAPI.submitAttendance(sessionId, {
        attendance: Object.entries(payload)
          .filter(([, status]) => status !== null)
          .map(([studentId, status]) => ({
            studentId: Number(studentId),
            status: status as AttendanceOption,
          })),
      }),
    onSuccess: () => {
      setShowAttendancePanel(false);
      queryClient.invalidateQueries({ queryKey: ['faculty-batches'] });
    },
    onError: (error: any) => {
      setNotification(error.response?.data?.message || 'Failed to submit attendance');
    },
  });

  const loadStudents = useCallback(
    async (batch: FacultyBatch, opts?: { autoOpen?: boolean; sessionOverride?: SessionSummary | null }) => {
    try {
      setIsFetchingStudents(true);
      const batchStudents = await sessionAPI.getBatchStudents(batch.batch.id);
      setStudents(batchStudents);

      const session = opts?.sessionOverride ?? batch.activeSession ?? null;
      const sessionId = session?.id;
      const nextState: AttendanceState = {};
      batchStudents.forEach((student) => {
        nextState[student.studentId] = null; // STRICT: initialize as NULL until faculty marks it
      });

      // Restore draft if exists
      if (sessionId) {
        const draft = await restoreDraft(sessionId);
        if (draft?.attendance) {
          Object.entries(draft.attendance).forEach(([sid, status]) => {
            const id = Number(sid);
            if (!Number.isNaN(id) && id in nextState) {
              nextState[id] = status as AttendanceOption | null;
            }
          });
        }
      }

      setSelectedBatch(batch);
      setAttendanceSession(session);
      setShowAttendancePanel(true);
      setAttendanceState(nextState);

      // Late lecture rule UI: block attendance completion until delay reason is saved
      setDelayReasonRequired(false);
      setDelayReasonInput('');
      if (sessionId && session?.actualStartAt) {
        const times = getTodayScheduleTimes(batch.batch);
        const scheduledStartMin = timeToMinutes(times?.startTime ?? null);
        if (scheduledStartMin !== null) {
          const actual = new Date(session.actualStartAt);
          const actualMin = actual.getHours() * 60 + actual.getMinutes();
          const isLate = actualMin - scheduledStartMin > 5;
          const hasReason = !!(session as any).delayReason;
          if (isLate && !hasReason) {
            setDelayReasonRequired(true);
          }
        }
      }

      // Save immediately so "do not interact then navigate away" does not lose the NULL draft
      if (sessionId) {
        void saveDraft(sessionId, batch.batch.id, nextState);
      }

    } catch (error: any) {
      setNotification(error.response?.data?.message || 'Failed to load students');
    } finally {
      setIsFetchingStudents(false);
    }
  },
  [restoreDraft, saveDraft]);

  const handleToggleStudent = (studentId: number) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]:
        prev[studentId] === null
          ? 'present'
          : prev[studentId] === 'present'
            ? 'absent'
            : 'present',
    }));
  };

  const isAttendanceComplete = useMemo(() => {
    if (!showAttendancePanel) return false;
    if (!students.length) return false;
    return students.every((s) => attendanceState[s.studentId] !== null);
  }, [attendanceState, showAttendancePanel, students]);

  const isTaskAttendanceComplete = useMemo(() => {
    if (!showTaskModal || !selectedTask) return false;
    const links = selectedTask.taskStudents || [];
    if (!links.length) return false;
    return links.every((ls) => taskAttendance[ls.studentId] !== null && taskAttendance[ls.studentId] !== undefined);
  }, [showTaskModal, selectedTask, taskAttendance]);

  // Use the authoritative session for attendance operations (start-session response or existing session)
  const activeSession = attendanceSession;

  const handleChangeSubject = async (nextTopic: string) => {
    if (!activeSession) return;
    const topic = nextTopic.trim();
    if (!topic) return;

    // Optimistic UI update
    setSelectedSubject(topic);
    try {
      await sessionAPI.updateSessionTopic(activeSession.id, topic);
      setAttendanceSession((prev) => (prev ? { ...prev, topic } : prev));
    } catch (e: any) {
      setNotification(e?.response?.data?.message || 'Failed to update subject');
      // Revert selection back to session.topic if update fails
      const revert = (activeSession.topic ?? '').trim();
      if (revert) setSelectedSubject(revert);
    }
  };

  const subjectOptions = useMemo(() => {
    if (!selectedBatch) return [];
    return extractSubjectsFromSoftware((selectedBatch.batch as any).software);
  }, [selectedBatch]);

  const completedSubjects = useMemo(() => {
    if (!selectedBatch) return [];
    try {
      const raw = localStorage.getItem(completedSubjectKey(selectedBatch.batch.id));
      if (!raw) return [];
      const parsed = JSON.parse(raw) as string[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [selectedBatch]);

  // Initialize dropdown selection from session.topic
  useEffect(() => {
    if (!showAttendancePanel || !attendanceSession) return;
    const topic = (attendanceSession.topic ?? '').trim();
    if (topic) {
      setSelectedSubject(topic);
    } else if (subjectOptions.length > 0) {
      setSelectedSubject(subjectOptions[0]);
    }
  }, [showAttendancePanel, attendanceSession, subjectOptions]);

  useEffect(() => {
    if (!showAttendancePanel) {
      setAttendanceState({});
      setStudents([]);
      setSelectedBatch(null);
      setAttendanceSession(null);
      setDelayReasonRequired(false);
      setDelayReasonInput('');
      setDelayReasonSaving(false);
    }
  }, [showAttendancePanel]);

  // Scroll focus to bottom when attendance opens
  useEffect(() => {
    if (!showAttendancePanel) return;
    window.setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 50);
  }, [showAttendancePanel]);

  // Autosave draft (local + backend) every 3s after changes
  useEffect(() => {
    const sessionId = attendanceSession?.id;
    const batchId = selectedBatch?.batch.id;
    if (!showAttendancePanel || !sessionId || !batchId) return;

    const now = Date.now();
    if (now - lastAutosaveRef.current < 800) return; // small throttle for rapid toggles
    lastAutosaveRef.current = now;

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = window.setTimeout(() => {
      saveDraft(sessionId, batchId, attendanceState);
    }, 3000);

    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [attendanceState, attendanceSession?.id, selectedBatch?.batch.id, showAttendancePanel, saveDraft]);

  const openStartSessionModal = (batch: FacultyBatch['batch']) => {
    const subjects = extractSubjectsFromSoftware((batch as any).software);
    const completed = (() => {
      try {
        return JSON.parse(localStorage.getItem(completedSubjectKey(batch.id)) || '[]') as string[];
      } catch {
        return [];
      }
    })();
    const available = subjects.filter((s) => !completed.includes(s));

    setStartSessionBatch(batch);
    setStartSessionUseCustom(false);
    setStartSessionCustomTopic('');
    setStartSessionSubject(available[0] || subjects[0] || '');
    setShowStartSessionModal(true);
  };

  const doStartSession = () => {
    if (!startSessionBatch) return;
    const batchId = startSessionBatch.id;
    const subjects = extractSubjectsFromSoftware((startSessionBatch as any).software);
    const completed = (() => {
      try {
        return JSON.parse(localStorage.getItem(completedSubjectKey(batchId)) || '[]') as string[];
      } catch {
        return [];
      }
    })();
    const available = subjects.filter((s) => !completed.includes(s));

    let topicValue: string | undefined = undefined;
    if (startSessionUseCustom) {
      topicValue = startSessionCustomTopic.trim() || undefined;
    } else {
      topicValue = startSessionSubject.trim() || undefined;
      if (available.length > 0 && topicValue && !available.includes(topicValue)) {
        setNotification('Selected subject is already completed or invalid.');
        return;
      }
    }
    if (available.length > 0 && !topicValue) {
      setNotification('Please select a subject to start the lecture.');
      return;
    }

    setShowStartSessionModal(false);
    startSessionMutation.mutate({ batchId, topicValue });
  };

  const openTaskCreateModal = async () => {
    try {
      setIsLoadingTaskStudents(true);
      // Subjects from all assigned batches (dedup)
      const subs = Array.from(
        new Set(
          (facultyBatches || [])
            .flatMap((b) => extractSubjectsFromSoftware((b.batch as any).software))
            .map((s) => s.trim())
            .filter(Boolean)
        )
      );
      setTaskCreateSubject(subs[0] || '');

      // Students from all assigned batches (dedup)
      const studentsMap = new Map<number, StudentAttendanceEntry>();
      await Promise.all(
        (facultyBatches || []).map(async (b) => {
          const list = await sessionAPI.getBatchStudents(b.batch.id);
          list.forEach((s) => {
            if (!studentsMap.has(s.studentId)) studentsMap.set(s.studentId, s);
          });
        })
      );
      setTaskCreateStudentOptions(Array.from(studentsMap.values()));
      setTaskCreateStudentIds([]);
      setShowTaskCreateModal(true);
    } catch (e: any) {
      setNotification(e?.response?.data?.message || 'Failed to load students for task creation');
    } finally {
      setIsLoadingTaskStudents(false);
    }
  };

  if (loadingBatches) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
        </div>
      </Layout>
    );
  }

  if (batchesError) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto bg-white shadow rounded p-8">
          <p className="text-red-600 font-semibold mb-2">Unable to load batches</p>
          <p className="text-gray-600 text-sm">{(batchesError as any)?.response?.data?.message || (batchesError as any)?.message}</p>
        </div>
      </Layout>
    );
  }

  if (!user || (user.role !== 'faculty' && user.role !== 'superadmin')) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto bg-white shadow rounded p-8">
          <p className="text-gray-600">This page is available only to faculty and superadmin users.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Notification open={!!notification} message={notification || ''} onDismiss={() => setNotification(null)} />
      <div className="max-w-7xl mx-auto">
        {/* Tasks Section */}
        {(user?.role === 'faculty' || user?.role === 'superadmin') && (
          <div className="mb-6 bg-white shadow-xl rounded-lg overflow-hidden">
            <div className="bg-gradient-to-r from-red-600 to-red-500 px-8 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Tasks</h2>
                <p className="text-red-100 text-sm">Create tasks, wait for admin approval, then complete with attendance.</p>
              </div>
              <button
                onClick={openTaskCreateModal}
                className="px-4 py-2 bg-white text-red-700 rounded-lg font-semibold hover:bg-red-50 transition-colors"
              >
                Create Task
              </button>
            </div>
            <div className="p-6">
              {(myTasks || []).length === 0 ? (
                <div className="text-gray-500 text-sm">No tasks yet.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(myTasks || []).map((t) => (
                    <div key={t.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-gray-900">{t.subject}</div>
                          <div className="text-xs text-gray-600 mt-1">
                            {t.date} • {t.time}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          t.status === 'approved' ? 'bg-green-100 text-green-800' :
                          t.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                      <div className="mt-3 flex gap-2">
                        {t.status === 'approved' && (
                          <button
                            onClick={() => {
                              setSelectedTask(t);
                              const init: Record<number, TaskAttendanceStatus | null> = {};
                              (t.taskStudents || []).forEach((ls) => {
                                init[ls.studentId] = null;
                              });
                              setTaskAttendance(init);
                              setShowTaskModal(true);
                            }}
                            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
                          >
                            Complete (Attendance)
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-500 px-8 py-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold text-white">My Batches</h1>
              <p className="text-indigo-100">Start sessions, mark attendance, and wrap up classes in one place.</p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {facultyBatches && facultyBatches.length === 0 && (
              <div className="text-center text-gray-500 py-12 bg-gray-50 rounded-lg">
                No batches assigned yet.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {(() => {
                // Check if faculty has ANY active session across ALL batches
                const hasAnyActiveSession = sortedFacultyBatches?.some((item) => {
                  const session = item.activeSession;
                  return session && session.status === 'ongoing' && !session.actualEndAt;
                });
                
                const now = new Date();
                const nowMin = now.getHours() * 60 + now.getMinutes();

                return sortedFacultyBatches?.map((batchItem) => {
                  const session = batchItem.activeSession;
                  const isOngoing = session && session.status === 'ongoing' && !session.actualEndAt;
                  // Can only start if this batch has no session AND no other batch has an active session
                  const canStartSession = !session && !hasAnyActiveSession;

                  const times = getTodayScheduleTimes(batchItem.batch);
                  const scheduledStartMin = timeToMinutes(times?.startTime ?? null);
                  const scheduledEndMin = timeToMinutes(times?.endTime ?? null);

                  const statusLabel = (() => {
                    if (isOngoing) return { label: 'Ongoing', cls: 'bg-green-100 text-green-800' };
                    if (session?.actualEndAt) return { label: 'Completed', cls: 'bg-gray-100 text-gray-800' };
                    if (scheduledStartMin === null) return { label: 'No schedule', cls: 'bg-gray-100 text-gray-700' };
                    if (nowMin < scheduledStartMin) return { label: 'Upcoming', cls: 'bg-blue-100 text-blue-800' };
                    if (scheduledEndMin !== null && nowMin >= scheduledStartMin && nowMin <= scheduledEndMin)
                      return { label: 'Due', cls: 'bg-yellow-100 text-yellow-800' };
                    if (!session && scheduledEndMin !== null && nowMin > scheduledEndMin)
                      return { label: 'Not Attended', cls: 'bg-red-100 text-red-800' };
                    if (session && !session.actualEndAt && scheduledEndMin !== null && nowMin > scheduledEndMin)
                      return { label: 'Overdue', cls: 'bg-red-100 text-red-800' };
                    return { label: 'Idle', cls: 'bg-gray-100 text-gray-700' };
                  })();
                  
                  return (
                    <div key={batchItem.batch.id} className="border border-gray-200 rounded-lg p-5 space-y-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">{batchItem.batch.title}</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            Batch #{batchItem.batch.id} • {batchItem.batch.mode || 'N/A'}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            statusLabel.cls
                          }`}
                        >
                          {statusLabel.label}
                        </span>
                      </div>

                      {/* Batch Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="font-medium text-gray-700 mb-1">Duration</div>
                          <div className="text-gray-600">
                            {batchItem.batch.startDate ? new Date(batchItem.batch.startDate).toLocaleDateString() : 'N/A'} - 
                            {batchItem.batch.endDate ? new Date(batchItem.batch.endDate).toLocaleDateString() : 'N/A'}
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="font-medium text-gray-700 mb-1">Status</div>
                          <div>
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              batchItem.batch.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {batchItem.batch.status || 'Unknown'}
                            </span>
                          </div>
                        </div>

                        {/* Note: Detailed enrollment and faculty info not available in FacultyBatch interface */}
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
                          <div className="font-medium text-yellow-800 mb-1">Batch Details</div>
                          <div className="text-yellow-700 space-y-1">
                            <div>
                              <span className="font-medium">Students:</span> {batchItem.batch.studentCount ?? 0}
                            </div>
                            <div>
                              <span className="font-medium">Software/Subjects:</span>{' '}
                              {(() => {
                                const subs = extractSubjectsFromSoftware((batchItem.batch as any).software);
                                if (subs.length <= 2) return subs.join(', ') || '-';
                                return `${subs.slice(0, 2).join(', ')} +${subs.length - 2} more`;
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Schedule Information */}
                      {batchItem.batch.schedule && Object.keys(batchItem.batch.schedule).length > 0 && (
                        <div className="bg-blue-50 rounded-lg p-3">
                          <div className="font-medium text-gray-700 mb-2">Schedule</div>
                          <div className="space-y-1">
                            {Object.entries(batchItem.batch.schedule)
                              .filter(([_day, times]) => times && (times.startTime || times.endTime))
                              .map(([day, times]) => (
                                <div key={day} className="flex justify-between text-sm">
                                  <span className="capitalize font-medium">{day}:</span>
                                  <span className="text-gray-600">
                                    {times.startTime || '-'} - {times.endTime || '-'}
                                  </span>
                                </div>
                              ))
                            }
                          </div>
                        </div>
                      )}

                      {/* Session Information */}
                      <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                        <div className="font-medium text-gray-700 mb-2">Current Session</div>
                        {session ? (
                          <>
                            <div className="space-y-1">
                              <p>
                                <span className="font-medium">Status:</span>{' '}
                                <span className={`px-2 py-0.5 rounded text-xs ${
                                  session.status === 'ongoing' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {session.status}
                                </span>
                              </p>
                              <p>
                                <span className="font-medium">Started:</span>{' '}
                                {session.actualStartAt ? new Date(session.actualStartAt).toLocaleString() : 'Not started'}
                              </p>
                              {session.actualEndAt && (
                                <p>
                                  <span className="font-medium">Ended:</span>{' '}
                                  {new Date(session.actualEndAt).toLocaleString()}
                                </p>
                              )}
                              <p>
                                <span className="font-medium">Topic:</span> {session.topic || 'N/A'}
                              </p>
                            </div>
                          </>
                        ) : (
                          <p className="text-gray-500 italic">No active session</p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-3">
                        {!session && (
                          <>
                            <button
                              onClick={() => openStartSessionModal(batchItem.batch)}
                              disabled={!canStartSession}
                              className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                                canStartSession
                                  ? 'bg-green-600 text-white hover:bg-green-700'
                                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              }`}
                              title={!canStartSession && hasAnyActiveSession ? 'You already have an active session running. Please end it before starting a new one.' : ''}
                            >
                              Start Session
                            </button>
                            {!canStartSession && hasAnyActiveSession && (
                              <p className="text-xs text-red-600 mt-1 w-full">
                                You have an active session in another batch. End it first.
                              </p>
                            )}
                          </>
                        )}
                      {session && (
                        <>
                          <button
                            onClick={() => loadStudents(batchItem)}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                          >
                            Mark Attendance / End
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              });
              })()}
            </div>
          </div>
        </div>

        {/* Attendance Panel */}
        {showAttendancePanel && selectedBatch && (
          <div className="mt-6 bg-white shadow-xl rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedBatch.batch.title} &mdash; Attendance
                </h2>
            {activeSession && (
                  <p className="text-sm text-gray-500">
                    Session started at {activeSession.actualStartAt ? new Date(activeSession.actualStartAt).toLocaleTimeString() : 'N/A'}
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowAttendancePanel(false)}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Close ✕
              </button>
            </div>

            {activeSession && subjectOptions.length > 0 && (
              <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => void handleChangeSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {subjectOptions.map((s) => {
                      const disabled = completedSubjects.includes(s) && s !== (activeSession.topic ?? '');
                      return (
                        <option key={s} value={s} disabled={disabled}>
                          {s}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="text-sm text-gray-600 flex items-end">
                  <span>
                    Completed subjects are disabled for this batch.
                  </span>
                </div>
              </div>
            )}

            {activeSession && delayReasonRequired && (
              <div className="mb-4 border border-red-200 bg-red-50 rounded-lg p-3">
                <div className="text-red-800 font-semibold mb-2">Late Lecture: Delay reason is required</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Delay Reason</label>
                    <input
                      type="text"
                      value={delayReasonInput}
                      onChange={(e) => setDelayReasonInput(e.target.value)}
                      className="w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Enter delay reason..."
                    />
                  </div>
                  <button
                    onClick={async () => {
                      if (!activeSession) return;
                      const trimmed = delayReasonInput.trim();
                      if (!trimmed) {
                        setNotification('Delay reason is mandatory.');
                        return;
                      }
                      setDelayReasonSaving(true);
                      try {
                        await sessionAPI.saveDelayReason(activeSession.id, trimmed);
                        setDelayReasonRequired(false);
                        setAttendanceSession((prev) => (prev ? { ...prev, delayReason: trimmed } : prev));
                      } catch (e: any) {
                        setNotification(e?.response?.data?.message || 'Failed to save delay reason');
                      } finally {
                        setDelayReasonSaving(false);
                      }
                    }}
                    disabled={delayReasonSaving}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {delayReasonSaving ? 'Saving...' : 'Save Delay Reason'}
                  </button>
                </div>
              </div>
            )}

            {activeSession && (
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => endSessionMutation.mutate(activeSession.id)}
                  disabled={delayReasonRequired || !isAttendanceComplete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  End Session
                </button>
              </div>
            )}

            <div className="overflow-x-auto">
              {isFetchingStudents ? (
                <div className="flex items-center justify-center py-12 text-gray-500">Loading students...</div>
              ) : students.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No students enrolled in this batch.</div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Present?</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {students.map((student) => (
                      <tr key={student.studentId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <label className="inline-flex items-center cursor-pointer space-x-2">
                            <input
                              type="checkbox"
                              className="form-checkbox h-5 w-5 text-green-600"
                        checked={attendanceState[student.studentId] === 'present'}
                              onChange={() => handleToggleStudent(student.studentId)}
                            />
                      <span className="text-sm text-gray-700">
                        {attendanceState[student.studentId] === 'present'
                          ? 'Present'
                          : attendanceState[student.studentId] === 'absent'
                            ? 'Absent'
                            : 'Not marked'}
                      </span>
                          </label>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {attendanceSession && (
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() =>
                    submitAttendanceMutation.mutate({
                      sessionId: attendanceSession.id,
                      payload: attendanceState,
                    })
                  }
                  disabled={submitAttendanceMutation.isPending || !isAttendanceComplete || delayReasonRequired}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {submitAttendanceMutation.isPending ? 'Saving...' : 'Save Attendance'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Task Attendance Modal */}
      {showTaskModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Task Attendance</h3>
                <div className="text-sm text-gray-600">{selectedTask.subject} • {selectedTask.date} • {selectedTask.time}</div>
              </div>
              <button
                onClick={() => {
                  setShowTaskModal(false);
                  setSelectedTask(null);
                  setTaskAttendance({});
                }}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Close ✕
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Student</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(selectedTask.taskStudents || []).map((ls) => (
                    <tr key={ls.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{ls.student?.name || `Student ${ls.studentId}`}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{ls.student?.email || '-'}</td>
                      <td className="px-4 py-3">
                        <select
                          value={taskAttendance[ls.studentId] || ''}
                          onChange={(e) => {
                            const v = e.target.value as TaskAttendanceStatus;
                            setTaskAttendance((prev) => ({ ...prev, [ls.studentId]: v || null }));
                          }}
                          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="">Select</option>
                          <option value="P">P</option>
                          <option value="A">A</option>
                          <option value="LATE">LATE</option>
                          <option value="ONLINE">ONLINE</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  const attendance = (selectedTask.taskStudents || []).map((ls) => ({
                    studentId: ls.studentId,
                    status: taskAttendance[ls.studentId] as TaskAttendanceStatus,
                  }));
                  submitTaskAttendanceMutation.mutate({ taskId: selectedTask.id, attendance });
                }}
                disabled={submitTaskAttendanceMutation.isPending || !isTaskAttendanceComplete}
                className="px-5 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
              >
                {submitTaskAttendanceMutation.isPending ? 'Saving...' : 'Submit & Complete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Create Modal */}
      {showTaskCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Create Task (Pending Superadmin Approval)</h3>
                <p className="text-sm text-gray-600">Select subject, date/time, and students.</p>
              </div>
              <button
                onClick={() => setShowTaskCreateModal(false)}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Close ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <select
                  value={taskCreateSubject}
                  onChange={(e) => setTaskCreateSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {Array.from(
                    new Set(
                      (facultyBatches || [])
                        .flatMap((b) => extractSubjectsFromSoftware((b.batch as any).software))
                        .map((s) => s.trim())
                        .filter(Boolean)
                    )
                  ).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={taskCreateDate}
                  onChange={(e) => setTaskCreateDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input
                  type="time"
                  value={taskCreateTime}
                  onChange={(e) => setTaskCreateTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {isLoadingTaskStudents ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
              </div>
            ) : taskCreateStudentOptions.length === 0 ? (
              <div className="text-center text-gray-600 py-8">No students found for your assigned batches.</div>
            ) : (
              <div className="border border-gray-200 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold text-gray-700">Students</div>
                  <div className="text-xs text-gray-500">{taskCreateStudentIds.length} selected</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {taskCreateStudentOptions.map((s) => {
                    const checked = taskCreateStudentIds.includes(s.studentId);
                    return (
                      <label key={s.studentId} className="flex items-center gap-2 p-2 border border-gray-100 rounded hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setTaskCreateStudentIds((prev) => (checked ? prev.filter((id) => id !== s.studentId) : [...prev, s.studentId]));
                          }}
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{s.name}</div>
                          <div className="text-xs text-gray-500 truncate">{s.email}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowTaskCreateModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const subject = taskCreateSubject.trim();
                  if (!subject) {
                    setNotification('Task subject is required.');
                    return;
                  }
                  if (!taskCreateDate) {
                    setNotification('Task date is required.');
                    return;
                  }
                  if (!taskCreateTime) {
                    setNotification('Task time is required.');
                    return;
                  }
                  if (!taskCreateStudentIds.length) {
                    setNotification('Select at least one student.');
                    return;
                  }
                  // Normalize time to HH:MM:SS for MySQL TIME
                  const timeNormalized = taskCreateTime.length === 5 ? `${taskCreateTime}:00` : taskCreateTime;
                  createTaskMutation.mutate({
                    subject,
                    date: taskCreateDate,
                    time: timeNormalized,
                    studentIds: taskCreateStudentIds,
                  });
                }}
                disabled={createTaskMutation.isPending}
                className="px-5 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:opacity-50"
              >
                {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Start Session Modal */}
      {showStartSessionModal && startSessionBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Start Lecture</h3>
                <div className="text-sm text-gray-600">{startSessionBatch.title}</div>
              </div>
              <button onClick={() => setShowStartSessionModal(false)} className="text-gray-500 hover:text-gray-700 text-sm">
                Close ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="font-medium text-gray-700 mb-1">Students</div>
                <div className="text-gray-700">{(startSessionBatch as any).studentCount ?? 0}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="font-medium text-gray-700 mb-1">Today Timing</div>
                <div className="text-gray-700">
                  {(() => {
                    const t = getTodayScheduleTimes(startSessionBatch as any);
                    return t ? `${t.startTime || '-'} - ${t.endTime || '-'}` : 'No schedule';
                  })()}
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                <input type="checkbox" checked={startSessionUseCustom} onChange={(e) => setStartSessionUseCustom(e.target.checked)} />
                Use custom topic (not from software list)
              </label>
            </div>

            {!startSessionUseCustom ? (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject/Topic</label>
                <select
                  value={startSessionSubject}
                  onChange={(e) => setStartSessionSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {extractSubjectsFromSoftware((startSessionBatch as any).software).map((s) => {
                    const completed = (() => {
                      try {
                        return JSON.parse(localStorage.getItem(completedSubjectKey(startSessionBatch.id)) || '[]') as string[];
                      } catch {
                        return [];
                      }
                    })();
                    return (
                      <option key={s} value={s} disabled={completed.includes(s)}>
                        {s}
                      </option>
                    );
                  })}
                </select>
                <div className="text-xs text-gray-500 mt-1">Completed subjects are disabled.</div>
              </div>
            ) : (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Custom Topic</label>
                <input
                  type="text"
                  value={startSessionCustomTopic}
                  onChange={(e) => setStartSessionCustomTopic(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter topic..."
                />
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowStartSessionModal(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300">
                Cancel
              </button>
              <button
                onClick={doStartSession}
                disabled={startSessionMutation.isPending}
                className="px-5 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
              >
                {startSessionMutation.isPending ? 'Starting...' : 'Start'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};


