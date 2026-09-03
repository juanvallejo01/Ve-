import { useRef } from 'react';
import { StyleSheet, TextInput, View, type NativeSyntheticEvent, type TextInputKeyPressEventData } from 'react-native';

import { useTheme } from '@/context/theme-context';

const LENGTH = 6;

export interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Fires when Enter/submit is pressed on the last box — mirrors the web
   * input's `onKeyDown` handler for the Enter key. */
  onSubmitEditing?: () => void;
  autoFocus?: boolean;
}

/**
 * Six individual digit boxes standing in for the web version's single
 * `<input maxLength={6}>` — auto-advances focus as each digit is typed and
 * auto-backspaces into the previous box on delete, since RN has no
 * equivalent of a single text field with per-character CSS letter-spacing
 * styling that reads well as "boxes."
 */
export function OtpInput({ value, onChange, onSubmitEditing, autoFocus }: OtpInputProps) {
  const { colors, radii, fonts } = useTheme();
  const inputs = useRef<Array<TextInput | null>>([]);
  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] ?? '');

  function setDigitAt(index: number, char: string) {
    const next = digits.slice();
    next[index] = char;
    onChange(next.join('').slice(0, LENGTH));
  }

  function handleChangeText(text: string, index: number) {
    const cleaned = text.replace(/\D/g, '');
    if (!cleaned) {
      setDigitAt(index, '');
      return;
    }
    // Handles both a single typed digit and a pasted multi-digit string
    // landing in one box (common on iOS autofill from SMS/one-time-code).
    if (cleaned.length > 1) {
      const chars = cleaned.split('');
      const next = digits.slice();
      for (let i = 0; i < chars.length && index + i < LENGTH; i++) {
        next[index + i] = chars[i];
      }
      onChange(next.join('').slice(0, LENGTH));
      const lastFilled = Math.min(index + chars.length, LENGTH) - 1;
      inputs.current[Math.min(lastFilled + 1, LENGTH - 1)]?.focus();
      return;
    }

    setDigitAt(index, cleaned);
    if (index < LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  }

  function handleKeyPress(e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
      setDigitAt(index - 1, '');
    }
  }

  return (
    <View style={styles.row}>
      {digits.map((digit, index) => (
        <TextInput
          key={index}
          ref={(ref) => {
            inputs.current[index] = ref;
          }}
          value={digit}
          onChangeText={(text) => handleChangeText(text, index)}
          onKeyPress={(e) => handleKeyPress(e, index)}
          onSubmitEditing={index === LENGTH - 1 ? onSubmitEditing : undefined}
          keyboardType="number-pad"
          maxLength={LENGTH}
          autoFocus={autoFocus && index === 0}
          returnKeyType="done"
          textAlign="center"
          selectTextOnFocus
          style={[
            styles.box,
            {
              borderRadius: radii.sm,
              borderColor: colors.border,
              backgroundColor: colors.background,
              color: colors.foreground,
              fontFamily: fonts.sans.bold,
            },
            digit ? { borderColor: '#fbbf24', backgroundColor: colors.card } : null,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  box: {
    flex: 1,
    height: 56,
    borderWidth: 1,
    fontSize: 22,
  },
});
