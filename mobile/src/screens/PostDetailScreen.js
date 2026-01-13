import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../contexts/AuthContext';
import { postsAPI } from '../services/api';
import { colors, spacing, fontSize } from '../utils/theme';
import { formatTimeAgo, formatCount } from '../utils/helpers';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function PostDetailScreen({ route, navigation }) {
  const { postId } = route.params;
  const { user } = useAuth();
  const videoRef = useRef(null);

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  useEffect(() => {
    loadPost();
  }, [postId]);

  const loadPost = async () => {
    try {
      setLoading(true);
      const response = await postsAPI.getPost(postId);
      setPost(response.data.post);
      setIsLiked(response.data.post.isLiked);
      setLikeCount(response.data.post.likeCount);
    } catch (error) {
      console.error('Error loading post:', error);
      Alert.alert('Error', 'Failed to load post');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    try {
      if (isLiked) {
        setIsLiked(false);
        setLikeCount((prev) => prev - 1);
        await postsAPI.unlike(postId);
      } else {
        setIsLiked(true);
        setLikeCount((prev) => prev + 1);
        await postsAPI.like(postId);
      }
    } catch (error) {
      setIsLiked(!isLiked);
      setLikeCount(post.likeCount);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await postsAPI.deletePost(postId);
            navigation.goBack();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete post');
          }
        },
      },
    ]);
  };

  const handleReport = () => {
    Alert.alert('Report Post', 'Why are you reporting this post?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Spam', onPress: () => submitReport('spam') },
      { text: 'Inappropriate', onPress: () => submitReport('inappropriate') },
      { text: 'Harassment', onPress: () => submitReport('harassment') },
    ]);
  };

  const submitReport = async (reason) => {
    try {
      await postsAPI.report(postId, { reason });
      Alert.alert('Reported', 'Thank you for reporting this post.');
    } catch (error) {
      Alert.alert('Error', 'Failed to report post');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!post) {
    return null;
  }

  const isOwnPost = post.user.id === user?.id;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Profile', { username: post.user.username })}
          >
            <Text style={styles.username}>@{post.user.username}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={isOwnPost ? handleDelete : handleReport}>
            <Text style={styles.moreButton}>⋯</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Video */}
      <TouchableWithoutFeedback onPress={() => setIsMuted(!isMuted)}>
        <View style={styles.videoContainer}>
          <Video
            ref={videoRef}
            source={{ uri: post.videoUrl }}
            style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            isLooping
            shouldPlay
            isMuted={isMuted}
          />

          {isMuted && (
            <View style={styles.muteIndicator}>
              <Text style={styles.muteText}>🔇</Text>
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>

      {/* Bottom info */}
      <SafeAreaView style={styles.bottomSafeArea} edges={['bottom']}>
        <View style={styles.infoContainer}>
          {post.caption && <Text style={styles.caption}>{post.caption}</Text>}
          <Text style={styles.timestamp}>{formatTimeAgo(post.createdAt)}</Text>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
              <Text style={[styles.actionIcon, isLiked && styles.likedIcon]}>
                {isLiked ? '♥' : '♡'}
              </Text>
              <Text style={styles.actionCount}>{formatCount(likeCount)}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Comments', { postId })}
            >
              <Text style={styles.actionIcon}>💬</Text>
              <Text style={styles.actionCount}>{formatCount(post.commentCount)}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionIcon}>↗</Text>
              <Text style={styles.actionCount}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  safeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  closeButton: {
    color: colors.white,
    fontSize: 24,
    padding: spacing.sm,
  },
  username: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  moreButton: {
    color: colors.white,
    fontSize: 24,
    padding: spacing.sm,
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.6,
  },
  muteIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -25 }, { translateY: -25 }],
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  muteText: {
    fontSize: 24,
  },
  bottomSafeArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  infoContainer: {
    padding: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  caption: {
    color: colors.white,
    fontSize: fontSize.md,
    marginBottom: spacing.sm,
  },
  timestamp: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionIcon: {
    fontSize: 24,
    color: colors.white,
  },
  likedIcon: {
    color: colors.heart,
  },
  actionCount: {
    color: colors.white,
    fontSize: fontSize.md,
  },
});
