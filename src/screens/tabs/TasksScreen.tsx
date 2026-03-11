/**
 * TasksScreen - İşler Sekmesi (Ana Ekran)
 *
 * Rol bazlı görev listesi gösterir.
 * Her rol için farklı bileşenler/modüller listelenir:
 *
 *   Aşçı: Alışveriş listesi + Yemek programı + Arıza bildir
 *   Garson: Alışveriş listesi + Arıza bildir
 *   Teknik: Arıza listesi + Arıza çözümü + Arıza bildir
 *   Housekeeping: Oda temizlik listesi + Arıza bildir
 *   Patron: Tüm modüller + Raporlar + Personel + Stok
 *   Müdür: Tüm modüller + Raporlar + Stok
 *   Resepsiyon: Arıza bildir
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppHeader, AppCard } from '../../components/common';
import useAuth from '../../hooks/useAuth';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { ROLES, ROLE_LABELS } from '../../utils/constants';

/* Görev modülleri (ekranları) */
import ShoppingListScreen from '../tasks/ShoppingListScreen';
import MealProgramScreen from '../tasks/MealProgramScreen';
import FaultCreateScreen from '../tasks/FaultCreateScreen';
import FaultListScreen from '../tasks/FaultListScreen';
import StockScreen from '../tasks/StockScreen';
import StaffScreen from '../reports/StaffScreen';
import ReportsScreen from '../reports/ReportsScreen';
import RoomServiceScreen from '../tasks/RoomServiceScreen';
import RoomStatusScreen from '../tasks/RoomStatusScreen';

interface TaskModule {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  screen: string;
}

/**
 * Rol bazlı menü öğeleri
 * Her rolün erişebileceği modüller tanımlanır.
 */
const TASK_MODULES: Record<string, TaskModule[]> = {
  [ROLES.CHEF]: [
    { id: 'shopping', label: 'Alışveriş Listesi', icon: 'cart-outline', color: '#22C55E', screen: 'ShoppingList' },
    { id: 'meal', label: 'Yemek Programı', icon: 'restaurant-outline', color: '#F59E0B', screen: 'MealProgram' },
    { id: 'fault-create', label: 'Arıza Bildir', icon: 'warning-outline', color: '#EF4444', screen: 'FaultCreate' },
  ],
  [ROLES.WAITER]: [
    { id: 'room-service', label: 'Oda Servisi', icon: 'cafe-outline', color: '#8B5CF6', screen: 'RoomService' },
    { id: 'shopping', label: 'Alışveriş Listesi', icon: 'cart-outline', color: '#22C55E', screen: 'ShoppingList' },
    { id: 'fault-create', label: 'Arıza Bildir', icon: 'warning-outline', color: '#EF4444', screen: 'FaultCreate' },
  ],
  [ROLES.TECHNICIAN]: [
    { id: 'fault-list', label: 'Arıza Listesi', icon: 'construct-outline', color: '#3B82F6', screen: 'FaultList' },
    { id: 'fault-create', label: 'Arıza Bildir', icon: 'warning-outline', color: '#EF4444', screen: 'FaultCreate' },
  ],
  [ROLES.HOUSEKEEPER]: [
    { id: 'room-status', label: 'Oda Durumu', icon: 'bed-outline', color: '#06B6D4', screen: 'RoomStatus' },
    { id: 'fault-create', label: 'Arıza Bildir', icon: 'warning-outline', color: '#EF4444', screen: 'FaultCreate' },
  ],
  [ROLES.RECEPTION]: [
    { id: 'room-service', label: 'Oda Servisi', icon: 'cafe-outline', color: '#8B5CF6', screen: 'RoomService' },
    { id: 'fault-create', label: 'Arıza Bildir', icon: 'warning-outline', color: '#EF4444', screen: 'FaultCreate' },
  ],
  [ROLES.MANAGER]: [
    { id: 'fault-list', label: 'Arıza Listesi', icon: 'construct-outline', color: '#3B82F6', screen: 'FaultList' },
    { id: 'room-service', label: 'Oda Servisi', icon: 'cafe-outline', color: '#8B5CF6', screen: 'RoomService' },
    { id: 'room-status', label: 'Oda Durumu', icon: 'bed-outline', color: '#06B6D4', screen: 'RoomStatus' },
    { id: 'shopping', label: 'Alışveriş Listesi', icon: 'cart-outline', color: '#22C55E', screen: 'ShoppingList' },
    { id: 'stock', label: 'Stok Yönetimi', icon: 'cube-outline', color: '#EC4899', screen: 'Stock' },
    { id: 'reports', label: 'Raporlar', icon: 'bar-chart-outline', color: '#F97316', screen: 'Reports' },
    { id: 'fault-create', label: 'Arıza Bildir', icon: 'warning-outline', color: '#EF4444', screen: 'FaultCreate' },
  ],
  [ROLES.PATRON]: [
    { id: 'fault-list', label: 'Arıza Listesi', icon: 'construct-outline', color: '#3B82F6', screen: 'FaultList' },
    { id: 'room-service', label: 'Oda Servisi', icon: 'cafe-outline', color: '#8B5CF6', screen: 'RoomService' },
    { id: 'room-status', label: 'Oda Durumu', icon: 'bed-outline', color: '#06B6D4', screen: 'RoomStatus' },
    { id: 'shopping', label: 'Alışveriş Listesi', icon: 'cart-outline', color: '#22C55E', screen: 'ShoppingList' },
    { id: 'meal', label: 'Yemek Programı', icon: 'restaurant-outline', color: '#F59E0B', screen: 'MealProgram' },
    { id: 'stock', label: 'Stok Yönetimi', icon: 'cube-outline', color: '#EC4899', screen: 'Stock' },
    { id: 'staff', label: 'Personel Yönetimi', icon: 'people-outline', color: '#1565C0', screen: 'Staff' },
    { id: 'reports', label: 'Raporlar', icon: 'bar-chart-outline', color: '#F97316', screen: 'Reports' },
    { id: 'fault-create', label: 'Arıza Bildir', icon: 'warning-outline', color: '#EF4444', screen: 'FaultCreate' },
  ],
};

/** Ekran bileşen eşlemesi */
const SCREEN_MAP: Record<string, React.ComponentType<{ onClose: () => void }>> = {
  ShoppingList: ShoppingListScreen,
  MealProgram: MealProgramScreen,
  FaultCreate: FaultCreateScreen,
  FaultList: FaultListScreen,
  Stock: StockScreen,
  Staff: StaffScreen,
  Reports: ReportsScreen,
  RoomService: RoomServiceScreen,
  RoomStatus: RoomStatusScreen,
};

const TasksScreen: React.FC = () => {
  const { user } = useAuth();
  const [activeScreen, setActiveScreen] = useState<string | null>(null);

  if (!user) return null;

  const modules = TASK_MODULES[user.role] || [];

  /** Modal içeriğini render et */
  const renderScreenContent = () => {
    if (!activeScreen) return null;
    const ScreenComponent = SCREEN_MAP[activeScreen];
    if (!ScreenComponent) return null;
    return <ScreenComponent onClose={() => setActiveScreen(null)} />;
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeader
          title={`Merhaba, ${user.name.split(' ')[0]}`}
          subtitle={ROLE_LABELS[user.role]}
        />

        {/* Modül kartları */}
        <View style={styles.grid}>
          {modules.map((mod) => (
            <TouchableOpacity
              key={mod.id}
              style={styles.moduleCard}
              activeOpacity={0.7}
              onPress={() => setActiveScreen(mod.screen)}
            >
              <View style={[styles.moduleIcon, { backgroundColor: mod.color + '15' }]}>
                <Ionicons name={mod.icon} size={28} color={mod.color} />
              </View>
              <Text style={styles.moduleLabel}>{mod.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Modül ekranları - tam ekran modal */}
      <Modal
        visible={!!activeScreen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setActiveScreen(null)}
      >
        {renderScreenContent()}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: 60,
    paddingBottom: spacing.xxl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  moduleCard: {
    width: '47%' as any,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  moduleIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  moduleLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
});

export default TasksScreen;
