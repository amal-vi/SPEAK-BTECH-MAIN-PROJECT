import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/auth-slice/authSlice';
import { GiHamburgerMenu } from "react-icons/gi"
import placeholderAvatar from '../assets/avatar-placeholder.png';
import { RxCross1 } from "react-icons/rx";

export default function Navbar() {
  const { token, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);


  return (
    <nav className="w-full p-6 bg-white shadow-sm relative z-50">
      <div className="flex justify-between items-center">
        <Link to="/" className="text-3xl font-bold text-blue-600">
          SPEAK
        </Link>

        {/* Hamburger Menu Icon */}
        <div className="md:hidden">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-gray-700 hover:text-blue-600 focus:outline-none text-2xl flex items-center justify-center p-2"
          >
            {isMobileMenuOpen ? <RxCross1 /> : <GiHamburgerMenu />}
          </button>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center space-x-8 text-lg font-medium">
          {token ? (
            //LOGGED IN
            <>
              <Link to="/" className="text-gray-700 hover:text-blue-600 transition">Home</Link>
              <Link to="/about" className="text-gray-700 hover:text-blue-600 transition">About</Link>
              <Link to="/dashboard" className="text-gray-700 hover:text-blue-600 transition">Dashboard</Link>

              {/* --- Profile Dropdown --- */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex text-sm bg-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <span className="sr-only">Open user menu</span>
                  <img
                    className="h-10 w-10 rounded-full"
                    src={user?.profile_image_url || placeholderAvatar}
                    alt="Profile"
                  />
                </button>

                {isDropdownOpen && (
                  <div
                    className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="user-menu-button"
                  >
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      role="menuitem"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      Profile
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsDropdownOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      role="menuitem"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            //LOGGED OUT
            <>
              <Link to="/" className="text-gray-700 hover:text-blue-600 transition">Home</Link>
              <Link to="/about" className="text-gray-700 hover:text-blue-600 transition">About</Link>
              <Link to="/login" className="text-gray-700 hover:text-blue-600 transition">Login</Link>
              <Link to="/register" className="text-blue-600 hover:text-blue-800 transition">Signup</Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile Links */}
      <div
        className={`md:hidden absolute top-full left-0 w-full bg-white shadow-lg overflow-hidden transition-all duration-300 ease-in-out z-50 ${
          isMobileMenuOpen ? "max-h-96 opacity-100 border-t" : "max-h-0 opacity-0"
        }`}
      >
        <div className="flex flex-col space-y-4 text-lg font-medium p-6">
          {token ? (
            <>
              <Link to="/" className="text-gray-700 hover:text-blue-600 transition" onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
              <Link to="/about" className="text-gray-700 hover:text-blue-600 transition" onClick={() => setIsMobileMenuOpen(false)}>About</Link>
              <Link to="/dashboard" className="text-gray-700 hover:text-blue-600 transition" onClick={() => setIsMobileMenuOpen(false)}>Dashboard</Link>
              <Link to="/profile" className="text-gray-700 hover:text-blue-600 transition" onClick={() => setIsMobileMenuOpen(false)}>Profile</Link>
              <button
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="text-left text-gray-700 hover:text-blue-600 transition"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/" className="text-gray-700 hover:text-blue-600 transition" onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
              <Link to="/about" className="text-gray-700 hover:text-blue-600 transition" onClick={() => setIsMobileMenuOpen(false)}>About</Link>
              <Link to="/login" className="text-gray-700 hover:text-blue-600 transition" onClick={() => setIsMobileMenuOpen(false)}>Login</Link>
              <Link to="/register" className="text-blue-600 hover:text-blue-800 transition" onClick={() => setIsMobileMenuOpen(false)}>Signup</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}