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
  IoCall
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

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const otherUserRef = useRef(null);

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
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        setLocalStream(stream);
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      })
      .catch(err => {
        console.error("Error accessing media devices.", err);
      });
  }, []);

  const handleHangUp = useCallback((notifyPeer = true) => {
    console.log('Hanging up call...');

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      console.log('Local tracks stopped.');
    }

    peerConnectionRef.current?.close();

    setLocalStream(null);
    localStreamRef.current = null;
    setRemoteStream(null);
    setCallStatus('idle');

    if (notifyPeer && otherUserRef.current) {
      socket.emit('call-ended', { to: otherUserRef.current });
    }

    dispatch(clearIncomingCall());
    navigate('/dashboard');
  }, [dispatch, navigate, socket]);

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

    const onCallEnded = () => handleHangUp(false);
    const onCallRejected = () => {
      console.log("Call rejected by peer");
      alert("Call was rejected.");
      handleHangUp(false);
    };

    const onMicToggled = ({ isMicOn }) => setRemoteMicOn(isMicOn);
    const onVideoToggled = ({ isVideoOn }) => setRemoteVideoOn(isVideoOn);

    socket.on('call-accepted', onCallAccepted);
    socket.on('ice-candidate', onIceCandidate);
    socket.on('call-ended', onCallEnded);
    socket.on('call-rejected', onCallRejected);
    socket.on('mic-toggled', onMicToggled);
    socket.on('video-toggled', onVideoToggled);

    return () => {
      socket.off('call-accepted', onCallAccepted);
      socket.off('ice-candidate', onIceCandidate);
      socket.off('call-ended', onCallEnded);
      socket.off('call-rejected', onCallRejected);
      socket.off('mic-toggled', onMicToggled);
      socket.off('video-toggled', onVideoToggled);
    };
  }, [socket, handleHangUp]);

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
  }, [calleeId, localStream, socket, callStatus, incomingCallData, user, dispatch]);

  const toggleMic = useCallback(() => {
    if (!localStreamRef.current) return;

    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      const newMicState = audioTrack.enabled;
      setIsMicOn(newMicState);

      if (otherUserRef.current) {
        socket.emit('toggle-mic', { to: otherUserRef.current, isMicOn: newMicState });
      }
    }
  }, []);

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
  }, []);


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

          <div
            className="absolute bottom-0 left-0 w-full 
                       bg-gray-800 bg-opacity-70 p-4 flex justify-center 
                       space-x-4 md:space-x-6"
          >
            <button
              onClick={toggleMic}
              className={`p-4 rounded-full text-white ${isMicOn ? 'bg-gray-600 hover:bg-gray-700' : 'bg-red-600'}`}
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