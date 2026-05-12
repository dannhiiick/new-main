import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useColors } from '../../hooks/useColors';
import { useTestMode } from '../../store/testMode';
import { usePlayerStore } from '../../store/player';

export function TestModeBanner() {
  const COLORS = useColors();
  const { active, session, end } = useTestMode();
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const [showDialog, setShowDialog] = useState(false);
  const [ending, setEnding] = useState(false);
  const [result, setResult] = useState<{ transferredCount: number } | null>(null);

  if (!active) return null;

  const count = session?._count?.interactions ?? 0;
  // Tab bar 64 + mini player ~70 + margin 12
  const bottomOffset = 64 + (currentTrack ? 70 : 0) + 12;

  const styles = useMemo(() => StyleSheet.create({
    wrapper: {
      position: 'absolute',
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: 999,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.accent,
      borderRadius: 24,
      paddingHorizontal: 16,
      paddingVertical: 9,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 10,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: COLORS.accent,
    },
    label: {
      color: COLORS.textPrimary,
      fontSize: 13,
      fontWeight: '600',
    },
    countBadge: {
      backgroundColor: COLORS.accentDim,
      borderRadius: 10,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    countText: {
      color: COLORS.accent,
      fontSize: 11,
      fontWeight: '700',
    },
    chevron: {
      color: COLORS.textMuted,
      fontSize: 13,
    },
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    dialog: {
      backgroundColor: COLORS.surface,
      borderRadius: 16,
      padding: 24,
      width: '100%',
      maxWidth: 360,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    dialogTitle: {
      color: COLORS.textPrimary,
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 8,
    },
    dialogSubtitle: {
      color: COLORS.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 20,
    },
    dialogActions: {
      gap: 10,
    },
    btnPrimary: {
      backgroundColor: COLORS.accent,
      borderRadius: 10,
      paddingVertical: 13,
      alignItems: 'center',
    },
    btnPrimaryText: {
      color: COLORS.bg,
      fontSize: 15,
      fontWeight: '700',
    },
    btnSecondary: {
      backgroundColor: COLORS.surfaceElevated,
      borderRadius: 10,
      paddingVertical: 13,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: COLORS.danger,
    },
    btnSecondaryText: {
      color: COLORS.danger,
      fontSize: 15,
      fontWeight: '600',
    },
    btnGhost: {
      paddingVertical: 10,
      alignItems: 'center',
    },
    btnGhostText: {
      color: COLORS.textMuted,
      fontSize: 14,
    },
  }), [COLORS]);

  async function handleEnd(keep: boolean) {
    setEnding(true);
    const res = await end(keep);
    setResult(res);
    setEnding(false);
  }

  return (
    <>
      <View style={[styles.wrapper, { bottom: bottomOffset }]} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.pill}
          onPress={() => setShowDialog(true)}
          activeOpacity={0.85}
        >
          <View style={styles.dot} />
          <Text style={styles.label}>Тест-режим</Text>
          {count > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{count}</Text>
            </View>
          )}
          <Text style={styles.chevron}>→</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showDialog}
        transparent
        animationType="fade"
        onRequestClose={() => !ending && setShowDialog(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            {result ? (
              <>
                <Text style={styles.dialogTitle}>
                  {result.transferredCount > 0
                    ? `${result.transferredCount} трека добавлено в библиотеку`
                    : 'Тест-сессия завершена'}
                </Text>
                <TouchableOpacity
                  style={styles.btnPrimary}
                  onPress={() => setShowDialog(false)}
                >
                  <Text style={styles.btnPrimaryText}>Закрыть</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.dialogTitle}>Завершить тест-режим</Text>
                <Text style={styles.dialogSubtitle}>
                  {count > 0
                    ? `У тебя ${count} действий. Перенести понравившееся в библиотеку?`
                    : 'Что делаем с тест-сессией?'}
                </Text>

                {ending ? (
                  <ActivityIndicator color={COLORS.accent} style={{ marginTop: 16 }} />
                ) : (
                  <View style={styles.dialogActions}>
                    <TouchableOpacity
                      style={styles.btnPrimary}
                      onPress={() => void handleEnd(true)}
                    >
                      <Text style={styles.btnPrimaryText}>Перенести лайки</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.btnSecondary}
                      onPress={() => void handleEnd(false)}
                    >
                      <Text style={styles.btnSecondaryText}>Удалить всё</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.btnGhost}
                      onPress={() => setShowDialog(false)}
                    >
                      <Text style={styles.btnGhostText}>Продолжить слушать</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

