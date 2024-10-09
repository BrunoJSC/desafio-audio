/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from "@/components/ui/button";
import { Header } from "./components/header";
import { Mic, Pause, Play, Square, Volume2 } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";

export function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendingError, setSendingError] = useState<string | null>(null);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    const newSocket = io("http://localhost:3000", {
      path: "/socket.io",
      transports: ["websocket"],
    });
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      if (audioURL) {
        URL.revokeObjectURL(audioURL);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      dataArrayRef.current = dataArray;

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      return stream;
    } catch (e) {
      console.error("Error starting recording:", e);
    }
  };

  const handleStartRecording = async () => {
    try {
      const stream = await startRecording();
      if (stream) {
        const mediaRecorder = new MediaRecorder(stream);
        setMediaRecorder(mediaRecorder);

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            setAudioChunks((prev) => [...prev, e.data]);
          }
        };

        mediaRecorder.start();
        setIsRecording(true);

        updateAudioLevel();
      }
    } catch (e) {
      console.error("Error starting recording:", e);
    }
  };

  const handleStopRecording = async () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      setIsRecording(false);

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
        setRecordedAudio(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
      };

      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    }
  };

  const playRecordedAudio = () => {
    if (audioRef.current && audioURL) {
      audioRef.current.src = audioURL;
      audioRef.current.play();
    }
  };

  const sendRecordedAudio = () => {
    if (!socket) {
      console.error("Socket not initialized");
      setSendingError("Connection error. Please try again.");
      return;
    }

    if (!recordedAudio) {
      console.error("No recorded audio available");
      setSendingError("Please record audio first.");
      return;
    }

    setIsSending(true);
    setSendingError(null);

    socket.emit(
      "send-audio",
      {
        audio: recordedAudio,
        filename: "recording.webm",
        fileType: "audio/webm",
      },
      (response: any) => {
        setIsSending(false);
        console.log("Server response:", response);
        if (typeof response === "string") {
          console.log(response);
          setRecordedAudio(null);
        } else if (response && typeof response === "object") {
          if (response.success) {
            console.log("Audio sent successfully");
            setRecordedAudio(null);
          } else {
            console.error(
              "Failed to send audio:",
              response.error || "Unknown error"
            );
            setSendingError(
              `Failed to send audio. ${response.error || "Please try again."}`
            );
          }
        } else {
          console.error("Invalid response from server:", response);
          setSendingError(
            "Received an invalid response from the server. Please try again."
          );
        }
      }
    );
  };

  const handleToggleRecording = () => {
    if (!isRecording) {
      handleStartRecording();
    } else {
      handleStopRecording();
    }
  };

  const updateAudioLevel = () => {
    if (analyserRef.current && dataArrayRef.current) {
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      const sum = dataArrayRef.current.reduce((a, b) => a + b, 0);
      const avg = sum / dataArrayRef.current.length;
      setAudioLevel(avg / 255);

      if (isRecording) {
        requestAnimationFrame(updateAudioLevel);
      }
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prevTime) => prevTime + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const stopRecording = () => {
    setIsRecording(false);
    setIsPlaying(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen">
      <Header />
      <section className="flex items-center justify-center space-x-12 p-8 mt-24 rounded-lg">
        <div className="flex flex-col items-center space-y-8">
          <div className="relative">
            <div
              className={`w-48 h-48 rounded-full flex items-center justify-center transition-colors duration-300 shadow-md ${
                isRecording ? "bg-red-500" : "bg-primary"
              }`}
            >
              <Volume2 className="w-24 h-24 text-primary-foreground" />
            </div>
          </div>
          <div className="flex space-x-6">
            <Button
              onClick={handleToggleRecording}
              variant="outline"
              size="icon"
              className="w-24 h-24 rounded-full"
              disabled={isSending}
            >
              {isPlaying ? (
                <Pause className="h-12 w-12" />
              ) : (
                <Play className="h-12 w-12" />
              )}
              <span className="sr-only">
                {isRecording
                  ? isPlaying
                    ? "Pause"
                    : "Resume"
                  : "Start Recording"}
              </span>
            </Button>
            {isRecording && (
              <Button
                onClick={stopRecording}
                variant="outline"
                size="icon"
                className="w-24 h-24 rounded-full bg-red-100 hover:bg-red-200"
                disabled={isSending}
              >
                <Square className="h-12 w-12 text-red-500" />
                <span className="sr-only">Stop Recording</span>
              </Button>
            )}
            {!isRecording && recordedAudio && (
              <>
                <Button
                  onClick={playRecordedAudio}
                  variant="outline"
                  size="icon"
                  className="w-24 h-24 rounded-full"
                  disabled={isSending}
                >
                  <Play className="h-12 w-12" />
                  <span className="sr-only">Play Recorded Audio</span>
                </Button>
                <Button
                  onClick={sendRecordedAudio}
                  variant="outline"
                  size="icon"
                  className="w-24 h-24 rounded-full bg-green-100 hover:bg-green-200"
                  disabled={isSending}
                >
                  <Square className="h-12 w-12 text-green-500" />
                  <span className="sr-only">Send Recorded Audio</span>
                </Button>
              </>
            )}
          </div>
          {isRecording && (
            <div className="text-3xl font-bold">
              {formatTime(recordingTime)}
            </div>
          )}
          {isSending && (
            <div className="text-lg text-blue-500">Sending audio...</div>
          )}
          {sendingError && (
            <div className="text-lg text-red-500">{sendingError}</div>
          )}
        </div>
        <div className="flex flex-col items-center space-y-4">
          <div className="h-64 w-10 bg-gray-200 rounded-full overflow-hidden relative">
            <div
              className="absolute bottom-0 left-0 right-0 bg-green-500 transition-all duration-200 ease-in-out"
              style={{ height: `${audioLevel * 100}%` }}
            ></div>
          </div>
          <Mic className="w-10 h-10 text-gray-600" />
        </div>
      </section>
    </div>
  );
}
