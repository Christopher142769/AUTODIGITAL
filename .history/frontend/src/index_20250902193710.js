import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import Login from './Login';
import Register from './Register';
import AdminDashboard from './AdminDashboard';
import axios from 'axios';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));

const AuthWrapper = () => {
  const [authToken, setAuthToken] = useState(localStorage.getItem('authToken'));
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      setLoading(true);
      if (authToken) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
        try {
          const response = await axios.get('https://autodigital.onrender.com/user/me');
          setUserRole(response.data.role);
        } catch (error) {
          console.error('Failed to verify user token:', error);
          setAuthToken(null);
          localStorage.removeItem('authToken');
        }
      }
      setLoading(false);
    };
    checkAuthStatus();
  }, [authToken]);

  if (loading) {
    return <div className="loading-state">Chargement...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            authToken ? (
              userRole === 'admin' ? (
                <Navigate to="/admin" />
              ) : userRole === 'user' ? (
                <Navigate to="/app" />
              ) : (
                <Login setAuthToken={setAuthToken} />
              )
            ) : (
              <Login setAuthToken={setAuthToken} />
            )
          }
        />
        <Route path="/register" element={<Register />} />
        <Route
          path="/app"
          element={
            authToken && userRole === 'user' ? (
              <App authToken={authToken} setAuthToken={setAuthToken} />
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/admin"
          element={
            authToken && userRole === 'admin' ? (
              <AdminDashboard setAuthToken={setAuthToken} />
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

root.render(
  <React.StrictMode>
    <AuthWrapper />
  </React.StrictMode>
);