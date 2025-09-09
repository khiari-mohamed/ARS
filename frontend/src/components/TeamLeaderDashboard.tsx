import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import ChefEquipeGlobalBasket from './ChefEquipeGlobalBasket';

const TeamLeaderDashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Tableau de Bord - Chef d'Équipe</h1>
          <p className="text-gray-600">Gestion des affectations et suivi d'équipe</p>
        </div>
        
        {/* Use the new comprehensive global basket */}
        <ChefEquipeGlobalBasket />
      </div>
    </div>
  );
};

export default TeamLeaderDashboard;