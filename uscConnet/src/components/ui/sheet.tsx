import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { useTheme } from '@/context/theme-context';

export interface SheetProps {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  /** Snap points as percentages of screen height or fixed px, e.g. ['50%']. */
  snapPoints?: (string | number)[];
  /**
   * Render content in a `ScrollView` instead of a plain `View` — needed for
   * sheets whose content can exceed the available height (e.g. the
   * create-post composer with an image preview carousel). Defaults to
   * `false` to preserve existing callers' behavior.
   */
  scrollable?: boolean;
}

/**
 * Resolves the first snap point (percentage string like `'85%'` or a fixed
 * px number, matching the API this component always accepted) into an
 * absolute pixel height for the sheet panel.
 */
function resolvePanelHeight(snapPoint: string | number | undefined): number {
  const screenHeight = Dimensions.get('window').height;
  if (typeof snapPoint === 'number') {
    return snapPoint;
  }
  if (typeof snapPoint === 'string' && snapPoint.trim().endsWith('%')) {
    const pct = parseFloat(snapPoint) / 100;
    return screenHeight * (Number.isFinite(pct) && pct > 0 ? pct : 0.5);
  }
  return screenHeight * 0.5;
}

/**
 * Generic bottom-sheet wrapper, implemented directly on React Native's core
 * `Modal` (a custom slide-up panel + backdrop, animated with the core
 * `Animated` API) rather than `@gorhom/bottom-sheet`'s `BottomSheetModal`.
 *
 * Why: this project confirmed, via device logs, that `@gorhom/bottom-sheet`
 * v5 (current stable, 5.2.14) is broken under `react-native-reanimated` v4
 * (this project's version, 4.5.0, required by Expo SDK 57 / the New
 * Architecture) — `.present()`/`.dismiss()` fire correctly (verified) but
 * the sheet's Reanimated-driven position/backdrop-opacity never visually
 * updates, with no error or crash. This is a known, still-open upstream
 * issue with no released fix: gorhom/react-native-bottom-sheet#2546, #2547,
 * #2528, #2600, #2613 all report the same "present() called, nothing
 * renders, no error" symptom after moving to Reanimated v4, and the
 * library's own peer-dependency range (`>=3.16.0 || >=4.0.0-`) is
 * aspirational — its dev/test target is still Reanimated ~3.19 per its own
 * package.json, and its internals (e.g. `useSharedValue`/animated styles
 * driving the sheet's translateY) are not confirmed compatible with
 * Reanimated v4's reworked worklets runtime (`react-native-worklets`). The
 * only workaround reported upstream is downgrading to Reanimated v3, which
 * isn't viable here (Reanimated v4 is required by this stack). Core `Modal`
 * sidesteps the dependency entirely — no Reanimated, no portal layer that
 * can silently fail to paint, just the native modal presentation API, whose
 * visibility is not in question on either platform.
 */
export function Sheet({
  children,
  isOpen,
  onClose,
  snapPoints = ['50%'],
  scrollable = false,
}: SheetProps) {
  const { colors, radii, shadows } = useTheme();
  // Every caller passes an inline array literal (e.g. `snapPoints={['85%']}`),
  // a new reference on every render, which defeats a naive
  // `useMemo(() => snapPoints, [snapPoints])`. Key off the serialized value
  // instead so `panelHeight` is only recomputed when the actual snap point
  // changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const panelHeight = useMemo(() => resolvePanelHeight(snapPoints[0]), [JSON.stringify(snapPoints)]);

  // The native Modal stays mounted slightly longer than `isOpen` so the
  // close animation can finish playing before it's actually torn down.
  const [isMounted, setIsMounted] = useState(isOpen);
  const translateY = useRef(new Animated.Value(panelHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const animateOpen = useRef(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 280, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
  }).current;

  const animateClose = useRef((onDone?: () => void) => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: panelHeight, duration: 220, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) {
        onDone?.();
      }
    });
  }).current;

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      // Reset to the fully-closed position first, then animate in on the
      // next frame — animating within the same render pass that flips the
      // Modal to `visible` can race with the native modal presentation.
      translateY.setValue(panelHeight);
      backdropOpacity.setValue(0);
      const raf = requestAnimationFrame(animateOpen);
      return () => cancelAnimationFrame(raf);
    }
    if (isMounted) {
      animateClose(() => setIsMounted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, panelHeight]);

  const handleRequestClose = () => {
    animateClose(() => {
      setIsMounted(false);
      onClose();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_evt, gesture) =>
        Math.abs(gesture.dy) > Math.abs(gesture.dx) && gesture.dy > 4,
      onPanResponderMove: (_evt, gesture) => {
        if (gesture.dy > 0) {
          translateY.setValue(gesture.dy);
        }
      },
      onPanResponderRelease: (_evt, gesture) => {
        const shouldClose = gesture.dy > panelHeight * 0.25 || gesture.vy > 1.2;
        if (shouldClose) {
          animateClose(() => {
            setIsMounted(false);
            onClose();
          });
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
        }
      },
    })
  ).current;

  if (!isMounted) {
    return null;
  }

  return (
    <Modal visible={isMounted} transparent animationType="none" statusBarTranslucent onRequestClose={handleRequestClose}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={handleRequestClose}>
          <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
        </TouchableWithoutFeedback>
        <Animated.View
          style={[
            styles.panel,
            {
              height: panelHeight,
              backgroundColor: colors.card,
              borderTopLeftRadius: radii.xl,
              borderTopRightRadius: radii.xl,
              transform: [{ translateY }],
            },
            shadows.cloudLg,
          ]}
        >
          <View {...panResponder.panHandlers} style={styles.handleArea}>
            <View style={[styles.handleIndicator, { backgroundColor: colors.border }]} />
          </View>

          {scrollable ? (
            <ScrollView
              style={styles.scrollableOuter}
              contentContainerStyle={styles.scrollableContent}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          ) : (
            <View style={styles.content}>{children}</View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
  },
  panel: {
    width: '100%',
    overflow: 'hidden',
  },
  handleArea: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handleIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  scrollableOuter: {
    flex: 1,
  },
  scrollableContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
});
