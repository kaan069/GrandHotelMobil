/**
 * StaffScreen - Eleman Yönetimi Ekranı
 *
 * Patron için personel bilgileri ve giriş/çıkış logları.
 * Yeni eleman ekleme, yıllık izin takibi ve mesai saatleri.
 * İzin hesaplaması işe giriş tarihine göre dinamik yapılır.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AppCard, StatusChip } from '../../components/common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { ROLE_LABELS, EMPLOYEES_STORAGE_KEY } from '../../utils/constants';
import { calculateAnnualLeave, getYearsOfService } from '../../utils/leaveCalculator';
import EmployeeAddModal from './EmployeeAddModal';

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  name: string;
  role: string;
  roles: string[];
  staffNumber: string;
  phone: string;
  password: string;
  hireDate: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  usedLeave: number;
}

interface StaffScreenProps {
  onClose: () => void;
}

/** Mock personel verileri (ilk yüklemede kullanılır) */
const DEFAULT_STAFF: Employee[] = [
  {
    id: 1, firstName: 'Mehmet', lastName: 'Demir', name: 'Mehmet Demir',
    role: 'manager', roles: ['manager'], staffNumber: '1002', phone: '0532 111 22 33',
    password: '1234', hireDate: '2022-03-15',
    checkIn: '08:00', checkOut: '17:30', status: 'active', usedLeave: 5,
  },
  {
    id: 2, firstName: 'Ayşe', lastName: 'Kaya', name: 'Ayşe Kaya',
    role: 'reception', roles: ['reception'], staffNumber: '1003', phone: '0533 222 33 44',
    password: '1234', hireDate: '2023-06-01',
    checkIn: '07:45', checkOut: null, status: 'active', usedLeave: 3,
  },
  {
    id: 3, firstName: 'Fatma', lastName: 'Çelik', name: 'Fatma Çelik',
    role: 'waiter', roles: ['waiter'], staffNumber: '1004', phone: '0534 333 44 55',
    password: '1234', hireDate: '2024-01-10',
    checkIn: null, checkOut: null, status: 'leave', usedLeave: 14,
  },
  {
    id: 4, firstName: 'Hasan', lastName: 'Şahin', name: 'Hasan Şahin',
    role: 'chef', roles: ['chef'], staffNumber: '1005', phone: '0535 444 55 66',
    password: '1234', hireDate: '2021-09-20',
    checkIn: '06:30', checkOut: null, status: 'active', usedLeave: 3,
  },
  {
    id: 5, firstName: 'Ali', lastName: 'Öztürk', name: 'Ali Öztürk',
    role: 'technician', roles: ['technician'], staffNumber: '1006', phone: '0536 555 66 77',
    password: '1234', hireDate: '2023-02-14',
    checkIn: '08:15', checkOut: '17:00', status: 'active', usedLeave: 7,
  },
  {
    id: 6, firstName: 'Zeynep', lastName: 'Arslan', name: 'Zeynep Arslan',
    role: 'housekeeper', roles: ['housekeeper'], staffNumber: '1007', phone: '0537 666 77 88',
    password: '1234', hireDate: '2024-05-01',
    checkIn: '07:00', checkOut: null, status: 'active', usedLeave: 2,
  },
];

const StaffScreen: React.FC<StaffScreenProps> = ({ onClose }) => {
  const [staff, setStaff] = useState<Employee[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  /** AsyncStorage'dan personel yükle */
  const loadStaff = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(EMPLOYEES_STORAGE_KEY);
      if (saved) {
        setStaff(JSON.parse(saved));
      } else {
        setStaff(DEFAULT_STAFF);
        await AsyncStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(DEFAULT_STAFF));
      }
    } catch {
      setStaff(DEFAULT_STAFF);
    }
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  /** AsyncStorage'a kaydet */
  const persist = async (data: Employee[]) => {
    setStaff(data);
    await AsyncStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(data));
  };

  /** Yeni eleman ekle */
  const handleAddEmployee = async (employeeData: Omit<Employee, 'id' | 'staffNumber' | 'checkIn' | 'checkOut'>) => {
    const maxId = staff.reduce((max, e) => Math.max(max, e.id), 0);
    const maxStaffNum = staff.reduce(
      (max, e) => Math.max(max, Number(e.staffNumber) || 0),
      1001
    );

    const newEmployee: Employee = {
      ...employeeData,
      id: maxId + 1,
      staffNumber: String(maxStaffNum + 1),
      checkIn: null,
      checkOut: null,
    };

    await persist([...staff, newEmployee]);
  };

  /** Eleman sil */
  const handleDelete = (id: number, name: string) => {
    Alert.alert(
      'Eleman Sil',
      `${name} silinecek. Emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => persist(staff.filter((s) => s.id !== id)),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Başlık */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Eleman Yönetimi</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)}>
          <Ionicons name="add-circle" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Özet kartları */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: colors.success + '15' }]}>
          <Text style={[styles.summaryValue, { color: colors.success }]}>
            {staff.filter((s) => s.status === 'active').length}
          </Text>
          <Text style={styles.summaryLabel}>Aktif</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.warning + '15' }]}>
          <Text style={[styles.summaryValue, { color: colors.warning }]}>
            {staff.filter((s) => s.status === 'leave').length}
          </Text>
          <Text style={styles.summaryLabel}>İzinli</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.primary + '15' }]}>
          <Text style={[styles.summaryValue, { color: colors.primary }]}>
            {staff.length}
          </Text>
          <Text style={styles.summaryLabel}>Toplam</Text>
        </View>
      </View>

      {/* Personel listesi */}
      <FlatList
        data={staff}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isExpanded = expandedId === item.id;
          const annualEntitlement = calculateAnnualLeave(item.hireDate);
          const usedLeave = item.usedLeave || 0;
          const remainingLeave = Math.max(0, annualEntitlement - usedLeave);
          const yearsOfService = getYearsOfService(item.hireDate);

          return (
            <TouchableOpacity activeOpacity={0.7} onPress={() => setExpandedId(isExpanded ? null : item.id)}>
              <AppCard style={styles.staffCard}>
                {/* Üst satır */}
                <View style={styles.staffTop}>
                  <View style={styles.staffAvatar}>
                    <Text style={styles.avatarText}>
                      {(item.name || `${item.firstName} ${item.lastName}`).split(' ').map((n) => n[0]).join('')}
                    </Text>
                  </View>
                  <View style={styles.staffInfo}>
                    <Text style={styles.staffName}>{item.name || `${item.firstName} ${item.lastName}`}</Text>
                    <Text style={styles.staffRole}>
                      {(item.roles || [item.role]).map((r) => ROLE_LABELS[r]).join(', ')} · #{item.staffNumber}
                    </Text>
                  </View>
                  <StatusChip
                    label={item.status === 'active' ? 'Aktif' : 'İzinli'}
                    color={item.status === 'active' ? colors.success : colors.warning}
                  />
                </View>

                {/* Detay (genişletilmiş) */}
                {isExpanded && (
                  <View style={styles.staffDetail}>
                    <View style={styles.divider} />

                    {/* Kıdem */}
                    <Text style={styles.detailTitle}>Kıdem</Text>
                    <Text style={styles.detailText}>
                      {Math.floor(yearsOfService)} yıl {Math.round((yearsOfService % 1) * 12)} ay
                    </Text>

                    {/* Giriş/Çıkış */}
                    <Text style={styles.detailTitle}>Bugünkü Mesai</Text>
                    <View style={styles.detailRow}>
                      <View style={styles.detailItem}>
                        <Ionicons name="log-in-outline" size={16} color={colors.success} />
                        <Text style={styles.detailText}>
                          Giriş: {item.checkIn || '---'}
                        </Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Ionicons name="log-out-outline" size={16} color={colors.error} />
                        <Text style={styles.detailText}>
                          Çıkış: {item.checkOut || '---'}
                        </Text>
                      </View>
                    </View>

                    {/* Telefon */}
                    {item.phone && (
                      <>
                        <Text style={styles.detailTitle}>Telefon</Text>
                        <Text style={styles.detailText}>{item.phone}</Text>
                      </>
                    )}

                    {/* Yıllık İzin */}
                    <Text style={styles.detailTitle}>Yıllık İzin</Text>
                    {annualEntitlement > 0 ? (
                      <>
                        <View style={styles.leaveBar}>
                          <View
                            style={[
                              styles.leaveBarFill,
                              {
                                width: `${(usedLeave / annualEntitlement) * 100}%`,
                                backgroundColor: remainingLeave <= 2 ? colors.error : colors.primary,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.leaveText}>
                          {usedLeave} kullanıldı / {remainingLeave} kalan / {annualEntitlement} toplam
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.detailText}>Henüz 1 yılını doldurmadı</Text>
                    )}

                    {/* Haftalık İzin */}
                    <Text style={styles.detailTitle}>Haftalık İzin</Text>
                    <Text style={styles.detailText}>Haftada 1 gün</Text>

                    {/* Sil butonu */}
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDelete(item.id, item.name || `${item.firstName} ${item.lastName}`)}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.error} />
                      <Text style={styles.deleteText}>Elemanı Sil</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </AppCard>
            </TouchableOpacity>
          );
        }}
      />

      {/* Eleman Ekleme Modalı */}
      <Modal visible={showAddModal} animationType="slide">
        <EmployeeAddModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddEmployee}
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: 56,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  staffCard: {
    marginBottom: spacing.sm,
  },
  staffTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  staffAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.primary,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  staffRole: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  staffDetail: {
    marginTop: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginBottom: spacing.sm,
  },
  detailTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
    marginTop: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 20,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  leaveBar: {
    height: 8,
    backgroundColor: colors.divider,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  leaveBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  leaveText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    paddingVertical: 8,
  },
  deleteText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.error,
  },
});

export default StaffScreen;
