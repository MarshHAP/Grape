import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { notificationsAPI } from '../services/api';
import { colors, spacing, fontSize, borderRadius } from '../utils/theme';
import { formatTimeAgo } from '../utils/helpers';

export default function ActivityScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadNotifications = async (pageNum = 1, refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else if (pageNum === 1) setLoading(true);

      const response = await notificationsAPI.getNotifications(pageNum);
      const newNotifications = response.data.notifications;

      if (pageNum === 1) {
        setNotifications(newNotifications);
      } else {
        setNotifications((prev) => [...prev, ...newNotifications]);
      }

      setHasMore(response.data.pagination.hasMore);
      setPage(pageNum);

      // Mark all as read
      if (response.data.unreadCount > 0) {
        await notificationsAPI.markAllAsRead();
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadNotifications(1, false);
    }, [])
  );

  const handleRefresh = () => {
    loadNotifications(1, true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadNotifications(page + 1);
    }
  };

  const getNotificationText = (notification) => {
    switch (notification.type) {
      case 'like':
        return 'liked your video';
      case 'comment':
        return 'commented on your video';
      case 'follow':
        return 'started following you';
      case 'mention':
        return 'mentioned you';
      default:
        return 'interacted with you';
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'like':
        return '♥';
      case 'comment':
        return '💬';
      case 'follow':
        return '👤';
      case 'mention':
        return '@';
      default:
        return '🔔';
    }
  };

  const handleNotificationPress = (notification) => {
    if (notification.type === 'follow') {
      navigation.navigate('Profile', { username: notification.actor.username });
    } else if (notification.post) {
      navigation.navigate('PostDetail', { postId: notification.post.id });
    }
  };

  const renderNotification = ({ item }) => (
    <TouchableOpacity
      style={[styles.notification, !item.read && styles.unread]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.iconContainer}>
        <Text style={[styles.icon, item.type === 'like' && styles.heartIcon]}>
          {getNotificationIcon(item.type)}
        </Text>
      </View>

      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Profile', { username: item.actor.username })}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.actor.username[0].toUpperCase()}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.textContainer}>
            <Text style={styles.notificationText}>
              <Text style={styles.username}>@{item.actor.username}</Text>
              {' '}{getNotificationText(item)}
            </Text>
            <Text style={styles.timestamp}>{formatTimeAgo(item.createdAt)}</Text>
          </View>
        </View>

        {item.comment && (
          <Text style={styles.commentText} numberOfLines={2}>
            "{item.comment.text}"
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading && notifications.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activity</Text>
      </View>

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyText}>No activity yet</Text>
            <Text style={styles.emptySubtext}>
              When people interact with your posts, you'll see it here.
            </Text>
          </View>
        }
        ListFooterComponent={
          hasMore && notifications.length > 0 ? (
            <View style={styles.footer}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
  },
  notification: {
    flexDirection: 'row',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  unread: {
    backgroundColor: colors.surface,
  },
  iconContainer: {
    width: 40,
    alignItems: 'center',
    paddingTop: 4,
  },
  icon: {
    fontSize: 20,
    color: colors.primary,
  },
  heartIcon: {
    color: colors.heart,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  avatarText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: 'bold',
  },
  textContainer: {
    flex: 1,
  },
  notificationText: {
    color: colors.text,
    fontSize: fontSize.md,
    lineHeight: 20,
  },
  username: {
    fontWeight: 'bold',
  },
  timestamp: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  commentText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    marginLeft: 48,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
    paddingHorizontal: spacing.lg,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
});
