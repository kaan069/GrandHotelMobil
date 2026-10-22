/**
 * OptionPickerModal - Aramalı seçim listesi (alt sayfa)
 *
 * Alert.alert ile yapılan seçimler uzun listelerde (oda, firma, acente) taşar
 * ve aranamaz. Bu bileşen aynı işi kaydırılabilir + aranabilir listeyle yapar.
 *
 * Kullanım:
 *   <OptionPickerModal
 *     visible={open} title="Acente Seçin"
 *     options={[{ value: null, label: 'Acente yok' }, ...agencies.map(a => ({ value: a.id, label: a.name }))]}
 *     selectedValue={agencyId}
 *     onSelect={(v) => setAgencyId(v)}
 *     onClose={() => setOpen(false)}
 *   />
 */

import { useEffect, useMemo, useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AppInput from './AppInput';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

export interface PickerOption<T> {
  value: T;
  label: string;
  sublabel?: string;
  disabled?: boolean;
}

interface OptionPickerModalProps<T> {
  visible: boolean;
  title: string;
  options: PickerOption<T>[];
  selectedValue?: T;
  onSelect: (value: T) => void;
  onClose: () => void;
  /** Varsayılan: 8'den fazla seçenek varsa arama kutusu görünür */
  searchable?: boolean;
  emptyText?: string;
}

function OptionPickerModal<T extends string | number | null>({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
  searchable,
  emptyText = 'Seçenek bulunamadı',
}: OptionPickerModalProps<T>) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (visible) setQuery('');
  }, [visible]);

  const showSearch = searchable ?? options.length > 8;
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr');
    if (!q) return options;
    return options.filter((o) =>
      `${o.label} ${o.sublabel || ''}`.toLocaleLowerCase('tr').includes(q));
  }, [options, query]);

  const renderItem = ({ item }: { item: PickerOption<T> }) => {
    const selected = item.value === selectedValue;
    return (
      <TouchableOpacity
        style={[styles.item, selected && styles.itemSelected, item.disabled && styles.itemDisabled]}
        disabled={item.disabled}
        onPress={() => { onSelect(item.value); onClose(); }}
        activeOpacity={0.7}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.itemLabel, selected && { color: colors.primary }]}>{item.label}</Text>
          {!!item.sublabel && <Text style={styles.itemSub}>{item.sublabel}</Text>}
        </View>
        {selected && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.container} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            <View style={{ width: 24 }} />
          </View>
          {showSearch && (
            <View style={styles.search}>
              <AppInput value={query} onChangeText={setQuery} placeholder="Ara..." icon="search-outline" style={{ marginBottom: 0 }} />
            </View>
          )}
          <FlatList
            data={filtered}
            keyExtractor={(item, i) => `${String(item.value)}-${i}`}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Text style={styles.empty}>{emptyText}</Text>}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
    minHeight: '40%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { flex: 1, textAlign: 'center', fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary },
  search: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  list: { padding: spacing.md, paddingBottom: spacing.xxl },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  itemSelected: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
  itemDisabled: { opacity: 0.45 },
  itemLabel: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary },
  itemSub: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  empty: { textAlign: 'center', color: colors.textDisabled, paddingVertical: spacing.xl, fontSize: fontSize.sm },
});

export default OptionPickerModal;
