import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import './Auth.css'; // même CSS que Login pour cohérence

const Register = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await axios.post('http://127.0.0.1:8000/register', {
        username,
        password,
      });
      setMessage('✅ Inscription réussie ! Vous pouvez maintenant vous connecter.');
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur d'inscription.");
    }
  };

  return (
    <div className="auth-container">
      <div className="neon-bg"></div>
      <div className="card auth-card animate-float">
        <h2 className="title-glow">✨ Inscription</h2>
        <form onSubmit={handleRegister} className="auth-form">
          <div className="form-group">
            <label>Nom d'utilisateur</label>
            <input
              type="text"
              className="input-glow"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Mot de passe</label>
            <input
              type="password"
              className="input-glow"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}
          {message && <div className="success-message">{message}</div>}

          <button type="submit" className="btn-futuristic">S'inscrire</button>
        </form>
        <p className="auth-link">
          Déjà un compte ? <Link to="/">Se connecter</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
