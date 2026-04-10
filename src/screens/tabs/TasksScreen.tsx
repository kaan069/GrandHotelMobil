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
import ComplaintsScreen from '../tasks/ComplaintsScreen';
import CompanyScreen from '../tasks/CompanyScreen';
import ReservationHistoryScreen from '../tasks/ReservationHistoryScreen';
import MyTasksScreen from '../tasks/MyTasksScreen';
import CreateTaskScreen from '../tasks/CreateTaskScreen';
import CameraScreen from '../tasks/CameraScreen';
import TablesScreen from '../tasks/TablesScreen';
import KitchenScreen from '../tasks/KitchenScreen';
import MinibarRoomsScreen from '../tasks/MinibarRoomsScreen';
import HotelManagementScreen from '../tasks/HotelManagementScreen';
import RoomSettingsScreen from '../tasks/RoomSettingsScreen';
import NightAuditScreen from '../tasks/NightAuditScreen';

interface TaskModule {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  screen: string;
  module: string;
}

/**
 * Rol bazlı menü öğeleri
 * Her rolün erişebileceği modüller tanımlanır.
 */
const TASK_MODULES: Record<string, TaskModule[]> = {
  [ROLES.CHEF]: [
    { id: 'kitchen', label: 'Mutfak Ekranı', icon: 'flame-outline', color: '#EF4444', screen: 'Kitchen', module: 'restaurant' },
    { id: 'my-tasks', label: 'Görevlerim', icon: 'clipboard-outline', color: '#1565C0', screen: 'MyTasks', module: 'staff' },
    { id: 'tables', label: 'Masalar', icon: 'grid-outline', color: '#06B6D4', screen: 'Tables', module: 'restaurant' },
    { id: 'shopping', label: 'Alışveriş Listesi', icon: 'cart-outline', color: '#22C55E', screen: 'ShoppingList', module: 'restaurant' },
    { id: 'meal', label: 'Yemek Programı', icon: 'restaurant-outline', color: '#F59E0B', screen: 'MealProgram', module: 'restaurant' },
    { id: 'fault-create', label: 'Arıza Bildir', icon: 'warning-outline', color: '#EF4444', screen: 'FaultCreate', module: 'staff' },
  ],
  [ROLES.WAITER]: [
    { id: 'my-tasks', label: 'Görevlerim', icon: 'clipboard-outline', color: '#1565C0', screen: 'MyTasks', module: 'staff' },
    { id: 'tables', label: 'Masalar', icon: 'grid-outline', color: '#06B6D4', screen: 'Tables', module: 'restaurant' },
    { id: 'room-service', label: 'Oda Servisi', icon: 'cafe-outline', color: '#8B5CF6', screen: 'RoomService', module: 'restaurant' },
    { id: 'shopping', label: 'Alışveriş Listesi', icon: 'cart-outline', color: '#22C55E', screen: 'ShoppingList', module: 'restaurant' },
    { id: 'meal', label: 'Yemek Programı', icon: 'restaurant-outline', color: '#F59E0B', screen: 'MealProgram', module: 'restaurant' },
    { id: 'fault-create', label: 'Arıza Bildir', icon: 'warning-outline', color: '#EF4444', screen: 'FaultCreate', module: 'staff' },
  ],
  [ROLES.CASHIER]: [
    { id: 'tables', label: 'Masalar', icon: 'grid-outline', color: '#06B6D4', screen: 'Tables', module: 'restaurant' },
    { id: 'my-tasks', label: 'Görevlerim', icon: 'clipboard-outline', color: '#1565C0', screen: 'MyTasks', module: 'staff' },
    { id: 'fault-create', label: 'Arıza Bildir', icon: 'warning-outline', color: '#EF4444', screen: 'FaultCreate', module: 'staff' },
  ],
  [ROLES.BARISTA]: [
    { id: 'my-tasks', label: 'Görevlerim', icon: 'clipboard-outline', color: '#1565C0', screen: 'MyTasks', module: 'staff' },
    { id: 'tables', label: 'Masalar', icon: 'grid-outline', color: '#06B6D4', screen: 'Tables', module: 'restaurant' },
    { id: 'meal', label: 'Yemek Programı', icon: 'restaurant-outline', color: '#F59E0B', screen: 'MealProgram', module: 'restaurant' },
    { id: 'fault-create', label: 'Arıza Bildir', icon: 'warning-outline', color: '#EF4444', screen: 'FaultCreate', module: 'staff' },
  ],
  [ROLES.BARMAN]: [
    { id: 'my-tasks', label: 'Görevlerim', icon: 'clipboard-outline', color: '#1565C0', screen: 'MyTasks', module: 'staff' },
    { id: 'tables', label: 'Masalar', icon: 'grid-outline', color: '#06B6D4', screen: 'Tables', module: 'restaurant' },
    { id: 'meal', label: 'Yemek Programı', icon: 'restaurant-outline', color: '#F59E0B', screen: 'MealProgram', module: 'restaurant' },
    { id: 'fault-create', label: 'Arıza Bildir', icon: 'warning-outline', color: '#EF4444', screen: 'FaultCreate', module: 'staff' },
  ],
  [ROLES.RESTAURANT_MANAGER]: [
    { id: 'tables', label: 'Masalar', icon: 'grid-outline', color: '#06B6D4', screen: 'Tables', module: 'restaurant' },
    { id: 'kitchen', label: 'Mutfak Ekranı', icon: 'flame-outline', color: '#EF4444', screen: 'Kitchen', module: 'restaurant' },
    { id: 'my-tasks', label: 'Görevlerim', icon: 'clipboard-outline', color: '#1565C0', screen: 'MyTasks', module: 'staff' },
    { id: 'create-task', label: 'Görev Ata', icon: 'add-circle-outline', color: '#E91E63', screen: 'CreateTask', module: 'staff' },
    { id: 'shopping', label: 'Alışveriş Listesi', icon: 'cart-outline', color: '#22C55E', screen: 'ShoppingList', module: 'restaurant' },
    { id: 'meal', label: 'Yemek Programı', icon: 'restaurant-outline', color: '#F59E0B', screen: 'MealProgram', module: 'restaurant' },
    { id: 'stock', label: 'Stok Yönetimi', icon: 'cube-outline', color: '#EC4899', screen: 'Stock', module: 'minibar' },
    { id: 'fault-create', label: 'Arıza Bildir', icon: 'warning-outline', color: '#EF4444', screen: 'FaultCreate', module: 'staff' },
  ],
  [ROLES.TECHNICIAN]: [
    { id: 'my-tasks', label: 'Görevlerim', icon: 'clipboard-outline', color: '#1565C0', screen: 'MyTasks', module: 'staff' },
    { id: 'fault-list', label: 'Arıza Listesi', icon: 'construct-outline', color: '#3B82F6', screen: 'FaultList', module: 'staff' },
    { id: 'meal', label: 'Yemek Programı', icon: 'restaurant-outline', color: '#F59E0B', screen: 'MealProgram', module: 'restaurant' },
    { id: 'fault-create', label: 'Arıza Bildir', icon: 'warning-outline', color: '#EF4444', screen: 'FaultCreate', module: 'staff' },
  ],
  [ROLES.HOUSEKEEPER]: [
    { id: 'my-tasks', label: 'Görevlerim', icon: 'clipboard-outline', color: '#1565C0', screen: 'MyTasks', module: 'staff' },
    { id: 'room-status', label: 'Oda Durumu', icon: 'bed-outline', color: '#06B6D4', screen: 'RoomStatus', module: 'base' },
    { id: 'minibar-rooms', label: 'Minibar Kontrol', icon: 'wine-outline', color: '#8B5CF6', screen: 'MinibarRooms', module: 'minibar' },
    { id: 'meal', label: 'Yemek Programı', icon: 'restaurant-outline', color: '#F59E0B', screen: 'MealProgram', module: 'restaurant' },
    { id: 'fault-create', label: 'Arıza Bildir', icon: 'warning-outline', color: '#EF4444', screen: 'FaultCreate', module: 'staff' },
  ],
  [ROLES.MINIBAR]: [
    { id: 'minibar-rooms', label: 'Minibar Kontrol', icon: 'wine-outline', color: '#8B5CF6', screen: 'MinibarRooms', module: 'minibar' },
    { id: 'my-tasks', label: 'Görevlerim', icon: 'clipboard-outline', color: '#1565C0', screen: 'MyTasks', module: 'staff' },
    { id: 'room-status', label: 'Oda Durumu', icon: 'bed-outline', color: '#06B6D4', screen: 'RoomStatus', module: 'base' },
    { id: 'stock', label: 'Stok Yönetimi', icon: 'cube-outline', color: '#EC4899', screen: 'Stock', module: 'minibar' },
    { id: 'fault-create', label: 'Arıza Bildir', icon: 'warning-outline', color: '#EF4444', screen: 'FaultCreate', module: 'staff' },
  ],
  [ROLES.RECEPTION]: [
    { id: 'my-tasks', label: 'Görevlerim', icon: 'clipboard-outline', color: '#1565C0', screen: 'MyTasks', module: 'staff' },
    { id: 'room-service', label: 'Oda Servisi', icon: 'cafe-outline', color: '#8B5CF6', screen: 'RoomService', module: 'restaurant' },
    { id: 'room-status', label: 'Oda Durumu', icon: 'bed-outline', color: '#06B6D4', screen: 'RoomStatus', module: 'base' },
    { id: 'companies', label: 'Firma Yönetimi', icon: 'business-outline', color: '#1565C0', screen: 'Companies', module: 'base' },
    { id: 'reservations', label: 'Rezervasyon Geçmişi', icon: 'time-outline', color: '#7C3AED', screen: 'ReservationHistory', module: 'base' },
    { id: 'meal', label: 'Yemek Programı', icon: 'restaurant-outline', color: '#F59E0B', screen: 'MealProgram', module: 'restaurant' },
    { id: 'night-audit', label: 'Gün Sonu', icon: 'moon-outline', color: '#1E293B', screen: 'NightAudit', module: 'base' },
    { id: 'fault-create', label: 'Arıza Bildir', icon: 'warning-outline', color: '#EF4444', screen: 'FaultCreate', module: 'staff' },
  ],
  [ROLES.MANAGER]: [
    { id: 'my-tasks', label: 'Görevlerim', icon: 'clipboard-outline', color: '#1565C0', screen: 'MyTasks', module: 'staff' },
    { id: 'hotel-mgmt', label: 'Otel Yönetimi', icon: 'business-outline', color: '#7C3AED', screen: 'HotelManagement', module: 'base' },
    { id: 'room-settings', label: 'Oda Yönetimi', icon: 'bed-outline', color: '#0891B2', screen: 'RoomSettings', module: 'base' },
    { id: 'tables', label: 'Masalar', icon: 'grid-outline', color: '#06B6D4', screen: 'Tables', module: 'restaurant' },
    { id: 'kitchen', label: 'Mutfak Ekranı', icon: 'flame-outline', color: '#EF4444', screen: 'Kitchen', module: 'restaurant' },
    { id: 'create-task', label: 'Görev Ata', icon: 'add-circle-outline', color: '#E91E63', screen: 'CreateTask', module: 'staff' },
    { id: 'complaints', label: 'Şikayetler & Öneriler', icon: 'chatbubbles-outline', color: '#8B5CF6', screen: 'Complaints', module: 'base' },
    { id: 'fault-list', label: 'Arıza Listesi', icon: 'construct-outline', color: '#3B82F6', screen: 'FaultList', module: 'staff' },
    { id: 'room-service', label: 'Oda Servisi', icon: 'cafe-outline', color: '#8B5CF6', screen: 'RoomService', module: 'restaurant' },
    { id: 'room-status', label: 'Oda Durumu', icon: 'bed-outline', color: '#06B6D4', screen: 'RoomStatus', module: 'base' },
    { id: 'companies', label: 'Firma Yönetimi', icon: 'business-outline', color: '#1565C0', screen: 'Companies', module: 'base' },
    { id: 'reservations', label: 'Rezervasyon Geçmişi', icon: 'time-outline', color: '#7C3AED', screen: 'ReservationHistory', module: 'base' },
    { id: 'shopping', label: 'Alışveriş Listesi', icon: 'cart-outline', color: '#22C55E', screen: 'ShoppingList', module: 'restaurant' },
    { id: 'meal', label: 'Yemek Programı', icon: 'restaurant-outline', color: '#F59E0B', screen: 'MealProgram', module: 'restaurant' },
    { id: 'stock', label: 'Stok Yönetimi', icon: 'cube-outline', color: '#EC4899', screen: 'Stock', module: 'minibar' },
    { id: 'minibar-rooms', label: 'Minibar Kontrol', icon: 'wine-outline', color: '#8B5CF6', screen: 'MinibarRooms', module: 'minibar' },
    { id: 'staff', label: 'Personel Yönetimi', icon: 'people-outline', color: '#1565C0', screen: 'Staff', module: 'staff' },
    { id: 'cameras', label: 'Kameralar', icon: 'videocam-outline', color: '#607D8B', screen: 'Cameras', module: 'cameras' },
    { id: 'reports', label: 'Raporlar', icon: 'bar-chart-outline', color: '#F97316', screen: 'Reports', module: 'base' },
    { id: 'night-audit', label: 'Gün Sonu', icon: 'moon-outline', color: '#1E293B', screen: 'NightAudit', module: 'base' },
    { id: 'fault-create', label: 'Arıza Bildir', icon: 'warning-outline', color: '#EF4444', screen: 'FaultCreate', module: 'staff' },
  ],
  [ROLES.PATRON]: [
    { id: 'my-tasks', label: 'Görevlerim', icon: 'clipboard-outline', color: '#1565C0', screen: 'MyTasks', module: 'staff' },
    { id: 'hotel-mgmt', label: 'Otel Yönetimi', icon: 'business-outline', color: '#7C3AED', screen: 'HotelManagement', module: 'base' },
    { id: 'room-settings', label: 'Oda Yönetimi', icon: 'bed-outline', color: '#0891B2', screen: 'RoomSettings', module: 'base' },
    { id: 'tables', label: 'Masalar', icon: 'grid-outline', color: '#06B6D4', screen: 'Tables', module: 'restaurant' },
    { id: 'kitchen', label: 'Mutfak Ekranı', icon: 'flame-outline', color: '#EF4444', screen: 'Kitchen', module: 'restaurant' },
    { id: 'create-task', label: 'Görev Ata', icon: 'add-circle-outline', color: '#E91E63', screen: 'CreateTask', module: 'staff' },
    { id: 'complaints', label: 'Şikayetler & Öneriler', icon: 'chatbubbles-outline', color: '#8B5CF6', screen: 'Complaints', module: 'base' },
    { id: 'fault-list', label: 'Arıza Listesi', icon: 'construct-outline', color: '#3B82F6', screen: 'FaultList', module: 'staff' },
    { id: 'room-service', label: 'Oda Servisi', icon: 'cafe-outline', color: '#8B5CF6', screen: 'RoomService', module: 'restaurant' },
    { id: 'room-status', label: 'Oda Durumu', icon: 'bed-outline', color: '#06B6D4', screen: 'RoomStatus', module: 'base' },
    { id: 'companies', label: 'Firma Yönetimi', icon: 'business-outline', color: '#1565C0', screen: 'Companies', module: 'base' },
    { id: 'reservations', label: 'Rezervasyon Geçmişi', icon: 'time-outline', color: '#7C3AED', screen: 'ReservationHistory', module: 'base' },
    { id: 'shopping', label: 'Alışveriş Listesi', icon: 'cart-outline', color: '#22C55E', screen: 'ShoppingList', module: 'restaurant' },
    { id: 'meal', label: 'Yemek Programı', icon: 'restaurant-outline', color: '#F59E0B', screen: 'MealProgram', module: 'restaurant' },
    { id: 'stock', label: 'Stok Yönetimi', icon: 'cube-outline', color: '#EC4899', screen: 'Stock', module: 'minibar' },
    { id: 'minibar-rooms', label: 'Minibar Kontrol', icon: 'wine-outline', color: '#8B5CF6', screen: 'MinibarRooms', module: 'minibar' },
    { id: 'staff', label: 'Personel Yönetimi', icon: 'people-outline', color: '#1565C0', screen: 'Staff', module: 'staff' },
    { id: 'cameras', label: 'Kameralar', icon: 'videocam-outline', color: '#607D8B', screen: 'Cameras', module: 'cameras' },
    { id: 'reports', label: 'Raporlar', icon: 'bar-chart-outline', color: '#F97316', screen: 'Reports', module: 'base' },
    { id: 'night-audit', label: 'Gün Sonu', icon: 'moon-outline', color: '#1E293B', screen: 'NightAudit', module: 'base' },
    { id: 'fault-create', label: 'Arıza Bildir', icon: 'warning-outline', color: '#EF4444', screen: 'FaultCreate', module: 'staff' },
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
  Complaints: ComplaintsScreen,
  Companies: CompanyScreen,
  ReservationHistory: ReservationHistoryScreen,
  MyTasks: MyTasksScreen,
  CreateTask: CreateTaskScreen,
  Cameras: CameraScreen,
  Tables: TablesScreen,
  Kitchen: KitchenScreen,
  MinibarRooms: MinibarRoomsScreen,
  HotelManagement: HotelManagementScreen,
  RoomSettings: RoomSettingsScreen,
  NightAudit: NightAuditScreen,
};

const TasksScreen: React.FC = () => {
  const { user } = useAuth();
  const [activeScreen, setActiveScreen] = useState<string | null>(null);

  if (!user) return null;

  const enabledModules = user.enabledModules || ['base'];

  // Tüm rollerin modüllerini birleştir (duplikat engelle)
  const allRoles = user.roles && user.roles.length > 0 ? user.roles : [user.role];
  const mergedModules: typeof TASK_MODULES[keyof typeof TASK_MODULES] = [];
  const seenIds = new Set<string>();
  for (const role of allRoles) {
    for (const mod of TASK_MODULES[role as keyof typeof TASK_MODULES] || []) {
      if (!seenIds.has(mod.id)) {
        seenIds.add(mod.id);
        mergedModules.push(mod);
      }
    }
  }
  const modules = mergedModules.filter(mod => enabledModules.includes(mod.module));

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
