import { LinearGradient } from 'expo-linear-gradient';
import { Mail } from 'lucide-react-native';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useTheme } from '@/context/theme-context';
import { CHECKING_MIN_DURATION_MS } from '@/lib/email-verification';

const RING_DURATION_MS = 1600;

interface EmailCheckingViewProps {
  email: string;
}

/**
 * Estado `checking`: ícono de correo con ondas suaves y una barra de progreso
 * que avanza durante CHECKING_MIN_DURATION_MS (no un spinner indefinido).
 */
export function EmailCheckingView({ email }: EmailCheckingViewProps) {
  const { t } = useTranslation('translation', { keyPrefix: 'auth.institutionalEmail' });
  const { fonts } = useTheme();
  const reduceMotion = useReducedMotion();

  const progress = useSharedValue(0);
  const ringA = useSharedValue(0);
  const ringB = useSharedValue(0);
  const float = useSharedValue(0);

  useEffect(() => {
    // Avanza rápido al inicio y se frena al final, como una carga real.
    progress.value = withTiming(1, {
      duration: CHECKING_MIN_DURATION_MS,
      easing: Easing.bezier(0.33, 0.9, 0.4, 1),
    });
    if (reduceMotion) return;
    ringA.value = withRepeat(withTiming(1, { duration: RING_DURATION_MS, easing: Easing.out(Easing.quad) }), -1);
    ringB.value = withDelay(
      RING_DURATION_MS / 2,
      withRepeat(withTiming(1, { duration: RING_DURATION_MS, easing: Easing.out(Easing.quad) }), -1)
    );
    float.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => [progress, ringA, ringB, float].forEach(cancelAnimation);
  }, [progress, ringA, ringB, float, reduceMotion]);

  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(float.value, [0, 1], [0, -3]) }],
  }));

  return (
    <View style={styles.container} accessibilityRole="progressbar" accessibilityLabel={t('checkingTitle')}>
      <View style={styles.iconStage}>
        <Ring value={ringA} />
        <Ring value={ringB} />
        <Animated.View style={[styles.iconTile, iconStyle]}>
          <Mail size={28} color="#fbbf24" strokeWidth={2} />
        </Animated.View>
      </View>

      <View style={styles.textBlock}>
        <Text style={[styles.title, { fontFamily: fonts.sans.bold }]}>{t('checkingTitle')}</Text>
        <Text style={[styles.subtitle, { fontFamily: fonts.sans.regular }]}>{t('checkingSubtitle')}</Text>
      </View>

      <View style={styles.progressBlock}>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, barStyle]}>
            <LinearGradient
              colors={['#fbbf24', '#f59e0b']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
        <Text style={[styles.email, { fontFamily: fonts.sans.medium }]} numberOfLines={1}>
          {email}
        </Text>
      </View>
    </View>
  );
}

function Ring({ value }: { value: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(value.value, [0, 0.2, 1], [0, 0.35, 0]),
    transform: [{ scale: interpolate(value.value, [0, 1], [0.85, 1.6]) }],
  }));
  return <Animated.View pointerEvents="none" style={[styles.ring, style]} />;
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 28, paddingVertical: 12 },

  iconStage: { height: 112, width: 112, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    height: 72,
    width: 72,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#fbbf24',
  },
  iconTile: {
    height: 72,
    width: 72,
    borderRadius: 24,
    backgroundColor: '#0A0A0C',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 6,
  },

  textBlock: { alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  title: { fontSize: 19, color: '#1A1A2E', textAlign: 'center' },
  subtitle: { fontSize: 14, lineHeight: 20, color: '#8E8E93', textAlign: 'center' },

  progressBlock: { width: '100%', alignItems: 'center', gap: 12 },
  track: { width: '100%', height: 4, borderRadius: 2, backgroundColor: '#F2F2F7', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2, overflow: 'hidden' },
  email: { fontSize: 13, color: '#8E8E93', maxWidth: '100%' },
});
