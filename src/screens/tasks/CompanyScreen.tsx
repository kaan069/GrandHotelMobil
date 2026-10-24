/**
 * CompanyScreen — Firma Yönetimi
 *
 * İki görünüm:
 *   1. Tümü — standart firma listesi + ekleme/silme
 *   2. Borçlu — cari bakiyesi > 0 olan firmalar (cari defter; Borçlular ekranıyla aynı kaynak)
 *
 * Firma detayında: firma bilgileri + açık borç kutucukları (konaklama başına, seçip tahsilat) +
 * cari hesap ekstresi (geçmiş, avans tahsilatı, iptal) + kayıtlı misafirler
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
import CariStatement from '../../components/cari/CariStatement';
import DebtCards from '../../components/cari/DebtCards';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import useApi from '../../hooks/useApi';
import { companiesApi } from '../../services/api';
import type { CariDebtorRow } from '../../services/api';
import type { Company, Guest } from '../../utils/types';

interface CompanyScreenProps {
  onClose: () => void;
}

type FilterType = 'all' | 'debtors';

const formatCurrency = (amount: number): string =>
  `₺${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CompanyScreen: React.FC<CompanyScreenProps> = ({ onClose }) => {
  const { data: companies, loading, refetch } = useApi(() => companiesApi.getAll());

  const [filter, setFilter] = useState<FilterType>('all');
  const [debtors, setDebtors] = useState<CariDebtorRow[]>([]);
  const [debtorsLoading, setDebtorsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /* Detay state */
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyGuests, setCompanyGuests] = useState<Guest[]>([]);
  const [loadingGuests, setLoadingGuests] = useState(false);
  /* Borç kutucukları ve ekstre: biri değişince diğeri yeniden yüklenir */
  const [debtsReload, setDebtsReload] = useState(0);
  const [statementReload, setStatementReload] = useState(0);

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

  /* Firma detay — cari ekstreyi CariStatement kendisi yükler */
  const handleSelectCompany = async (company: Company) => {
    setSelectedCompany(company);
    setCompanyGuests([]);
    setLoadingGuests(true);
    try {
      setCompanyGuests(await companiesApi.getGuests(company.id));
    } catch { setCompanyGuests([]); }
    finally { setLoadingGuests(false); }
  };

  const handleSelectDebtor = (debtor: CariDebtorRow) => {
    const company = companies?.find((c) => c.id === debtor.id);
    handleSelectCompany(company || {
      id: debtor.id, name: debtor.name, taxNumber: debtor.taxNumber, phone: debtor.phone,
      email: debtor.email, address: debtor.address ?? null,
    });
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
          <TouchableOpacity onPress={() => setSelectedCompany(null)}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>{selectedCompany.name}</Text>
          <TouchableOpacity onPress={() => handleDeleteCompany(selectedCompany)}>
            <Ionicons name="trash-outline" size={22} color={colors.error} />
          </TouchableOpacity>
        </View>

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

          {/* Açık borçlar — konaklama başına kutucuk, seçip tahsilat */}
          <DebtCards
            target={{ company: selectedCompany.id }}
            reloadToken={debtsReload}
            onChanged={() => { setStatementReload((t) => t + 1); if (filter === 'debtors') loadDebtors(); }}
          />

          {/* Cari hesap ekstresi (geçmiş, avans tahsilatı, iptal) */}
          <CariStatement
            kind="company"
            partyId={selectedCompany.id}
            reloadToken={statementReload}
            onChanged={() => { setDebtsReload((t) => t + 1); if (filter === 'debtors') loadDebtors(); }}
          />

          {/* Kayıtlı misafirler */}
          <AppCard style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Kayıtlı Misafirler ({companyGuests.length})</Text>
            </View>
            {loadingGuests ? (
              <Text style={styles.emptyText}>Yükleniyor...</Text>
            ) : companyGuests.length > 0 ? (
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
        </ScrollView>
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
                    <Text style={styles.companyDetail}>
                      {item.openCount} açık borç{item.activeReservations > 0 ? ` · ${item.activeReservations} konaklayan` : ''}
                    </Text>
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
