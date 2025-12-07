import React, { useState } from 'react';
import { AuthProvider, useAuth } from './components/Auth/AuthProvider';
import { Login } from './components/Auth/Login';
import { Register } from './components/Auth/Register';
import { ReferralStats } from './components/Referral/Referral';
// import { ReferralStats } from './components/Referral/ReferralStats';

const AppContent: React.FC = () => {
  const { user, logout, loading } = useAuth();
  const [view, setView] = useState<'login' | 'register'>('login');

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return (
      <div>
        <h1>CVERai Authentication</h1>
        
        <div>
          <button onClick={() => setView('login')}>Login</button>
          <button onClick={() => setView('register')}>Register</button>
        </div>

        {view === 'login' ? <Login /> : <Register />}
      </div>
    );
  }

  return (
    <div>
      <h1>Welcome to CVERai</h1>
      
      <div>
        <p>Email: {user.email}</p>
        <button onClick={logout}>Logout</button>
      </div>

      <ReferralStats />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;