import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import axios from "axios";
import "../styles/InterviewRoom.css";

const InterviewRoom = ({ interviewId, onNavigate, user }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [roomData, setRoomData] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [interviewState, setInterviewState] = useState('waiting');
    const [timeLeft, setTimeLeft] = useState(0);
    const [answer, setAnswer] = useState('');
    const [recording, setRecording] = useState(false);
    const [transcribing, setTranscribing] = useState(false);

    const socketRef = useRef(null);
    const hasJoinedRef = useRef(false);
    const mountedRef = useRef(true);
    const timerRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const isSubmittingRef = useRef(false);
    const currentAnswerRef = useRef('');
    const interviewStartTimeRef = useRef(null);
    const currentPhaseStartRef = useRef(null);
    const currentPhaseRef = useRef('waiting');

    // ✅ Step 1 — Create a ref
    const currentQuestionIndexRef = useRef(0);

    const API_BASE = 'http://localhost:8000';
    const SOCKET_URL = 'http://localhost:8000';

    // Timer function - defined first
    const startSyncedTimer = useCallback((durationSeconds, onComplete, phase) => {
        console.log(`[TIMER] Starting ${phase} timer for ${durationSeconds}s`);

        // Clear any existing timer
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        const startTime = Date.now();
        currentPhaseStartRef.current = startTime;
        currentPhaseRef.current = phase;

        // Update immediately
        setTimeLeft(durationSeconds);

        // Use setInterval for reliable timing that works with recording
        timerRef.current = setInterval(() => {
            if (!mountedRef.current || currentPhaseRef.current !== phase) {
                clearInterval(timerRef.current);
                timerRef.current = null;
                return;
            }

            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const remaining = Math.max(0, durationSeconds - elapsed);

            setTimeLeft(remaining);

            // Check if time is up
            if (remaining <= 0) {
                console.log(`[TIMER] ${phase} timer complete`);
                clearInterval(timerRef.current);
                timerRef.current = null;

                if (mountedRef.current && currentPhaseRef.current === phase) {
                    try {
                        onComplete();
                    } catch (error) {
                        console.error('[TIMER] Error in timer completion callback:', error);
                    }
                }
            }
        }, 100);
    }, []);

    // Submit answer function
    const submitAnswer = async () => {
        if (isSubmittingRef.current) {
            console.log('[INTERVIEW] Already submitting, skipping duplicate');
            return;
        }

        isSubmittingRef.current = true;
        console.log('[INTERVIEW] Submitting answer...', {
            currentQuestionIndex,
            questionsLength: questions.length,
            interviewState
        });

        try {
            // Stop recording if active
            if (recording) {
                console.log('[INTERVIEW] Recording active, stopping first...');
                await stopRecording();
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            const finalAnswer = currentAnswerRef.current.trim() || '(No answer provided)';
            console.log('[INTERVIEW] Final answer to submit:', finalAnswer.substring(0, 100));

            const userData = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');

            // ✅ Step 3 — submitAnswer MUST use the ref, not the state
            fetch(`${API_BASE}/api/interview-rooms/${interviewId}/submit-answer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question_index: currentQuestionIndexRef.current, // ✅ FIX: Use ref instead of state
                    answer: finalAnswer,
                    user_id: userData?._id || userData?.id
                })
            }).then(resp => {
                if (resp.ok) {
                    console.log('[INTERVIEW] Answer submitted successfully');
                } else {
                    console.error('[INTERVIEW] Submit failed');
                }
            }).catch(err => {
                console.error('[ERROR] Error submitting answer:', err);
            });

            // Clear timer immediately (don't wait for response)
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }

            // Reset answer state immediately
            setAnswer('');
            currentAnswerRef.current = '';

            console.log('[INTERVIEW] Waiting for server socket broadcast...');

        } catch (err) {
            console.error('[ERROR] Error in submitAnswer:', err);
            isSubmittingRef.current = false;
        } finally {
            // Reset submission lock after a short delay
            setTimeout(() => {
                isSubmittingRef.current = false;
            }, 1000);
        }
    };

    // Reading phase
    const startReadingPhase = useCallback(() => {
        console.log('[INTERVIEW] Starting reading phase');
        setInterviewState('reading');
        setAnswer('');
        currentAnswerRef.current = '';
        setRecording(false);
        setTranscribing(false);
        isSubmittingRef.current = false;

        startSyncedTimer(10, () => {
            if (mountedRef.current) {
                startAnsweringPhase();
            }
        }, 'reading');
    }, [startSyncedTimer]);

    // Answering phase
    const startAnsweringPhase = useCallback(() => {
        console.log('[INTERVIEW] Starting answering phase');

        setInterviewState('answering');

        startSyncedTimer(30, () => {
            if (mountedRef.current) {
                console.log('[INTERVIEW] Auto-submitting answer due to timer completion');
                submitAnswer();
            }
        }, 'answering');
    }, [startSyncedTimer]);

    // Recording functions
    const startRecording = async () => {
        if (interviewState !== 'answering') return;

        try {
            console.log('[RECORDING] Starting recording setup...');

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                }
            });

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onerror = (e) => {
                console.error('[RECORDING] Error:', e);
                setRecording(false);
            };

            mediaRecorder.start(1000);
            setRecording(true);
            console.log('[RECORDING] Started - Timer should continue running');

        } catch (error) {
            console.error("Mic access denied:", error);
            alert("Microphone permissions are required for voice answers!");
        }
    };

    const stopRecording = () => {
        return new Promise((resolve) => {
            if (!mediaRecorderRef.current || !recording) {
                console.log('[RECORDING] No active recording to stop');
                resolve();
                return;
            }

            setRecording(false);
            setTranscribing(true);
            console.log('[RECORDING] Stopping...');

            mediaRecorderRef.current.onstop = async () => {
                try {
                    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
                    console.log('[RECORDING] Audio blob size:', audioBlob.size);

                    if (audioBlob.size > 0) {
                        const formData = new FormData();
                        formData.append("file", audioBlob, "audio.webm");

                        console.log('[TRANSCRIPTION] Sending audio for transcription...');
                        const res = await axios.post(`${API_BASE}/transcribe`, formData, {
                            headers: { "Content-Type": "multipart/form-data" },
                            timeout: 30000
                        });

                        const transcribedText = res.data.text || '';
                        console.log('[TRANSCRIPTION] Success:', transcribedText);

                        const newAnswer = currentAnswerRef.current + (currentAnswerRef.current ? ' ' : '') + transcribedText;
                        setAnswer(newAnswer);
                        currentAnswerRef.current = newAnswer;

                    } else {
                        console.log('[TRANSCRIPTION] No audio data captured');
                    }
                } catch (e) {
                    console.error('[TRANSCRIPTION] Error:', e);
                    alert("Error transcribing audio. Your typed answer will be saved.");
                } finally {
                    setTranscribing(false);
                    if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
                        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
                    }
                    mediaRecorderRef.current = null;
                    audioChunksRef.current = [];
                    resolve();
                }
            };

            mediaRecorderRef.current.stop();
        });
    };

    // Debug state changes
    useEffect(() => {
        console.log('[STATE] Current state:', {
            loading,
            error: error?.message,
            roomData: !!roomData,
            participants: participants.length,
            questions: questions.length,
            interviewState,
            currentQuestionIndex,
            timeLeft
        });
    }, [loading, error, roomData, participants, questions, interviewState, currentQuestionIndex, timeLeft]);

    // SYNC ANSWER STATE WITH REF
    useEffect(() => {
        currentAnswerRef.current = answer;
    }, [answer]);

    // SYNC PHASE REF
    useEffect(() => {
        currentPhaseRef.current = interviewState;
    }, [interviewState]);

    // CRITICAL FIX: Deduplicate participants helper
    const deduplicateParticipants = useCallback((participantList) => {
        const seen = new Map();
        const unique = [];

        for (const p of participantList) {
            const userId = p.userId || p.user_id;
            if (userId && !seen.has(userId)) {
                seen.set(userId, true);
                unique.push({
                    userId: userId,
                    userName: p.userName || p.user_name || 'Unknown',
                    userType: p.userType || p.user_type || 'unknown',
                    joinedAt: p.joinedAt || p.joined_at
                });
            }
        }

        console.log(`[PARTICIPANTS] Deduplicated ${participantList.length} → ${unique.length} participants`);
        return unique;
    }, []);

    // CRITICAL FIX: Safe participant state update
    const updateParticipants = useCallback((newParticipants) => {
        if (!mountedRef.current) return;

        const deduplicated = deduplicateParticipants(newParticipants);
        setParticipants(deduplicated);
    }, [deduplicateParticipants]);

    // Helper function for API-based state sync
    const syncStateViaAPI = async () => {
        try {
            const stateResp = await fetch(`${API_BASE}/api/interview-rooms/${interviewId}/current-state`);
            if (stateResp.ok) {
                const stateData = await stateResp.json();
                console.log('[INTERVIEW] API State sync result:', stateData);

                if (stateData.status === 'in_progress') {
                    console.log('[INTERVIEW] ✅ Interview confirmed in progress, starting reading phase');
                    setQuestions(stateData.questions || []);
                    // ✅ Step 2 — Update both state and ref on initial load
                    setCurrentQuestionIndex(stateData.current_question_index || 0);
                    currentQuestionIndexRef.current = stateData.current_question_index || 0;
                    startReadingPhase();
                } else {
                    console.log('[INTERVIEW] ❌ Interview still not in progress, status:', stateData.status);
                }
            }
        } catch (syncErr) {
            console.error('[INTERVIEW] API state sync failed:', syncErr);
        }
    };

    const handleStartInterview = async () => {
        try {
            console.log('[INTERVIEW] HR initiating interview start...');

            const resp = await fetch(`${API_BASE}/api/interview-rooms/${interviewId}/start-interview`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!resp.ok) {
                const errorData = await resp.json();
                throw new Error(errorData.detail || 'Failed to start interview');
            }

            const data = await resp.json();
            console.log('[INTERVIEW] Start response:', data);

            // CRITICAL FIX: Force emit interview_started event to ensure all clients receive it
            if (socketRef.current?.connected && roomData) {
                console.log('[INTERVIEW] Emitting interview_started event to all clients');
                socketRef.current.emit('interview_started', {
                    roomId: roomData.roomId,
                    timestamp: new Date().toISOString()
                });
            }

            // Set a timeout to fallback to direct API call
            setTimeout(async () => {
                if (interviewState === 'waiting') {
                    console.log('[INTERVIEW] Interview not started, trying API sync');
                    await syncStateViaAPI();
                }
            }, 2000);

        } catch (err) {
            console.error('[ERROR] Error starting interview:', err);
            alert('Failed to start interview: ' + err.message);
        }
    };

    // FIXED: Enhanced socket connection
    const connectSocket = useCallback((roomInfo) => {
        if (hasJoinedRef.current && socketRef.current?.connected) {
            console.log('[SOCKET] Already connected, skipping');
            return;
        }

        console.log('[SOCKET] Connecting to', SOCKET_URL);
        hasJoinedRef.current = true;

        const socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 3,
            reconnectionDelay: 1000,
            timeout: 10000,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('[SOCKET] ✅ Connected:', socket.id);

            socket.emit('join_room', {
                roomId: roomInfo.roomId,
                userId: roomInfo.userId,
                userName: roomInfo.userName,
                userType: roomInfo.userType,
            });
        });

        // CRITICAL FIX: Process ALL data from room_joined
        socket.on('room_joined', (data) => {
            console.log('[SOCKET] ✅ Room joined - questions:', data.interviewInfo?.questions?.length, 'currentIndex:', data.interviewInfo?.currentQuestionIndex);
            if (mountedRef.current) {
                // Update participants
                if (data.participants) {
                    updateParticipants(data.participants);
                }

                // CRITICAL: Update ALL interview state from room_joined
                if (data.interviewInfo) {
                    console.log('[SOCKET] 📝 Processing interviewInfo from room_joined:', data.interviewInfo);

                    // Update questions
                    if (data.interviewInfo.questions) {
                        setQuestions(data.interviewInfo.questions);
                        console.log(`[SOCKET] Set ${data.interviewInfo.questions.length} questions`);
                    }

                    // ✅ Step 2 — Update both state and ref when setting initial value
                    setCurrentQuestionIndex(data.interviewInfo.currentQuestionIndex || 0);
                    currentQuestionIndexRef.current = data.interviewInfo.currentQuestionIndex || 0;

                    // Update interview state
                    if (data.interviewInfo.status === 'in_progress') {
                        console.log('[SOCKET] 🎬 Interview in progress, starting reading phase');
                        interviewStartTimeRef.current = data.interviewInfo.startedAt ? new Date(data.interviewInfo.startedAt) : new Date();
                        startReadingPhase();
                    } else if (data.interviewInfo.status === 'completed') {
                        setInterviewState('complete');
                    } else {
                        setInterviewState('waiting');
                        console.log('[SOCKET] ⏳ Interview scheduled, waiting for start');
                    }
                }
            }
        });

        socket.on('interview_state_sync', (data) => {
            console.log('[SOCKET] 🔄 State sync received - questions:', data.questions?.length, 'currentIndex:', data.currentQuestionIndex);
            if (mountedRef.current) {
                if (data.participants) {
                    updateParticipants(data.participants);
                }

                if (data.status === 'in_progress') {
                    interviewStartTimeRef.current = data.startedAt ? new Date(data.startedAt) : null;
                    // ✅ Step 2 — Update both state and ref
                    setCurrentQuestionIndex(data.currentQuestionIndex || 0);
                    currentQuestionIndexRef.current = data.currentQuestionIndex || 0;
                    startReadingPhase();
                }
            }
        });

        socket.on('user_joined', (data) => {
            console.log('[SOCKET] 👤 User joined:', data);
            if (mountedRef.current) {
                setParticipants(prev => {
                    const userId = data.userId;
                    const exists = prev.some(p => p.userId === userId);
                    if (exists) return prev;

                    const newList = [...prev, {
                        userId: userId,
                        userName: data.userName,
                        userType: data.userType,
                        joinedAt: data.timestamp
                    }];
                    return deduplicateParticipants(newList);
                });
            }
        });

        socket.on('user_left', (data) => {
            console.log('[SOCKET] 🚪 User left:', data);
            if (mountedRef.current) {
                setParticipants(prev => prev.filter(p => p.userId !== data.userId));
            }
        });

        socket.on('participants_list', (data) => {
            console.log('[SOCKET] 📋 Participants update:', data);
            if (mountedRef.current) {
                updateParticipants(data.participants || []);
            }
        });

        socket.on('interview_started', (data) => {
            console.log('[SOCKET] 🎬 Interview started event received:', data);

            // ✨ NEW: Log AI vs Static question breakdown
            if (data.questions) {
                const aiCount = data.questions.filter(q => q.source === 'ai_generated').length;
                const staticCount = data.questions.length - aiCount;
                console.log(`[SOCKET] 📊 Questions: ${data.questions.length} total (${staticCount} static, ${aiCount} AI)`);

                // Set questions with sources
                setQuestions(data.questions);
            }

            if (mountedRef.current) {
                interviewStartTimeRef.current = data.timestamp ? new Date(data.timestamp) : new Date();
                setCurrentQuestionIndex(0);
                currentQuestionIndexRef.current = 0;

                console.log('[SOCKET] Immediately transitioning to reading phase...');
                setInterviewState('reading');
                setAnswer('');
                currentAnswerRef.current = '';
                setRecording(false);
                setTranscribing(false);
                isSubmittingRef.current = false;

                startSyncedTimer(10, () => {
                    if (mountedRef.current) {
                        startAnsweringPhase();
                    }
                }, 'reading');
            }
        });

        // CRITICAL FIX: Enhanced next_question event handler
        socket.on('next_question', (data) => {
            console.log('[SOCKET] ➡️ Next question event RECEIVED:', {
                nextIndex: data.nextIndex,
                isComplete: data.isComplete,
                currentRef: currentQuestionIndexRef.current
            });

            if (!mountedRef.current) return;

            // Clear any existing timers FIRST
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }

            if (data.isComplete) {
                console.log('[SOCKET] 🎉 Interview complete via socket');
                setInterviewState('complete');
                setTimeLeft(0);
                setAnswer('');
                currentAnswerRef.current = '';
                return;
            }

            const nextIndex = data.nextIndex;
            console.log('[SOCKET] Moving to question:', nextIndex);

            // Reset all state immediately
            isSubmittingRef.current = false;
            setAnswer('');
            currentAnswerRef.current = '';
            setRecording(false);
            setTranscribing(false);

            // ✅ Update both state and ref
            setCurrentQuestionIndex(nextIndex);
            currentQuestionIndexRef.current = nextIndex;

            // Start reading phase immediately
            setInterviewState('reading');
            setTimeLeft(10);
            console.log('[SOCKET] Starting reading phase for Q' + (nextIndex + 1));

            // ✅ CRITICAL FIX: Inline timer logic to avoid stale closures
            const readingStartTime = Date.now();
            currentPhaseStartRef.current = readingStartTime;
            currentPhaseRef.current = 'reading';

            timerRef.current = setInterval(() => {
                if (!mountedRef.current || currentPhaseRef.current !== 'reading') {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                    return;
                }

                const elapsed = Math.floor((Date.now() - readingStartTime) / 1000);
                const remaining = Math.max(0, 10 - elapsed);
                setTimeLeft(remaining);

                if (remaining <= 0) {
                    console.log('[SOCKET] Reading complete for Q' + (nextIndex + 1));
                    clearInterval(timerRef.current);
                    timerRef.current = null;

                    if (!mountedRef.current) return;

                    // Start answering phase
                    setInterviewState('answering');
                    setTimeLeft(30);
                    console.log('[SOCKET] Starting answering phase for Q' + (nextIndex + 1));

                    const answeringStartTime = Date.now();
                    currentPhaseStartRef.current = answeringStartTime;
                    currentPhaseRef.current = 'answering';

                    timerRef.current = setInterval(() => {
                        if (!mountedRef.current || currentPhaseRef.current !== 'answering') {
                            clearInterval(timerRef.current);
                            timerRef.current = null;
                            return;
                        }

                        const elapsedAnswering = Math.floor((Date.now() - answeringStartTime) / 1000);
                        const remainingAnswering = Math.max(0, 30 - elapsedAnswering);
                        setTimeLeft(remainingAnswering);

                        if (remainingAnswering <= 0) {
                            console.log('[SOCKET] Auto-submitting answer for Q' + (nextIndex + 1));
                            clearInterval(timerRef.current);
                            timerRef.current = null;

                            if (mountedRef.current) {
                                submitAnswer();
                            }
                        }
                    }, 100);
                }
            }, 100);
        });

        socket.on('error', (data) => {
            console.error('[SOCKET] ❌ Error:', data);
        });

        socket.on('disconnect', (reason) => {
            console.log('[SOCKET] 🔌 Disconnected:', reason);
            hasJoinedRef.current = false;
        });
    }, [updateParticipants, startReadingPhase, deduplicateParticipants]);

    // SIMPLIFIED: Initialize room
    useEffect(() => {
        const initRoom = async () => {
            if (!interviewId || !user) {
                setError('Invalid session');
                setLoading(false);
                return;
            }

            try {
                console.log('[INIT] Starting room initialization...');

                // Get current state first
                const stateResponse = await fetch(`${API_BASE}/api/interview-rooms/${interviewId}/current-state`);
                if (!stateResponse.ok) throw new Error('Failed to fetch interview state');

                const stateData = await stateResponse.json();
                console.log('[INIT] Current state:', stateData);

                const roomInfo = {
                    interviewId,
                    roomId: `interview_${interviewId}`,
                    userId: user._id || user.id,
                    userName: user.full_name || user.name || user.email || 'User',
                    userType: user.role,
                    field: stateData.field,
                };

                setRoomData(roomInfo);
                setQuestions(stateData.questions || []);
                // ✅ Step 2 — Update both state and ref on initial load
                setCurrentQuestionIndex(stateData.current_question_index || 0);
                currentQuestionIndexRef.current = stateData.current_question_index || 0;

                if (stateData.status === 'in_progress') {
                    setInterviewState('reading');
                } else {
                    setInterviewState('waiting');
                }

                // Connect socket
                console.log('[INIT] Connecting socket...');
                connectSocket(roomInfo);

                setLoading(false);
                console.log('[INIT] Room initialization complete');

            } catch (err) {
                console.error('[ERROR] Init error:', err);
                setError(err.message);
                setLoading(false);
            }
        };

        initRoom();
    }, [interviewId, user, connectSocket]);

    const handleLeaveRoom = () => {
        if (window.confirm('Leave interview?')) {
            if (socketRef.current && roomData) {
                socketRef.current.emit('leave_room', { roomId: roomData.roomId });
                socketRef.current.disconnect();
            }
            onNavigate(roomData?.userType === 'hr' ? '/schedule-interview' : '/candidate');
        }
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const getDifficultyStyle = (difficulty) => {
        if (difficulty === 'easy') return 'difficulty-easy';
        if (difficulty === 'hard') return 'difficulty-hard';
        return 'difficulty-medium';
    };

    const getTimerColor = () => {
        if (interviewState === 'reading') return 'timer-reading';
        if (timeLeft <= 5) return 'timer-ending';
        return 'timer-active';
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p style={{ marginTop: '1rem' }}>Loading interview...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="loading-container">
                <h2 style={{ color: '#ef4444' }}>Error</h2>
                <p>{error}</p>
                <button
                    className="control-button leave-button"
                    style={{ width: 'auto', padding: '0 2rem', borderRadius: '0.5rem' }}
                    onClick={() => window.history.back()}
                >
                    Go Back
                </button>
            </div>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];
    const isHR = roomData?.userType === 'hr';

    return (
        <div className="interview-room-page">
            <header className="interview-header">
                <div className="header-left">
                    <h1 className="header-title">
                        {roomData?.field?.replace(/_/g, ' ').toUpperCase()} Interview
                    </h1>
                    <div className="status-indicator">
                        <div className="status-dot"></div>
                        <span>
                            {interviewState === 'complete'
                                ? 'Completed'
                                : interviewState === 'waiting'
                                    ? 'Waiting'
                                    : 'Live'}
                        </span>
                    </div>
                </div>
            </header>

            <div className="main-content">
                <div className="content-wrapper">
                    {/* Question Area */}
                    <div className="question-area">
                        {interviewState === 'waiting' && (
                            <div className="status-card">
                                <div className="status-icon">⏳</div>
                                <div className="status-title">
                                    {isHR ? 'Ready to Start?' : 'Waiting for HR'}
                                </div>
                                <div className="status-message">
                                    {isHR
                                        ? `${participants.length} participant(s) in the room. Click Start when ready.`
                                        : 'HR will start the interview shortly. Please wait...'}
                                </div>
                                {isHR && (
                                    <button className="start-button" onClick={handleStartInterview}>
                                        <span>▶️</span>
                                        Start Interview
                                    </button>
                                )}
                            </div>
                        )}

                        {interviewState === 'complete' && (
                            <div className="status-card">
                                <div className="status-icon">✅</div>
                                <div className="status-title">Interview Complete!</div>
                                <div className="status-message">
                                    All {questions.length} questions have been answered successfully.
                                    {isHR && ' You can review responses in your dashboard.'}
                                </div>
                            </div>
                        )}

                        {(interviewState === 'reading' || interviewState === 'answering') && currentQuestion && (
                            <div className="question-card">
                                <div className="question-header">
                                    <div className="question-number">
                                        Question {currentQuestionIndex + 1} of {questions.length}
                                    </div>
                                    <div className="question-meta">
                                        <span className={`badge ${getDifficultyStyle(currentQuestion.difficulty)}`}>
                                            {currentQuestion.difficulty}
                                        </span>
                                        <span className="badge type-badge">
                                            {currentQuestion.type}
                                        </span>
                                        {/* ✨ NEW: AI Generated Badge */}
                                        {currentQuestion.source === 'ai_generated' && (
                                            <span className="badge ai-badge">
                                                🤖 AI Generated
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="question-text">
                                    {currentQuestion.text}
                                </div>

                                <div className="timer-section">
                                    <div className="timer-label">
                                        {interviewState === 'reading' ? 'Reading Time' : 'Time Remaining'}
                                    </div>
                                    <div className={`timer-display ${getTimerColor()}`}>
                                        {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                                    </div>
                                    <div className="progress-bar">
                                        <div
                                            className="progress-fill"
                                            style={{
                                                width: `${(timeLeft / (interviewState === 'reading' ? 8 : 30)) * 100}%`
                                            }}
                                        />
                                    </div>
                                </div>

                                {interviewState === 'answering' && !isHR && (
                                    <div className="answer-section">
                                        <div className="answer-label">Your Answer:</div>
                                        <div className="recording-controls">
                                            <button
                                                onClick={recording ? stopRecording : startRecording}
                                                disabled={transcribing || timeLeft <= 5}
                                                className={`recording-button ${recording ? 'stop-recording-button' : 'start-recording-button'}`}
                                            >
                                                {recording ? '⏹️ Stop Recording' : '🎙️ Start Recording'}
                                            </button>
                                            {recording && (
                                                <div className="recording-status">
                                                    ● Recording in progress...
                                                </div>
                                            )}
                                            {transcribing && (
                                                <div className="transcribing-status">
                                                    ⏳ Transcribing audio...
                                                </div>
                                            )}
                                        </div>
                                        <textarea
                                            className="answer-input"
                                            value={answer}
                                            onChange={(e) => setAnswer(e.target.value)}
                                            placeholder="Start recording or type your answer here..."
                                            disabled={transcribing}
                                            rows={6}
                                        />
                                        <div className="answer-stats">
                                            <span>Time left: {timeLeft}s</span>
                                            <span>{answer.length} characters</span>
                                        </div>
                                    </div>
                                )}

                                {interviewState === 'answering' && isHR && (
                                    <div className="hr-view-message">
                                        <div className="hr-icon">👁️</div>
                                        <div className="hr-text">Candidate is answering the question...</div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Participants Sidebar */}
                    <aside className="sidebar">
                        <div className="sidebar-header">
                            <h3 className="sidebar-title">Participants ({participants.length})</h3>
                        </div>
                        <div className="participants-list">
                            {participants.length > 0 ? (
                                participants.map((p, index) => (
                                    <div
                                        key={`participant-${p.userId}-${index}`}
                                        className="participant-item"
                                    >
                                        <div className={`participant-avatar ${p.userType === 'hr' ? 'hr' : 'candidate'}`}>
                                            {getInitials(p.userName)}
                                            <div className="participant-status"></div>
                                        </div>
                                        <div className="participant-info">
                                            <div className="participant-name">{p.userName}</div>
                                            <div className="participant-type">{p.userType.toUpperCase()}</div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="no-participants">
                                    <div className="no-participants-icon">👥</div>
                                    <div>No participants yet</div>
                                </div>
                            )}
                        </div>
                    </aside>
                </div>
            </div>

            <div className="controls">
                <button
                    className="control-button leave-button"
                    onClick={handleLeaveRoom}
                    title="Leave Interview"
                >
                    📞 Leave
                </button>
            </div>
        </div>
    );
};

export default InterviewRoom;