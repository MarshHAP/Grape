import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TouchableOpacity } from 'react-native';

import VideoCard from '../components/VideoCard';
import { searchAPI } from '../services/api';
import { colors, spacing, fontSize } from '../utils/theme';
import { formatCount } from '../utils/helpers';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_HEIGHT = 120;
const VIDEO_HEIGHT = SCREEN_HEIGHT - HEADER_HEIGHT;

export default function HashtagScreen({ route, navigation }) {
  const { tag } = route.params;
  const flatListRef = useRef(null);

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalPosts, setTotalPosts] = useState(0);

  const loadPosts = async (pageNum = 1, refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else if (pageNum === 1) setLoading(true);

      const response = await searchAPI.getHashtagPosts(tag, pageNum);
      const newPosts = response.data.posts;

      if (pageNum === 1) {
        setPosts(newPosts);
      } else {
        setPosts((prev) => [...prev, ...newPosts]);
      }

      setHasMore(response.data.pagination.hasMore);
      setTotalPosts(response.data.pagination.total);
      setPage(pageNum);
    } catch (error) {
      console.error('Error loading hashtag posts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [tag]);

  const handleRefresh = () => {
    loadPosts(1, true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadPosts(page + 1);
    }
  };

  const handleViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }, []);

  const renderItem = ({ item, index }) => (
    <VideoCard
      post={item}
      isActive={index === currentIndex}
      height={VIDEO_HEIGHT}
      onUserPress={() => navigation.navigate('Profile', { username: item.user.username })}
      onCommentPress={() => navigation.navigate('Comments', { postId: item.id })}
    />
  );

  if (loading && posts.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.hashtagInfo}>
          <Text style={styles.hashtagName}>#{tag}</Text>
          <Text style={styles.postCount}>{formatCount(totalPosts)} posts</Text>
        </View>
      </View>

      {/* Posts */}
      <FlatList
        ref={flatListRef}
        data={posts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={VIDEO_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No posts with #{tag}</Text>
          </View>
        }
        ListFooterComponent={
          hasMore && posts.length > 0 ? (
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
    height: HEADER_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  headerTop: {
    paddingVertical: spacing.sm,
  },
  backButton: {
    color: colors.primary,
    fontSize: fontSize.md,
  },
  hashtagInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  hashtagName: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  postCount: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  emptyContainer: {
    height: VIDEO_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.lg,
  },
  footer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
});
