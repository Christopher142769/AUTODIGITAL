// --- AdminDashboard.js ---
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  FaUsers,
  FaChartLine,
  FaCog,
  FaSignOutAlt,
  FaTimes,
  FaBars
} from 'react-icons/fa';
import './AdminDashboard.css';

const AdminDashboard = ({ setAuthToken }) => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  // Gère l'état de la sidebar en fonction de la taille de l'écran
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get('https://autodigital.onrender.com/admin/users');
      setUsers(response.data.users);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de la récupération des utilisateurs.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGrantSubscription = async (username, months) => {
    setIsLoading(true);
    setError(null);
    try {
      await axios.post('https://autodigital.onrender.com/admin/update-subscription', { username, months });
      alert(`Abonnement de ${months} mois accordé à ${username}!`);
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de l\'attribution de l\'abonnement.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setAuthToken(null);
    navigate('/');
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="admin-container">
      {/* Bouton de bascule mobile */}
      <button className="toggle-btn" onClick={toggleSidebar}>
        {isSidebarOpen ? <FaTimes /> : <FaBars />}
      </button>

      {/* Sidebar */}
      <div className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h2 className="logo neon-text">⚡ DUXAI ⚡</h2>
        </div>
        <ul className="sidebar-menu">
          <li className="menu-item active">
            <FaUsers />
            <span>Utilisateurs</span>
          </li>
          <li className="menu-item">
            <FaChartLine />
            <span>Statistiques</span>
          </li>
          <li className="menu-item">
            <FaCog />
            <span>Paramètres</span>
          </li>
          <li className="menu-item logout" onClick={handleLogout}>
            <FaSignOutAlt />
            <span>Déconnexion</span>
          </li>
        </ul>
        <div className="sidebar-footer">
          <p>&copy; 2025 DuxAI</p>
        </div>
      </div>

      {/* Main Content */}
      <main className="dashboard-content">
        <header className="dashboard-header">
          <h1 className="neon-title">🚀 Tableau de bord Administrateur</h1>
        </header>
        
        {isLoading && <p className="loading-message">Chargement des données...</p>}
        {error && <p className="error-message">{error}</p>}
        
        <div className="card user-list-card">
          <h2 className="neon-subtitle">👥 Liste des Utilisateurs</h2>
          <table className="user-table">
            <thead>
              <tr>
                <th>Nom d'utilisateur</th>
                <th>Rôle</th>
                <th>Essais Restants</th>
                <th>Abonnement</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.username}>
                  <td data-label="Nom d'utilisateur">{user.username}</td>
                  <td data-label="Rôle"><span className={`role-badge ${user.role}`}>{user.role}</span></td>
                  <td data-label="Essais Restants">{user.trials_left === -1 ? 'Illimité' : user.trials_left}</td>
                  <td data-label="Abonnement">{user.subscription_end ? new Date(user.subscription_end).toLocaleDateString() : 'Aucun'}</td>
                  <td data-label="Actions">
                    {user.role === 'user' && (
                      <button className="grant-btn" onClick={() => setSelectedUser(user)}>
                        ⚡ Accorder
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Modal */}
      {selectedUser && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Accorder un abonnement à <span className="neon-text">{selectedUser.username}</span></h3>
              <button className="close-button" onClick={() => setSelectedUser(null)}>&times;</button>
            </div>
            <div className="subscription-options">
              <button onClick={() => handleGrantSubscription(selectedUser.username, 1)}>1 mois</button>
              <button onClick={() => handleGrantSubscription(selectedUser.username, 3)}>3 mois</button>
              <button onClick={() => handleGrantSubscription(selectedUser.username, 6)}>6 mois</button>
              <button onClick={() => handleGrantSubscription(selectedUser.username, 12)}>12 mois</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;