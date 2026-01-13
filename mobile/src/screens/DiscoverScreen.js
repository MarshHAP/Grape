import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import VideoCard from '../components/VideoCard';
import { postsAPI, searchAPI } from '../services/api';
import { colors, spacing, fontSize, borderRadius } from '../utils/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const TAB_BAR_HEIGHT = 80;
const HEADER_HEIGHT = 100;
const VIDEO_HEIGHT = SCREEN_HEIGHT - TAB_BAR_HEIGHT - HEADER_HEIGHT;

export default function DiscoverScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [searchType, setSearchType] = useState('users'); // 'users' or 'hashtags'
  const flatListRef = useRef(null);

  const loadDiscover = async (pageNum = 1, refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else if (pageNum === 1) setLoading(true);

      const response = await postsAPI.getDiscover(pageNum);
      const newPosts = response.data.posts;

      if (pageNum === 1) {
        setPosts(newPosts);
      } else {
        setPosts((prev) => [...prev, ...newPosts]);
      }

      setHasMore(response.data.pagination.hasMore);
      setPage(pageNum);
    } catch (error) {
      console.error('Error loading discover:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (!searchQuery) {
        loadDiscover(1, false);
      }
    }, [])
  );

  const handleSearch = async (query) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    try {
      if (searchType === 'users') {
        const response = await searchAPI.users(query);
        setSearchResults({ type: 'users', data: response.data.users });
      } else {
        const response = await searchAPI.hashtags(query);
        setSearchResults({ type: 'hashtags', data: response.data.hashtags });
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const handleRefresh = () => {
    if (searchQuery) {
      handleSearch(searchQuery);
    } else {
      loadDiscover(1, true);
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore && !searchQuery) {
      loadDiscover(page + 1);
    }
  };

  const handleViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }, []);

  const renderSearchResult = ({ item }) => {
    if (searchResults?.type === 'users') {
      return (
        <TouchableOpacity
          style={styles.userResult}
          onPress={() => navigation.navigate('Profile', { username: item.username })}
        >
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {item.username[0].toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.username}>@{item.username}</Text>
            {item.bio && <Text style={styles.userBio} numberOfLines={1}>{item.bio}</Text>}
          </View>
        </TouchableOpacity>
      );
    } else {
      return (
        <TouchableOpacity
          style={styles.hashtagResult}
          onPress={() => navigation.navigate('Hashtag', { tag: item.tag })}
        >
          <Text style={styles.hashtagIcon}>#</Text>
          <View style={styles.hashtagInfo}>
            <Text style={styles.hashtagName}>{item.tag}</Text>
            <Text style={styles.hashtagCount}>{item.postCount} posts</Text>
          </View>
        </TouchableOpacity>
      );
    }
  };

  const renderVideoItem = ({ item, index }) => (
    <VideoCard
      post={item}
      isActive={index === currentIndex}
      height={VIDEO_HEIGHT}
      onUserPress={() => navigation.navigate('Profile', { username: item.user.username })}
      onCommentPress={() => navigation.navigate('Comments', { postId: item.id })}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search Header */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search users or #hashtags"
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setSearchResults(null);
              }}
            >
              <Text style={styles.clearButton}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Search Type Tabs */}
        {searchQuery && (
          <View style={styles.searchTabs}>
            <TouchableOpacity
              style={[styles.searchTab, searchType === 'users' && styles.searchTabActive]}
              onPress={() => {
                setSearchType('users');
                handleSearch(searchQuery);
              }}
            >
              <Text style={[styles.searchTabText, searchType === 'users' && styles.searchTabTextActive]}>
                Users
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.searchTab, searchType === 'hashtags' && styles.searchTabActive]}
              onPress={() => {
                setSearchType('hashtags');
                handleSearch(searchQuery);
              }}
            >
              <Text style={[styles.searchTabText, searchType === 'hashtags' && styles.searchTabTextActive]}>
                Hashtags
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Content */}
      {searchResults ? (
        <FlatList
          data={searchResults.data}
          renderItem={renderSearchResult}
          keyExtractor={(item) => item.id || item.tag}
          style={styles.searchList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No results found</Text>
            </View>
          }
        />
      ) : loading && posts.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={posts}
          renderItem={renderVideoItem}
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
              <Text style={styles.emptyText}>No videos to discover</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.md,
  },
  clearButton: {
    color: colors.textMuted,
    fontSize: 16,
    padding: spacing.xs,
  },
  searchTabs: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  searchTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
  },
  searchTabActive: {
    backgroundColor: colors.primary,
  },
  searchTabText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  searchTabTextActive: {
    color: colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xxl,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  searchList: {
    flex: 1,
  },
  userResult: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  userAvatarText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  userBio: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  hashtagResult: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  hashtagIcon: {
    fontSize: 24,
    color: colors.primary,
    marginRight: spacing.md,
    width: 48,
    textAlign: 'center',
  },
  hashtagInfo: {
    flex: 1,
  },
  hashtagName: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  hashtagCount: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
});
