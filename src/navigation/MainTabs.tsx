/**
 * MainTabs - Ana tab navigasyonu
 *
 * Alt bar yapısı:
 *   Sol: İşler (rol bazlı görevler)
 *   Orta: QR Kod (kamera açar)
 *   Sağ: Profil
 *
 * QR butonu özel stil ile ortada büyük ve yuvarlak gösterilir.
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import TasksScreen from '../screens/tabs/TasksScreen';
import QRScreen from '../screens/tabs/QRScreen';
import ProfileScreen from '../screens/tabs/ProfileScreen';
import { colors } from '../theme';

type MainTabsParamList = {
  Tasks: undefined;
  QR: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

interface QRButtonProps {
  onPress?: (...args: any[]) => void;
  [key: string]: any;
}

/**
 * Özel QR buton bileşeni
 * Tab bar ortasında büyük yuvarlak buton olarak gösterilir.
 */
const QRButton: React.FC<QRButtonProps> = ({ onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.qrButton}>
    <View style={styles.qrButtonInner}>
      <Ionicons name="qr-code" size={28} color={colors.textWhite} />
    </View>
  </TouchableOpacity>
);

const MainTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      {/* İşler sekmesi */}
      <Tab.Screen
        name="Tasks"
        component={TasksScreen}
        options={{
          tabBarLabel: 'İşler',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
        }}
      />

      {/* QR Kod sekmesi - özel buton */}
      <Tab.Screen
        name="QR"
        component={QRScreen}
        options={{
          tabBarLabel: '',
          tabBarButton: (props) => <QRButton {...props} />,
        }}
      />

      {/* Profil sekmesi */}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.tabBg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    height: 85,
    paddingBottom: 20,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  qrButton: {
    top: -20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.qrButton,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.qrButtonShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default MainTabs;
