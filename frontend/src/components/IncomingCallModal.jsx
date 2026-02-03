import React, { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { clearIncomingCall } from '../store/users-slice/usersSlice';
import defaultAvatar from '../assets/default-avatar.png';
import { useSocket } from '../context/SocketContext';

export default function IncomingCallModal({ callData }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const socket = useSocket();

  const { from } = callData;
  const audioRef = useRef(null);

  useEffect(() => {
    audioRef.current = new Audio('/ringtone.mp3');
    audioRef.current.loop = true;

    // Attempt to play audio
    const playAudio = async () => {
      try {
        await audioRef.current.play();
      } catch (err) {
        console.error("Failed to play ringtone:", err);
      }
    };

    playAudio();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, []);

  const handleAnswer = () => {
    navigate('/call');
  };

  const handleReject = () => {
    socket.emit('reject-call', { to: from.user_id });
    dispatch(clearIncomingCall());
  };

  return (
    <div className="fixed inset-0 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-100 p-8 rounded-lg shadow-2xl text-center">
        <h2 className="text-2xl font-bold mb-4 text-black">
          Incoming Call from {from.name}
        </h2>
        <img
          src={from.profile_image_url || defaultAvatar}
          alt={from.name}
          className="w-24 h-24 rounded-full mx-auto mb-4"
        />
        <div className="space-x-4">
          <button
            onClick={handleAnswer}
            className="px-6 py-2 bg-green-500 text-white rounded-md"
          >
            Answer
          </button>
          <button
            onClick={handleReject}
            className="px-6 py-2 bg-red-500 text-white rounded-md"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}