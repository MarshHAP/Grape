import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, fontSize, borderRadius } from '../utils/theme';

export default function SettingsScreen({ navigation }) {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: logout,
      },
    ]);
  };

  const SettingsItem = ({ icon, title, subtitle, onPress, danger }) => (
    <TouchableOpacity style={styles.settingsItem} onPress={onPress}>
      <Text style={styles.settingsIcon}>{icon}</Text>
      <View style={styles.settingsTextContainer}>
        <Text style={[styles.settingsTitle, danger && styles.dangerText]}>
          {title}
        </Text>
        {subtitle && <Text style={styles.settingsSubtitle}>{subtitle}</Text>}
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  const SettingsSection = ({ title, children }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Account Section */}
        <SettingsSection title="Account">
          <SettingsItem
            icon="👤"
            title="Edit Profile"
            subtitle="Change your username, bio, and photo"
            onPress={() => navigation.navigate('EditProfile')}
          />
          <SettingsItem
            icon="📧"
            title="Email"
            subtitle={user?.email}
            onPress={() => {}}
          />
          <SettingsItem
            icon="🔒"
            title="Change Password"
            onPress={() => Alert.alert('Coming Soon', 'This feature is coming soon.')}
          />
        </SettingsSection>

        {/* Privacy Section */}
        <SettingsSection title="Privacy">
          <SettingsItem
            icon="🔐"
            title="Private Account"
            subtitle="Control who can see your videos"
            onPress={() => Alert.alert('Coming Soon', 'This feature is coming soon.')}
          />
          <SettingsItem
            icon="🚫"
            title="Blocked Accounts"
            onPress={() => Alert.alert('Coming Soon', 'This feature is coming soon.')}
          />
        </SettingsSection>

        {/* Notifications Section */}
        <SettingsSection title="Notifications">
          <SettingsItem
            icon="🔔"
            title="Push Notifications"
            subtitle="Manage notification preferences"
            onPress={() => Alert.alert('Coming Soon', 'This feature is coming soon.')}
          />
        </SettingsSection>

        {/* Support Section */}
        <SettingsSection title="Support">
          <SettingsItem
            icon="❓"
            title="Help Center"
            onPress={() => Alert.alert('Help', 'Visit our help center for FAQs and support.')}
          />
          <SettingsItem
            icon="📝"
            title="Terms of Service"
            onPress={() => {}}
          />
          <SettingsItem
            icon="🔏"
            title="Privacy Policy"
            onPress={() => {}}
          />
        </SettingsSection>

        {/* About Section */}
        <SettingsSection title="About">
          <SettingsItem
            icon="🍇"
            title="Grape"
            subtitle="Version 1.0.0"
            onPress={() => {}}
          />
        </SettingsSection>

        {/* Logout */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>🍇 Grape</Text>
          <Text style={styles.footerSubtext}>6-second videos. Infinite possibilities.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    color: colors.primary,
    fontSize: fontSize.md,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionContent: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingsIcon: {
    fontSize: 20,
    marginRight: spacing.md,
    width: 30,
    textAlign: 'center',
  },
  settingsTextContainer: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  settingsSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  dangerText: {
    color: colors.error,
  },
  chevron: {
    fontSize: 20,
    color: colors.textMuted,
  },
  logoutSection: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  logoutButton: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error,
  },
  logoutText: {
    color: colors.error,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  footerText: {
    fontSize: fontSize.lg,
    color: colors.primary,
    fontWeight: 'bold',
  },
  footerSubtext: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
