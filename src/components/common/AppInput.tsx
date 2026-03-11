/**
 * AppInput - Uygulama genelinde kullanılan input bileşeni
 *
 * Props:
 *   - label (string): Input etiketi
 *   - value (string): Değer
 *   - onChangeText (function): Değişiklik fonksiyonu
 *   - placeholder (string): Placeholder
 *   - error (string): Hata mesajı
 *   - secureTextEntry (boolean): Şifre modu
 *   - keyboardType (string): Klavye tipi
 *   - icon (string): Sol ikon (Ionicons)
 *   - multiline (boolean): Çok satırlı
 *   - editable (boolean): Düzenlenebilir mi
 */

import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, fontSize } from '../../theme';

export interface AppInputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
  icon?: keyof typeof Ionicons.glyphMap;
  multiline?: boolean;
  editable?: boolean;
  style?: StyleProp<ViewStyle>;
}

const AppInput: React.FC<AppInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry = false,
  keyboardType = 'default',
  icon,
  multiline = false,
  editable = true,
  style,
  ...rest
}) => {
  return (
    <View style={[styles.container, style]}>
      {/* Etiket */}
      {label && <Text style={styles.label}>{label}</Text>}

      {/* Input alanı */}
      <View style={[styles.inputWrapper, error && styles.inputError, !editable && styles.inputDisabled]}>
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={error ? colors.error : colors.textSecondary}
            style={styles.icon}
          />
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textDisabled}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          multiline={multiline}
          editable={editable}
          style={[
            styles.input,
            multiline && styles.multiline,
            icon && styles.inputWithIcon,
          ]}
          {...rest}
        />
      </View>

      {/* Hata mesajı */}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
  },
  inputError: {
    borderColor: colors.error,
  },
  inputDisabled: {
    backgroundColor: colors.divider,
    opacity: 0.7,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  inputWithIcon: {
    paddingLeft: 0,
  },
  multiline: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  errorText: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: 4,
  },
});

export default AppInput;
