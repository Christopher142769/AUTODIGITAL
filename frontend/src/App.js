import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './App.css';

function App({ authToken, setAuthToken }) {
  const [userQuery, setUserQuery] = useState('');
  const [fileName, setFileName] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false); // Nouveau state pour la modale de paiement
  const [modificationQuery, setModificationQuery] = useState('');
  const [files, setFiles] = useState([]);
  const [trialsLeft, setTrialsLeft] = useState(3);
  const [username, setUsername] = useState('');

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
      const response = await axios.get('https://autodigital.onrender.com/list-files');
      if (response.data.success) {
        setFiles(response.data.files);
      }
    } catch (err) {
      console.error('Erreur lors de la récupération des fichiers:', err);
      setError("Impossible de lister les fichiers. Le backend est-il en cours d'exécution ?");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setAuthToken(null);
    navigate('/');
  };

  const renderCodeInIframe = (code) => {
    setTimeout(() => {
      if (iframeRef.current) {
        iframeRef.current.contentDocument.open();
        iframeRef.current.contentDocument.write(code);
        iframeRef.current.contentDocument.close();
      }
    }, 50);
  };

  const handleSubmit = async (queryToUse, fileToUse) => {
    if (trialsLeft === 0) {
      setIsPaymentModalOpen(true); // Ouvre la nouvelle modale de paiement
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post('https://autodigital.onrender.com/generate', {
        file_path: fileToUse,
        user_query: queryToUse,
      });

      if (response.data.status === 'success') {
        const newCode = response.data.code;
        setGeneratedCode(newCode);
        setFileName(fileToUse);
        setTrialsLeft(response.data.trials_left);
        renderCodeInIframe(newCode);
        fetchFiles();
        if (isModalOpen) setIsModalOpen(false);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur de communication avec le backend. Assurez-vous qu'il est en cours d'exécution.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Nouvelle fonction pour gérer le paiement d'abonnement
  const handleSubscriptionPayment = async (plan, amount) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.post('https://autodigital.onrender.com/create-payment-invoice', {
        plan,
        amount,
        callback_url: 'https://autodigital.onrender.com/payment-callback',
        return_url: window.location.href,
      });

      if (response.data.success) {
        window.location.href = response.data.invoice_url; // Redirige vers la page de paiement PayDunya
      } else {
        setError('Erreur lors de la création de la facture de paiement.');
      }
    } catch (err) {
      setError('Erreur de communication avec le serveur de paiement.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitialSubmit = (e) => {
    e.preventDefault();
    handleSubmit(userQuery, fileName);
  };

  const handleModifySubmit = (e) => {
    e.preventDefault();
    handleSubmit(modificationQuery, fileName);
  };

  const handleCardClick = async (file) => {
    setIsLoading(true);
    setError(null);
    setFileName(file.name);

    try {
      const response = await axios.get(`https://autodigital.onrender.com/get-file-content?file_path=${file.name}`);
      const fileContent = response.data.content;
      setGeneratedCode(fileContent);
      renderCodeInIframe(fileContent);
    } catch (err) {
      setError('Impossible de récupérer le contenu du fichier. Vérifiez le backend.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = () => {
    if (generatedCode) {
      const blob = new Blob([generatedCode], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }
  };

  return (
    <div className="App ui-root">
      {/* Background FX */}
      <div className="bg-grid" aria-hidden></div>
      <div className="bg-blobs" aria-hidden>
        <span></span><span></span><span></span><span></span>
      </div>

      {/* Top nav / brand */}
      <header className="brand-header glass-card">
        <div className="brand-left">
          <div className="brand-logo neon">AUTODIGITAL</div>
          <p className="brand-subtitle">Expert · Générateur de sites web</p>
        </div>
        <div className="brand-right">
          <div className="user-pill">
            <span className="dot" /> {username || 'Utilisateur'}
          </div>
          <button onClick={handleLogout} className="btn btn-ghost">Déconnexion</button>
        </div>
      </header>

      {/* Main */}
      <main className="main-content">
        <section className="hero glass-card">
          <div className="hero-copy">
            <h1 className="hero-title">Créez. Modifiez. Déployez.</h1>
            <p className="hero-desc">Une plateforme propulsée par l’IA pour générer des templates superbes en un instant.
              Animations fluides, design futuriste, responsive total.</p>
          </div>
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-label">Essais restants</span>
              <span className="stat-value">
                {trialsLeft === -1 ? 'Illimité' : `${trialsLeft} / 3`}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Projets</span>
              <span className="stat-value">{files.length}</span>
            </div>
          </div>
        </section>

        <div className="grid-container">
          {/* Generate new site */}
          <section className="card form-card glass-card hover-lift">
            <h2 className="card-title">Générer un nouveau site</h2>
            <form onSubmit={handleInitialSubmit} className="smart-form">
              <div className="form-group floating">
                <input
                  id="fileName"
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  required
                  placeholder=" "
                  autoComplete="off"
                />
              </div>

              <div className="form-group floating">
                <textarea
                  id="userQuery"
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder="Crée un site web simple pour un café. Ajoute une section 'À propos' et un formulaire de contact."
                  rows="5"
                  required
                ></textarea>
              </div>

              <button type="submit" className="btn btn-primary w-100" disabled={isLoading}>
                {isLoading ? 'Génération en cours…' : 'Générer le Template'}
              </button>
            </form>
          </section>

          {/* Error toast */}
          {error && (
            <div className="toast error glass-card" role="alert">
              <div className="toast-dot" /><span>{error}</span>
              <button className="btn btn-ghost sm" onClick={() => setError(null)}>OK</button>
            </div>
          )}

          {/* Files list */}
          <section className="card file-list-card glass-card">
            <div className="card-head">
              <h2 className="card-title">Sites web existants</h2>
              {files.length === 0 && <p className="muted">Aucun site trouvé. Générez-en un !</p>}
            </div>

            <div className="files-grid">
              {files.map((file) => (
                <article key={file.name} className="file-card hover-lift" onClick={() => handleCardClick(file)}>
                  <header className="file-card-head">
                    <h3 className="file-title">{file.name}</h3>
                  </header>

                  <div className="card-preview-container">
                    <iframe
                      src={`https://autodigital.onrender.com/files/${username}/${file.name}`}
                      title={file.name}
                      className="card-preview-iframe"
                      sandbox="allow-scripts allow-same-origin"
                    ></iframe>
                  </div>

                  <footer className="card-actions">
                    <button
                      className="btn btn-secondary"
                      onClick={(e) => { e.stopPropagation(); setFileName(file.name); setIsModalOpen(true); }}
                    >Modifier</button>

                    <a
                      href={`https://autodigital.onrender.com/files/${username}/${file.name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button className="btn btn-ghost">Aperçu</button>
                    </a>
                  </footer>
                </article>
              ))}
            </div>
          </section>

          {/* Live preview */}
          {generatedCode && (
            <section className="card preview-card glass-card">
              <div className="card-head">
                <h2 className="card-title">Prévisualisation du code généré</h2>
                <div className="actions">
                  <button className="btn btn-secondary" onClick={() => setIsModalOpen(true)}>Modifier</button>
                  <button className="btn btn-outline" onClick={handlePreview}>Grand écran</button>
                </div>
              </div>

              <div className="preview-container">
                <iframe
                  ref={iframeRef}
                  title="Code Preview"
                  className="code-preview-iframe"
                  sandbox="allow-scripts allow-same-origin"
                ></iframe>
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Modal de modification de site */}
      {isModalOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content glass-card">
            <div className="modal-header">
              <h3 className="modal-title">Modifier le site web</h3>
              <button className="close-button" onClick={() => setIsModalOpen(false)} aria-label="Fermer">&times;</button>
            </div>
            {trialsLeft !== 0 ? (
              <form onSubmit={handleModifySubmit} className="smart-form">
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
              // Contenu de la modale de modification si les essais sont à 0 (sera remplacé par la modale de paiement)
              <div className="modal-body">
                <p>Vous avez utilisé vos 3 essais de génération. Veuillez passer à l'option premium pour continuer.</p>
                <button className="btn btn-gradient w-100" onClick={() => { setIsModalOpen(false); setIsPaymentModalOpen(true); }}>Passer à l'option Premium</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Nouvelle modale de paiement */}
      {isPaymentModalOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content glass-card">
            <div className="modal-header">
              <h3 className="modal-title">Choisir un abonnement</h3>
              <button className="close-button" onClick={() => setIsPaymentModalOpen(false)}>&times;</button>
            </div>
            <div className="modal-body payment-options">
              <p>Vous avez utilisé vos 3 essais. Choisissez un abonnement pour continuer à générer des sites web.</p>
              
              <div className="subscription-card">
                <h4>Abonnement 1 mois</h4>
                <p>Accès illimité aux fonctionnalités de génération de site.</p>
                <span className="price">9.99 €</span>
                <button
                  className="btn btn-primary w-100"
                  onClick={() => handleSubscriptionPayment('1_month', 9.99)}
                >
                  Payer avec PayDunya
                </button>
              </div>
              
              <div className="subscription-card">
                <h4>Abonnement 6 mois</h4>
                <p>Économisez 20% en choisissant le plan 6 mois.</p>
                <span className="price">47.99 €</span>
                <button
                  className="btn btn-primary w-100"
                  onClick={() => handleSubscriptionPayment('6_months', 47.99)}
                >
                  Payer avec PayDunya
                </button>
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