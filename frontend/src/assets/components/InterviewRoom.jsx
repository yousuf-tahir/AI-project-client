import React, { useState, useEffect, useRef } from 'react';
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
    const isSubmittingRef = useRef(false); // ✅ PREVENT DUPLICATE SUBMISSIONS
    const currentAnswerRef = useRef(''); // ✅ TRACK CURRENT ANSWER
   
    const API_BASE = 'http://localhost:8000';
    const SOCKET_URL = 'http://localhost:8000';
    
    // ✅ SYNC ANSWER STATE WITH REF
    useEffect(() => {
        currentAnswerRef.current = answer;
    }, [answer]);
    
    // Cleanup all refs and timers
    useEffect(() => {
        mountedRef.current = true;
       
        return () => {
            mountedRef.current = false;
           
            // Clear all timers
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
           
            // Cleanup media recorder
            if (mediaRecorderRef.current && recording) {
                try {
                    mediaRecorderRef.current.stop();
                    mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
                } catch (e) {
                    console.error('Error stopping media recorder:', e);
                }
            }
           
            // Cleanup socket
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
           
            hasJoinedRef.current = false;
        };
    }, []);
    
    // Save room state for persistence
    const saveRoomState = (state) => {
        try {
            sessionStorage.setItem('interviewRoomState', JSON.stringify({
                ...state,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.error('Error saving room state:', e);
        }
    };
    
    // Load room state
    const loadRoomState = () => {
        try {
            const saved = sessionStorage.getItem('interviewRoomState');
            if (saved) {
                const state = JSON.parse(saved);
                if (Date.now() - state.timestamp < 300000) { // 5 minutes
                    return state;
                }
            }
        } catch (e) {
            console.error('Error loading room state:', e);
        }
        return null;
    };
    
    // Fetch current interview state
    const fetchInterviewState = async (interviewId) => {
        try {
            console.log('[INTERVIEW] Fetching state for:', interviewId);
            const resp = await fetch(`${API_BASE}/api/interview-rooms/${interviewId}/current-state`);
            if (!resp.ok) throw new Error('Failed to fetch interview state');
           
            const data = await resp.json();
            console.log('[INTERVIEW] Fetched state:', data);
           
            setQuestions(data.questions || []);
            setCurrentQuestionIndex(data.current_question_index || 0);
           
            // Save state for persistence
            saveRoomState({
                questions: data.questions || [],
                currentQuestionIndex: data.current_question_index || 0,
                status: data.status
            });
           
            // Handle different states
            if (data.status === 'in_progress') {
                if (data.current_question_index < data.questions.length) {
                    startReadingPhase();
                } else {
                    setInterviewState('complete');
                }
            } else if (data.status === 'completed') {
                setInterviewState('complete');
            } else {
                setInterviewState('waiting');
            }
           
        } catch (err) {
            console.error('Error fetching interview state:', err);
            const savedState = loadRoomState();
            if (savedState) {
                setQuestions(savedState.questions || []);
                setCurrentQuestionIndex(savedState.currentQuestionIndex || 0);
            }
        }
    };
    
    // Start reading phase with timer
    const startReadingPhase = () => {
        console.log('[INTERVIEW] Starting reading phase');
        setInterviewState('reading');
        setTimeLeft(8);
        setAnswer('');
        currentAnswerRef.current = ''; // ✅ RESET ANSWER REF
        setRecording(false);
        setTranscribing(false);
        isSubmittingRef.current = false; // ✅ RESET SUBMISSION FLAG
       
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
       
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                    startAnsweringPhase();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };
    
    // Start answering phase with timer
    const startAnsweringPhase = () => {
        console.log('[INTERVIEW] Starting answering phase');
        setInterviewState('answering');
        setTimeLeft(30);
       
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
       
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                    // ✅ CALL SUBMIT WITH SLIGHT DELAY TO ENSURE TRANSCRIPTION COMPLETES
                    setTimeout(() => submitAnswer(), 100);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };
    
    // Start recording
    const startRecording = async () => {
        if (interviewState !== 'answering') return;
       
        try {
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
           
            mediaRecorder.start(1000);
            setRecording(true);
            console.log('[RECORDING] Started');
           
        } catch (error) {
            console.error("Mic access denied:", error);
            alert("Microphone permissions are required for voice answers!");
        }
    };
    
    // ✅ IMPROVED: Stop recording and transcribe with proper state management
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
                        
                        // ✅ UPDATE BOTH STATE AND REF
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
                    // Clean up media tracks
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
    
    // ✅ IMPROVED: Submit answer with duplicate prevention
    const submitAnswer = async () => {
        // ✅ PREVENT DUPLICATE SUBMISSIONS
        if (isSubmittingRef.current) {
            console.log('[INTERVIEW] Submission already in progress, skipping...');
            return;
        }
        
        isSubmittingRef.current = true;
        console.log('[INTERVIEW] Submitting answer...');
        
        try {
            // ✅ WAIT FOR RECORDING TO STOP AND TRANSCRIBE
            if (recording) {
                console.log('[INTERVIEW] Recording active, stopping first...');
                await stopRecording();
                // ✅ WAIT A BIT MORE FOR STATE TO UPDATE
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            // ✅ USE REF VALUE TO GET LATEST ANSWER
            const finalAnswer = currentAnswerRef.current.trim() || '(No answer provided)';
            console.log('[INTERVIEW] Final answer to submit:', finalAnswer);
            
            const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
            
            const resp = await fetch(`${API_BASE}/api/interview-rooms/${interviewId}/submit-answer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question_index: currentQuestionIndex,
                    answer: finalAnswer,
                    user_id: user?._id || user?.id
                })
            });
            
            if (!resp.ok) throw new Error('Failed to submit answer');
            
            const data = await resp.json();
            console.log('[INTERVIEW] Answer submitted successfully:', data);
            
            // ✅ RESET FOR NEXT QUESTION
            setAnswer('');
            currentAnswerRef.current = '';
            
        } catch (err) {
            console.error('[ERROR] Error submitting answer:', err);
            alert('Failed to submit answer. Please try again.');
        } finally {
            // ✅ RESET SUBMISSION FLAG AFTER A DELAY
            setTimeout(() => {
                isSubmittingRef.current = false;
            }, 1000);
        }
    };
    
    // HR starts the interview
    const handleStartInterview = async () => {
        try {
            console.log('[INTERVIEW] Starting interview');
           
            const resp = await fetch(`${API_BASE}/api/interview-rooms/${interviewId}/start-interview`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
           
            if (!resp.ok) throw new Error('Failed to start interview');
           
            console.log('[INTERVIEW] Interview started successfully');
           
        } catch (err) {
            console.error('[ERROR] Error starting interview:', err);
            alert('Failed to start interview: ' + err.message);
        }
    };
    
    // Enhanced socket connection with better error handling
    const connectSocket = (roomInfo) => {
        if (hasJoinedRef.current && socketRef.current?.connected) {
            console.log('[SOCKET] Already connected');
            return;
        }
       
        console.log('[SOCKET] Connecting to', SOCKET_URL);
        hasJoinedRef.current = true;
       
        const socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            timeout: 20000
        });
       
        socketRef.current = socket;
       
        socket.on('connect', () => {
            console.log('[SOCKET] Connected:', socket.id);
            socket.emit('join_room', {
                roomId: roomInfo.roomId,
                userId: roomInfo.userId,
                userName: roomInfo.userName,
                userType: roomInfo.userType,
            });
        });
       
        socket.on('room_joined', (data) => {
            console.log('[SOCKET] Room joined:', data);
            if (mountedRef.current) {
                setParticipants(data.participants || []);
            }
        });
       
        socket.on('user_joined', (data) => {
            console.log('[SOCKET] User joined:', data);
            if (mountedRef.current) {
                setParticipants(prev => {
                    const exists = prev.some(p => p.userId === data.userId);
                    return exists ? prev : [...prev, data];
                });
            }
        });
       
        socket.on('user_left', (data) => {
            console.log('[SOCKET] User left:', data);
            if (mountedRef.current) {
                setParticipants(prev => prev.filter(p => p.userId !== data.userId));
            }
        });
       
        socket.on('participants_list', (data) => {
            console.log('[SOCKET] Participants update:', data);
            if (mountedRef.current) {
                setParticipants(data.participants || []);
            }
        });
       
        socket.on('interview_started', (data) => {
            console.log('[SOCKET] Interview started event received');
            if (mountedRef.current) {
                fetchInterviewState(interviewId);
            }
        });
       
        socket.on('next_question', (data) => {
            console.log('[SOCKET] Next question event received:', data);
            if (mountedRef.current) {
                if (data.isComplete) {
                    console.log('[INTERVIEW] Interview complete');
                    setInterviewState('complete');
                    if (timerRef.current) {
                        clearInterval(timerRef.current);
                        timerRef.current = null;
                    }
                    sessionStorage.removeItem('interviewRoomState');
                } else {
                    console.log('[INTERVIEW] Moving to question', data.nextIndex);
                    setCurrentQuestionIndex(data.nextIndex);
                    startReadingPhase();
                }
            }
        });
       
        socket.on('error', (data) => {
            console.error('[SOCKET] Error:', data);
        });
       
        socket.on('disconnect', (reason) => {
            console.log('[SOCKET] Disconnected:', reason);
        });
       
        socket.on('reconnect', (attemptNumber) => {
            console.log('[SOCKET] Reconnected after', attemptNumber, 'attempts');
            socket.emit('join_room', {
                roomId: roomInfo.roomId,
                userId: roomInfo.userId,
                userName: roomInfo.userName,
                userType: roomInfo.userType,
            });
        });
       
        socket.on('reconnect_error', (error) => {
            console.error('[SOCKET] Reconnection error:', error);
        });
    };
    
    // Initialize room
    useEffect(() => {
        const initRoom = async () => {
            if (!interviewId || !user) {
                setError('Invalid session');
                setLoading(false);
                return;
            }
           
            try {
                const savedState = loadRoomState();
               
                const response = await fetch(`${API_BASE}/api/interviews/${interviewId}`);
                if (!response.ok) throw new Error('Interview not found');
               
                const interview = await response.json();
                if (!interview.room_id) throw new Error('Room not created');
               
                const userId = user._id || user.id;
                let userType = null;
               
                if (interview.hr_id === userId) userType = 'hr';
                else if (interview.candidate_id === userId) userType = 'candidate';
                else throw new Error('Not authorized');
               
                const roomInfo = {
                    interviewId,
                    roomId: interview.room_id,
                    userId,
                    userName: user.full_name || user.name || user.email || 'User',
                    userType,
                    field: interview.field,
                };
               
                setRoomData(roomInfo);
               
                if (savedState) {
                    console.log('[INTERVIEW] Restoring saved state');
                    setQuestions(savedState.questions || []);
                    setCurrentQuestionIndex(savedState.currentQuestionIndex || 0);
                    if (savedState.status === 'in_progress') {
                        setInterviewState('reading');
                    }
                }
               
                await fetchInterviewState(interviewId);
               
                const connectWithRetry = () => {
                    if (mountedRef.current) {
                        connectSocket(roomInfo);
                    }
                };
               
                setTimeout(connectWithRetry, 500);
               
                setLoading(false);
               
            } catch (err) {
                console.error('[ERROR] Init error:', err);
                if (mountedRef.current) {
                    setError(err.message);
                    setLoading(false);
                }
            }
        };
       
        initRoom();
    }, [interviewId, user]);
    
    const handleLeaveRoom = () => {
        if (window.confirm('Leave interview?')) {
            sessionStorage.removeItem('interviewRoomState');
           
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
        <div className="interview-container">
            <header className="interview-header">
                <div className="header-left">
                    <h1 className="header-title">
                        Interview - {roomData?.field?.replace(/_/g, ' ').toUpperCase()}
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
                                    : 'HR will start the interview shortly...'
                                }
                            </div>
                            {isHR && (
                                <button
                                    className="start-button"
                                    onClick={handleStartInterview}
                                >
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
                                All {questions.length} questions have been answered.
                                {isHR && ' You can review the responses in the dashboard.'}
                            </div>
                        </div>
                    )}
                    
                    {(interviewState === 'reading' || interviewState === 'answering') && currentQuestion && (
                        <>
                            <div className="question-card">
                                <div className="question-header">
                                    <div className="question-number">
                                        Question {currentQuestionIndex + 1} of {questions.length}
                                    </div>
                                    <div className="question-meta">
                                        <span className={`badge ${getDifficultyStyle(currentQuestion.difficulty)}`}>
                                            {currentQuestion.difficulty}
                                        </span>
                                        <span className="badge" style={{ backgroundColor: '#3b82f620', color: '#3b82f6' }}>
                                            {currentQuestion.type}
                                        </span>
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
                                        <div className="progress-fill"
                                            style={{
                                                width: `${(timeLeft / (interviewState === 'reading' ? 8 : 30)) * 100}%`,
                                                backgroundColor: timeLeft <= 5 ? '#ef4444' : '#10b981'
                                            }} />
                                    </div>
                                </div>
                                
                                {interviewState === 'answering' && !isHR && (
                                    <div className="answer-section">
                                        <div className="answer-label">Your Answer:</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                            <button
                                                onClick={recording ? stopRecording : startRecording}
                                                disabled={transcribing || timeLeft <= 5}
                                                className={`recording-button ${recording ? 'stop-recording-button' : 'start-recording-button'}`}
                                                style={{
                                                    opacity: (transcribing || timeLeft <= 5) ? 0.5 : 1,
                                                    cursor: (transcribing || timeLeft <= 5) ? 'not-allowed' : 'pointer'
                                                }}
                                            >
                                                {recording ? 'Stop Recording' : 'Start Recording'} 🎙️
                                            </button>
                                            {recording && (
                                                <div className="recording-status">
                                                    ● Recording... (Timer: {timeLeft}s)
                                                </div>
                                            )}
                                            {transcribing && (
                                                <div className="transcribing-status">
                                                    ⏳ Transcribing... (Please wait)
                                                </div>
                                            )}
                                        </div>
                                        <textarea
                                            className="answer-input"
                                            value={answer}
                                            onChange={(e) => setAnswer(e.target.value)}
                                            placeholder="Start recording or type your answer here..."
                                            disabled={transcribing}
                                            rows={4}
                                        />
                                        <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                                            Time remaining: {timeLeft} seconds | Current answer length: {answer.length} chars
                                        </div>
                                    </div>
                                )}
                                
                                {interviewState === 'answering' && isHR && (
                                    <div className="status-message" style={{ textAlign: 'center', padding: '1rem' }}>
                                        Candidate is answering...
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
                
                <aside className="sidebar">
                    <div className="sidebar-header">
                        <h3 className="sidebar-title">Participants ({participants.length})</h3>
                    </div>
                    <div className="sidebar-content">
                        {participants.map(p => (
                            <div key={p.userId} className="participant-item">
                                <div className="participant-avatar"
                                    style={{
                                        backgroundColor: p.userType === 'hr' ? '#8b5cf6' : '#3b82f6'
                                    }}>
                                    {getInitials(p.userName)}
                                </div>
                                <div className="participant-info">
                                    <div className="participant-name">{p.userName}</div>
                                    <div className="participant-type">{p.userType}</div>
                                </div>
                            </div>
                        ))}
                        {participants.length === 0 && (
                            <div style={{ color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>
                                No participants yet
                            </div>
                        )}
                    </div>
                </aside>
            </div>
            
            <div className="controls">
                <button 
                    className="control-button leave-button" 
                    onClick={handleLeaveRoom} 
                    title="Leave"
                >
                    📞
                </button>
            </div>
        </div>
    );
};

export default InterviewRoom;