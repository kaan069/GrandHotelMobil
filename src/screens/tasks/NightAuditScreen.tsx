/**
 * NightAuditScreen — Gün Sonu İşlemi (Mobil)
 *
 * Web'deki NightAuditDialog'un mobil karşılığı.
 * Adımlar:
 * 1. Önizleme — konaklayan odalar + no-show listesi
 * 2. No-show iptal
 * 3. Gün sonu uygula → oda ücretleri folio'ya yazılır
 * 4. Sonuç özeti
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppButton } from '../../components/common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { kazancApi } from '../../services/api';
import useAuth from '../../hooks/useAuth';

interface Props {
  onClose: () => void;
}

interface OccupiedRoom {
  roomNumber: string;
  guestName: string;
  price: number;
  nights: number;
}

interface NoShowRoom {
  roomNumber: string;
  guestName: string;
  reservationId: number;
  checkIn: string;
}

type Step = 'preview' | 'result';

const NightAuditScreen: React.FC<Props> = ({ onClose }) => {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('preview');
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);

  // Önizleme verileri
  const [occupiedRooms, setOccupiedRooms] = useState<OccupiedRoom[]>([]);
  const [noShowRooms, setNoShowRooms] = useState<NoShowRoom[]>([]);
  const [totalCharge, setTotalCharge] = useState(0);
  const [noShowStatus, setNoShowStatus] = useState<Record<number, string>>({});
  const [alreadyProcessed, setAlreadyProcessed] = useState(false);

  // Sonuç
  const [result, setResult] = useState<{ processedRooms: number; totalCharged: number; noShowCount: number } | null>(null);

  useEffect(() => {
    loadPreview();
  }, []);

  const loadPreview = async () => {
    setLoading(true);
    try {
      const data = await kazancApi.nightAuditPreview();
      setOccupiedRooms(data.occupiedRooms || []);
      setNoShowRooms(data.noShowRooms || []);
      setTotalCharge(data.totalCharge || 0);
      setAlreadyProcessed(data.alreadyProcessed || false);
    } catch {
      Alert.alert('Hata', 'Gün sonu verileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  // Tüm no-show'ları toplu iptal
  const handleCancelAllNoShows = async () => {
    const pending = noShowRooms.filter(r => noShowStatus[r.reservationId] !== 'cancelled');
    if (pending.length === 0) return;
    Alert.alert('Toplu İptal', `${pending.length} rezervasyonu iptal etmek istediğinize emin misiniz?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Tümünü İptal Et', style: 'destructive',
        onPress: async () => {
          for (const room of pending) {
            setNoShowStatus(prev => ({ ...prev, [room.reservationId]: 'cancelling' }));
            try {
              await kazancApi.cancelNoShow(room.reservationId);
              setNoShowStatus(prev => ({ ...prev, [room.reservationId]: 'cancelled' }));
            } catch {
              setNoShowStatus(prev => ({ ...prev, [room.reservationId]: 'error' }));
            }
          }
        },
      },
    ]);
  };

  const handleCancelNoShow = async (room: NoShowRoom) => {
    setNoShowStatus(prev => ({ ...prev, [room.reservationId]: 'cancelling' }));
    try {
      await kazancApi.cancelNoShow(room.reservationId);
      setNoShowStatus(prev => ({ ...prev, [room.reservationId]: 'cancelled' }));
    } catch {
      setNoShowStatus(prev => ({ ...prev, [room.reservationId]: 'error' }));
    }
  };

  const handleExecute = () => {
    if (alreadyProcessed) {
      Alert.alert('Uyarı', 'Bugün için gün sonu işlemi zaten yapılmış. Tekrar çalıştırmak ücretleri mükerrer yansıtır.');
      return;
    }
    Alert.alert(
      'Gün Sonu Uygula',
      `${occupiedRooms.length} odaya toplam ${fmt(totalCharge)} ₺ gecelik ücret yansıtılacak.\n\nDevam edilsin mi?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Uygula', style: 'destructive',
          onPress: async () => {
            setExecuting(true);
            try {
              const processedBy = user ? user.name : '';
              const data = await kazancApi.nightAuditExecute(processedBy);
              setResult({
                processedRooms: data.processedRooms || 0,
                totalCharged: data.totalCharged || 0,
                noShowCount: data.noShowCount || 0,
              });
              setStep('result');
            } catch {
              Alert.alert('Hata', 'Gün sonu işlemi başarısız');
            } finally {
              setExecuting(false);
            }
          },
        },
      ]
    );
  };

  const fmt = (n: number | undefined | null) => (n ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 0 });
  const today = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

  // Sonuç ekranı
  if (step === 'result' && result) {
    return (
      <View style={styles.container}>
        <Header onClose={onClose} />
        <View style={styles.resultContainer}>
          <View style={styles.resultIcon}>
            <Ionicons name="checkmark-circle" size={64} color="#22c55e" />
          </View>
          <Text style={styles.resultTitle}>Gün Sonu Tamamlandı</Text>
          <Text style={styles.resultDate}>{today}</Text>

          <View style={styles.resultCard}>
            <ResultRow label="İşlenen Oda" value={`${result.processedRooms} oda`} />
            <ResultRow label="Toplam Ücret" value={`${fmt(result.totalCharged)} ₺`} color={colors.primary} />
            {result.noShowCount > 0 && (
              <ResultRow label="No-Show" value={`${result.noShowCount} iptal`} color="#f59e0b" />
            )}
          </View>

          <AppButton title="Kapat" onPress={onClose} icon="close-circle-outline" style={{ marginTop: spacing.lg }} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header onClose={onClose} />

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Tarih */}
          <View style={styles.dateBand}>
            <Ionicons name="moon-outline" size={20} color="#fff" />
            <Text style={styles.dateText}>{today}</Text>
          </View>

          {/* Zaten işlenmiş uyarısı */}
          {alreadyProcessed && (
            <View style={{ backgroundColor: '#fef3c7', padding: 12, borderRadius: 8, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="warning" size={20} color="#f59e0b" />
              <Text style={{ color: '#92400e', fontSize: 13, fontWeight: '600', flex: 1 }}>
                Bugün için gün sonu işlemi zaten yapılmış.
              </Text>
            </View>
          )}

          {/* Konaklayan odalar */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="bed-outline" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Konaklayan Odalar ({occupiedRooms.length})</Text>
            </View>
            {occupiedRooms.map((room, i) => (
              <View key={i} style={styles.roomRow}>
                <Text style={styles.roomNum}>Oda {room.roomNumber}</Text>
                <Text style={styles.roomGuest} numberOfLines={1}>{room.guestName || '-'}</Text>
                <Text style={styles.roomRate}>{fmt(room.price)} ₺</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Toplam Gecelik Ücret</Text>
              <Text style={styles.totalValue}>{fmt(totalCharge)} ₺</Text>
            </View>
          </View>

          {/* No-show */}
          {noShowRooms.length > 0 && (
            <View style={styles.section}>
              <View style={[styles.sectionHeader, { justifyContent: 'space-between' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="alert-circle-outline" size={20} color="#f59e0b" />
                  <Text style={styles.sectionTitle}>Gelmeyen Misafirler ({noShowRooms.length})</Text>
                </View>
                {noShowRooms.filter(r => noShowStatus[r.reservationId] !== 'cancelled').length > 1 && (
                  <TouchableOpacity onPress={handleCancelAllNoShows} style={{ backgroundColor: '#ef4444', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>Tümünü İptal</Text>
                  </TouchableOpacity>
                )}
              </View>
              {noShowRooms.map((room, i) => {
                const status = noShowStatus[room.reservationId];
                return (
                  <View key={i} style={styles.noShowRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.roomNum}>Oda {room.roomNumber}</Text>
                      <Text style={styles.roomGuest}>{room.guestName}</Text>
                    </View>
                    {status === 'cancelled' ? (
                      <View style={styles.cancelledBadge}>
                        <Text style={styles.cancelledText}>İptal Edildi</Text>
                      </View>
                    ) : status === 'cancelling' ? (
                      <ActivityIndicator size="small" color="#f59e0b" />
                    ) : (
                      <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancelNoShow(room)}>
                        <Ionicons name="close-circle" size={16} color="#fff" />
                        <Text style={styles.cancelBtnText}>İptal Et</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Uygula butonu */}
          <AppButton
            title={executing ? 'İşleniyor...' : `Gün Sonu Uygula — ${fmt(totalCharge)} ₺`}
            onPress={handleExecute}
            icon="moon-outline"
            loading={executing}
            variant="danger"
            style={{ marginTop: spacing.md }}
          />

          <Text style={styles.warningText}>
            Bu işlem geri alınamaz. Tüm konaklayan odalara gecelik ücret folio'ya yazılacaktır.
          </Text>
        </ScrollView>
      )}
    </View>
  );
};

const Header: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <View style={styles.header}>
    <TouchableOpacity onPress={onClose} style={{ padding: spacing.xs }}>
      <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
    </TouchableOpacity>
    <Text style={styles.headerTitle}>Gün Sonu</Text>
    <View style={{ width: 24 }} />
  </View>
);

const ResultRow: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <View style={styles.resultRow}>
    <Text style={styles.resultLabel}>{label}</Text>
    <Text style={[styles.resultValue, color ? { color } : null]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.md, paddingBottom: 40 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary },
  dateBand: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1e293b', padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.md,
  },
  dateText: { color: '#fff', fontSize: fontSize.md, fontWeight: '600' },
  section: {
    backgroundColor: colors.card, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  roomRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  roomNum: { width: 70, fontSize: fontSize.sm, fontWeight: '700', color: colors.textPrimary },
  roomGuest: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary },
  roomRate: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing.sm, marginTop: spacing.xs,
    borderTopWidth: 2, borderTopColor: colors.border,
  },
  totalLabel: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  totalValue: { fontSize: fontSize.lg, fontWeight: '800', color: colors.primary },
  noShowRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#ef4444', paddingHorizontal: 10, paddingVertical: 5, borderRadius: borderRadius.full,
  },
  cancelBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  cancelledBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: borderRadius.full },
  cancelledText: { color: colors.textDisabled, fontSize: 12, fontWeight: '600' },
  warningText: {
    fontSize: fontSize.xs, color: colors.textDisabled, textAlign: 'center', marginTop: spacing.sm,
  },
  // Sonuç
  resultContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  resultIcon: { marginBottom: spacing.md },
  resultTitle: { fontSize: fontSize.xl, fontWeight: '800', color: colors.textPrimary },
  resultDate: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: 4, marginBottom: spacing.lg },
  resultCard: {
    backgroundColor: colors.card, borderRadius: borderRadius.md, padding: spacing.md, width: '100%',
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  resultLabel: { fontSize: fontSize.md, color: colors.textSecondary },
  resultValue: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
});

export default NightAuditScreen;
