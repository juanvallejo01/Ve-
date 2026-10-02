import { Eye, EyeOff, AlertCircle, Check, Circle, Mail } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { EmailCheckingView } from '@/components/auth/email-checking-view';
import { EmailRegisteredView } from '@/components/auth/email-registered-view';
import { OtpInput } from '@/components/auth/otp-input';
import { PickerSheetField } from '@/components/auth/picker-sheet-field';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/context/theme-context';
import { FACULTIES, FACULTY_NAMES } from '@/constants/faculties';
import { openLegalPage } from '@/constants/legal';
import { useEmailVerificationFlow } from '@/hooks/use-email-verification-flow';
import { isValidEmailFormat } from '@/lib/email-verification';
import { isPasswordValid, PASSWORD_RULES } from '@/lib/password-policy';
import type { LoginResponse } from '@/types';

type Step = 'credentials' | 'otp';

/**
 * Ported from the web app's `screens/Auth.tsx`. Renders a fixed light
 * palette (`#F8F8FA` background, white card, `#1A1A2E`/`#8E8E93` text) the
 * same way the web source hardcodes those hex values rather than using its
 * own theme tokens — this screen intentionally doesn't follow system dark
 * mode, matching the original.
 */
export default function AuthScreen() {
  const { t } = useTranslation('translation', { keyPrefix: 'auth' });
  const { fonts } = useTheme();
  const { login, verifyOtp, register } = useAuth();

  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [faculty, setFaculty] = useState('');
  const [major, setMajor] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Paso 2FA: tras validar credenciales, se pide el código de 6 dígitos
  // enviado por correo antes de abrir la sesión.
  const [step, setStep] = useState<Step>('credentials');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpMessage, setOtpMessage] = useState('');
  const [isResending, setIsResending] = useState(false);

  // Registro en dos pasos: primero el correo institucional (ver
  // useEmailVerificationFlow), y con status 'continue' el resto del perfil.
  const emailFlow = useEmailVerificationFlow();
  const isEmailStep = isRegistering && step === 'credentials' && emailFlow.status !== 'continue';

  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  function triggerShake() {
    shakeX.value = withSequence(
      withTiming(-4, { duration: 45 }),
      withTiming(4, { duration: 45 }),
      withTiming(-4, { duration: 45 }),
      withTiming(4, { duration: 45 }),
      withTiming(0, { duration: 45 })
    );
  }

  function showError(message: string) {
    setError(message);
    triggerShake();
  }

  async function handleEmailContinue() {
    setError('');
    if (!isValidEmailFormat(email)) {
      showError(t('errors.validEmailRequired'));
      return;
    }
    // Si el dominio no es institucional, el flujo vuelve a `email_input` y se
    // muestra el motivo con el mismo banner de error del formulario.
    const result = await emailFlow.submit(email);
    if (result && !result.ok) {
      showError(
        result.reason === 'domain_not_allowed' ? t('errors.emailDomainNotAllowed') : t('errors.validEmailRequired')
      );
    }
  }

  // Tanto login como register (cuenta recién creada) pasan por el mismo
  // reto de 2FA — si la respuesta lo pide, se muestra el paso de código.
  function goToOtpStepIfNeeded(response: LoginResponse) {
    if ('requiresTwoFactor' in response) {
      setOtpEmail(response.email);
      setOtpMessage(response.message);
      setOtpCode('');
      setStep('otp');
    }
  }

  async function handleSubmit() {
    setError('');
    setIsLoading(true);

    try {
      if (isRegistering) {
        if (!name.trim()) {
          showError(t('errors.nameRequired'));
          setIsLoading(false);
          return;
        }
        if (!isPasswordValid(password)) {
          showError(t('errors.passwordPolicy'));
          setIsLoading(false);
          return;
        }
        if (!major.trim()) {
          showError(t('errors.majorRequired'));
          setIsLoading(false);
          return;
        }

        const response = await register({
          name: name.trim(),
          nickname: nickname.trim() || undefined,
          // Correo ya normalizado y validado en el paso institucional.
          email: emailFlow.email,
          password,
          major: major.trim(),
        });
        goToOtpStepIfNeeded(response);
      } else {
        if (!email.trim() || !password) {
          showError(t('errors.emailPasswordRequired'));
          setIsLoading(false);
          return;
        }
        const response = await login({ email: email.trim().toLowerCase(), password });
        goToOtpStepIfNeeded(response);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      const message = err?.response?.data?.message || err?.message || t('errors.authFailed');
      showError(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerifyOtp() {
    setError('');
    const code = otpCode.trim();
    if (!/^\d{6}$/.test(code)) {
      showError(t('errors.otpInvalid'));
      return;
    }

    setIsLoading(true);
    try {
      await verifyOtp({ email: otpEmail, code });
    } catch (err: any) {
      console.error('OTP verification error:', err);
      const message = err?.response?.data?.message || err?.message || t('errors.authFailed');
      showError(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResendCode() {
    setError('');
    setIsResending(true);
    try {
      // Volver a llamar a login con las mismas credenciales genera y envía
      // un código nuevo (el backend invalida el anterior automáticamente).
      const response = await login({ email: otpEmail, password });
      if ('requiresTwoFactor' in response) {
        setOtpCode('');
        setOtpMessage(t('otp.resendSuccess'));
      }
    } catch (err: any) {
      console.error('Resend OTP error:', err);
      const message = err?.response?.data?.message || err?.message || t('errors.authFailed');
      showError(message);
    } finally {
      setIsResending(false);
    }
  }

  function handleBackToCredentials() {
    setStep('credentials');
    setOtpCode('');
    setError('');
  }

  function toggleMode() {
    setIsRegistering((prev) => !prev);
    setError('');
    setEmail('');
    setPassword('');
    setName('');
    setNickname('');
    setFaculty('');
    setMajor('');
    emailFlow.reset();
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.wrapper}>
            {/* Logo & brand */}
            <View style={styles.logoBlock}>
              <View style={styles.logoBadgeWrap}>
                <View style={styles.logoBox}>
                  <Text style={[styles.logoText, { fontFamily: fonts.caveat.bold }]}>Ve!</Text>
                </View>
                <View style={styles.logoDot} />
              </View>
              <View style={styles.headingBlock}>
                <Text style={[styles.title, { fontFamily: fonts.sans.bold }]}>
                  {step === 'otp' ? t('otp.title') : isRegistering ? t('joinTitle') : t('welcomeBackTitle')}
                </Text>
                <Text style={[styles.subtitle, { fontFamily: fonts.sans.regular }]}>
                  {step === 'otp'
                    ? otpMessage || t('otp.subtitleFallback', { email: otpEmail })
                    : isRegistering
                      ? isEmailStep
                        ? t('institutionalEmail.emailStepSubtitle')
                        : t('institutionalEmail.profileStepSubtitle')
                      : t('welcomeBackSubtitle')}
                </Text>
              </View>
              {isRegistering && step === 'credentials' ? (
                <StepIndicator current={isEmailStep ? 1 : 2} total={2} label={t('institutionalEmail.stepLabel', { current: isEmailStep ? 1 : 2, total: 2 })} />
              ) : null}
            </View>

            {/* Form card */}
            <Animated.View layout={LinearTransition.duration(260)} style={[styles.card, shakeStyle]}>
              <View style={styles.cardInner}>
                {error && (!isEmailStep || emailFlow.status === 'email_input') ? (
                  <View style={styles.errorBanner}>
                    <AlertCircle size={16} color="#FF3B30" />
                    <Text style={[styles.errorText, { fontFamily: fonts.sans.regular }]}>{error}</Text>
                  </View>
                ) : null}

                {step === 'otp' ? (
                  <>
                    <View style={styles.field}>
                      <Text style={[styles.label, { fontFamily: fonts.sans.semiBold }]}>
                        {t('otp.codeLabel')}
                      </Text>
                      <OtpInput value={otpCode} onChange={setOtpCode} onSubmitEditing={handleVerifyOtp} autoFocus />
                    </View>

                    <Button
                      fullWidth
                      size="lg"
                      onPress={handleVerifyOtp}
                      loading={isLoading}
                      disabled={isLoading}
                      gradientColors={['#fbbf24', '#f59e0b']}
                      textColor="#0A0A0C"
                      style={styles.submitButton}
                    >
                      {isLoading ? t('otp.verifying') : t('otp.verifyButton')}
                    </Button>

                    <View style={styles.otpActionsRow}>
                      <Pressable onPress={handleResendCode} disabled={isResending || isLoading}>
                        <Text
                          style={[
                            styles.otpActionText,
                            { color: '#d97706', fontFamily: fonts.sans.semiBold },
                            (isResending || isLoading) && styles.disabledText,
                          ]}
                        >
                          {isResending ? t('otp.resending') : t('otp.resendButton')}
                        </Text>
                      </Pressable>
                      <Text style={styles.otpActionsDot}>•</Text>
                      <Pressable onPress={handleBackToCredentials} disabled={isLoading}>
                        <Text
                          style={[
                            styles.otpActionText,
                            { color: '#8E8E93', fontFamily: fonts.sans.semiBold },
                            isLoading && styles.disabledText,
                          ]}
                        >
                          {t('otp.back')}
                        </Text>
                      </Pressable>
                    </View>
                  </>
                ) : isEmailStep ? (
                  <Animated.View key={emailFlow.status} entering={FadeInDown.duration(300)}>
                    {emailFlow.status === 'checking' ? (
                      <EmailCheckingView email={emailFlow.email} />
                    ) : emailFlow.status === 'registered' ? (
                      <EmailRegisteredView email={emailFlow.email} onContinue={emailFlow.proceed} />
                    ) : (
                      // 'email_input'. Los estados futuros code_sent / otp_input /
                      // verified se renderizarán aquí cuando exista el proveedor.
                      <View style={styles.cardInner}>
                        <FieldInput
                          label={t('institutionalEmail.label')}
                          placeholder={t('institutionalEmail.placeholder')}
                          hint={t('institutionalEmail.hint')}
                          leftIcon={<Mail size={18} color="#C7C7CC" />}
                          value={email}
                          onChangeText={setEmail}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          onSubmitEditing={handleEmailContinue}
                        />

                        <Button
                          fullWidth
                          size="lg"
                          onPress={handleEmailContinue}
                          gradientColors={['#fbbf24', '#f59e0b']}
                          textColor="#0A0A0C"
                          style={styles.submitButton}
                        >
                          {t('institutionalEmail.continue')}
                        </Button>

                        <View style={styles.dividerRow}>
                          <View style={styles.dividerLine} />
                          <Text style={[styles.dividerText, { fontFamily: fonts.sans.medium }]}>{t('or')}</Text>
                          <View style={styles.dividerLine} />
                        </View>

                        <Button
                          variant="outline"
                          fullWidth
                          size="lg"
                          onPress={toggleMode}
                          textColor="#1A1A2E"
                          style={styles.outlineButton}
                        >
                          {t('toggleToSignIn')}
                        </Button>
                      </View>
                    )}
                  </Animated.View>
                ) : (
                  <Animated.View entering={isRegistering ? FadeInDown.duration(300) : undefined} style={styles.cardInner}>
                    {isRegistering ? (
                      <LockedEmailRow email={emailFlow.email} />
                    ) : null}

                    {isRegistering ? (
                      <FieldInput
                        label={t('fullName')}
                        placeholder={t('fullNamePlaceholder')}
                        value={name}
                        onChangeText={setName}
                      />
                    ) : null}

                    {isRegistering ? (
                      <FieldInput
                        label={t('nickname')}
                        placeholder={t('nicknamePlaceholder')}
                        value={nickname}
                        onChangeText={setNickname}
                      />
                    ) : null}

                    {!isRegistering ? (
                      <FieldInput
                        label={t('email')}
                        placeholder={t('emailPlaceholder')}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    ) : null}

                    <FieldInput
                      label={t('password')}
                      placeholder={isRegistering ? t('passwordPlaceholderRegister') : t('passwordPlaceholderLogin')}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      onSubmitEditing={handleSubmit}
                      rightElement={
                        <Pressable
                          onPress={() => setShowPassword((prev) => !prev)}
                          hitSlop={8}
                          accessibilityLabel={showPassword ? t('hidePassword') : t('showPassword')}
                        >
                          {showPassword ? (
                            <EyeOff size={18} color="#C7C7CC" />
                          ) : (
                            <Eye size={18} color="#C7C7CC" />
                          )}
                        </Pressable>
                      }
                    />

                    {isRegistering ? <PasswordChecklist password={password} /> : null}

                    {isRegistering ? (
                      <PickerSheetField
                        label={t('faculty')}
                        placeholder={t('facultyPlaceholder')}
                        value={faculty}
                        options={FACULTY_NAMES}
                        onSelect={(next) => {
                          setFaculty(next);
                          setMajor('');
                        }}
                      />
                    ) : null}

                    {isRegistering && faculty ? (
                      <PickerSheetField
                        label={t('major')}
                        placeholder={t('majorPlaceholder')}
                        value={major}
                        options={FACULTIES[faculty] ?? []}
                        onSelect={setMajor}
                      />
                    ) : null}

                    <Button
                      fullWidth
                      size="lg"
                      onPress={handleSubmit}
                      loading={isLoading}
                      disabled={isLoading}
                      gradientColors={['#fbbf24', '#f59e0b']}
                      textColor="#0A0A0C"
                      style={styles.submitButton}
                    >
                      {isLoading ? t('loading') : isRegistering ? t('createAccount') : t('signIn')}
                    </Button>

                    <View style={styles.dividerRow}>
                      <View style={styles.dividerLine} />
                      <Text style={[styles.dividerText, { fontFamily: fonts.sans.medium }]}>{t('or')}</Text>
                      <View style={styles.dividerLine} />
                    </View>

                    <Button
                      variant="outline"
                      fullWidth
                      size="lg"
                      onPress={toggleMode}
                      disabled={isLoading}
                      textColor="#1A1A2E"
                      style={styles.outlineButton}
                    >
                      {isRegistering ? t('toggleToSignIn') : t('createAccount')}
                    </Button>
                  </Animated.View>
                )}
              </View>
            </Animated.View>

            <Text style={[styles.termsText, { fontFamily: fonts.sans.regular }]}>
              {t('termsNoticePrefix')}{' '}
              <Text style={styles.termsLink} onPress={() => openLegalPage('terms')} accessibilityRole="link">
                {t('termsLink')}
              </Text>{' '}
              {t('termsNoticeAnd')}{' '}
              <Text style={styles.termsLink} onPress={() => openLegalPage('privacy')} accessibilityRole="link">
                {t('privacyLink')}
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface FieldInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  onSubmitEditing?: () => void;
  rightElement?: ReactNode;
  leftIcon?: ReactNode;
  /** Texto de ayuda pequeño bajo el campo. */
  hint?: string;
}

/** Local stand-in for the web version's repeated `<input>` markup. */
function FieldInput({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  onSubmitEditing,
  rightElement,
  leftIcon,
  hint,
}: FieldInputProps) {
  const { fonts } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { fontFamily: fonts.sans.semiBold }]}>{label}</Text>
      <View
        style={[
          styles.inputRow,
          isFocused && styles.inputRowFocused,
          rightElement ? { paddingRight: 12 } : null,
          leftIcon ? { paddingLeft: 16, gap: 10 } : null,
        ]}
      >
        {leftIcon}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#C7C7CC"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[styles.input, { fontFamily: fonts.sans.regular }]}
        />
        {rightElement}
      </View>
      {hint ? <Text style={[styles.hint, { fontFamily: fonts.sans.regular }]}>{hint}</Text> : null}
    </View>
  );
}

/** Requisitos de la contraseña, que se marcan en vivo mientras se escribe. */
function PasswordChecklist({ password }: { password: string }) {
  const { t } = useTranslation('translation', { keyPrefix: 'auth.passwordRules' });
  const { fonts } = useTheme();
  return (
    <View style={styles.checklist}>
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password);
        return (
          <View key={rule.id} style={styles.checklistRow}>
            {ok ? <Check size={14} color="#34C759" strokeWidth={3} /> : <Circle size={14} color="#C7C7CC" />}
            <Text style={[styles.checklistText, { fontFamily: fonts.sans.medium }, ok && styles.checklistTextOk]}>
              {t(rule.id)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function StepIndicator({ current, total, label }: { current: number; total: number; label: string }) {
  return (
    <View style={styles.stepIndicator} accessible accessibilityLabel={label}>
      {Array.from({ length: total }, (_, i) => (
        <Animated.View
          key={i}
          layout={LinearTransition.duration(260)}
          style={[styles.stepDot, i + 1 === current && styles.stepDotActive, i + 1 < current && styles.stepDotDone]}
        />
      ))}
    </View>
  );
}

/**
 * Correo ya verificado en el paso 1. Es de solo lectura: una vez pasada la
 * verificación no se puede cambiar (para usar otro correo hay que reiniciar
 * el registro volviendo a "Iniciar sesión").
 */
function LockedEmailRow({ email }: { email: string }) {
  const { fonts } = useTheme();
  return (
    <View style={styles.lockedRow}>
      <View style={styles.lockedIcon}>
        <Mail size={16} color="#d97706" />
      </View>
      <Text style={[styles.lockedEmail, styles.flex, { fontFamily: fonts.sans.semiBold }]} numberOfLines={1}>
        {email}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F8FA' },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 },
  wrapper: { width: '100%', maxWidth: 390, alignSelf: 'center', gap: 40 },

  logoBlock: { alignItems: 'center', gap: 20 },
  logoBadgeWrap: { position: 'relative' },
  logoBox: {
    height: 80,
    width: 80,
    borderRadius: 24,
    backgroundColor: '#0A0A0C',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6,
  },
  logoText: { fontSize: 30, lineHeight: 34, color: '#fbbf24' },
  logoDot: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    height: 20,
    width: 20,
    borderRadius: 10,
    backgroundColor: '#fbbf24',
    borderWidth: 3,
    borderColor: '#F8F8FA',
  },
  headingBlock: { alignItems: 'center', gap: 8 },
  title: { fontSize: 26, color: '#1A1A2E', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#8E8E93', textAlign: 'center' },

  card: {
    width: '100%',
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    padding: 28,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  cardInner: { gap: 20 },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255,59,48,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  errorText: { flex: 1, fontSize: 14, color: '#FF3B30' },

  field: { gap: 8 },
  label: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: '#8E8E93', paddingLeft: 4 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EBEBF0',
    backgroundColor: '#F8F8FA',
    paddingHorizontal: 20,
  },
  inputRowFocused: {
    borderColor: '#fbbf24',
    backgroundColor: '#FFFFFF',
  },
  input: { flex: 1, paddingVertical: 14, fontSize: 14, color: '#1A1A2E' },
  hint: { fontSize: 12, lineHeight: 16, color: '#8E8E93', paddingLeft: 4 },

  checklist: { gap: 6, paddingLeft: 4, marginTop: -8 },
  checklistRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checklistText: { fontSize: 12, color: '#8E8E93' },
  checklistTextOk: { color: '#1A1A2E' },

  stepIndicator: { flexDirection: 'row', gap: 6 },
  stepDot: { height: 6, width: 6, borderRadius: 3, backgroundColor: '#EBEBF0' },
  stepDotActive: { width: 22, backgroundColor: '#fbbf24' },
  stepDotDone: { backgroundColor: '#1A1A2E' },

  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EBEBF0',
    backgroundColor: '#F8F8FA',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  lockedIcon: {
    height: 32,
    width: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(251,191,36,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedEmail: { fontSize: 14, color: '#1A1A2E' },

  submitButton: { marginTop: 4, shadowColor: '#fbbf24', shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
  outlineButton: { borderColor: '#EBEBF0', backgroundColor: '#FFFFFF' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: '#EBEBF0' },
  dividerText: { fontSize: 12, color: '#C7C7CC' },

  otpActionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  otpActionText: { fontSize: 14 },
  otpActionsDot: { color: '#EBEBF0', fontSize: 14 },
  disabledText: { opacity: 0.5 },

  termsText: { fontSize: 12, lineHeight: 18, color: '#AEAEB2', textAlign: 'center' },
  termsLink: { color: '#8E8E93', textDecorationLine: 'underline' },
});
