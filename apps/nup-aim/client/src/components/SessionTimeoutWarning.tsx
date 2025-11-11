import React, { useState, useEffect } from 'react';
import { Clock, RefreshCw, LogOut } from 'lucide-react';

interface SessionTimeoutWarningProps {
  onExtendSession: () => void;
  onLogout: () => void;
}

export const SessionTimeoutWarning: React.FC<SessionTimeoutWarningProps> = ({
  onExtendSession,
  onLogout
}) => {
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutos em segundos
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkSessionTimeout = () => {
      const lastActivity = localStorage.getItem('nup_aim_last_activity');
      if (!lastActivity) return;

      const SESSION_TIMEOUT = 7 * 60 * 1000; // 7 minutos
      const WARNING_TIME = 2 * 60 * 1000; // Avisar 2 minutos antes
      
      const timeSinceLastActivity = Date.now() - parseInt(lastActivity);
      const timeUntilExpiry = SESSION_TIMEOUT - timeSinceLastActivity;
      
      if (timeUntilExpiry <= WARNING_TIME && timeUntilExpiry > 0) {
        setTimeLeft(Math.floor(timeUntilExpiry / 1000));
        setIsVisible(true);
      } else if (timeUntilExpiry <= 0) {
        onLogout();
      } else {
        setIsVisible(false);
      }
    };

    const interval = setInterval(checkSessionTimeout, 1000);
    checkSessionTimeout(); // Check immediately

    return () => clearInterval(interval);
  }, [onLogout]);

  const handleExtendSession = () => {
    localStorage.setItem('nup_aim_last_activity', Date.now().toString());
    setIsVisible(false);
    onExtendSession();
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
            <Clock className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Sessão Expirando</h3>
            <p className="text-sm text-gray-600">Sua sessão expirará em breve</p>
          </div>
        </div>

        <div className="mb-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600 mb-2">
              {formatTime(timeLeft)}
            </div>
            <p className="text-sm text-gray-600">
              Sua sessão expirará automaticamente por segurança. 
              Clique em "Continuar" para estender sua sessão.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleExtendSession}
            className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Continuar Sessão
          </button>
          <button
            onClick={onLogout}
            className="inline-flex items-center justify-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </button>
        </div>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            <strong>Segurança:</strong> Por motivos de segurança, sua sessão expira após 7 minutos de inatividade.
          </p>
        </div>
      </div>
    </div>
  );
};