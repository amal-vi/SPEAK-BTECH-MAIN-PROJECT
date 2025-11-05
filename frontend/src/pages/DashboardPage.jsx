import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import defaultAvatar from '../assets/default-avatar.png';
import { IoVideocamOutline } from "react-icons/io5";
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useSocket } from '../context/SocketContext';
import IncomingCallModal from '../components/IncomingCallModal';
import { setOnlineUsers, startLoadingOnlineUsers, setIncomingCall } from '../store/users-slice/usersSlice';
import { fetchRecentCalls } from '../store/call-slice/callSlice';
import { formatDistanceToNow } from 'date-fns';

export default function DashboardPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const socket = useSocket();

  const { user, token } = useSelector((state) => state.auth);
  const { onlineUsersList, isLoading: isUsersLoading, incomingCallData } = useSelector((state) => state.users);

  const { recentCalls, isLoading: isCallsLoading } = useSelector((state) => state.calls);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    dispatch(startLoadingOnlineUsers());
    dispatch(fetchRecentCalls());

    if (socket.connected) {
      socket.emit('get_online_users');
    }

    const handleUpdateOnline = (userObjects) => {
      let filteredUsers = userObjects;
      if (user) {
        filteredUsers = userObjects.filter(u => u.user_id !== user.user_id);
      }
      dispatch(setOnlineUsers(filteredUsers));
    };

    const handleIncomingCall = ({ from, offer }) => {
      console.log('Dashboard: Incoming call from:', from.name);
      dispatch(setIncomingCall({ from, offer }));
    };

    socket.on('update_online_users', handleUpdateOnline);
    socket.on('incoming-call', handleIncomingCall);

    return () => {
      socket.off('update_online_users', handleUpdateOnline);
      socket.off('incoming-call', handleIncomingCall);
    };
  }, [user, token, dispatch, navigate, socket]);

  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-gray-100 p-8">
        {incomingCallData && <IncomingCallModal callData={incomingCallData} />}
        <div className="container mx-auto mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

          <div className="lg:col-span-2 bg-white shadow-xl rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Online</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {isUsersLoading ? (
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
                    <Link
                      to={`/call/${onlineUser.user_id}`}
                      className="text-blue-600 hover:text-blue-800 text-3xl"
                    >
                      <IoVideocamOutline />
                    </Link>
                  </div>
                ))
              ) : (
                <p className="text-gray-600">No other users are currently online.</p>
              )}
            </div>
          </div>

          <div className="lg:col-span-1 bg-white shadow-xl rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Recent Calls</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {isCallsLoading ? (
                <p>Loading recent calls...</p>
              ) : recentCalls.length > 0 ? (
                recentCalls.map((call) => (
                  <div
                    key={call.call_id}
                    className="flex items-center space-x-4 p-4 border-b border-gray-100"
                  >
                    <img
                      src={call.other_user.profile_image_url || defaultAvatar}
                      alt={call.other_user.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-semibold text-gray-900">{call.other_user.name}</p>
                      <p className="text-sm text-gray-500">
                        {call.timestamp ? (
                          formatDistanceToNow(new Date(call.timestamp), { addSuffix: true })
                        ) : (
                          'Date unavailable'
                        )}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-600">You have no recent calls.</p>
              )}
            </div>
          </div>

        </div>
      </div>
      <Footer />
    </>
  );
}