import React, { useEffect } from 'react';

interface ScanRejectionHandlerProps {
  onRejectedBordereauClick: (bordereauId: string) => void;
}

const ScanRejectionHandler: React.FC<ScanRejectionHandlerProps> = ({ onRejectedBordereauClick }) => {
  useEffect(() => {
    // Check for rejected bordereau in URL params (when user clicks notification)
    const urlParams = new URLSearchParams(window.location.search);
    const rejectedBordereauId = urlParams.get('rejected-bordereau');
    
    if (rejectedBordereauId) {
      // Show notification that user clicked on rejection notification
      const notificationDialog = document.createElement('div');
      notificationDialog.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center;">
          <div style="background: white; padding: 24px; border-radius: 8px; max-width: 500px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
            <div style="display: flex; align-items: center; margin-bottom: 16px;">
              <span style="font-size: 24px; margin-right: 8px;">🔄</span>
              <h3 style="margin: 0; color: #e65100;">Bordereau Rejeté - Correction Requise</h3>
            </div>
            <p style="margin: 8px 0; color: #666;">Ce bordereau a été rejeté par le chef d'équipe et nécessite une correction des documents.</p>
            <p style="margin: 8px 0; color: #666; font-weight: bold;">📝 Le bordereau apparaîtra dans la section "Bordereaux Retournés pour Correction" ci-dessous.</p>
            <div style="display: flex; gap: 12px; margin-top: 20px;">
              <button onclick="this.parentElement.parentElement.parentElement.remove(); window.scrollTo({top: 0, behavior: 'smooth'});" style="background: #e65100; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: bold;">Voir Bordereaux Retournés</button>
              <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background: #666; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Fermer</button>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(notificationDialog);
      
      // Clean up URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [onRejectedBordereauClick]);

  return null; // This is a utility component with no UI
};

export default ScanRejectionHandler;