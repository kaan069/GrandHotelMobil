/**
 * AppNavigator - Ana navigasyon yöneticisi
 *
 * Kullanıcı giriş yapmışsa MainTabs, yapmamışsa AuthStack gösterilir.
 * Uygulama açılışında kayıtlı oturum kontrol edilir.
 */

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';

import AuthStack from './AuthStack';
import MainTabs from './MainTabs';
import useAuth from '../hooks/useAuth';

const AppNavigator: React.FC = () => {
  const { isAuthenticated, loadSession } = useAuth();

  /* Uygulama açılışında kayıtlı oturumu yükle */
  useEffect(() => {
    loadSession();
  }, [loadSession]);

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
};

export default AppNavigator;
