/**
 * CompanyScreen — Firma Yönetimi
 *
 * İki görünüm:
 *   1. Tümü — standart firma listesi + ekleme/silme
 *   2. Borçlu — bakiyesi olan firmalar (toplam, ödenen, bakiye)
 *
 * Firma detayında: firma bilgileri + kayıtlı misafirler
 * Borçlu firma detayında: borç özeti + rezervasyon listesi + folio kalemleri
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppCard, AppButton, AppInput, EmptyState, LoadingState } from '../../components/common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import useApi from '../../hooks/useApi';
import useAuth from '../../hooks/useAuth';
import { companiesApi } from '../../services/api';
import type { Company, Guest } from '../../utils/types';

interface CompanyScreenProps {
  onClose: () => void;
}

type FilterType = 'all' | 'debtors';

const formatCurrency = (amount: number): string =>
  `₺${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CompanyScreen: React.FC<CompanyScreenProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { data: companies, loading, refetch } = useApi(() => companiesApi.getAll());

  const [filter, setFilter] = useState<FilterType>('all');
  const [debtors, setDebtors] = useState<any[]>([]);
  const [debtorsLoading, setDebtorsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /* Detay state */
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyGuests, setCompanyGuests] = useState<Guest[]>([]);
  const [debtDetail, setDebtDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  /* Form state */
  const [showAddModal, setShowAddModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formTax, setFormTax] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [saving, setSaving] = useState(false);

  /* Borçlu firmaları yükle */
  const loadDebtors = async () => {
    setDebtorsLoading(true);
    try {
      const data = await companiesApi.getDebtors();
      setDebtors(data);
    } catch { setDebtors([]); }
    finally { setDebtorsLoading(false); }
  };

  useEffect(() => {
    if (filter === 'debtors') loadDebtors();
  }, [filter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (filter === 'all') await refetch();
    else await loadDebtors();
    setRefreshing(false);
  }, [filter, refetch]);

  /* Firma oluştur */
  const handleCreateCompany = async () => {
    if (!formName.trim()) { Alert.alert('Uyarı', 'Firma adı zorunludur.'); return; }
    setSaving(true);
    try {
      await companiesApi.create({
        name: formName.trim(),
        taxNumber: formTax.trim() || undefined,
        address: formAddress.trim() || undefined,
        phone: formPhone.trim() || undefined,
        email: formEmail.trim() || undefined,
      });
      setShowAddModal(false);
      setFormName(''); setFormTax(''); setFormAddress(''); setFormPhone(''); setFormEmail('');
      refetch();
      Alert.alert('Başarılı', 'Firma oluşturuldu.');
    } catch (err: any) { Alert.alert('Hata', err.message); }
    finally { setSaving(false); }
  };

  /* Firma detay (tüm firmalar) */
  const handleSelectCompany = async (company: Company) => {
    setSelectedCompany(company);
    setDebtDetail(null);
    setLoadingDetail(true);
    try {
      const guests = await companiesApi.getGuests(company.id);
      setCompanyGuests(guests);
    } catch { setCompanyGuests([]); }
    finally { setLoadingDetail(false); }
  };

  /* Borçlu firma detay */
  const handleSelectDebtor = async (debtor: any) => {
    setSelectedCompany({ id: debtor.id, name: debtor.name, taxNumber: debtor.taxNumber, phone: debtor.phone, email: debtor.email, address: null });
    setLoadingDetail(true);
    try {
      const detail = await companiesApi.getDebtDetail(debtor.id);
      setDebtDetail(detail);
      setCompanyGuests([]);
    } catch { setDebtDetail(null); }
    finally { setLoadingDetail(false); }
  };

  /* Firma sil */
  const handleDeleteCompany = (company: Company) => {
    Alert.alert('Firma Sil', `"${company.name}" silinsin mi?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive',
        onPress: async () => {
          try { await companiesApi.delete(company.id); setSelectedCompany(null); refetch(); }
          catch (err: any) { Alert.alert('Hata', err.message); }
        },
      },
    ]);
  };

  /* Ödeme ekle — borç kapat */
  const handleAddPayment = (rezId: number, rezRoomNumber: string, rezBalance: number) => {
    Alert.prompt(
      'Ödeme Ekle',
      `Oda ${rezRoomNumber} — Bakiye: ${formatCurrency(rezBalance)}\nÖdeme tutarını girin:`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Ödeme Yap',
          onPress: async (value) => {
            const amount = parseFloat(value || '0');
            if (amount <= 0) { Alert.alert('Hata', 'Geçerli bir tutar girin'); return; }
            try {
              await companiesApi.addPayment(selectedCompany!.id, {
                reservationId: rezId,
                amount,
                description: 'Firma ödemesi',
                staffName: user?.name || '',
              });
              Alert.alert('Başarılı', `${formatCurrency(amount)} ödeme kaydedildi.`);
              // Detayı yenile
              const detail = await companiesApi.getDebtDetail(selectedCompany!.id);
              setDebtDetail(detail);
            } catch (err: any) {
              Alert.alert('Hata', err.message || 'Ödeme yapılamadı');
            }
          },
        },
      ],
      'plain-text',
      '',
      'decimal-pad'
    );
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  /* ── Yükleniyor ── */
  if (loading && !companies && filter === 'all') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={28} color={colors.textPrimary} /></TouchableOpacity>
          <Text style={styles.title}>Firma Yönetimi</Text>
          <View style={{ width: 28 }} />
        </View>
        <LoadingState message="Firmalar yükleniyor..." />
      </View>
    );
  }

  /* ── Firma / Borç Detay Görünümü ── */
  if (selectedCompany) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setSelectedCompany(null); setDebtDetail(null); }}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>{selectedCompany.name}</Text>
          <TouchableOpacity onPress={() => handleDeleteCompany(selectedCompany)}>
            <Ionicons name="trash-outline" size={22} color={colors.error} />
          </TouchableOpacity>
        </View>

        {loadingDetail ? (
          <LoadingState message="Detaylar yükleniyor..." />
        ) : (
          <ScrollView contentContainerStyle={styles.detailContent}>
            {/* Firma bilgileri */}
            <AppCard style={styles.card}>
              <View style={styles.sectionHeader}>
                <Ionicons name="business" size={20} color={colors.primary} />
                <Text style={styles.sectionTitle}>Firma Bilgileri</Text>
              </View>
              {selectedCompany.taxNumber && <Text style={styles.infoRow}>Vergi No: {selectedCompany.taxNumber}</Text>}
              {selectedCompany.phone && <Text style={styles.infoRow}>Telefon: {selectedCompany.phone}</Text>}
              {selectedCompany.email && <Text style={styles.infoRow}>E-posta: {selectedCompany.email}</Text>}
            </AppCard>

            {/* ── Borç detayı (borçlu firma seçildiyse) ── */}
            {debtDetail && (
              <>
                {/* Borç özeti */}
                <AppCard style={[styles.card, { borderLeftWidth: 4, borderLeftColor: colors.error }]}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="alert-circle" size={20} color={colors.error} />
                    <Text style={styles.sectionTitle}>Borç Durumu</Text>
                  </View>
                  <View style={styles.debtSummaryRow}>
                    <View style={styles.debtItem}>
                      <Text style={styles.debtLabel}>Toplam</Text>
                      <Text style={styles.debtValue}>{formatCurrency(Number(debtDetail.summary.totalAmount))}</Text>
                    </View>
                    <View style={styles.debtItem}>
                      <Text style={styles.debtLabel}>Ödenen</Text>
                      <Text style={[styles.debtValue, { color: colors.success }]}>{formatCurrency(Number(debtDetail.summary.paidAmount))}</Text>
                    </View>
                    <View style={styles.debtItem}>
                      <Text style={styles.debtLabel}>Bakiye</Text>
                      <Text style={[styles.debtValue, { color: colors.error, fontSize: fontSize.xl }]}>
                        {formatCurrency(Number(debtDetail.summary.balance))}
                      </Text>
                    </View>
                  </View>
                </AppCard>

                {/* Rezervasyonlar */}
                <View style={styles.sectionHeader}>
                  <Ionicons name="bed" size={20} color={colors.primary} />
                  <Text style={styles.sectionTitle}>Konaklamalar ({debtDetail.reservations.length})</Text>
                </View>
                {debtDetail.reservations.map((rez: any) => (
                  <AppCard key={rez.id} style={styles.card}>
                    <View style={styles.rezHeader}>
                      <View style={styles.roomBadge}>
                        <Text style={styles.roomBadgeText}>{rez.roomNumber}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: rez.isActive ? colors.success + '20' : colors.textDisabled + '20' }]}>
                        <Text style={[styles.statusText, { color: rez.isActive ? colors.success : colors.textDisabled }]}>
                          {rez.isActive ? 'Aktif' : 'Tamamlandı'}
                        </Text>
                      </View>
                    </View>
                    {rez.guestNames && <Text style={styles.rezGuest}>{rez.guestNames}</Text>}
                    <Text style={styles.rezDate}>
                      {formatDate(rez.checkIn)} → {formatDate(rez.checkOut)}
                    </Text>
                    <View style={styles.rezAmounts}>
                      <Text style={styles.rezAmountLabel}>Tutar: {formatCurrency(Number(rez.totalAmount))}</Text>
                      <Text style={styles.rezAmountLabel}>Ödenen: {formatCurrency(Number(rez.paidAmount))}</Text>
                      {Number(rez.balance) > 0 && (
                        <Text style={[styles.rezAmountLabel, { color: colors.error, fontWeight: '700' }]}>
                          Bakiye: {formatCurrency(Number(rez.balance))}
                        </Text>
                      )}
                    </View>
                    {/* Folio kalemleri */}
                    {rez.folioItems.length > 0 && (
                      <View style={styles.folioSection}>
                        {rez.folioItems.map((f: any) => (
                          <View key={f.id} style={styles.folioRow}>
                            <Text style={styles.folioDesc} numberOfLines={1}>{f.description}</Text>
                            <Text style={styles.folioAmount}>{formatCurrency(f.amount)}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {/* Ödeme butonu — bakiye varsa göster */}
                    {Number(rez.balance) > 0 && (
                      <AppButton
                        title="Ödeme Ekle"
                        icon="cash-outline"
                        variant="outline"
                        onPress={() => handleAddPayment(rez.id, rez.roomNumber, Number(rez.balance))}
                        style={{ marginTop: spacing.sm }}
                      />
                    )}
                  </AppCard>
                ))}
              </>
            )}

            {/* ── Normal firma detayı (misafirler) ── */}
            {!debtDetail && (
              <AppCard style={styles.card}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="people" size={20} color={colors.primary} />
                  <Text style={styles.sectionTitle}>Kayıtlı Misafirler ({companyGuests.length})</Text>
                </View>
                {companyGuests.length > 0 ? (
                  companyGuests.map((guest) => (
                    <View key={guest.id} style={styles.guestRow}>
                      <Ionicons name="person-circle-outline" size={28} color={colors.primary} />
                      <View style={styles.guestInfo}>
                        <Text style={styles.guestName}>{guest.firstName} {guest.lastName}</Text>
                        <Text style={styles.guestDetail}>TC: {guest.tcNo} · {guest.phone}</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>Bu firmaya kayıtlı misafir yok</Text>
                )}
              </AppCard>
            )}
          </ScrollView>
        )}
      </View>
    );
  }

  /* ── Ana Liste Görünümü ── */
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Firma Yönetimi</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)}>
          <Ionicons name="add-circle" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Filtre chip'leri */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>Tümü</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'debtors' && styles.filterChipDebtActive]}
          onPress={() => setFilter('debtors')}
        >
          <Ionicons name="alert-circle" size={14} color={filter === 'debtors' ? '#fff' : colors.error} />
          <Text style={[styles.filterText, filter === 'debtors' && styles.filterTextActive]}>
            Borçlu{debtors.length > 0 ? ` (${debtors.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Tüm Firmalar ── */}
      {filter === 'all' && (
        <FlatList
          data={companies || []}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          ListEmptyComponent={<EmptyState icon="business-outline" title="Henüz firma yok" />}
          renderItem={({ item }) => (
            <AppCard style={styles.companyCard} onPress={() => handleSelectCompany(item)}>
              <View style={styles.companyRow}>
                <View style={styles.companyIcon}>
                  <Ionicons name="business" size={24} color={colors.primary} />
                </View>
                <View style={styles.companyInfo}>
                  <Text style={styles.companyName}>{item.name}</Text>
                  {item.taxNumber && <Text style={styles.companyDetail}>VN: {item.taxNumber}</Text>}
                  {item.phone && <Text style={styles.companyDetail}>{item.phone}</Text>}
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textDisabled} />
              </View>
            </AppCard>
          )}
        />
      )}

      {/* ── Borçlu Firmalar ── */}
      {filter === 'debtors' && (
        debtorsLoading ? (
          <LoadingState message="Borçlu firmalar yükleniyor..." />
        ) : (
          <FlatList
            data={debtors}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
            ListEmptyComponent={<EmptyState icon="checkmark-circle-outline" title="Borçlu firma yok" description="Tüm firmalar bakiyesiz" />}
            renderItem={({ item }) => (
              <AppCard style={[styles.companyCard, { borderLeftWidth: 3, borderLeftColor: colors.error }]} onPress={() => handleSelectDebtor(item)}>
                <View style={styles.companyRow}>
                  <View style={[styles.companyIcon, { backgroundColor: colors.error + '15' }]}>
                    <Ionicons name="alert-circle" size={24} color={colors.error} />
                  </View>
                  <View style={styles.companyInfo}>
                    <Text style={styles.companyName}>{item.name}</Text>
                    <Text style={styles.companyDetail}>{item.reservationCount} rezervasyon · {item.activeReservations} aktif</Text>
                  </View>
                  <View style={styles.debtBadge}>
                    <Text style={styles.debtBadgeText}>{formatCurrency(Number(item.balance))}</Text>
                  </View>
                </View>
              </AppCard>
            )}
          />
        )
      )}

      {/* Yeni Firma Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent onRequestClose={() => setShowAddModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAddModal(false)}>
          <View style={styles.modalContainer} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Yeni Firma</Text>
              <View style={{ width: 24 }} />
            </View>
            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              <AppInput label="Firma Adı *" value={formName} onChangeText={setFormName} placeholder="Firma adını girin" icon="business-outline" />
              <AppInput label="Vergi Numarası" value={formTax} onChangeText={setFormTax} placeholder="Vergi numarası" icon="document-text-outline" keyboardType="number-pad" />
              <AppInput label="Adres" value={formAddress} onChangeText={setFormAddress} placeholder="Firma adresi" icon="location-outline" multiline />
              <AppInput label="Telefon" value={formPhone} onChangeText={setFormPhone} placeholder="0212 XXX XX XX" icon="call-outline" keyboardType="phone-pad" />
              <AppInput label="E-posta" value={formEmail} onChangeText={setFormEmail} placeholder="info@firma.com" icon="mail-outline" keyboardType="email-address" autoCapitalize="none" />
              <AppButton title="Firma Oluştur" onPress={handleCreateCompany} icon="checkmark-circle-outline" loading={saving} />
              <AppButton title="Vazgeç" onPress={() => setShowAddModal(false)} variant="outline" style={{ marginTop: spacing.sm }} />
            </ScrollView>
          </View>
        </TouchableOpacity>
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
  title: { flex: 1, textAlign: 'center', fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary },
  filterRow: {
    flexDirection: 'row', paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    gap: 8, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: borderRadius.full, backgroundColor: colors.divider,
  },
  filterChipActive: { backgroundColor: colors.primary },
  filterChipDebtActive: { backgroundColor: colors.error },
  filterText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '500' },
  filterTextActive: { color: colors.textWhite },
  list: { padding: spacing.md, paddingBottom: spacing.xxl },
  companyCard: { marginBottom: spacing.sm },
  companyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  companyIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center',
  },
  companyInfo: { flex: 1 },
  companyName: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  companyDetail: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  debtBadge: {
    backgroundColor: colors.error + '15', paddingHorizontal: 10, paddingVertical: 6, borderRadius: borderRadius.md,
  },
  debtBadgeText: { fontSize: fontSize.sm, fontWeight: '800', color: colors.error },
  /* Detay */
  detailContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  card: { marginBottom: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  infoRow: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: 6 },
  debtSummaryRow: { flexDirection: 'row', gap: spacing.sm },
  debtItem: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, backgroundColor: colors.divider, borderRadius: borderRadius.sm },
  debtLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: 4 },
  debtValue: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  rezHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  roomBadge: { backgroundColor: colors.primary + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: borderRadius.sm },
  roomBadgeText: { fontSize: fontSize.md, fontWeight: '800', color: colors.primary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.sm },
  statusText: { fontSize: fontSize.xs, fontWeight: '600' },
  rezGuest: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary, marginBottom: 4 },
  rezDate: { fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: 6 },
  rezAmounts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rezAmountLabel: { fontSize: fontSize.xs, color: colors.textSecondary },
  folioSection: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider },
  folioRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  folioDesc: { flex: 1, fontSize: fontSize.xs, color: colors.textSecondary },
  folioAmount: { fontSize: fontSize.xs, fontWeight: '600', color: colors.textPrimary },
  guestRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.divider },
  guestInfo: { flex: 1 },
  guestName: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary },
  guestDetail: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  emptyText: { fontSize: fontSize.sm, color: colors.textDisabled, textAlign: 'center', paddingVertical: spacing.md, fontStyle: 'italic' },
  /* Modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: colors.background, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, maxHeight: '90%' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary },
  modalForm: { padding: spacing.md },
});

export default CompanyScreen;
