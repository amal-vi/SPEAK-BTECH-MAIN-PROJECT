import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import defaultAvatar from '../assets/default-avatar.png';
import { IoVideocamOutline } from "react-icons/io5";
import { setOnlineUsers, startLoadingOnlineUsers } from '../store/users-slice/usersSlice';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const socket = io('http://127.0.0.1:5000', {
  transports: ['websocket']
});

const mockRecentCalls = [
  { userId: '1', name: 'Emily White', lastSeen: '18 days ago', avatar: defaultAvatar },
  { userId: '2', name: 'Chris Smith', lastSeen: '18 days ago', avatar: defaultAvatar },
  { userId: '3', name: 'Firis Smith', lastSeen: '15 days ago', avatar: defaultAvatar },
  { userId: '4', name: 'Michael Chen', lastSeen: '10 days ago', avatar: defaultAvatar },
];


export default function DashboardPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { user, token } = useSelector((state) => state.auth);
  const { onlineUsersList, isLoading } = useSelector((state) => state.users);

  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [token, navigate]);

  useEffect(() => {
    dispatch(startLoadingOnlineUsers());

    if (user) {
      if (!socket.connected) {
        socket.connect();
      }
      socket.emit('user_online', user);
    }

    socket.on('update_online_users', (userObjects) => {
      let filteredUsers = userObjects;
      if (user) {
        filteredUsers = userObjects.filter(u => u.user_id !== user.user_id);
      }
      dispatch(setOnlineUsers(filteredUsers));
    });

    return () => {
      socket.off('update_online_users');
    };
  }, [user, dispatch]);

  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-gray-100 p-8">

        <div className="container mx-auto mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

          <div className="lg:col-span-2 bg-white shadow-xl rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Online</h2>

            <div className="space-y-4">
              {isLoading ? (
                <p>Loading online users...</p>
              ) : onlineUsersList.length > 0 ? (
                onlineUsersList.map((onlineUser) => (
                  <div
                    key={onlineUser.user_id}
                    className="flex justify-between items-center p-4 border-b border-gray-100"
                  >
                    <div className="flex items-center space-x-4">
                      <img
                        src={onlineUser.profile_image_url || defaultAvatar}
                        alt={onlineUser.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-semibold text-gray-900">{onlineUser.name}</p>
                        <p className="text-sm text-green-500">Online</p>
                      </div>
                    </div>
                    <button className="text-blue-600 hover:text-blue-800 text-3xl">
                      <IoVideocamOutline />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-gray-600">No other users are currently online.</p>
              )}
            </div>
          </div>

          <div className="lg:col-span-1 bg-white shadow-xl rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Recent Calls</h2>
            <div className="space-y-4">
              {mockRecentCalls.map((call) => (
                <div
                  key={call.userId}
                  className="flex items-center space-x-4 p-4 border-b border-gray-100"
                >
                  <img
                    src={call.avatar}
                    alt={call.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-semibold text-gray-900">{call.name}</p>
                    <p className="text-sm text-gray-500">{call.lastSeen}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
      <Footer />
    </>
  );
}