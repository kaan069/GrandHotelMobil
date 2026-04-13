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
import type { ApiEmployee, ApiLeave } from '../../services/api';
import useAuth from '../../hooks/useAuth';
import EmployeeAddModal from './EmployeeAddModal';
import LeaveGrantModal from '../../components/employees/LeaveGrantModal';

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
  const [editingEmployee, setEditingEmployee] = useState<ApiEmployee | null>(null);
  const [leaveModalEmployee, setLeaveModalEmployee] = useState<ApiEmployee | null>(null);
  const [employeeLeaves, setEmployeeLeaves] = useState<Record<number, ApiLeave[]>>({});

  /** Maaşı Türk locale'inde biçimle */
  const fmtSalary = (val: number | string | null | undefined) => {
    if (val == null || val === '') return null;
    const n = Number(val);
    if (isNaN(n) || n === 0) return null;
    return n.toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

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
        salary: employeeData.salary,
      });
      setShowAddModal(false);
      fetchStaff();
    } catch (err: any) {
      Alert.alert('Hata', 'Eleman eklenemedi');
    }
  };

  /** Eleman güncelle (API) */
  const handleUpdateEmployee = async (employeeData: any) => {
    if (!editingEmployee) return;
    try {
      await staffApi.update(editingEmployee.id, {
        firstName: employeeData.firstName,
        lastName: employeeData.lastName,
        phone: employeeData.phone || '',
        hireDate: employeeData.hireDate,
        roles: employeeData.roles || [],
        salary: employeeData.salary,
      });
      setEditingEmployee(null);
      fetchStaff();
    } catch (err: any) {
      Alert.alert('Hata', 'Eleman güncellenemedi');
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

  /** Eleman genişletildiğinde izin geçmişini çek */
  const fetchLeaves = async (empId: number) => {
    try {
      const leaves = await leavesApi.getForEmployee(empId);
      setEmployeeLeaves((prev) => ({ ...prev, [empId]: leaves }));
    } catch {
      // Sessiz hata
    }
  };

  /** Eleman kartı genişletme — izinleri de çek */
  const handleExpand = (empId: number) => {
    const isExpanding = expandedId !== empId;
    setExpandedId(isExpanding ? empId : null);
    if (isExpanding && !employeeLeaves[empId]) {
      fetchLeaves(empId);
    }
  };

  /** İzin iptal et */
  const handleCancelLeave = (leave: ApiLeave, emp: ApiEmployee) => {
    Alert.alert(
      'İzin İptal',
      `${emp.fullName} — ${leave.startDate} tarihli izni iptal etmek istiyor musunuz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'İptal Et',
          style: 'destructive',
          onPress: async () => {
            try {
              await leavesApi.cancel(leave.id);
              Alert.alert('Başarılı', 'İzin iptal edildi');
              fetchLeaves(emp.id);
              fetchStaff();
            } catch (err: any) {
              Alert.alert('Hata', err?.message || 'İzin iptal edilemedi');
            }
          },
        },
      ]
    );
  };

  /** İzin verme — LeaveGrantModal kullan */
  const handleLeaveGrant = async (data: {
    employeeId: number; leaveType: string;
    startDate: string; endDate: string;
    deductFromAnnual: boolean; note: string;
  }) => {
    try {
      await leavesApi.create({
        ...data,
        approvedById: user?.id,
      });
      Alert.alert('Başarılı', 'İzin verildi');
      setLeaveModalEmployee(null);
      fetchStaff();
      // İzin geçmişini de yenile
      fetchLeaves(data.employeeId);
    } catch (err: any) {
      Alert.alert('Hata', err?.message || 'İzin verilemedi');
    }
  };

  const LEAVE_TYPE_LABELS: Record<string, string> = {
    weekly: 'Haftalık', annual: 'Yıllık', daily: 'Günlük', unpaid: 'Ücretsiz',
  };

  const LEAVE_STATUS_LABELS: Record<string, string> = {
    approved: 'Onaylı', pending: 'Beklemede', cancelled: 'İptal', rejected: 'Reddedildi',
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
            <TouchableOpacity activeOpacity={0.7} onPress={() => handleExpand(item.id)}>
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

                    {/* Aylık Maaş */}
                    <Text style={styles.detailTitle}>Aylık Maaş</Text>
                    <Text style={[styles.detailText, { fontWeight: '700' }]}>
                      {fmtSalary(item.salary) ? `${fmtSalary(item.salary)} ₺` : 'Belirlenmemiş'}
                    </Text>

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

                    {/* İzin Geçmişi */}
                    {employeeLeaves[item.id] && employeeLeaves[item.id].length > 0 && (
                      <>
                        <Text style={styles.detailTitle}>Son İzinler</Text>
                        {employeeLeaves[item.id].slice(0, 10).map((leave) => (
                          <View key={leave.id} style={styles.leaveHistoryRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.leaveHistoryType}>
                                {LEAVE_TYPE_LABELS[leave.leaveType] || leave.leaveType}
                                {' · '}
                                <Text style={{ fontWeight: '400', color: colors.textSecondary }}>
                                  {leave.startDate === leave.endDate
                                    ? leave.startDate
                                    : `${leave.startDate} → ${leave.endDate}`}
                                </Text>
                                {' · '}
                                <Text style={{ fontWeight: '400' }}>{leave.durationDays} gün</Text>
                              </Text>
                              {leave.note ? (
                                <Text style={styles.leaveHistoryNote} numberOfLines={1}>{leave.note}</Text>
                              ) : null}
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <StatusChip
                                label={LEAVE_STATUS_LABELS[leave.status] || leave.status}
                                color={leave.status === 'approved' ? colors.success : leave.status === 'cancelled' ? colors.error : colors.warning}
                              />
                              {leave.status === 'approved' && (
                                <TouchableOpacity onPress={() => handleCancelLeave(leave, item)}>
                                  <Ionicons name="close-circle" size={22} color={colors.error} />
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        ))}
                      </>
                    )}

                    {/* Butonlar */}
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={styles.leaveBtn}
                        onPress={() => setLeaveModalEmployee(item)}
                      >
                        <Ionicons name="calendar-outline" size={16} color="#fff" />
                        <Text style={styles.leaveBtnText}>İzin Ver</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.editBtn}
                        onPress={() => setEditingEmployee(item)}
                      >
                        <Ionicons name="create-outline" size={16} color="#fff" />
                        <Text style={styles.leaveBtnText}>Düzenle</Text>
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

      {/* Eleman Düzenleme Modalı */}
      <Modal visible={!!editingEmployee} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditingEmployee(null)}>
        {editingEmployee && (
          <EmployeeAddModal
            key={`edit-${editingEmployee.id}`}
            onClose={() => setEditingEmployee(null)}
            onSave={handleUpdateEmployee}
            editingEmployee={editingEmployee}
          />
        )}
      </Modal>

      {/* İzin Verme Modalı */}
      <Modal visible={!!leaveModalEmployee} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setLeaveModalEmployee(null)}>
        {leaveModalEmployee && (
          <LeaveGrantModal
            key={`leave-${leaveModalEmployee.id}`}
            onClose={() => setLeaveModalEmployee(null)}
            onSave={handleLeaveGrant}
            employee={{
              id: leaveModalEmployee.id,
              fullName: leaveModalEmployee.fullName,
              hasWeeklyLeaveThisWeek: leaveModalEmployee.hasWeeklyLeaveThisWeek,
              remainingAnnualLeave: leaveModalEmployee.remainingAnnualLeave,
              annualLeaveEntitlement: leaveModalEmployee.annualLeaveEntitlement,
              weeklyLeaveRemaining: leaveModalEmployee.weeklyLeaveRemaining,
            }}
          />
        )}
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
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: borderRadius.md,
  },
  leaveBtnText: { fontSize: fontSize.sm, color: '#fff', fontWeight: '600' },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: spacing.xs,
  },
  deleteText: { fontSize: fontSize.sm, color: colors.error, fontWeight: '500' },
  // İzin geçmişi
  leaveHistoryRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  leaveHistoryType: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary },
  leaveHistoryNote: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
});

export default StaffScreen;
