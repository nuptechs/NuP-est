import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Mail, ArrowLeft, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/ApiAuthContext';

interface EmailVerificationProps {
  token?: string;
  onBackToLogin: () => void;
}

export const EmailVerification: React.FC<EmailVerificationProps> = ({ token, onBackToLogin }) => {
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const { verifyEmail, resendVerificationEmail } = useAuth();

  useEffect(() => {
    if (token) {
      handleVerification();
    } else {
      setVerificationStatus('error');
      setMessage('Token de verificação não fornecido');
    }
  }, [token]);

  const handleVerification = async () => {
    if (!token) return;

    try {
      const result = await verifyEmail(token);
      setVerificationStatus(result.success ? 'success' : 'error');
      setMessage(result.message);
    } catch (error) {
      setVerificationStatus('error');
      setMessage('Erro ao verificar email');
    }
  };

  const handleResendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setResendLoading(true);
    setResendMessage('');

    try {
      const result = await resendVerificationEmail(resendEmail);
      setResendMessage(result.message);
    } catch (error) {
      setResendMessage('Erro ao reenviar email de verificação');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className={`flex items-center justify-center w-16 h-16 rounded-lg mx-auto mb-4 ${
            verificationStatus === 'loading' ? 'bg-blue-600' :
            verificationStatus === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}>
            {verificationStatus === 'loading' && (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            )}
            {verificationStatus === 'success' && <CheckCircle className="w-8 h-8 text-white" />}
            {verificationStatus === 'error' && <XCircle className="w-8 h-8 text-white" />}
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900">
            {verificationStatus === 'loading' && 'Verificando Email...'}
            {verificationStatus === 'success' && 'Email Verificado!'}
            {verificationStatus === 'error' && 'Erro na Verificação'}
          </h2>
          
          <p className="mt-2 text-sm text-gray-600">
            Sistema de Análise de Impacto
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <div className={`p-4 rounded-lg ${
            verificationStatus === 'success' ? 'bg-green-50 border border-green-200' :
            verificationStatus === 'error' ? 'bg-red-50 border border-red-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            <p className={`text-sm ${
              verificationStatus === 'success' ? 'text-green-800' :
              verificationStatus === 'error' ? 'text-red-800' :
              'text-blue-800'
            }`}>
              {message}
            </p>
          </div>

          {verificationStatus === 'success' && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Seu email foi verificado com sucesso! Agora você pode fazer login no sistema.
                </p>
              </div>
              
              <button
                onClick={onBackToLogin}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para Login
              </button>
            </div>
          )}

          {verificationStatus === 'error' && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Não foi possível verificar seu email. Você pode solicitar um novo email de verificação.
                </p>
              </div>

              <form onSubmit={handleResendEmail} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email para reenvio
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      required
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="seu.email@exemplo.com"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={resendLoading}
                  className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
                >
                  {resendLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Reenviando...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Reenviar Email de Verificação
                    </>
                  )}
                </button>
              </form>

              {resendMessage && (
                <div className={`p-3 rounded-lg ${
                  resendMessage.includes('Erro') ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
                }`}>
                  <p className={`text-sm ${
                    resendMessage.includes('Erro') ? 'text-red-800' : 'text-green-800'
                  }`}>
                    {resendMessage}
                  </p>
                </div>
              )}

              <button
                onClick={onBackToLogin}
                className="w-full flex justify-center items-center py-2 px-4 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};