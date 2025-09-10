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
  FaBars,
  FaBell,
  FaTrashAlt // 🗑️ Ajout de l'icône de la corbeille
} from 'react-icons/fa';
// Importations de Recharts
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './AdminDashboard.css';

// --- Configuration d'Axios pour l'authentification ---
const api = axios.create({
  baseURL: 'https://autodigital.onrender.com'
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const AdminDashboard = ({ setAuthToken }) => {
  const [users, setUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({ total_users: 0, top_users: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [activeSection, setActiveSection] = useState('users');
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
    fetchNotifications();
    fetchStats();
    const notificationInterval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(notificationInterval);
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
      const response = await api.get('/admin/users'); // Changé axios.get en api.get
      setUsers(response.data.users);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de la récupération des utilisateurs.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/admin/notifications'); // Changé axios.get en api.get
      setNotifications(response.data.notifications);
    } catch (err) {
      console.error('Erreur lors de la récupération des notifications:', err);
    }
  };

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/admin/stats'); // Changé axios.get en api.get
      setStats(response.data);
    } catch (err) {
      console.error('Erreur lors de la récupération des statistiques:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGrantSubscription = async (username, months) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.post('/admin/update-subscription', { username, months }); // Changé axios.post en api.post
      alert(`Abonnement de ${months} mois accordé à ${username}!`);
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de l\'attribution de l\'abonnement.');
    } finally {
      setIsLoading(false);
    }
  };

  // 🗑️ Nouvelle fonction pour supprimer un utilisateur
  const handleDeleteUser = async (username) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur '${username}' ? Cette action est irréversible.`)) {
      setIsLoading(true);
      setError(null);
      try {
        await api.delete(`/admin/users/${username}`); // Changé axios.delete en api.delete
        alert(`L'utilisateur '${username}' a été supprimé avec succès.`);
        fetchUsers(); // Actualiser la liste après la suppression
      } catch (err) {
        setError(err.response?.data?.detail || 'Erreur lors de la suppression de l\'utilisateur.');
      } finally {
        setIsLoading(false);
      }
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
          <li className={`menu-item ${activeSection === 'users' ? 'active' : ''}`} onClick={() => setActiveSection('users')}>
            <FaUsers />
            <span>Utilisateurs</span>
          </li>
          <li className={`menu-item ${activeSection === 'notifications' ? 'active' : ''}`} onClick={() => setActiveSection('notifications')}>
            <FaBell />
            <span>Notifications</span>
            {notifications.length > 0 && <span className="notification-badge">{notifications.length}</span>}
          </li>
          <li className={`menu-item ${activeSection === 'stats' ? 'active' : ''}`} onClick={() => setActiveSection('stats')}>
            <FaChartLine />
            <span>Statistiques</span>
          </li>
          <li className={`menu-item ${activeSection === 'settings' ? 'active' : ''}`} onClick={() => setActiveSection('settings')}>
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
        
        {/* Affichage conditionnel des sections */}
        {activeSection === 'users' && (
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
                    <td data-label="Actions" className="actions-cell">
  <div className="button-group">
    {user.role === 'user' && (
      <button className="grant-btn" onClick={() => setSelectedUser(user)}>
        ⚡ Accorder
      </button>
    )}
    <button 
      className="delete-btn-futuristic" 
      onClick={() => handleDeleteUser(user.username)}
      disabled={user.username === 'admin'}
    >
      <FaTrashAlt style={{ marginRight: '5px' }} />
    </button>
  </div>
</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeSection === 'notifications' && (
          <div className="card notification-list-card">
            <h2 className="neon-subtitle">🔔 Notifications de Paiement</h2>
            <div className="notification-list">
              {notifications.length === 0 ? (
                <p className="muted">Aucune nouvelle notification.</p>
              ) : (
                notifications.map((notif, index) => (
                  <div key={index} className={`notification-item ${notif.status}`}>
                    <span className="notification-timestamp">{new Date(notif.timestamp).toLocaleString()}</span>
                    <p className="notification-message">{notif.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        {activeSection === 'stats' && (
          <div className="card stats-card">
            <h2 className="neon-subtitle">📊 Statistiques</h2>
            <div className="stats-grid">
              <div className="stat-item">
                <p className="stat-label">Total Utilisateurs</p>
                <p className="stat-value">{stats.total_users}</p>
              </div>
              <div className="stat-item">
                <p className="stat-label">Générations</p>
                <p className="stat-value">{stats.top_users.reduce((sum, user) => sum + user.generations, 0)}</p>
              </div>
            </div>
            <div className="chart-container">
              <h3>Top 5 des utilisateurs les plus actifs</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={stats.top_users}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.5} />
                  <XAxis dataKey="username" stroke="#fff" />
                  <YAxis stroke="#fff" />
                  <Tooltip />
                  <Bar dataKey="generations" fill="#00f0ff" barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
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