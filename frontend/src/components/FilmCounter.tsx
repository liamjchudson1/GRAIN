import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface Props {
  remaining: number;
  total?: number;
  resetAt?: string;
  compact?: boolean;
}

export default function FilmCounter({ remaining, total = 12, resetAt, compact }: Props) {
  const pct = remaining / total;
  const color =
    remaining === 0 ? theme.colors.danger : remaining <= 3 ? '#FF9500' : theme.colors.accent;

  const daysUntilReset = resetAt
    ? Math.max(0, Math.ceil((new Date(resetAt).getTime() - Date.now()) / 86400000))
    : null;

  if (compact) {
    return (
      <View style={styles.compact}>
        <View style={[styles.dot, { backgroundColor: remaining > 0 ? color : theme.colors.danger }]} />
        <Text style={[styles.compactText, { color }]}>
          {remaining}/{total}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>FILM ROLL</Text>
        <Text style={[styles.count, { color }]}>
          {remaining} <Text style={styles.countOf}>/ {total}</Text>
        </Text>
      </View>

      {/* Film strip */}
      <View style={styles.strip}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.frame,
              { backgroundColor: i < remaining ? color : theme.colors.surfaceAlt },
              i < remaining && styles.frameActive,
            ]}
          />
        ))}
      </View>

      {daysUntilReset !== null && (
        <Text style={styles.reset}>
          {remaining === 0
            ? `Resets in ${daysUntilReset}d`
            : `${remaining} shot${remaining !== 1 ? 's' : ''} left this week`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  label: {
    fontSize: theme.font.xs,
    color: theme.colors.textMuted,
    letterSpacing: 1.5,
    fontWeight: '600',
  },
  count: {
    fontSize: theme.font.xl,
    fontWeight: '700',
  },
  countOf: {
    fontSize: theme.font.md,
    color: theme.colors.textMuted,
    fontWeight: '400',
  },
  strip: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: theme.spacing.sm,
  },
  frame: {
    flex: 1,
    height: 8,
    borderRadius: 2,
  },
  frameActive: {
    opacity: 1,
  },
  reset: {
    fontSize: theme.font.xs,
    color: theme.colors.textMuted,
    textAlign: 'right',
  },
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  compactText: {
    fontSize: theme.font.sm,
    fontWeight: '600',
  },
});