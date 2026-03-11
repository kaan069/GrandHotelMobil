/**
 * GrandHotel Mobile - Ana Uygulama Bileşeni
 *
 * AuthProvider ve NavigationContainer ile uygulamayı sarar.
 * Giriş yapmışsa MainTabs, yapmamışsa Login ekranı gösterilir.
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <AppNavigator />
    </AuthProvider>
  );
};

export default App;
