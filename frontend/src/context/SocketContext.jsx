import React, { createContext, useContext, useEffect } from 'react';
import { useSelector } from 'react-redux';
import io from 'socket.io-client';

const socket = io('http://127.0.0.1:5000', {
  autoConnect: false,
  transports: ['websocket'],
});

const SocketContext = createContext(socket);

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (user) {
      socket.connect();
      socket.emit('user_online', user);
    }

    return () => {
      socket.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};