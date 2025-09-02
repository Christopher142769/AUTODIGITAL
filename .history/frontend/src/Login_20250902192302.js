import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import './Auth.css';

const Login = ({ setAuthToken }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const response = await axios.post('https://autodigital.onrender.com/login', {
        username,
        password,
      });
      const { access_token } = response.data;
      localStorage.setItem('authToken', access_token);
      setAuthToken(access_token);
      navigate('/app');
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur de connexion.');
    }
  };

  return (
    <div className="auth-container">
      <div className="neon-bg"></div>
      <div className="card auth-card animate-float">
        <h2 className="title-glow">🚀 Connexion</h2>
        <form onSubmit={handleLogin} className="auth-form">
          <div className="form-group">
            <label>Nom d'utilisateur</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="input-glow"
            />
          </div>
          <div className="form-group">
            <label>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input-glow"
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="btn-futuristic">Se connecter</button>
        </form>
        <p className="auth-link">
          Pas encore de compte ? <Link to="/register">S'inscrire</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
