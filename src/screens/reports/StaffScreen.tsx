/**
 * StaffScreen - Eleman Yönetimi Ekranı
 *
 * Patron/müdür için personel bilgileri ve izin takibi.
 * Veriler backend API'den çekilir.
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
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppCard, StatusChip } from '../../components/common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { ROLE_LABELS } from '../../utils/constants';
import { getYearsOfService } from '../../utils/leaveCalculator';
import { staffApi, leavesApi } from '../../services/api';
import type { ApiEmployee } from '../../services/api';
import useAuth from '../../hooks/useAuth';
import EmployeeAddModal from './EmployeeAddModal';

interface StaffScreenProps {
  onClose: () => void;
}

const StaffScreen: React.FC<StaffScreenProps> = ({ onClose }) => {
  const [staff, setStaff] = useState<ApiEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  /** Backend'den personel listesini çek */
  const fetchStaff = useCallback(async () => {
    try {
      const data = await staffApi.getAll();
      setStaff(data);
    } catch (err) {
      console.error('Personel yüklenemedi:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStaff();
  };

  /** Yeni eleman ekle (API) */
  const handleAddEmployee = async (employeeData: any) => {
    try {
      const maxNum = staff.reduce((max, e) => Math.max(max, Number(e.staffNumber) || 0), 1001);
      await staffApi.create({
        firstName: employeeData.firstName,
        lastName: employeeData.lastName,
        phone: employeeData.phone || '',
        password: employeeData.password,
        staffNumber: String(maxNum + 1),
        hireDate: employeeData.hireDate,
        roles: employeeData.roles || [],
      });
      setShowAddModal(false);
      fetchStaff();
    } catch (err: any) {
      Alert.alert('Hata', 'Eleman eklenemedi');
    }
  };

  /** Eleman sil (API) */
  const handleDelete = (id: number, name: string) => {
    Alert.alert(
      'Eleman Sil',
      `${name} silinecek. Emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await staffApi.delete(id);
              setStaff((prev) => prev.filter((s) => s.id !== id));
            } catch {
              Alert.alert('Hata', 'Eleman silinemedi');
            }
          },
        },
      ]
    );
  };

  /** İzin ver */
  const handleLeave = (emp: ApiEmployee) => {
    const leaveTypes = [
      { text: 'Haftalık İzin', type: 'weekly' },
      { text: 'Yıllık İzin', type: 'annual' },
      { text: 'Günlük İzin', type: 'daily' },
      { text: 'Ücretsiz İzin', type: 'unpaid' },
    ];

    Alert.alert(
      `${emp.fullName} — İzin Ver`,
      'İzin tipini seçin:',
      [
        ...leaveTypes.map((lt) => ({
          text: lt.text,
          onPress: () => {
            const today = new Date().toISOString().split('T')[0];

            /* Haftalık izin zaten kullanılmışsa uyar */
            if (lt.type === 'weekly' && emp.hasWeeklyLeaveThisWeek) {
              Alert.alert(
                'Haftalık İzin Kullanılmış',
                'Bu hafta zaten haftalık izin kullanılmış. Yıllık izinden düşülsün mü?',
                [
                  { text: 'İptal', style: 'cancel' },
                  {
                    text: 'Evet, Yıllıktan Düş',
                    onPress: async () => {
                      try {
                        await leavesApi.create({
                          employeeId: emp.id,
                          leaveType: 'weekly',
                          startDate: today,
                          endDate: today,
                          deductFromAnnual: true,
                          note: 'Haftalık izin (yıllıktan düşüldü)',
                          approvedById: user?.id,
                        });
                        Alert.alert('Başarılı', 'İzin verildi');
                        fetchStaff();
                      } catch {
                        Alert.alert('Hata', 'İzin verilemedi');
                      }
                    },
                  },
                ]
              );
              return;
            }

            /* Normal izin ver */
            Alert.alert(
              lt.text,
              'Bugün için izin verilsin mi?',
              [
                { text: 'İptal', style: 'cancel' },
                {
                  text: 'Onayla',
                  onPress: async () => {
                    try {
                      await leavesApi.create({
                        employeeId: emp.id,
                        leaveType: lt.type,
                        startDate: today,
                        endDate: today,
                        deductFromAnnual: lt.type === 'annual' || lt.type === 'daily',
                        note: lt.text,
                        approvedById: user?.id,
                      });
                      Alert.alert('Başarılı', `${emp.fullName} izinli olarak işaretlendi`);
                      fetchStaff();
                    } catch {
                      Alert.alert('Hata', 'İzin verilemedi');
                    }
                  },
                },
              ]
            );
          },
        })),
        { text: 'İptal', style: 'cancel' },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Eleman Yönetimi</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 8, color: colors.textSecondary }}>Yükleniyor...</Text>
        </View>
      </View>
    );
  }

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
            {staff.filter((s) => s.isOnLeaveToday).length}
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        renderItem={({ item }) => {
          const isExpanded = expandedId === item.id;
          const yearsOfService = getYearsOfService(item.hireDate);
          const usedLeave = item.usedAnnualLeave || 0;
          const entitlement = item.annualLeaveEntitlement || 0;
          const remaining = item.remainingAnnualLeave || 0;

          return (
            <TouchableOpacity activeOpacity={0.7} onPress={() => setExpandedId(isExpanded ? null : item.id)}>
              <AppCard style={styles.staffCard}>
                {/* Üst satır */}
                <View style={styles.staffTop}>
                  <View style={styles.staffAvatar}>
                    <Text style={styles.avatarText}>
                      {item.fullName.split(' ').map((n) => n[0]).join('')}
                    </Text>
                  </View>
                  <View style={styles.staffInfo}>
                    <Text style={styles.staffName}>{item.fullName}</Text>
                    <Text style={styles.staffRole}>
                      {(item.roleLabels || []).join(', ')} · #{item.staffNumber}
                    </Text>
                  </View>
                  <StatusChip
                    label={item.isOnLeaveToday ? 'İzinli' : 'Aktif'}
                    color={item.isOnLeaveToday ? colors.warning : colors.success}
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

                    {/* Telefon */}
                    {item.phone ? (
                      <>
                        <Text style={styles.detailTitle}>Telefon</Text>
                        <Text style={styles.detailText}>{item.phone}</Text>
                      </>
                    ) : null}

                    {/* Şifre */}
                    <Text style={styles.detailTitle}>Şifre</Text>
                    <Text style={styles.detailText}>{item.password}</Text>

                    {/* Yıllık İzin */}
                    <Text style={styles.detailTitle}>Yıllık İzin</Text>
                    {entitlement > 0 ? (
                      <>
                        <View style={styles.leaveBar}>
                          <View
                            style={[
                              styles.leaveBarFill,
                              {
                                width: `${Math.min((usedLeave / entitlement) * 100, 100)}%`,
                                backgroundColor: remaining <= 2 ? colors.error : colors.primary,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.leaveText}>
                          {usedLeave} kullanıldı / {remaining} kalan / {entitlement} toplam
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.detailText}>Henüz 1 yılını doldurmadı</Text>
                    )}

                    {/* Butonlar */}
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={styles.leaveBtn}
                        onPress={() => handleLeave(item)}
                      >
                        <Ionicons name="calendar-outline" size={16} color="#fff" />
                        <Text style={styles.leaveBtnText}>İzin Ver</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDelete(item.id, item.fullName)}
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.error} />
                        <Text style={styles.deleteText}>Sil</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </AppCard>
            </TouchableOpacity>
          );
        }}
      />

      {/* Eleman Ekleme Modalı */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddModal(false)}>
        <EmployeeAddModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddEmployee}
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingTop: 56, paddingBottom: spacing.md,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary },
  summaryRow: {
    flexDirection: 'row', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm,
  },
  summaryCard: {
    flex: 1, paddingVertical: spacing.sm, borderRadius: borderRadius.md, alignItems: 'center',
  },
  summaryValue: { fontSize: fontSize.xl, fontWeight: '800' },
  summaryLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  list: { padding: spacing.md, paddingBottom: spacing.xxl },
  staffCard: { marginBottom: spacing.sm },
  staffTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  staffAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary + '20',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: fontSize.md, fontWeight: '700', color: colors.primary },
  staffInfo: { flex: 1 },
  staffName: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary },
  staffRole: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  staffDetail: { marginTop: spacing.sm },
  divider: { height: 1, backgroundColor: colors.border, marginBottom: spacing.sm },
  detailTitle: { fontSize: fontSize.xs, fontWeight: '600', color: colors.textSecondary, marginTop: spacing.sm, marginBottom: 2 },
  detailText: { fontSize: fontSize.sm, color: colors.textPrimary },
  leaveBar: { height: 6, backgroundColor: colors.border, borderRadius: 3, marginTop: 4, overflow: 'hidden' },
  leaveBarFill: { height: '100%', borderRadius: 3 },
  leaveText: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 4 },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: spacing.md,
  },
  leaveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.success, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: borderRadius.md,
  },
  leaveBtnText: { fontSize: fontSize.sm, color: '#fff', fontWeight: '600' },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: spacing.xs,
  },
  deleteText: { fontSize: fontSize.sm, color: colors.error, fontWeight: '500' },
});

export default StaffScreen;
