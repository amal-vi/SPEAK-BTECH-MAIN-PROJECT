import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import Navbar from '../components/Navbar';
import { clearIncomingCall } from '../store/users-slice/usersSlice';

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
  const [otherUser, setOtherUser] = useState(null);
  const [callStatus, setCallStatus] = useState('idle');

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);

  const createPeerConnection = (targetUserId) => {
    const pc = new RTCPeerConnection(peerConnectionConfig);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', {
          to: targetUserId,
          candidate: event.candidate,
        });
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

  // --- Get user media (camera/mic) ---
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

  // --- Hang up / End Call ---
  const handleHangUp = useCallback((notifyPeer = true) => {
    console.log('Hanging up call, stream is:', localStreamRef.current);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    peerConnectionRef.current?.close();
    setLocalStream(null);
    localStreamRef.current = null;
    setRemoteStream(null);
    setCallStatus('idle');

    if (notifyPeer && otherUser) {
      socket.emit('call-ended', { to: otherUser });
    }

    dispatch(clearIncomingCall());
    navigate('/dashboard');
  }, [otherUser, dispatch, navigate, socket]);

  // --- Socket listeners ---
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
      handleHangUp(false);
    };

    //  handle call rejection
    const onCallRejected = () => {
      console.log("Call rejected by peer");
      alert("Call was rejected.");
      handleHangUp(false);
    };

    socket.on('call-accepted', onCallAccepted);
    socket.on('ice-candidate', onIceCandidate);
    socket.on('call-ended', onCallEnded);
    socket.on('call-rejected', onCallRejected);

    return () => {
      socket.off('call-accepted', onCallAccepted);
      socket.off('ice-candidate', onIceCandidate);
      socket.off('call-ended', onCallEnded);
      socket.off('call-rejected', onCallRejected);
    };
  }, [socket, handleHangUp]);

  // --- Handle outgoing / incoming call ---
  useEffect(() => {
    if (!localStream || !socket.connected || !user) {
      return;
    }

    // Callee: answering an incoming call
    if (incomingCallData) {
      setCallStatus('in-call');
      const caller = incomingCallData.from;
      setOtherUser(caller.user_id);

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

      // Caller: starting a call
    } else if (calleeId && callStatus === 'idle') {
      setOtherUser(calleeId);
      setCallStatus('calling');

      const pc = createPeerConnection(calleeId);

      pc.createOffer()
        .then(offer => {
          pc.setLocalDescription(offer);
          console.log('Making call to:', calleeId);
          socket.emit('call-user', {
            to: calleeId,
            offer: offer,
          });
        });
    }

  }, [calleeId, localStream, socket, callStatus, incomingCallData, user, dispatch]);

  // --- UI ---
  return (
    <div className="min-h-screen bg-black flex flex-col">
      <Navbar />

      {/* Video Feeds */}
      <div className="flex-grow relative">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="absolute bottom-24 right-4 w-1/4 max-w-xs border-4 border-white rounded-md"
        />
        {callStatus === 'calling' && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white text-2xl bg-black bg-opacity-50 p-4 rounded-md">
            Calling...
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-800 p-4 flex justify-center space-x-6">
        <button
          onClick={() => handleHangUp(true)}
          className="px-6 py-3 bg-red-600 text-white rounded-full text-lg"
        >
          Hang Up
        </button>
      </div>
    </div>
  );
}
