import React, { useState, useEffect, useRef } from 'react';
import { LogIn, User, Lock, AlertCircle, Mail, RefreshCw, FileText, UserPlus, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/ApiAuthContext';

export const LoginForm: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResendEmail, setShowResendEmail] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  const [userCaptcha, setUserCaptcha] = useState('');
  const [captchaError, setCaptchaError] = useState(false);
  const captchaCanvasRef = useRef<HTMLCanvasElement>(null);
  const { login, resendVerificationEmail } = useAuth();
  
  // New state for registration
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerData, setRegisterData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [registerErrors, setRegisterErrors] = useState<Record<string, string>>({});
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);

  useEffect(() => {
    generateCaptcha();
  }, []);

  const generateCaptcha = () => {
    const canvas = captchaCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Generate random code (letters and numbers)
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    setCaptchaCode(code);

    // Background
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add noise (dots)
    for (let i = 0; i < 100; i++) {
      ctx.fillStyle = `rgba(${Math.random() * 100}, ${Math.random() * 100}, ${Math.random() * 100}, 0.2)`;
      ctx.beginPath();
      ctx.arc(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        Math.random() * 2,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Add lines
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = `rgba(${Math.random() * 100}, ${Math.random() * 100}, ${Math.random() * 100}, 0.3)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.stroke();
    }

    // Draw text
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = '#4b5563';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw each character with slight rotation and position variation
    for (let i = 0; i < code.length; i++) {
      const x = (i + 0.5) * (canvas.width / code.length);
      const y = canvas.height / 2 + (Math.random() * 10 - 5);
      const rotation = Math.random() * 0.4 - 0.2; // -0.2 to 0.2 radians

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.fillText(code[i], 0, 0);
      ctx.restore();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCaptchaError(false);

    // Validate captcha
    if (userCaptcha !== captchaCode) {
      setCaptchaError(true);
      generateCaptcha();
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔐 Tentando fazer login...');
      console.log('👤 Usuário:', username);
      
      // Remove espaços extras do username/email
      const cleanUsername = username.trim();
      const cleanPassword = password.trim();
      
      const result = await login(cleanUsername, cleanPassword);
      
      if (!result.success) {
        console.log('❌ Login falhou:', result.message);
        setError(result.message || 'Erro ao fazer login');
        
        // Show resend email option if email not verified
        if (result.message?.includes('Email não verificado')) {
          setShowResendEmail(true);
          setResendEmail(username.includes('@') ? username : '');
        }
      } else {
        console.log('✅ Login realizado com sucesso!');
      }
    } catch (error) {
      console.error('💥 Erro no login:', error);
      setError('Erro ao fazer login. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setResendLoading(true);
    setResendMessage('');

    try {
      const result = await resendVerificationEmail(resendEmail);
      setResendMessage(result.message);
      
      if (result.success) {
        setShowResendEmail(false);
      }
    } catch (error) {
      setResendMessage('Erro ao reenviar email de verificação');
    } finally {
      setResendLoading(false);
    }
  };

  // New function to handle registration form submission
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterErrors({});
    
    // Validate registration form
    const errors: Record<string, string> = {};
    
    if (!registerData.username.trim()) {
      errors.username = 'Nome de usuário é obrigatório';
    } else if (registerData.username.length < 3) {
      errors.username = 'Nome de usuário deve ter pelo menos 3 caracteres';
    }
    
    if (!registerData.email.trim()) {
      errors.email = 'Email é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(registerData.email)) {
      errors.email = 'Email inválido';
    }
    
    if (!registerData.password.trim()) {
      errors.password = 'Senha é obrigatória';
    } else if (registerData.password.length < 6) {
      errors.password = 'Senha deve ter pelo menos 6 caracteres';
    }
    
    if (!registerData.confirmPassword.trim()) {
      errors.confirmPassword = 'Confirmação de senha é obrigatória';
    } else if (registerData.password !== registerData.confirmPassword) {
      errors.confirmPassword = 'As senhas não coincidem';
    }
    
    if (Object.keys(errors).length > 0) {
      setRegisterErrors(errors);
      return;
    }
    
    setRegisterLoading(true);
    
    try {
      // Use the API client to register the user
      const { apiClient } = await import('../lib/apiClient');
      
      // Create user
      const result = await apiClient.register({
        username: registerData.username,
        email: registerData.email,
        password: registerData.password,
        profileId: '', // Will use default profile from backend
      });
      
      if (!result.success) {
        setRegisterErrors({ form: result.error || 'Erro ao criar usuário' });
      } else {
        setRegisterSuccess(true);
        
        // Reset form after successful registration
        setRegisterData({
          username: '',
          email: '',
          password: '',
          confirmPassword: ''
        });
      }
    } catch (error) {
      console.error('Erro ao registrar usuário:', error);
      setRegisterErrors({ form: 'Erro ao criar usuário. Tente novamente.' });
    } finally {
      setRegisterLoading(false);
    }
  };

  // Toggle between login and registration forms
  const toggleRegistration = () => {
    setIsRegistering(!isRegistering);
    setError('');
    setCaptchaError(false);
    setRegisterErrors({});
    setRegisterSuccess(false);
    generateCaptcha();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Subtle watermark pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03] select-none">
        <div className="absolute inset-0 flex flex-wrap content-start">
          {Array.from({ length: 50 }).map((_, i) => (
            <div key={i} className="p-4 text-gray-900 text-xs rotate-[-20deg]">
              <div>NuPTechs</div>
              <div className="text-[8px]">Sua fábrica de softwares inteligentes</div>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-blue-600 rounded-lg mx-auto mb-4">
            {isRegistering ? <UserPlus className="w-8 h-8 text-white" /> : <LogIn className="w-8 h-8 text-white" />}
          </div>
          <h2 className="text-3xl font-bold text-gray-900">NuP_AIM</h2>
          <p className="mt-2 text-sm text-gray-600">
            Sistema de Análise de Impacto
          </p>
          <div className="mt-1 text-xs text-blue-600 font-medium">
            <span>NuPTechs</span>
            <span className="mx-1">•</span>
            <span className="text-gray-500 italic text-[10px]">Sua fábrica de softwares inteligentes</span>
          </div>
        </div>

        {isRegistering ? (
          // Registration Form
          <div className="mt-8 space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Criar Nova Conta</h3>
                <button
                  onClick={toggleRegistration}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Voltar para Login
                </button>
              </div>
              
              {registerSuccess ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-3">
                    <Mail className="w-6 h-6 text-green-600" />
                  </div>
                  <h4 className="text-lg font-medium text-green-800 mb-2">Cadastro Realizado!</h4>
                  <p className="text-sm text-green-700 mb-3">
                    Enviamos um email de verificação para <strong>{registerData.email}</strong>.
                    Por favor, verifique sua caixa de entrada e clique no link para ativar sua conta.
                  </p>
                  <button
                    onClick={toggleRegistration}
                    className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Voltar para Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label htmlFor="register-username" className="block text-sm font-medium text-gray-700 mb-1">
                      Nome de Usuário *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="register-username"
                        name="username"
                        type="text"
                        required
                        value={registerData.username}
                        onChange={(e) => setRegisterData({...registerData, username: e.target.value})}
                        className={`block w-full pl-10 pr-3 py-2 border ${registerErrors.username ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
                        placeholder="Digite seu nome de usuário"
                      />
                    </div>
                    {registerErrors.username && (
                      <p className="mt-1 text-sm text-red-600">{registerErrors.username}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="register-email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="register-email"
                        name="email"
                        type="email"
                        required
                        value={registerData.email}
                        onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                        className={`block w-full pl-10 pr-3 py-2 border ${registerErrors.email ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
                        placeholder="seu.email@exemplo.com"
                      />
                    </div>
                    {registerErrors.email && (
                      <p className="mt-1 text-sm text-red-600">{registerErrors.email}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="register-password" className="block text-sm font-medium text-gray-700 mb-1">
                      Senha *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="register-password"
                        name="password"
                        type="password"
                        required
                        value={registerData.password}
                        onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                        className={`block w-full pl-10 pr-3 py-2 border ${registerErrors.password ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
                        placeholder="Mínimo 6 caracteres"
                      />
                    </div>
                    {registerErrors.password && (
                      <p className="mt-1 text-sm text-red-600">{registerErrors.password}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="register-confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                      Confirmar Senha *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="register-confirm-password"
                        name="confirmPassword"
                        type="password"
                        required
                        value={registerData.confirmPassword}
                        onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})}
                        className={`block w-full pl-10 pr-3 py-2 border ${registerErrors.confirmPassword ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
                        placeholder="Digite a senha novamente"
                      />
                    </div>
                    {registerErrors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600">{registerErrors.confirmPassword}</p>
                    )}
                  </div>

                  {registerErrors.form && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      <p className="text-sm text-red-800">{registerErrors.form}</p>
                    </div>
                  )}

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Importante:</strong> Após o cadastro, você receberá um email de verificação. 
                      É necessário clicar no link de confirmação para ativar sua conta.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={registerLoading}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {registerLoading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Cadastrando...
                      </div>
                    ) : (
                      'Cadastrar'
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        ) : (
          // Login Form
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  Usuário ou Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.trim())}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Digite seu usuário ou email"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Digite sua senha"
                  />
                </div>
              </div>

              {/* CAPTCHA */}
              <div>
                <label htmlFor="captcha" className="block text-sm font-medium text-gray-700 mb-2">
                  Código de Segurança
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FileText className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="captcha"
                      name="captcha"
                      type="text"
                      required
                      value={userCaptcha}
                      onChange={(e) => setUserCaptcha(e.target.value)}
                      className={`block w-full pl-10 pr-3 py-2 border ${
                        captchaError ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                      } rounded-lg transition-colors`}
                      placeholder="Digite o código"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <canvas 
                      ref={captchaCanvasRef} 
                      width="150" 
                      height="40" 
                      className="border border-gray-300 rounded-lg bg-gray-50"
                    ></canvas>
                    <button
                      type="button"
                      onClick={generateCaptcha}
                      className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                      title="Gerar novo código"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                {captchaError && (
                  <p className="mt-1 text-sm text-red-600">Código de segurança incorreto</p>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Resend Email Section */}
              {showResendEmail && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-medium text-yellow-900 mb-2">Reenviar Email de Verificação</h4>
                  <form onSubmit={handleResendEmail} className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-yellow-800 mb-1">
                        Email para reenvio
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Mail className="h-4 w-4 text-yellow-600" />
                        </div>
                        <input
                          type="email"
                          required
                          value={resendEmail}
                          onChange={(e) => setResendEmail(e.target.value)}
                          className="block w-full pl-9 pr-3 py-2 text-sm border border-yellow-300 rounded focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                          placeholder="seu.email@exemplo.com"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={resendLoading}
                        className="inline-flex items-center px-3 py-2 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors disabled:opacity-50"
                      >
                        {resendLoading ? (
                          <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Mail className="w-4 h-4 mr-1" />
                        )}
                        Reenviar
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowResendEmail(false)}
                        className="px-3 py-2 text-sm text-yellow-700 hover:text-yellow-900 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                  {resendMessage && (
                    <p className={`text-sm mt-2 ${resendMessage.includes('Erro') ? 'text-red-600' : 'text-green-600'}`}>
                      {resendMessage}
                    </p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Entrando...
                  </div>
                ) : (
                  'Entrar'
                )}
              </button>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={toggleRegistration}
                  className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Não tem uma conta? Cadastre-se
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};