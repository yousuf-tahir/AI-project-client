import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { FaMicrophone, FaStop, FaArrowRight } from 'react-icons/fa';
import '../styles/interview-page.css';

const AIInterview = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [evaluation, setEvaluation] = useState(null);
  const [interviewComplete, setInterviewComplete] = useState(false);
  const [timer, setTimer] = useState(0);
  const [timeUp, setTimeUp] = useState(false);
  
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const questionTimerRef = useRef(null);
  const QUESTION_TIME_LIMIT = 180; // 3 minutes per question

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;

        recognitionRef.current.onresult = (event) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }
          
          setTranscript(finalTranscript || interimTranscript);
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          stopRecording();
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      clearInterval(timerRef.current);
      clearInterval(questionTimerRef.current);
    };
  }, []);

  // Fetch interview questions
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await axios.get(`/api/questions?jobId=${jobId}`);
        if (response.data.questions && response.data.questions.length > 0) {
          setQuestions(response.data.questions);
          setCurrentQuestion(response.data.questions[0]);
        } else {
          // If no HR questions, fetch general questions based on job field
          const generalResponse = await axios.get(`/api/general-questions?jobId=${jobId}`);
          setQuestions(generalResponse.data.questions);
          setCurrentQuestion(generalResponse.data.questions[0]);
        }
      } catch (error) {
        console.error('Error fetching questions:', error);
        toast.error('Failed to load interview questions');
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [jobId]);

  // Timer effect
  useEffect(() => {
    if (interviewStarted && !interviewComplete) {
      timerRef.current = setInterval(() => {
        setTimer(prev => {
          if (prev >= QUESTION_TIME_LIMIT) {
            handleTimeUp();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }

    return () => clearInterval(timerRef.current);
  }, [interviewStarted, interviewComplete]);

  const startInterview = () => {
    setInterviewStarted(true);
    startQuestionTimer();
  };

  const startQuestionTimer = () => {
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    
    questionTimerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev >= QUESTION_TIME_LIMIT) {
          handleTimeUp();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const handleTimeUp = () => {
    setTimeUp(true);
    stopRecording();
    clearInterval(questionTimerRef.current);
    toast.info('Time\'s up! Moving to the next question.');
    setTimeout(handleNextQuestion, 2000);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = () => {
    if (recognitionRef.current) {
      setTranscript('');
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      if (transcript.trim()) {
        evaluateAnswer();
      }
    }
  };

  const evaluateAnswer = async () => {
    try {
      const response = await axios.post('/api/evaluate-answer', {
        question: currentQuestion,
        answer: transcript,
        jobId
      });
      
      setEvaluation({
        score: response.data.score,
        feedback: response.data.feedback
      });

      // Save evaluation to database
      await axios.post('/api/save-evaluation', {
        jobId,
        question: currentQuestion,
        answer: transcript,
        evaluation: response.data
      });

    } catch (error) {
      console.error('Error evaluating answer:', error);
      toast.error('Failed to evaluate your answer');
    }
  };

  const handleNextQuestion = () => {
    setEvaluation(null);
    setTranscript('');
    setTimeUp(false);
    setTimer(0);
    
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setCurrentQuestion(questions[nextIndex]);
      startQuestionTimer();
    } else {
      // Interview complete
      setInterviewComplete(true);
      clearInterval(questionTimerRef.current);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!interviewStarted) {
    return (
      <div className="interview-container">
        <div className="interview-card text-center max-w-2xl mx-auto">
          <h1>AI-Powered Interview</h1>
          <p className="text-gray-600 mb-8">
            Welcome to your interview! You'll be asked a series of questions. 
            You'll have {Math.floor(QUESTION_TIME_LIMIT / 60)} minutes to answer each question.
          </p>
          <button
            onClick={startInterview}
            className="btn btn-primary"
          >
            Start Interview
            <FaArrowRight className="ml-2" />
          </button>
        </div>
      </div>
    );
  }

  if (interviewComplete) {
    return (
      <div className="interview-container">
        <div className="interview-card text-center max-w-2xl mx-auto">
          <div className="text-green-500 mb-6">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h1>Interview Complete!</h1>
          <p className="text-gray-600 mb-8">
            Thank you for completing the interview. Your responses have been recorded and will be reviewed by the hiring team.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn btn-primary"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="interview-container">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="interview-card flex justify-between items-center">
          <div>
            <h2>AI Interview</h2>
            <p>Question {currentQuestionIndex + 1} of {questions.length}</p>
          </div>
          <div className="text-right">
            <div className="interview-timer">
              {formatTime(timer)}
            </div>
            <div className="timer-progress">
              <div 
                className={`timer-progress-bar ${
                  timer > QUESTION_TIME_LIMIT * 0.8 ? 'timer-warning' : ''
                } ${timer > QUESTION_TIME_LIMIT * 0.9 ? 'timer-danger' : ''}`}
                style={{ width: `${Math.min(100, (timer / QUESTION_TIME_LIMIT) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Question Card */}
        <div className="interview-card">
          <h3>Question:</h3>
          <p className="question-text">{currentQuestion}</p>
        </div>

        {/* Answer Section */}
        <div className="interview-card">
          <div className="answer-section">
            <div className="flex justify-between items-center mb-4">
              <h3>Your Answer:</h3>
              <button
                onClick={toggleRecording}
                className={`btn ${isRecording ? 'btn-danger' : 'btn-primary'}`}
              >
                {isRecording ? (
                  <>
                    <FaStop className="mr-2" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <FaMicrophone className="mr-2" />
                    {transcript ? 'Record Again' : 'Start Recording'}
                  </>
                )}
              </button>
            </div>
            
            {transcript && (
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="whitespace-pre-line">{transcript}</p>
              </div>
            )}

            {isRecording && (
              <div className="recording-indicator">
                <span className="recording-pulse"></span>
                <span>Recording in progress...</span>
              </div>
            )}
          </div>
        </div>

        {/* Evaluation */}
        {evaluation && (
          <div className="evaluation-section">
            <h3>Evaluation:</h3>
            <div className="score-display">
              Score: <span className={`${
                evaluation.score >= 8 ? 'text-green-600' : 
                evaluation.score >= 5 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {evaluation.score}/10
              </span>
            </div>
            <div>
              <p className="font-medium mb-2">Feedback:</p>
              <p className="feedback-text">
                {evaluation.feedback}
              </p>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleNextQuestion}
                className="btn btn-primary"
                disabled={timeUp}
              >
                {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Complete Interview'}
                <FaArrowRight className="ml-2" />
              </button>
            </div>
          </div>
        )}

        {timeUp && !evaluation && (
          <div className="text-center py-4 text-gray-600">
            <p>Please wait while we evaluate your response...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIInterview;
