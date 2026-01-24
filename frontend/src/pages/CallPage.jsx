import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import Navbar from '../components/Navbar';
import { clearIncomingCall } from '../store/users-slice/usersSlice';
import {
  IoMicOffSharp,
  IoMicSharp,
  IoVideocamOffSharp,
  IoVideocamSharp,
  IoCall,
  IoSend
} from "react-icons/io5";

const peerConnectionConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function CallPage() {
  const socket = useSocket();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { incomingCallData } = useSelector((state) => state.users);
  const { calleeId } = useParams();

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const [callStatus, setCallStatus] = useState('idle');
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [remoteMicOn, setRemoteMicOn] = useState(true);
  const [remoteVideoOn, setRemoteVideoOn] = useState(true);

  //captions
  const [captions, setCaptions] = useState("");
  const captionTimerRef = useRef(null);

  //TTS
  const [textMessage, setTextMessage] = useState("");
  const audioPlayerRef = useRef(new Audio());
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);

  // sign language
  const [signLabel, setSignLabel] = useState("");

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const otherUserRef = useRef(null);
  const isCleaningUpRef = useRef(false);
  const mediaRecorderRef = useRef(null);

  const createPeerConnection = (targetUserId) => {
    const pc = new RTCPeerConnection(peerConnectionConfig);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', { to: targetUserId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    peerConnectionRef.current = pc;
    return pc;
  };

  useEffect(() => {

    if (!user) return;

    let mounted = true;
    setIsMicOn(!user.isDeaf);       // Mic is ON for hearing, OFF for deaf
    navigator.mediaDevices.getUserMedia({ video: true, audio: !user.isDeaf })
      .then(stream => {
        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        setLocalStream(stream);
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        console.log('Media stream initialized');
      })
      .catch(err => {
        // This is an expected path for a deaf user
        if (user.isDeaf && (err.name === "NotReadableError" || err.name === "NotFoundError" || err.name === "OverconstrainedError")) {
          console.warn("Audio device not found. This is normal for a deaf user.");
          // Try again with video only
          navigator.mediaDevices.getUserMedia({ video: true, audio: false })
            .then(stream => {
              setLocalStream(stream);
              localStreamRef.current = stream;
              if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
              }
            });
        } else {
          // error for a hearing user
          console.error("Error accessing media devices.", err);
          alert("Could not access your camera or microphone. Please check permissions.");
        }
      });

    return () => {
      mounted = false;
      console.log('Component unmounting - cleaning up');
      if (localStreamRef.current) {
        console.log('Stopping tracks on unmount');
        localStreamRef.current.getTracks().forEach(track => {
          console.log(`Unmount: stopping ${track.kind}, state: ${track.readyState}`);
          track.stop();
        });
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, [user]);

  const handleHangUp = useCallback((notifyPeer = true) => {
    if (isCleaningUpRef.current) {
      console.log('Already cleaning up, skip');
      return;
    }

    isCleaningUpRef.current = true;
    console.log('=== HANGUP INITIATED ===');
    stopRecording();

    if (localStreamRef.current) {
      const tracks = localStreamRef.current.getTracks();
      console.log(`Found ${tracks.length} tracks to stop`);
      tracks.forEach(track => {
        console.log(`Stopping ${track.kind} track - current state: ${track.readyState}`);
        track.stop();
        console.log(`After stop() - state: ${track.readyState}`);
      });
    }

    if (localVideoRef.current?.srcObject) {
      console.log('Stopping tracks from video element');
      const videoTracks = localVideoRef.current.srcObject.getTracks();
      videoTracks.forEach(track => {
        console.log(`Video element ${track.kind} - state: ${track.readyState}`);
        track.stop();
      });
      localVideoRef.current.srcObject = null;
      localVideoRef.current.load();
    }

    if (remoteVideoRef.current?.srcObject) {
      remoteVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
      remoteVideoRef.current.srcObject = null;
      remoteVideoRef.current.load();
    }

    if (peerConnectionRef.current) {
      console.log('Closing peer connection');
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setCallStatus('idle');

    if (notifyPeer && otherUserRef.current) {
      socket.emit('call-ended', { to: otherUserRef.current });
    }

    dispatch(clearIncomingCall());

    console.log('=== CLEANUP COMPLETE ===');

    setTimeout(() => {
      navigate('/dashboard');
    }, 200);
  }, [dispatch, navigate, socket]);

  const processAudioQueue = useCallback(() => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;

    const nextItem = audioQueueRef.current.shift();
    isPlayingRef.current = true;

    try {
      const audioSrc = `data:audio/wav;base64,${nextItem.audio}`;
      audioPlayerRef.current.src = audioSrc;
      audioPlayerRef.current.play().catch(err => {
        console.error("Autoplay blocked:", err);
        isPlayingRef.current = false;
        processAudioQueue();
      });
    } catch (error) {
      console.error("Error playing audio:", error);
      isPlayingRef.current = false;
      processAudioQueue();
    }
  }, []);

  useEffect(() => {
    const player = audioPlayerRef.current;
    const handleEnded = () => {
      isPlayingRef.current = false;
      processAudioQueue();
    };
    const handleError = () => {
      isPlayingRef.current = false;
      processAudioQueue();
    }

    player.addEventListener('ended', handleEnded);
    player.addEventListener('error', handleError);
    return () => {
      player.removeEventListener('ended', handleEnded);
      player.removeEventListener('error', handleError);
    };
  }, [processAudioQueue]);

  useEffect(() => {
    const onCallAccepted = ({ answer }) => {
      console.log('Call accepted');
      if (peerConnectionRef.current) {
        peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      }
      setCallStatus('in-call');
    };

    const onIceCandidate = ({ candidate }) => {
      if (peerConnectionRef.current && candidate) {
        peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    };

    const onCallEnded = () => {
      console.log('Call ended by peer');
      handleHangUp(false);
    };

    const onCallRejected = () => {
      console.log("Call rejected by peer");
      alert("Call was rejected.");
      handleHangUp(false);
    };

    const onMicToggled = ({ isMicOn }) => setRemoteMicOn(isMicOn);
    const onVideoToggled = ({ isVideoOn }) => setRemoteVideoOn(isVideoOn);

    // STT 
    const onSttResult = ({ text }) => {
      if (user?.isDeaf) {
        setCaptions(text);
        if (captionTimerRef.current) clearTimeout(captionTimerRef.current);
        captionTimerRef.current = setTimeout(() => setCaptions(""), 4000);
      }
    };

    // TTS 
    const onPlayAudioMessage = ({ audio, text }) => {
      console.log(" Received TTS Audio:", text);

      // Hearing user -- Play the sound
      if (!user?.isDeaf) {
        audioQueueRef.current.push({ audio, text });
        processAudioQueue();
      }
    };

    socket.on('call-accepted', onCallAccepted);
    socket.on('ice-candidate', onIceCandidate);
    socket.on('call-ended', onCallEnded);
    socket.on('call-rejected', onCallRejected);
    socket.on('mic-toggled', onMicToggled);
    socket.on('video-toggled', onVideoToggled);
    socket.on('stt-result', onSttResult);
    socket.on('play-audio-message', onPlayAudioMessage);

    return () => {
      socket.off('call-accepted', onCallAccepted);
      socket.off('ice-candidate', onIceCandidate);
      socket.off('call-ended', onCallEnded);
      socket.off('call-rejected', onCallRejected);
      socket.off('mic-toggled', onMicToggled);
      socket.off('video-toggled', onVideoToggled);
      socket.off('stt-result', onSttResult);
      socket.off('play-audio-message', onPlayAudioMessage);
    };
  }, [socket, handleHangUp, user, processAudioQueue]);

  useEffect(() => {
    if (!localStream || !socket.connected || !user) {
      return;
    }

    if (incomingCallData) {
      setCallStatus('in-call');
      const caller = incomingCallData.from;
      otherUserRef.current = caller.user_id;

      const pc = createPeerConnection(caller.user_id);

      pc.setRemoteDescription(new RTCSessionDescription(incomingCallData.offer))
        .then(() => pc.createAnswer())
        .then(answer => {
          pc.setLocalDescription(answer);
          socket.emit('answer-call', {
            to: caller.user_id,
            answer: answer,
          });
        });
      dispatch(clearIncomingCall());

    } else if (calleeId && callStatus === 'idle') {
      otherUserRef.current = calleeId;
      setCallStatus('calling');

      const pc = createPeerConnection(calleeId);

      pc.createOffer()
        .then(offer => {
          pc.setLocalDescription(offer);
          socket.emit('call-user', {
            to: calleeId,
            offer: offer,
          });
        });
    }

    // Start STT recording for hearing user
    if (callStatus === 'in-call' && !user.isDeaf) {
      startRecording();
    }

    return () => {
      stopRecording();
    }

  }, [calleeId, localStream, socket, callStatus, incomingCallData, user, dispatch]);

  //SIGN LANGUAGE DETECTION (SEND FRAMES)
  useEffect(() => {
    // Only run if the user is deaf user video is active
    if (!user?.isDeaf || !localStreamRef.current) return;

    const interval = setInterval(() => {
      if (localVideoRef.current && socket.connected) {
        // 1. Create a hidden canvas to grab the frame
        const canvas = document.createElement('canvas');
        canvas.width = 320; // Low res is fine for speed
        canvas.height = 240;

        const ctx = canvas.getContext('2d');
        // Draw the current video frame onto the canvas
        ctx.drawImage(localVideoRef.current, 0, 0, canvas.width, canvas.height);

        // 2. Convert to Base64 (JPEG format, 50% quality to save bandwidth)
        const frameData = canvas.toDataURL('image/jpeg', 0.5);

        // 3. Send to Backend
        socket.emit('process-frame', {
          image: frameData,
          to: otherUserRef.current
        });
      }
    }, 500); // Send 2 frames per second

    // 4. Listen for the result
    const onSignPrediction = ({ label }) => {
      console.log("🖐 Sign Detected:", label);
      setSignLabel(label);

      // Clear the label after 2 seconds so it doesn't stay forever
      setTimeout(() => setSignLabel(""), 2000);
    };

    socket.on('sign-prediction', onSignPrediction);

    return () => {
      clearInterval(interval);
      socket.off('sign-prediction', onSignPrediction);
    };
  }, [user, socket, localStream]);

  const toggleMic = useCallback(() => {
    if (!localStreamRef.current) return;

    if (!user || user.isDeaf) return;

    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      const newMicState = audioTrack.enabled;
      setIsMicOn(newMicState);

      if (otherUserRef.current) {
        socket.emit('toggle-mic', { to: otherUserRef.current, isMicOn: newMicState });
      }
    }
  }, [socket]);

  const toggleVideo = useCallback(() => {
    if (!localStreamRef.current) return;

    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      const newVideoState = videoTrack.enabled;
      setIsVideoOn(newVideoState);

      if (otherUserRef.current) {
        socket.emit('toggle-video', { to: otherUserRef.current, isVideoOn: newVideoState });
      }
    }
  }, [socket]);

  // STT
  const startRecording = () => {
    if (user?.isDeaf) return;
    if (!localStreamRef.current) return;

    const audioTracks = localStreamRef.current.getAudioTracks();
    if (audioTracks.length === 0) return;

    const audioStream = new MediaStream([audioTracks[0]]);
    const mimeType = 'audio/webm;codecs=opus';
    const recorder = new MediaRecorder(audioStream, { mimeType });
    mediaRecorderRef.current = recorder;
    let chunks = [];

    let silenceStart = 0;
    let isSilent = false;
    let hasSpeech = false; // new flag to track if user actually spoke

    // For silence detection
    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(audioStream);
    const analyser = audioCtx.createAnalyser();
    source.connect(analyser);
    const dataArray = new Uint8Array(analyser.fftSize);

    const detectSilence = () => {
      analyser.getByteFrequencyData(dataArray);
      const volume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

      if (volume > 10) {
        // user is speaking
        hasSpeech = true;
        isSilent = false;
      } else if (volume < 5) {
        // silence
        if (!isSilent) {
          silenceStart = Date.now();
          isSilent = true;
        } else if (hasSpeech && Date.now() - silenceStart > 1500) {
          // stop only if we already detected speech
          recorder.stop();
          audioCtx.close();
          return;
        }
      }

      requestAnimationFrame(detectSilence);
    };

    detectSilence();

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = async () => {
      if (!hasSpeech) {
        // User never spoke; skip backend call
        console.log("Silence detected, skipping backend call.");
        audioCtx.close();
        setTimeout(startRecording, 1000);
        return;
      }

      const blob = new Blob(chunks, { type: mimeType });
      chunks = [];
      hasSpeech = false; // reset flag for next session

      const formData = new FormData();
      formData.append('file', blob, 'chunk.webm');

      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/stt/transcribe`, {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (data.text && data.text.trim() !== "") {
          socket.emit("stt-result", { to: otherUserRef.current, text: data.text });
        }
      } catch (err) {
        console.error("Transcription failed:", err);
      }

      // Restart after silence
      setTimeout(startRecording, 1000);
    };

    recorder.start();
  };

  const stopRecording = () => {
    try {
      if (mediaRecorderRef.current) {
        if (mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
          console.log('--- Audio recording for STT stopped ---');
        }
        mediaRecorderRef.current = null;
      }
    } catch (err) {
      console.warn("Error stopping recording:", err);
    }
  };

  const handleSendText = (e) => {
    e.preventDefault();
    if (!textMessage.trim() || !otherUserRef.current) return;

    socket.emit('send-text-for-tts', {
      to: otherUserRef.current,
      text: textMessage
    });
    setTextMessage("");
  };


  return (
    <div className="min-h-screen bg-black flex flex-col">
      <Navbar />
      <div className="flex-grow flex items-center justify-center p-2 md:p-4">

        <div className="relative w-full max-w-6xl aspect-video bg-black rounded-lg overflow-hidden">

          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          {!remoteVideoOn && (
            <div className="absolute top-0 left-0 w-full h-full bg-black flex items-center justify-center">
              <div className="text-center text-white">
                <IoVideocamOffSharp size={64} className="mx-auto" />
                <p className="text-xl mt-4">Video is off</p>
              </div>
            </div>
          )}

          {remoteVideoOn && !remoteMicOn && (
            <div className="absolute top-4 left-4 bg-black bg-opacity-50 p-2 rounded-full">
              <IoMicOffSharp size={24} className="text-white" />
            </div>
          )}

          <div
            className="absolute top-4 right-4 w-32 md:w-48 aspect-[4/3]
                       bg-black border-2 border-white rounded-md overflow-hidden"
          >
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {!isVideoOn && (
              <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center">
                <IoVideocamOffSharp size={48} className="text-white" />
              </div>
            )}
          </div>

          {callStatus === 'calling' && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white text-2xl bg-black bg-opacity-50 p-4 rounded-md">
              Calling...
            </div>
          )}

          {/* TTS INPUT BAR (ONLY FOR DEAF USER) */}
          {user?.isDeaf && (
            <div className="absolute bottom-24 left-0 w-full flex justify-center  px-4">
              <form
                onSubmit={handleSendText}
                className="flex w-full max-w-lg items-center gap-2 bg-gray-900/90 backdrop-blur-md p-2 rounded-full border border-gray-600 shadow-2xl"
              >
                <input
                  type="text"
                  className="flex-grow bg-transparent text-white px-4 py-2 outline-none placeholder-gray-400 font-medium"
                  placeholder="Type to speak..."
                  value={textMessage}
                  onChange={(e) => setTextMessage(e.target.value)}
                  maxLength={500}
                />
                <button
                  type="submit"
                  disabled={!textMessage.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-400 text-white rounded-full p-3 transition-colors flex items-center justify-center"
                >
                  <IoSend size={20} className={!textMessage.trim() ? "translate-x-0" : "translate-x-0.5"} />
                </button>
              </form>
            </div>
          )}

          {user && user.isDeaf && captions && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-black bg-opacity-75 text-white p-4 rounded-md max-w-lg text-center z-20">
              <p className="text-xl">{captions}</p>
            </div>
          )}

          <div
            className="absolute bottom-0 left-0 w-full 
                       bg-gray-800 bg-opacity-70 p-4 flex justify-center 
                       space-x-4 md:space-x-6"
          >
            <button
              onClick={toggleMic}
              disabled={user?.isDeaf}
              className={`p-4 rounded-full text-white ${isMicOn ? 'bg-gray-600 hover:bg-gray-700' : 'bg-red-600'} ${user?.isDeaf ? 'bg-gray-700 opacity-50 cursor-not-allowed' : ''}`}
            >
              {isMicOn ? <IoMicSharp size={24} /> : <IoMicOffSharp size={24} />}
            </button>
            <button
              onClick={toggleVideo}
              className={`p-4 rounded-full text-white ${isVideoOn ? 'bg-gray-600 hover:bg-gray-700' : 'bg-red-600'}`}
            >
              {isVideoOn ? <IoVideocamSharp size={24} /> : <IoVideocamOffSharp size={24} />}
            </button>
            <button
              onClick={() => handleHangUp(true)}
              className="p-4 bg-red-600 text-white rounded-full"
            >
              <IoCall size={24} style={{ transform: 'rotate(135deg)' }} />
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}
