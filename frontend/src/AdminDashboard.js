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
  FaCheck
} from 'react-icons/fa';
import './AdminDashboard.css';

const AdminDashboard = ({ setAuthToken }) => {
  const [users, setUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
    fetchNotifications();
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

  const fetchNotifications = async () => {
    try {
      const response = await axios.get('https://autodigital.onrender.com/admin/notifications');
      setNotifications(response.data.notifications);
    } catch (err) {
      console.error('Erreur lors de la récupération des notifications:', err);
      // Gérer l'erreur mais ne pas la bloquer
    }
  };

  const handleGrantSubscription = async (username, months) => {
    try {
      await axios.post('https://autodigital.onrender.com/admin/grant-subscription', {
        username,
        months
      });
      alert(`Abonnement de ${months} mois accordé à ${username} avec succès.`);
      fetchUsers(); // Rafraîchir la liste des utilisateurs
      setSelectedUser(null);
    } catch (err) {
      alert(err.response?.data?.detail || 'Erreur lors de l\'attribution de l\'abonnement.');
    }
  };

  const handleProcessNotification = async (notificationId, username, months) => {
    try {
      // 1. Accorder l'abonnement à l'utilisateur
      await handleGrantSubscription(username, months);

      // 2. Supprimer la notification
      await axios.delete(`https://autodigital.onrender.com/admin/notifications/${notificationId}`);
      
      // 3. Rafraîchir les notifications
      fetchNotifications();
    } catch (err) {
      console.error('Erreur lors du traitement de la notification:', err);
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    localStorage.removeItem('authToken');
    navigate('/login');
  };

  return (
    <div className={`admin-container ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2 className="logo">Admin Dashboard</h2>
          <button className="close-btn" onClick={() => setIsSidebarOpen(false)}>&times;</button>
        </div>
        <nav className="nav-menu">
          <a href="#" className="nav-item active"><FaUsers /> Utilisateurs</a>
          <a href="#" className="nav-item"><FaChartLine /> Statistiques</a>
          <a href="#" className="nav-item"><FaBell /> Notifications</a>
          <a href="#" className="nav-item"><FaCog /> Paramètres</a>
          <button onClick={handleLogout} className="nav-item"><FaSignOutAlt /> Déconnexion</button>
        </nav>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <header className="main-header">
          <button className="menu-btn" onClick={() => setIsSidebarOpen(true)}><FaBars /></button>
          <h1>Tableau de bord</h1>
        </header>

        {error && <div className="alert-error">{error}</div>}
        {isLoading && <div className="loading-spinner"></div>}

        {/* Section Notifications */}
        <div className="dashboard-section notifications-section">
          <h2><FaBell /> Notifications de paiement</h2>
          {notifications.length > 0 ? (
            <div className="notifications-list">
              {notifications.map(notification => (
                <div key={notification.id} className="notification-item">
                  <span className="notification-text">
                    <span className="user-text">{notification.username}</span> a payé pour un abonnement de <span className="months-text">{notification.subscription_months} mois</span>.
                  </span>
                  <button className="process-btn" onClick={() => handleProcessNotification(notification.id, notification.username, notification.subscription_months)}>
                    <FaCheck /> Accorder
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-notifications">Aucune notification en attente.</p>
          )}
        </div>
        
        {/* Section Utilisateurs */}
        <div className="dashboard-section">
          <h2><FaUsers /> Utilisateurs</h2>
          <table className="user-table">
            <thead>
              <tr>
                <th>Nom d'utilisateur</th>
                <th>Rôle</th>
                <th>Essais restants</th>
                <th>Abonnement (fin)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.username}>
                  <td data-label="Nom d'utilisateur">{user.username}</td>
                  <td data-label="Rôle" className={user.role === 'admin' ? 'admin-role' : ''}>{user.role}</td>
                  <td data-label="Essais restants">{user.trials_left}</td>
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