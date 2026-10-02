import { Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { useTheme } from '@/context/theme-context';

interface EmailRegisteredViewProps {
  email: string;
  onContinue: () => void;
}

/**
 * Estado `registered`: confirma que el correo pasó la validación
 * institucional, sin afirmar que se envió un código. Desde aquí solo se puede
 * continuar: el correo ya no se puede cambiar.
 */
export function EmailRegisteredView({ email, onContinue }: EmailRegisteredViewProps) {
  const { t } = useTranslation('translation', { keyPrefix: 'auth.institutionalEmail' });
  const { fonts } = useTheme();

  return (
    <View style={styles.container}>
      <Animated.View entering={ZoomIn.springify().damping(14).stiffness(180)} style={styles.badge}>
        <Check size={30} color="#FFFFFF" strokeWidth={3} />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(320)} style={styles.textBlock}>
        <Text style={[styles.title, { fontFamily: fonts.sans.bold }]}>{t('registeredTitle')}</Text>
        <Text style={[styles.body, { fontFamily: fonts.sans.regular }]}>{t('registeredBody')}</Text>
        <View style={styles.emailChip}>
          <Text style={[styles.emailText, { fontFamily: fonts.sans.semiBold }]} numberOfLines={1}>
            {email}
          </Text>
        </View>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(260).duration(320)} style={styles.actions}>
        <Button
          fullWidth
          size="lg"
          onPress={onContinue}
          gradientColors={['#fbbf24', '#f59e0b']}
          textColor="#0A0A0C"
          style={styles.cta}
        >
          {t('continue')}
        </Button>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 24, paddingTop: 8 },

  badge: {
    height: 64,
    width: 64,
    borderRadius: 32,
    backgroundColor: '#34C759',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 5,
  },

  textBlock: { alignItems: 'center', gap: 10, width: '100%' },
  title: { fontSize: 19, color: '#1A1A2E', textAlign: 'center' },
  body: { fontSize: 14, lineHeight: 20, color: '#8E8E93', textAlign: 'center' },
  emailChip: {
    marginTop: 4,
    maxWidth: '100%',
    borderRadius: 999,
    backgroundColor: '#F8F8FA',
    borderWidth: 1,
    borderColor: '#EBEBF0',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  emailText: { fontSize: 13, color: '#1A1A2E' },

  actions: { width: '100%', alignItems: 'center', gap: 16 },
  cta: { shadowColor: '#fbbf24', shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
});
