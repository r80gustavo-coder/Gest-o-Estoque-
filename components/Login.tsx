
import React, { useState } from 'react';
import { Lock } from 'lucide-react';

interface LoginProps {
  onLogin: (status: boolean) => void;
  onCancel: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onCancel }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'kavinsadmin' && password === 'adm123') {
      onLogin(true);
    } else {
      setError('Credenciais inválidas.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="bg-white p-8 rounded-xl shadow-lg border w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-indigo-100 rounded-full">
            <Lock className="w-8 h-8 text-indigo-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Acesso Administrativo</h2>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usuário</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900"
            />
          </div>
          
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <div className="pt-2 flex gap-3">
             <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
            >
              Voltar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
            >
              Entrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
