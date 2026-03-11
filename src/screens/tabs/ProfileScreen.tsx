/**
 * ProfileScreen - Profil Ekranı
 *
 * Kullanıcı bilgilerini ve çıkış butonunu gösterir.
 * Rol bilgisi, şube kodu ve personel numarası görüntülenir.
 * Mesailerim butonu ile QR okutarak kaydedilen mesai geçmişi görüntülenir.
 */

import React, { useState } from 'react';
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
import ShiftsScreen from '../tasks/ShiftsScreen';

interface InfoRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}

interface LeaveCardProps {
  hireDate: string;
}

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
}

const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const [showShifts, setShowShifts] = useState(false);

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
            <Text style={styles.roleText}>{ROLE_LABELS[user.role] || user.role}</Text>
          </View>
        </View>

        {/* Bilgi kartları */}
        <AppCard style={styles.infoCard}>
          <InfoRow icon="business-outline" label="Şube Kodu" value={user.branchCode} />
          <View style={styles.divider} />
          <InfoRow icon="card-outline" label="Personel No" value={user.staffNumber} />
          <View style={styles.divider} />
          <InfoRow icon="shield-checkmark-outline" label="Yetki" value={ROLE_LABELS[user.role]} />
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

        {/* İzinlerim */}
        <LeaveCard hireDate={user.hireDate} />

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
const LeaveCard: React.FC<LeaveCardProps> = ({ hireDate }) => {
  const annualEntitlement = calculateAnnualLeave(hireDate);
  const yearsOfService = getYearsOfService(hireDate);
  const usedLeave = 0; // Backend'den gelecek
  const remainingLeave = Math.max(0, annualEntitlement - usedLeave);

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
});

export default ProfileScreen;
