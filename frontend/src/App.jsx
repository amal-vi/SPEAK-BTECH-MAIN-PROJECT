import './App.css'
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AboutPage from './pages/AboutPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { ToastContainer } from 'react-toastify';
import ProfilePage from './pages/ProfilePage';
import DashboardPage from './pages/DashboardPage';
import { SocketProvider } from './context/SocketContext';
import CallPage from './pages/CallPage';

function App() {
  return (
    <BrowserRouter>
      <SocketProvider>
        <div className="min-h-screen bg-gray-900 text-white">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/call/:calleeId" element={<CallPage />} />
            <Route path="/call" element={<CallPage />} />
          </Routes>
        </div>
      </SocketProvider>
      <ToastContainer />

    </BrowserRouter>

  );
}

export default App;