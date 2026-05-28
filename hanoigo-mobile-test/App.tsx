import React, { useState } from 'react';
import { LoginScreen } from './src/screens/LoginScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'login' | 'dashboard'>('login');
  // Default to LAN hotspot IP
  const [ipAddress, setIpAddress] = useState('172.20.10.3');
  const [userSession, setUserSession] = useState<{ token: string; username: string } | null>(null);

  const handleLoginSuccess = (token: string, username: string) => {
    setUserSession({ token, username });
    setCurrentScreen('dashboard');
  };

  const handleSignOut = () => {
    setUserSession(null);
    setCurrentScreen('login');
  };

  if (currentScreen === 'login') {
    return (
      <LoginScreen 
        ipAddress={ipAddress}
        setIpAddress={setIpAddress}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <DashboardScreen 
      ipAddress={ipAddress}
      setIpAddress={setIpAddress}
      onSignOut={handleSignOut}
    />
  );
}
