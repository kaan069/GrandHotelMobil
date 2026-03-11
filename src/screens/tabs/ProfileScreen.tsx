/**
 * ProfileScreen - Profil Ekranı
 *
 * Kullanıcı bilgilerini ve çıkış butonunu gösterir.
 * Rol bilgisi, şube kodu ve personel numarası görüntülenir.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppCard, AppButton } from '../../components/common';
import useAuth from '../../hooks/useAuth';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { ROLE_LABELS, APP_NAME } from '../../utils/constants';
import { calculateAnnualLeave, getYearsOfService } from '../../utils/leaveCalculator';

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
}

const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();

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
const MenuItem: React.FC<MenuItemProps> = ({ icon, label }) => (
  <View style={styles.menuItem}>
    <View style={styles.infoLeft}>
      <Ionicons name={icon} size={20} color={colors.textSecondary} />
      <Text style={styles.menuLabel}>{label}</Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
  </View>
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
