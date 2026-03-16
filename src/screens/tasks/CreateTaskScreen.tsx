/**
 * CreateTaskScreen — Görev Oluşturma Ekranı
 *
 * Müdür/patron yeni görev oluşturur ve çalışanlara atar.
 * Alt çalışanlar API'den çekilir (subordinates endpoint).
 * Birden fazla çalışan seçilebilir (checkbox).
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

import { AppInput, AppButton } from '../../components/common';
import useAuth from '../../hooks/useAuth';
import { staffApi, tasksApi } from '../../services/api';
import type { ApiEmployee } from '../../services/api';

const PRIORITIES = [
  { value: 'low', label: 'Düşük', color: '#4CAF50', icon: 'arrow-down-outline' as const },
  { value: 'medium', label: 'Normal', color: '#FF9800', icon: 'remove-outline' as const },
  { value: 'high', label: 'Yüksek', color: '#F44336', icon: 'arrow-up-outline' as const },
  { value: 'urgent', label: 'Acil', color: '#9C27B0', icon: 'alert-outline' as const },
];

interface CreateTaskScreenProps {
  onClose: () => void;
}

const CreateTaskScreen: React.FC<CreateTaskScreenProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [subordinates, setSubordinates] = useState<ApiEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* Tüm aktif çalışanları getir (kendisi hariç) */
  useEffect(() => {
    if (!user) return;
    staffApi.getAll({ status: 'active' })
      .then((all) => setSubordinates(all.filter((e) => e.id !== user.id)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const toggleEmployee = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Hata', 'Görev başlığı zorunludur');
      return;
    }
    if (selectedIds.length === 0) {
      Alert.alert('Hata', 'En az bir çalışan seçmelisiniz');
      return;
    }
    if (!user) return;

    setSaving(true);
    try {
      await tasksApi.create({
        title: title.trim(),
        description: description.trim(),
        createdById: user.id,
        assigneeIds: selectedIds,
        priority,
      });
      Alert.alert('Başarılı', 'Görev oluşturuldu', [{ text: 'Tamam', onPress: onClose }]);
    } catch (err) {
      Alert.alert('Hata', 'Görev oluşturulamadı');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Görev Oluştur</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Başlık */}
        <AppInput
          label="Görev Başlığı *"
          value={title}
          onChangeText={setTitle}
          placeholder="Örn: Oda 301 temizliği"
        />

        {/* Açıklama */}
        <AppInput
          label="Açıklama"
          value={description}
          onChangeText={setDescription}
          placeholder="Detaylı açıklama..."
          multiline
          numberOfLines={3}
        />

        {/* Öncelik */}
        <Text style={styles.sectionTitle}>Öncelik</Text>
        <View style={styles.priorityRow}>
          {PRIORITIES.map((p) => (
            <TouchableOpacity
              key={p.value}
              style={[
                styles.priorityChip,
                priority === p.value && { backgroundColor: p.color, borderColor: p.color },
              ]}
              onPress={() => setPriority(p.value)}
            >
              <Ionicons
                name={p.icon}
                size={14}
                color={priority === p.value ? '#fff' : p.color}
              />
              <Text
                style={[
                  styles.priorityText,
                  priority === p.value && { color: '#fff' },
                ]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Çalışan seçimi */}
        <Text style={styles.sectionTitle}>
          Atanacak Çalışanlar ({selectedIds.length} seçili)
        </Text>

        {loading ? (
          <ActivityIndicator size="small" color="#1565C0" style={{ marginTop: 12 }} />
        ) : subordinates.length === 0 ? (
          <Text style={styles.emptyText}>Alt çalışan bulunamadı</Text>
        ) : (
          subordinates.map((emp) => {
            const isSelected = selectedIds.includes(emp.id);
            return (
              <TouchableOpacity
                key={emp.id}
                style={[styles.employeeRow, isSelected && styles.employeeRowSelected]}
                onPress={() => toggleEmployee(emp.id)}
              >
                <Ionicons
                  name={isSelected ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={isSelected ? '#1565C0' : '#999'}
                />
                <View style={styles.employeeInfo}>
                  <Text style={styles.employeeName}>{emp.fullName}</Text>
                  <Text style={styles.employeeRoles}>
                    {emp.roleLabels?.join(', ') || emp.roles?.join(', ')}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Kaydet */}
        <View style={{ marginTop: 24 }}>
          <AppButton
            title={saving ? 'Oluşturuluyor...' : 'Görev Oluştur'}
            onPress={handleSubmit}
            disabled={saving}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E0E0E0',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#212121' },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#333', marginTop: 20, marginBottom: 8 },
  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#fff',
  },
  priorityText: { fontSize: 12, fontWeight: '600', color: '#666' },
  employeeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, backgroundColor: '#fff', borderRadius: 10,
    marginBottom: 8, borderWidth: 1, borderColor: '#E0E0E0',
  },
  employeeRowSelected: { borderColor: '#1565C0', backgroundColor: '#E3F2FD' },
  employeeInfo: { flex: 1 },
  employeeName: { fontSize: 15, fontWeight: '600', color: '#212121' },
  employeeRoles: { fontSize: 12, color: '#666', marginTop: 2 },
  emptyText: { fontSize: 14, color: '#999', textAlign: 'center', marginTop: 12 },
});

export default CreateTaskScreen;
