import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { theme } from '../theme';

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface Props {
  date: string;
  style?: TextStyle;
  prefix?: string;
}

export default function TimeAgo({ date, style, prefix = '' }: Props) {
  const [label, setLabel] = useState(formatTimeAgo(date));

  useEffect(() => {
    const interval = setInterval(() => setLabel(formatTimeAgo(date)), 30000);
    return () => clearInterval(interval);
  }, [date]);

  return <Text style={[styles.text, style]}>{prefix}{label}</Text>;
}

const styles = StyleSheet.create({
  text: {
    fontSize: theme.font.xs,
    color: theme.colors.textMuted,
  },
});