import { useState, useRef } from "react";
import axios from "axios";
import "../styles/VoiceRecorder.css"; // Create this CSS file

const VoiceRecorder = () => {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // 🎙 Start Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.start();
      setRecording(true);
      setTranscript("");

    } catch (error) {
      console.error("Mic access denied:", error);
      alert("Microphone permissions are required!");
    }
  };

  // 🛑 Stop Recording + Send to Backend
  const stopRecording = async () => {
    setRecording(false);
    setLoading(true);

    return new Promise((resolve) => {
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

        // Prepare form data
        const formData = new FormData();
        formData.append("file", audioBlob, "audio.webm");

        try {
          const res = await axios.post("http://localhost:8000/transcribe", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          setTranscript(res.data.text);
        } catch (e) {
          console.error(e);
          alert("Error transcribing audio. Check backend logs.");
        }

        setLoading(false);
        resolve();
      };

      mediaRecorderRef.current.stop();
    });
  };

  const clearTranscript = () => {
    setTranscript("");
  };

  return (
    <div className="voice-recorder-container">
      <div className="voice-recorder-card">
        {/* Header */}
        <div className="voice-recorder-header">
          <div className="header-icon">
            <span className="material-icons-outlined">mic</span>
          </div>
          <div className="header-content">
            <h1>Voice Interview Recorder</h1>
            <p>Record your interview responses and get instant transcription</p>
          </div>
        </div>

        {/* Recording Section */}
        <div className="recording-section">
          <div className="recording-visual">
            <div className={`mic-icon ${recording ? "recording" : ""}`}>
              <span className="material-icons-outlined">
                {recording ? "mic" : "mic_none"}
              </span>
            </div>
            {recording && (
              <div className="recording-animation">
                <div className="wave"></div>
                <div className="wave"></div>
                <div className="wave"></div>
              </div>
            )}
          </div>

          <div className="recording-controls">
            {!recording ? (
              <button
                onClick={startRecording}
                className="btn btn-primary btn-start"
              >
                <span className="material-icons-outlined">play_arrow</span>
                Start Recording
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="btn btn-secondary btn-stop"
              >
                <span className="material-icons-outlined">stop</span>
                Stop Recording
              </button>
            )}
          </div>

          {recording && (
            <div className="recording-status">
              <div className="recording-indicator">
                <div className="pulse"></div>
                Recording...
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="loading-section">
            <div className="loading-spinner"></div>
            <p>Processing your recording...</p>
          </div>
        )}

        {/* Transcript Section */}
        {transcript && (
          <div className="transcript-section">
            <div className="transcript-header">
              <h3>
                <span className="material-icons-outlined">description</span>
                Transcription
              </h3>
              <button onClick={clearTranscript} className="btn btn-text">
                <span className="material-icons-outlined">clear</span>
                Clear
              </button>
            </div>
            <div className="transcript-content">
              <p>{transcript}</p>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="instructions-section">
          <h4>How to use:</h4>
          <ul>
            <li>Click "Start Recording" to begin capturing audio</li>
            <li>Speak clearly into your microphone</li>
            <li>Click "Stop Recording" when finished</li>
            <li>Your transcription will appear automatically</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default VoiceRecorder;