/**
 * ProfileScreen - Profil Ekranı
 *
 * Kullanıcı bilgilerini ve çıkış butonunu gösterir.
 * Rol bilgisi, şube kodu ve personel numarası görüntülenir.
 * Mesailerim butonu ile QR okutarak kaydedilen mesai geçmişi görüntülenir.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppCard, AppButton } from '../../components/common';
import useAuth from '../../hooks/useAuth';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { ROLE_LABELS, APP_NAME } from '../../utils/constants';
import { calculateAnnualLeave, getYearsOfService } from '../../utils/leaveCalculator';
import { staffApi, leavesApi } from '../../services/api';
import type { ApiLeave } from '../../services/api';
import { StatusChip } from '../../components/common';
import ShiftsScreen from '../tasks/ShiftsScreen';
import EarningsScreen from './EarningsScreen';

interface InfoRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}

interface LeaveCardProps {
  hireDate: string;
  leaveInfo?: { used: number; remaining: number; entitlement: number } | null;
}

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
}

const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const [showShifts, setShowShifts] = useState(false);
  const [showEarnings, setShowEarnings] = useState(false);
  const [isOnLeave, setIsOnLeave] = useState(false);
  const [leaveInfo, setLeaveInfo] = useState<{ used: number; remaining: number; entitlement: number } | null>(null);
  const [workInfo, setWorkInfo] = useState<{ consecutive: number; total: number; weeklyEarned: number; weeklyUsed: number; weeklyRemaining: number } | null>(null);
  const [myLeaves, setMyLeaves] = useState<ApiLeave[]>([]);

  /* Backend'den izin + çalışma bilgisi çek */
  useEffect(() => {
    if (!user) return;
    staffApi.getById(user.id)
      .then((emp: Record<string, unknown>) => {
        setIsOnLeave(emp.isOnLeaveToday as boolean);
        setLeaveInfo({
          used: emp.usedAnnualLeave as number,
          remaining: emp.remainingAnnualLeave as number,
          entitlement: emp.annualLeaveEntitlement as number,
        });
        setWorkInfo({
          consecutive: (emp.consecutiveWorkDays as number) || 0,
          total: (emp.totalWorkDays as number) || 0,
          weeklyEarned: (emp.weeklyLeaveEarned as number) || 0,
          weeklyUsed: (emp.weeklyLeaveUsed as number) || 0,
          weeklyRemaining: (emp.weeklyLeaveRemaining as number) || 0,
        });
      })
      .catch(() => {});
    // İzin geçmişini çek
    leavesApi.getForEmployee(user.id)
      .then(setMyLeaves)
      .catch(() => {});
  }, [user]);

  /** Çıkış onayı */
  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Çıkış yapmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Çıkış Yap', style: 'destructive', onPress: logout },
      ]
    );
  };

  if (!user) return null;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Profil kartı */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.name.split(' ').map((n: string) => n[0]).join('')}
            </Text>
          </View>
          <Text style={styles.name}>{user.name}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {(user.roles && user.roles.length > 0
                ? user.roles.map((r: string) => ROLE_LABELS[r] || r).join(', ')
                : ROLE_LABELS[user.role] || user.role
              )}
            </Text>
          </View>
        </View>

        {/* Bilgi kartları */}
        <AppCard style={styles.infoCard}>
          <InfoRow icon="business-outline" label="Şube Kodu" value={user.branchCode} />
          <View style={styles.divider} />
          <InfoRow icon="card-outline" label="Personel No" value={user.staffNumber} />
          <View style={styles.divider} />
          <InfoRow icon="shield-checkmark-outline" label="Yetki" value={
            user.roles && user.roles.length > 0
              ? user.roles.map((r: string) => ROLE_LABELS[r] || r).join(', ')
              : ROLE_LABELS[user.role] || user.role
          } />
        </AppCard>

        {/* Mesailerim Butonu */}
        <TouchableOpacity
          style={styles.shiftsButton}
          activeOpacity={0.7}
          onPress={() => setShowShifts(true)}
        >
          <View style={styles.shiftsLeft}>
            <View style={styles.shiftsIcon}>
              <Ionicons name="time-outline" size={22} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.shiftsTitle}>Mesailerim</Text>
              <Text style={styles.shiftsSubtitle}>QR ile giriş/çıkış kayıtları</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textDisabled} />
        </TouchableOpacity>

        {/* Kazançlarım Butonu */}
        <TouchableOpacity
          style={styles.shiftsButton}
          activeOpacity={0.7}
          onPress={() => setShowEarnings(true)}
        >
          <View style={styles.shiftsLeft}>
            <View style={[styles.shiftsIcon, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="cash-outline" size={22} color="#22c55e" />
            </View>
            <View>
              <Text style={styles.shiftsTitle}>Kazançlarım</Text>
              <Text style={styles.shiftsSubtitle}>Maaş ve komisyon detayları</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textDisabled} />
        </TouchableOpacity>

        {/* Bugün izinli banner */}
        {isOnLeave && (
          <View style={styles.leaveBanner}>
            <Ionicons name="checkmark-circle" size={24} color="#fff" />
            <Text style={styles.leaveBannerText}>Bugün İzinlisiniz</Text>
          </View>
        )}

        {/* İzinlerim */}
        <LeaveCard hireDate={user.hireDate} leaveInfo={leaveInfo} />

        {/* İzin Geçmişim */}
        {myLeaves.length > 0 && (
          <AppCard style={styles.leaveCard}>
            <Text style={styles.leaveTitle}>İzin Geçmişim</Text>
            <View style={styles.divider} />
            {myLeaves.slice(0, 15).map((leave) => (
              <View key={leave.id} style={styles.leaveHistoryRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.leaveHistoryType}>
                    {{ weekly: 'Haftalık', annual: 'Yıllık', daily: 'Günlük', unpaid: 'Ücretsiz' }[leave.leaveType] || leave.leaveType}
                    {' · '}
                    {leave.startDate === leave.endDate
                      ? leave.startDate
                      : `${leave.startDate} → ${leave.endDate}`}
                    {' · '}
                    {leave.durationDays} gün
                  </Text>
                  {leave.note ? <Text style={styles.leaveHistoryNote} numberOfLines={1}>{leave.note}</Text> : null}
                </View>
                <StatusChip
                  label={
                    { approved: 'Onaylı', pending: 'Beklemede', cancelled: 'İptal', rejected: 'Reddedildi' }[leave.status] || leave.status
                  }
                  color={
                    leave.status === 'approved' ? '#22C55E' : leave.status === 'cancelled' ? '#EF4444' : '#F59E0B'
                  }
                />
              </View>
            ))}
          </AppCard>
        )}

        {/* Çalışma Durumu */}
        {workInfo && (
          <AppCard style={styles.leaveCard}>
            <Text style={styles.leaveTitle}>Çalışma Durumu</Text>
            <View style={styles.divider} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 24, fontWeight: '800', color: colors.primary }}>{workInfo.total}</Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>Çalıştığı Gün</Text>
              </View>
              <View style={{ width: 1, backgroundColor: colors.border }} />
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 24, fontWeight: '800', color: '#22c55e' }}>{workInfo.weeklyEarned}</Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>Kazanılan İzin</Text>
              </View>
              <View style={{ width: 1, backgroundColor: colors.border }} />
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 24, fontWeight: '800', color: workInfo.weeklyRemaining > 0 ? '#f59e0b' : colors.textDisabled }}>{workInfo.weeklyRemaining}</Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>Kalan H. İzin</Text>
              </View>
            </View>
          </AppCard>
        )}

        {/* Menü öğeleri */}
        <AppCard style={styles.menuCard}>
          <MenuItem icon="notifications-outline" label="Bildirimler" />
          <View style={styles.divider} />
          <MenuItem icon="settings-outline" label="Ayarlar" />
          <View style={styles.divider} />
          <MenuItem icon="help-circle-outline" label="Yardım" />
        </AppCard>

        {/* Çıkış butonu */}
        <AppButton
          title="Çıkış Yap"
          onPress={handleLogout}
          variant="danger"
          icon="log-out-outline"
          style={styles.logoutButton}
        />

        {/* Versiyon */}
        <Text style={styles.version}>{APP_NAME} Mobile v1.0</Text>
      </ScrollView>

      {/* Mesailerim Modal */}
      <Modal
        visible={showShifts}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowShifts(false)}
      >
        <ShiftsScreen onClose={() => setShowShifts(false)} />
      </Modal>

      {/* Kazançlarım Modal */}
      <Modal
        visible={showEarnings}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEarnings(false)}
      >
        <EarningsScreen onClose={() => setShowEarnings(false)} />
      </Modal>
    </View>
  );
};

/** Bilgi satırı bileşeni */
const InfoRow: React.FC<InfoRowProps> = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoLeft}>
      <Ionicons name={icon} size={20} color={colors.textSecondary} />
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

/** İzin bilgi kartı bileşeni */
const LeaveCard: React.FC<LeaveCardProps> = ({ hireDate, leaveInfo }) => {
  const annualEntitlement = leaveInfo?.entitlement ?? calculateAnnualLeave(hireDate);
  const yearsOfService = getYearsOfService(hireDate);
  const usedLeave = leaveInfo?.used ?? 0;
  const remainingLeave = leaveInfo?.remaining ?? Math.max(0, annualEntitlement - usedLeave);

  return (
    <AppCard style={styles.leaveCard}>
      <View style={styles.leaveTitleRow}>
        <Ionicons name="calendar-outline" size={20} color={colors.primary} />
        <Text style={styles.leaveTitle}>İzinlerim</Text>
      </View>

      {/* Kıdem */}
      <View style={styles.leaveRow}>
        <Text style={styles.leaveLabel}>Kıdem Süresi</Text>
        <Text style={styles.leaveValue}>
          {Math.floor(yearsOfService)} yıl {Math.round((yearsOfService % 1) * 12)} ay
        </Text>
      </View>

      <View style={styles.divider} />

      {/* Yıllık İzin */}
      <View style={styles.leaveRow}>
        <Text style={styles.leaveLabel}>Yıllık İzin Hakkı</Text>
        <Text style={styles.leaveValue}>
          {annualEntitlement > 0 ? `${annualEntitlement} gün` : 'Henüz hak kazanılmadı'}
        </Text>
      </View>

      {annualEntitlement > 0 && (
        <>
          <View style={styles.leaveBarContainer}>
            <View style={styles.leaveBar}>
              <View
                style={[
                  styles.leaveBarFill,
                  {
                    width: `${annualEntitlement > 0 ? (usedLeave / annualEntitlement) * 100 : 0}%`,
                    backgroundColor: remainingLeave <= 2 ? colors.error : colors.primary,
                  },
                ]}
              />
            </View>
          </View>
          <View style={styles.leaveStats}>
            <Text style={styles.leaveStat}>{usedLeave} kullanıldı</Text>
            <Text style={styles.leaveStat}>{remainingLeave} kalan</Text>
          </View>
        </>
      )}

      <View style={styles.divider} />

      {/* Haftalık İzin */}
      <View style={styles.leaveRow}>
        <Text style={styles.leaveLabel}>Haftalık İzin</Text>
        <Text style={styles.leaveValue}>Haftada 1 gün</Text>
      </View>
    </AppCard>
  );
};

/** Menü öğesi bileşeni */
const MenuItem: React.FC<MenuItemProps> = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} disabled={!onPress}>
    <View style={styles.infoLeft}>
      <Ionicons name={icon} size={20} color={colors.textSecondary} />
      <Text style={styles.menuLabel}>{label}</Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  leaveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  leaveBannerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: 60,
    paddingBottom: spacing.xxl,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.textWhite,
  },
  name: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  roleBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  roleText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  infoCard: {
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginLeft: 12,
  },
  infoValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
  },
  shiftsButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  shiftsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shiftsIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shiftsTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  shiftsSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  leaveCard: {
    marginBottom: spacing.md,
  },
  leaveTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  leaveTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
    marginLeft: 8,
  },
  leaveRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  leaveLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  leaveValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  leaveBarContainer: {
    marginVertical: 6,
  },
  leaveBar: {
    height: 8,
    backgroundColor: colors.divider,
    borderRadius: 4,
    overflow: 'hidden',
  },
  leaveBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  leaveStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  leaveStat: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  menuCard: {
    marginBottom: spacing.lg,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  menuLabel: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    marginLeft: 12,
  },
  logoutButton: {
    marginBottom: spacing.lg,
  },
  version: {
    textAlign: 'center',
    fontSize: fontSize.xs,
    color: colors.textDisabled,
  },
  leaveHistoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  leaveHistoryType: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  leaveHistoryNote: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
});

export default ProfileScreen;
