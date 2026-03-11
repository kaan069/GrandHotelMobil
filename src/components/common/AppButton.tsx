/**
 * AppButton - Uygulama genelinde kullanılan buton bileşeni
 *
 * Props:
 *   - title (string): Buton metni
 *   - onPress (function): Tıklama fonksiyonu
 *   - variant ('primary' | 'secondary' | 'outline' | 'danger'): Buton stili
 *   - loading (boolean): Yükleniyor durumu
 *   - disabled (boolean): Pasif durumu
 *   - icon (string): Ionicons ikon adı
 *   - style (object): Ek stil
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { borderRadius } from '../../theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger';

interface VariantStyle {
  bg: string;
  text: string;
  border?: string;
}

export interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}

const VARIANT_STYLES: Record<ButtonVariant, VariantStyle> = {
  primary: { bg: colors.primary, text: colors.textWhite },
  secondary: { bg: colors.secondary, text: colors.textWhite },
  outline: { bg: 'transparent', text: colors.primary, border: colors.primary },
  danger: { bg: colors.error, text: colors.textWhite },
};

const AppButton: React.FC<AppButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  style,
}) => {
  const variantStyle = VARIANT_STYLES[variant];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={[
        styles.button,
        { backgroundColor: variantStyle.bg },
        variantStyle.border && { borderWidth: 1.5, borderColor: variantStyle.border },
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyle.text} size="small" />
      ) : (
        <View style={styles.content}>
          {icon && (
            <Ionicons name={icon} size={20} color={variantStyle.text} style={styles.icon} />
          )}
          <Text style={[styles.text, { color: variantStyle.text }]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
  },
  icon: {
    marginRight: 8,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default AppButton;
