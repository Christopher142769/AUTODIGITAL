// --- App.js ---
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './App.css';
import { FaTimes, FaCheckCircle } from 'react-icons/fa';

function App({ authToken, setAuthToken }) {
  const [userQuery, setUserQuery] = useState('');
  const [fileName, setFileName] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [modificationQuery, setModificationQuery] = useState('');
  const [files, setFiles] = useState([]);
  const [trialsLeft, setTrialsLeft] = useState(3);
  const [username, setUsername] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState('');

  const iframeRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (authToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      fetchUserInfo();
      fetchFiles();
    }
  }, [authToken]);

  const fetchUserInfo = async () => {
    try {
      const response = await axios.get('https://autodigital.onrender.com/user/me');
      setTrialsLeft(response.data.trials_left);
      setUsername(response.data.username);
    } catch (err) {
      console.error('Erreur de récupération des informations utilisateur:', err);
      handleLogout();
    }
  };

  const fetchFiles = async () => {
    try {
      const response = await axios.get('https://autodigital.onrender.com/user/files');
      setFiles(response.data.files);
    } catch (err) {
      console.error('Erreur de récupération des fichiers:', err);
      handleLogout();
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    localStorage.removeItem('authToken');
    navigate('/login');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setGeneratedCode('');
    try {
      const response = await axios.post('https://autodigital.onrender.com/generate', {
        user_query: userQuery,
        file_name: fileName
      });
      setGeneratedCode(response.data.code);
      setTrialsLeft(response.data.trials_left);
      setIsModalOpen(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Une erreur est survenue lors de la génération du code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleModification = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setGeneratedCode('');
    try {
      const response = await axios.post('https://autodigital.onrender.com/modify', {
        modification_query: modificationQuery,
        file_content: generatedCode
      });
      setGeneratedCode(response.data.code);
      setTrialsLeft(response.data.trials_left);
    } catch (err) {
      setError(err.response?.data?.detail || 'Une erreur est survenue lors de la modification du code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await axios.post('https://autodigital.onrender.com/save', {
        file_name: fileName,
        file_content: generatedCode
      });
      alert('Fichier sauvegardé avec succès !');
      setIsModalOpen(false);
      fetchFiles();
    } catch (err) {
      alert(err.response?.data?.detail || 'Erreur lors de la sauvegarde du fichier.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadFile = async (selectedFileName) => {
    setIsLoading(true);
    setFileName(selectedFileName);
    setIsModalOpen(false);
    try {
      const response = await axios.get(`https://autodigital.onrender.com/user/file/${selectedFileName}`);
      setGeneratedCode(response.data.file_content);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors du chargement du fichier.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenSubscriptionModal = () => {
    setIsSubscriptionModalOpen(true);
  };

  const handleCloseSubscriptionModal = () => {
    setIsSubscriptionModalOpen(false);
    setPaymentMessage('');
    setPaymentSuccess(false);
  };

  const handleSubscribe = async (subscriptionMonths) => {
    setIsLoading(true);
    setPaymentMessage('Traitement du paiement...');
    setPaymentSuccess(false);
    
    try {
      // TODO: Intégrer l'API Paydunya ici
      // Pour l'instant, nous simulons le paiement en envoyant une requête au backend
      const response = await axios.post('https://autodigital.onrender.com/subscribe', {
        username: username,
        subscription_months: subscriptionMonths,
        // Champs Paydunya simulés
        amount: subscriptionMonths * 10,
        currency: "XOF"
      });

      if (response.status === 200) {
        setPaymentMessage('Paiement réussi ! Votre demande d\'abonnement a été envoyée à l\'administrateur.');
        setPaymentSuccess(true);
      } else {
        setPaymentMessage('Échec du paiement. Veuillez réessayer.');
        setPaymentSuccess(false);
      }
    } catch (err) {
      console.error('Erreur lors de la souscription:', err);
      setPaymentMessage(err.response?.data?.detail || 'Une erreur est survenue lors du paiement.');
      setPaymentSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar de gauche */}
      <div className="sidebar left-sidebar">
        <h1 className="logo">
          AutoDigital
          <span className="cursor">|</span>
        </h1>
        <p className="description">
          Assistant IA pour créer, modifier et générer votre site web.
        </p>
        <p className="user-info">
          Bienvenue, <span className="neon-text">{username}</span>!
          <br />
          Essais restants : <span className="neon-text">{trialsLeft}</span>
        </p>

        <form onSubmit={handleSubmit} className="form-container">
          <div className="form-group floating">
            <input
              id="fileName"
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="index.html, style.css, script.js"
              required
            />
            <label htmlFor="fileName">Nom du fichier</label>
          </div>
          <div className="form-group floating">
            <textarea
              id="userQuery"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Crée une page d'accueil avec un fond bleu et un bouton 'Commencer'."
              rows="4"
              required
            ></textarea>
            <label htmlFor="userQuery">Décrivez ce que vous voulez générer</label>
          </div>
          <button type="submit" className="btn btn-primary w-100" disabled={isLoading}>
            {isLoading ? 'Génération en cours…' : 'Générer le code'}
          </button>
        </form>

        <div className="file-list-section">
          <h2>Vos fichiers</h2>
          <div className="file-list">
            {files.length > 0 ? (
              files.map(file => (
                <div key={file.id} className="file-item" onClick={() => handleLoadFile(file.file_name)}>
                  {file.file_name}
                </div>
              ))
            ) : (
              <p>Aucun fichier trouvé.</p>
            )}
          </div>
        </div>

        <button className="btn btn-secondary w-100 mt-auto" onClick={handleLogout}>
          Déconnexion
        </button>
      </div>

      {/* Main content */}
      <div className="main-content">
        <div className="code-viewer">
          {error && <div className="alert alert-danger">{error}</div>}
          {generatedCode ? (
            <iframe
              ref={iframeRef}
              title="Code Preview"
              srcDoc={generatedCode}
              sandbox="allow-scripts allow-forms allow-same-origin"
              className="code-preview"
            ></iframe>
          ) : (
            <div className="placeholder">
              Votre aperçu de code s'affichera ici.
            </div>
          )}
        </div>
      </div>

      {/* Modal de modification/sauvegarde */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Modifier & Sauvegarder</h3>
              <button className="close-button" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            {trialsLeft > 0 ? (
              <form onSubmit={handleModification} className="modal-body">
                <p>Modifiez votre code en utilisant l'IA. Essais restants : {trialsLeft}</p>
                <div className="form-group floating">
                  <textarea
                    id="modificationQuery"
                    value={modificationQuery}
                    onChange={(e) => setModificationQuery(e.target.value)}
                    placeholder="Ajoute une nouvelle section 'Menu' avec une liste de 3 plats."
                    rows="4"
                    required
                  ></textarea>
                  <label htmlFor="modificationQuery">Décrivez la modification souhaitée</label>
                </div>
                <button type="submit" className="btn btn-primary w-100" disabled={isLoading}>
                  {isLoading ? 'Modification en cours…' : 'Appliquer la modification'}
                </button>
              </form>
            ) : (
              <div className="modal-body">
                <p>Vous avez utilisé vos 3 essais de génération. Veuillez passer à l'option premium pour continuer.</p>
                <button className="btn btn-gradient w-100" onClick={handleOpenSubscriptionModal}>Passer à l'option Premium</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal d'abonnement */}
      {isSubscriptionModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Choisissez votre plan</h3>
              <button className="close-button" onClick={handleCloseSubscriptionModal}>&times;</button>
            </div>
            <div className="modal-body subscription-modal-body">
              <p>Sélectionnez un plan pour débloquer des générations illimitées.</p>
              {paymentMessage && (
                <div className={`payment-message ${paymentSuccess ? 'success' : 'error'}`}>
                  {paymentSuccess ? <FaCheckCircle /> : <FaTimes />}
                  <p>{paymentMessage}</p>
                </div>
              )}
              <div className="subscription-options-grid">
                <div className="plan-card">
                  <h4 className="plan-title">Abonnement Mensuel</h4>
                  <p className="plan-price">5000 XOF/mois</p>
                  <button className="btn btn-plan w-100" onClick={() => handleSubscribe(1)}>Acheter (1 mois)</button>
                </div>
                <div className="plan-card">
                  <h4 className="plan-title">Abonnement Trimestriel</h4>
                  <p className="plan-price">12000 XOF/trimestre</p>
                  <button className="btn btn-plan w-100" onClick={() => handleSubscribe(3)}>Acheter (3 mois)</button>
                </div>
                <div className="plan-card">
                  <h4 className="plan-title">Abonnement Annuel</h4>
                  <p className="plan-price">48000 XOF/an</p>
                  <button className="btn btn-plan w-100" onClick={() => handleSubscribe(12)}>Acheter (12 mois)</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="loading-overlay" aria-live="polite">
          <div className="loader">
            <div className="orbit"></div>
            <div className="sat"></div>
            <span className="loader-text">AUTODIGITAL crée la magie…</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;