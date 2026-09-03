import { Check, ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Sheet } from '@/components/ui/sheet';
import { useTheme } from '@/context/theme-context';

export interface PickerSheetFieldProps {
  label: string;
  placeholder: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
}

/**
 * Stand-in for the web version's native `<select>` for the faculty/major
 * cascading fields. Rather than fall back to `@react-native-picker/picker`'s
 * platform-native wheel (which would look out of place against the app's
 * rounded "cloud shadow" visual language), this opens the shared `Sheet`
 * primitive with a scrollable option list styled like the rest of the app.
 */
export function PickerSheetField({ label, placeholder, value, options, onSelect }: PickerSheetFieldProps) {
  // The trigger row below is hardcoded to the Auth screen's fixed light
  // palette (matching the web source, which hardcodes `bg-[#F8F8FA]` etc.
  // rather than using its own theme tokens). The Sheet's *contents*, though,
  // still read `colors`/`radii`/`fonts` from useTheme() — the shared `Sheet`
  // primitive itself colors its background/handle from the theme, so text
  // here must track the same theme or it'd go illegible (dark-on-dark) under
  // a dark system theme even though the rest of this screen stays light.
  const { colors, radii, fonts } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: '#8E8E93', fontFamily: fonts.sans.semiBold }]}>{label}</Text>
      <Pressable
        onPress={() => setIsOpen(true)}
        style={[
          styles.input,
          { borderRadius: radii.sm, borderColor: '#EBEBF0', backgroundColor: '#F8F8FA' },
        ]}
      >
        <Text
          style={[
            styles.inputText,
            { fontFamily: fonts.sans.regular, color: value ? '#1A1A2E' : '#C7C7CC' },
          ]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        <ChevronDown size={18} color="#8E8E93" />
      </Pressable>

      <Sheet isOpen={isOpen} onClose={() => setIsOpen(false)} snapPoints={['60%']}>
        <Text style={[styles.sheetTitle, { color: colors.foreground, fontFamily: fonts.sans.bold }]}>
          {label}
        </Text>
        <FlatList
          data={options}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                onSelect(item);
                setIsOpen(false);
              }}
              style={[styles.option, { borderBottomColor: colors.border }]}
            >
              <Text
                style={[
                  styles.optionText,
                  { color: colors.foreground, fontFamily: item === value ? fonts.sans.semiBold : fonts.sans.regular },
                ]}
              >
                {item}
              </Text>
              {item === value ? <Check size={18} color="#d97706" /> : null}
            </Pressable>
          )}
        />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingLeft: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputText: {
    fontSize: 14,
    flex: 1,
  },
  sheetTitle: {
    fontSize: 18,
    marginBottom: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: {
    fontSize: 15,
  },
});
