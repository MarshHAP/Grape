import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../utils/theme';

const icons = {
  home: {
    active: '⌂',
    inactive: '○',
  },
  search: {
    active: '◉',
    inactive: '○',
  },
  heart: {
    active: '♥',
    inactive: '♡',
  },
  user: {
    active: '●',
    inactive: '○',
  },
};

export default function TabIcon({ name, focused, badge }) {
  const icon = icons[name] || icons.home;

  return (
    <View style={styles.container}>
      <Text style={[styles.icon, focused && styles.iconActive]}>
        {focused ? icon.active : icon.inactive}
      </Text>
      {badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 24,
    color: colors.textMuted,
  },
  iconActive: {
    color: colors.white,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
});
