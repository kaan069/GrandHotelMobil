/**
 * MealProgramScreen - Yemek Programı Ekranı
 *
 * Aşçı için günlük/haftalık yemek programı oluşturma.
 * Günler bazında öğle ve akşam yemekleri girilir.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppCard, AppInput, AppButton } from '../../components/common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

interface MealDay {
  lunch: string;
  dinner: string;
}

type MealProgram = Record<string, MealDay>;

interface MealProgramScreenProps {
  onClose: () => void;
}

/** Haftanın günleri */
const DAYS: string[] = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

/** Mock yemek programı */
const INITIAL_PROGRAM: MealProgram = {
  Pazartesi: { lunch: 'Mercimek Çorbası, Tavuk Sote, Pilav', dinner: 'Karnıyarık, Cacık' },
  Salı: { lunch: 'Ezogelin Çorbası, Köfte, Makarna', dinner: 'İmam Bayıldı, Bulgur Pilavı' },
  Çarşamba: { lunch: '', dinner: '' },
  Perşembe: { lunch: '', dinner: '' },
  Cuma: { lunch: '', dinner: '' },
  Cumartesi: { lunch: '', dinner: '' },
  Pazar: { lunch: '', dinner: '' },
};

const MealProgramScreen: React.FC<MealProgramScreenProps> = ({ onClose }) => {
  const [program, setProgram] = useState<MealProgram>(INITIAL_PROGRAM);
  const [editingDay, setEditingDay] = useState<string | null>(null);

  /** Yemek programını güncelle */
  const handleUpdate = (day: string, meal: keyof MealDay, value: string) => {
    setProgram((prev) => ({
      ...prev,
      [day]: { ...prev[day], [meal]: value },
    }));
  };

  return (
    <View style={styles.container}>
      {/* Başlık */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Yemek Programı</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {DAYS.map((day) => {
          const isEditing = editingDay === day;
          const meals = program[day];
          const hasContent = meals.lunch || meals.dinner;

          return (
            <AppCard key={day} style={styles.dayCard}>
              <TouchableOpacity
                style={styles.dayHeader}
                onPress={() => setEditingDay(isEditing ? null : day)}
              >
                <View style={styles.dayLeft}>
                  <View style={[styles.dayDot, hasContent && styles.dayDotActive]} />
                  <Text style={styles.dayName}>{day}</Text>
                </View>
                <Ionicons
                  name={isEditing ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>

              {/* Yemek bilgisi (kapalı halde özet) */}
              {!isEditing && hasContent && (
                <View style={styles.mealSummary}>
                  {meals.lunch ? (
                    <Text style={styles.summaryText}>🍽 {meals.lunch}</Text>
                  ) : null}
                  {meals.dinner ? (
                    <Text style={styles.summaryText}>🌙 {meals.dinner}</Text>
                  ) : null}
                </View>
              )}

              {/* Düzenleme modu */}
              {isEditing && (
                <View style={styles.editSection}>
                  <AppInput
                    label="Öğle Yemeği"
                    value={meals.lunch}
                    onChangeText={(text: string) => handleUpdate(day, 'lunch', text)}
                    placeholder="Çorba, Ana yemek, Yan yemek..."
                    multiline
                  />
                  <AppInput
                    label="Akşam Yemeği"
                    value={meals.dinner}
                    onChangeText={(text: string) => handleUpdate(day, 'dinner', text)}
                    placeholder="Ana yemek, Yan yemek..."
                    multiline
                  />
                  <AppButton
                    title="Kaydet"
                    onPress={() => setEditingDay(null)}
                    icon="checkmark-outline"
                  />
                </View>
              )}
            </AppCard>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: 56,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  dayCard: {
    marginBottom: spacing.sm,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textDisabled,
    marginRight: 10,
  },
  dayDotActive: {
    backgroundColor: colors.success,
  },
  dayName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  mealSummary: {
    marginTop: spacing.sm,
    paddingLeft: 18,
  },
  summaryText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  editSection: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.md,
  },
});

export default MealProgramScreen;
