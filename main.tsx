import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import './app/index.css'; // Importación crítica de estilos

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("No se encontró el elemento root");
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Registro con ruta absoluta para Firebase Hosting
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered with scope: ', registration.scope);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);