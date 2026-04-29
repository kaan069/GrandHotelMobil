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

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppHeader } from '../../components/common';
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
import DebtorsScreen from '../tasks/DebtorsScreen';
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
    { id: 'debtors', label: 'Borçlular', icon: 'cash-outline', color: '#DC2626', screen: 'Debtors', module: 'base' },
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
    { id: 'debtors', label: 'Borçlular', icon: 'cash-outline', color: '#DC2626', screen: 'Debtors', module: 'base' },
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
    { id: 'debtors', label: 'Borçlular', icon: 'cash-outline', color: '#DC2626', screen: 'Debtors', module: 'base' },
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

/** Modül id → kategori eşlemesi */
const MODULE_CATEGORY: Record<string, string> = {
  // Günlük İşler — sürekli kullanılan
  'my-tasks': 'daily',
  'kitchen': 'daily',
  'tables': 'daily',
  'room-service': 'daily',
  'room-status': 'daily',
  'fault-create': 'daily',
  // Yönetim
  'create-task': 'management',
  'staff': 'management',
  'hotel-mgmt': 'management',
  'room-settings': 'management',
  'complaints': 'management',
  'fault-list': 'management',
  // Rezervasyon & Cari
  'companies': 'reservation',
  'debtors': 'reservation',
  'reservations': 'reservation',
  'night-audit': 'reservation',
  // Mutfak & Stok
  'meal': 'kitchen-stock',
  'shopping': 'kitchen-stock',
  'stock': 'kitchen-stock',
  'minibar-rooms': 'kitchen-stock',
  // Sistem
  'cameras': 'system',
  'reports': 'system',
};

interface CategoryDef {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  defaultOpen: boolean;
}

/** Kategori tanımları — sıra önemli (üstten alta render sırası) */
const CATEGORIES: CategoryDef[] = [
  { id: 'daily', label: 'Günlük İşler', icon: 'flash-outline', defaultOpen: true },
  { id: 'management', label: 'Yönetim', icon: 'people-outline', defaultOpen: false },
  { id: 'reservation', label: 'Rezervasyon & Cari', icon: 'calendar-outline', defaultOpen: false },
  { id: 'kitchen-stock', label: 'Mutfak & Stok', icon: 'restaurant-outline', defaultOpen: false },
  { id: 'system', label: 'Sistem', icon: 'settings-outline', defaultOpen: false },
];

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
  Debtors: DebtorsScreen,
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
  const [search, setSearch] = useState('');
  const [openCats, setOpenCats] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    CATEGORIES.forEach((c) => { init[c.id] = c.defaultOpen; });
    return init;
  });

  // Hooks unconditional — early return user check'i en sonda
  const enabledModules = user?.enabledModules || ['base'];
  const allRoles = user?.roles && user.roles.length > 0 ? user.roles : (user ? [user.role] : []);

  const modules = useMemo(() => {
    const merged: typeof TASK_MODULES[keyof typeof TASK_MODULES] = [];
    const seen = new Set<string>();
    for (const role of allRoles) {
      for (const mod of TASK_MODULES[role as keyof typeof TASK_MODULES] || []) {
        if (!seen.has(mod.id)) {
          seen.add(mod.id);
          merged.push(mod);
        }
      }
    }
    return merged.filter((mod) => enabledModules.includes(mod.module));
  }, [allRoles, enabledModules]);

  const trimmedSearch = search.trim().toLocaleLowerCase('tr-TR');
  const filtered = trimmedSearch
    ? modules.filter((m) => m.label.toLocaleLowerCase('tr-TR').includes(trimmedSearch))
    : modules;

  /** Kategori → modüller eşlemesi (sıralı) */
  const grouped = useMemo(() => {
    const map: Record<string, typeof modules> = {};
    CATEGORIES.forEach((c) => { map[c.id] = []; });
    const others: typeof modules = [];
    for (const mod of filtered) {
      const cat = MODULE_CATEGORY[mod.id];
      if (cat && map[cat]) map[cat].push(mod);
      else others.push(mod);
    }
    return { map, others };
  }, [filtered]);

  if (!user) return null;

  const renderScreenContent = () => {
    if (!activeScreen) return null;
    const ScreenComponent = SCREEN_MAP[activeScreen];
    if (!ScreenComponent) return null;
    return <ScreenComponent onClose={() => setActiveScreen(null)} />;
  };

  const renderCard = (mod: TaskModule) => (
    <TouchableOpacity
      key={mod.id}
      style={styles.moduleCard}
      activeOpacity={0.7}
      onPress={() => setActiveScreen(mod.screen)}
    >
      <View style={[styles.moduleIcon, { backgroundColor: mod.color + '15' }]}>
        <Ionicons name={mod.icon} size={28} color={mod.color} />
      </View>
      <Text style={styles.moduleLabel} numberOfLines={2}>{mod.label}</Text>
    </TouchableOpacity>
  );

  const isSearching = trimmedSearch.length > 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeader
          title={`Merhaba, ${user.name.split(' ')[0]}`}
          subtitle={ROLE_LABELS[user.role]}
        />

        {/* Arama */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="İşlem ara..."
            placeholderTextColor={colors.textDisabled}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {isSearching ? (
          /* Arama açık → düz grid */
          filtered.length > 0 ? (
            <View style={styles.grid}>
              {filtered.map(renderCard)}
            </View>
          ) : (
            <Text style={styles.emptyText}>Sonuç bulunamadı</Text>
          )
        ) : (
          /* Kategori grupları */
          <>
            {CATEGORIES.map((cat) => {
              const items = grouped.map[cat.id];
              if (!items || items.length === 0) return null;
              const open = openCats[cat.id];
              return (
                <View key={cat.id} style={styles.categoryBlock}>
                  <TouchableOpacity
                    style={styles.categoryHeader}
                    activeOpacity={0.7}
                    onPress={() => setOpenCats((p) => ({ ...p, [cat.id]: !p[cat.id] }))}
                  >
                    <View style={styles.categoryHeaderLeft}>
                      <Ionicons name={cat.icon} size={18} color={colors.primary} />
                      <Text style={styles.categoryLabel}>{cat.label}</Text>
                      <View style={styles.categoryCountBadge}>
                        <Text style={styles.categoryCountText}>{items.length}</Text>
                      </View>
                    </View>
                    <Ionicons
                      name={open ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                  {open && (
                    <View style={styles.grid}>
                      {items.map(renderCard)}
                    </View>
                  )}
                </View>
              );
            })}

            {/* Kategorisiz modüller (yeni eklenip henüz haritalanmamış) */}
            {grouped.others.length > 0 && (
              <View style={styles.categoryBlock}>
                <Text style={styles.categoryLabel}>Diğer</Text>
                <View style={styles.grid}>
                  {grouped.others.map(renderCard)}
                </View>
              </View>
            )}
          </>
        )}
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    padding: 0,
  },
  categoryBlock: {
    marginBottom: spacing.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: spacing.xs,
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryLabel: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  categoryCountBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  categoryCountText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.primary,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
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
