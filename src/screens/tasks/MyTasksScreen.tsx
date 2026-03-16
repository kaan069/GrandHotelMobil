/**
 * MyTasksScreen — Görevlerim Ekranı
 *
 * Giriş yapan çalışana atanmış görevleri listeler.
 * Her görev kartında: başlık, açıklama, öncelik, oluşturan, durum.
 * "Tamamla" butonu ile görev tamamlanır.
 * Filtreleme: Bekleyen / Tamamlanan
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useAuth from '../../hooks/useAuth';
import { tasksApi } from '../../services/api';
import type { ApiTask } from '../../services/api';

const PRIORITY_COLORS: Record<string, string> = {
  low: '#4CAF50',
  medium: '#FF9800',
  high: '#F44336',
  urgent: '#9C27B0',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Düşük',
  medium: 'Normal',
  high: 'Yüksek',
  urgent: 'Acil',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Bekliyor',
  in_progress: 'Devam Ediyor',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
};

type FilterType = 'pending' | 'completed';

const MyTasksScreen: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('pending');

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    try {
      const data = await tasksApi.getAll({ assignee: user.id });
      setTasks(data);
    } catch (err) {
      console.error('Görevler yüklenemedi:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  const handleComplete = (taskId: number) => {
    if (!user) return;
    Alert.alert(
      'Görevi Tamamla',
      'Bu görevi tamamlandı olarak işaretlemek istiyor musunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Tamamla',
          onPress: async () => {
            try {
              await tasksApi.complete(taskId, { employeeId: user.id });
              fetchTasks();
            } catch (err) {
              Alert.alert('Hata', 'Görev tamamlanamadı');
            }
          },
        },
      ]
    );
  };

  /* Görevin bu kullanıcı tarafından tamamlanıp tamamlanmadığını kontrol et */
  const isCompletedByMe = (task: ApiTask): boolean => {
    if (!task.assignments || !user) return false;
    const myAssignment = task.assignments.find((a) => a.employeeId === user.id);
    return myAssignment?.isCompleted ?? false;
  };

  /* Filtrele */
  const filteredTasks = tasks.filter((task) => {
    if (filter === 'completed') return isCompletedByMe(task);
    return !isCompletedByMe(task);
  });

  const renderTask = ({ item }: { item: ApiTask }) => {
    const completed = isCompletedByMe(item);
    const priorityColor = PRIORITY_COLORS[item.priority] || '#999';

    return (
      <View style={[styles.card, completed && styles.cardCompleted]}>
        {/* Üst: Öncelik + Durum */}
        <View style={styles.cardHeader}>
          <View style={[styles.priorityBadge, { backgroundColor: priorityColor }]}>
            <Text style={styles.priorityText}>{PRIORITY_LABELS[item.priority] || item.priority}</Text>
          </View>
          <Text style={styles.statusText}>{STATUS_LABELS[item.status] || item.status}</Text>
        </View>

        {/* Başlık */}
        <Text style={[styles.title, completed && styles.titleCompleted]}>{item.title}</Text>

        {/* Açıklama */}
        {item.description ? (
          <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
        ) : null}

        {/* Alt bilgi */}
        <View style={styles.cardFooter}>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={14} color="#666" />
            <Text style={styles.infoText}>{item.createdByName}</Text>
          </View>
          {item.dueDate && (
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={14} color="#666" />
              <Text style={styles.infoText}>
                {new Date(item.dueDate).toLocaleDateString('tr-TR')}
              </Text>
            </View>
          )}
        </View>

        {/* Atanan kişiler */}
        {item.assigneeNames && (
          <Text style={styles.assignees}>
            <Ionicons name="people-outline" size={12} color="#999" /> {item.assigneeNames}
          </Text>
        )}

        {/* Tamamla butonu */}
        {!completed && (
          <TouchableOpacity
            style={styles.completeButton}
            onPress={() => handleComplete(item.id)}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
            <Text style={styles.completeButtonText}>Tamamla</Text>
          </TouchableOpacity>
        )}

        {completed && (
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.completedText}>Tamamlandı</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1565C0" />
        <Text style={styles.loadingText}>Görevler yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filtre */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'pending' && styles.filterActive]}
          onPress={() => setFilter('pending')}
        >
          <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>
            Bekleyen ({tasks.filter((t) => !isCompletedByMe(t)).length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'completed' && styles.filterActive]}
          onPress={() => setFilter('completed')}
        >
          <Text style={[styles.filterText, filter === 'completed' && styles.filterTextActive]}>
            Tamamlanan ({tasks.filter((t) => isCompletedByMe(t)).length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Görev listesi */}
      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderTask}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="clipboard-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>
              {filter === 'pending' ? 'Bekleyen görev yok' : 'Tamamlanan görev yok'}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 8, color: '#666' },
  emptyText: { marginTop: 12, color: '#999', fontSize: 15 },
  list: { padding: 16, paddingBottom: 32 },
  filterRow: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  filterButton: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F5F5F5', alignItems: 'center' },
  filterActive: { backgroundColor: '#1565C0' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#666' },
  filterTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  cardCompleted: { opacity: 0.7 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  priorityText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  statusText: { fontSize: 12, color: '#666' },
  title: { fontSize: 16, fontWeight: '700', color: '#212121', marginBottom: 4 },
  titleCompleted: { textDecorationLine: 'line-through', color: '#999' },
  description: { fontSize: 13, color: '#666', marginBottom: 8, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', gap: 16, marginBottom: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoText: { fontSize: 12, color: '#666' },
  assignees: { fontSize: 12, color: '#999', marginTop: 4 },
  completeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, backgroundColor: '#4CAF50', paddingVertical: 10, borderRadius: 8 },
  completeButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  completedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  completedText: { color: '#4CAF50', fontWeight: '600', fontSize: 13 },
});

export default MyTasksScreen;
