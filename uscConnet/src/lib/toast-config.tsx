import { AlertCircle, CheckCircle2 } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import type { ToastConfig } from 'react-native-toast-message';

import { darkColors, lightColors } from '@/constants/colors';
import { radii } from '@/constants/radii';
import { shadows } from '@/constants/shadows';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Custom `react-native-toast-message` render config, styled with the app's
 * own design tokens (colors/radii/shadows from `src/constants/`) instead of
 * the library's stock look. Mirrors the web `toast-context.tsx`'s three
 * variants: success (green), error (red), info (neutral card).
 */
function ToastBubble({
  text1,
  backgroundColor,
  textColor,
  icon,
}: {
  text1?: string;
  backgroundColor: string;
  textColor: string;
  icon?: React.ReactNode;
}) {
  return (
    <View style={[styles.bubble, shadows.cloudMd, { backgroundColor, borderRadius: radii.lg }]}>
      {icon}
      <Text style={[styles.text, { color: textColor }]} numberOfLines={2}>
        {text1}
      </Text>
    </View>
  );
}

function useToastColors() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkColors : lightColors;
}

export const toastConfig: ToastConfig = {
  success: ({ text1 }) => {
    const colors = useToastColors();
    return (
      <ToastBubble
        text1={text1}
        backgroundColor={colors.success}
        textColor="#FFFFFF"
        icon={<CheckCircle2 size={20} color="#FFFFFF" strokeWidth={2.5} />}
      />
    );
  },
  error: ({ text1 }) => {
    const colors = useToastColors();
    return (
      <ToastBubble
        text1={text1}
        backgroundColor={colors.destructive}
        textColor="#FFFFFF"
        icon={<AlertCircle size={20} color="#FFFFFF" strokeWidth={2.5} />}
      />
    );
  },
  info: ({ text1 }) => {
    const colors = useToastColors();
    return <ToastBubble text1={text1} backgroundColor={colors.card} textColor={colors.foreground} />;
  },
};

const styles = StyleSheet.create({
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    minWidth: 280,
    maxWidth: 400,
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
});
