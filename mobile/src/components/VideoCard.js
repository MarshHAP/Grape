import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { postsAPI } from '../services/api';
import { colors, spacing, fontSize } from '../utils/theme';
import { formatTimeAgo, formatCount } from '../utils/helpers';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function VideoCard({
  post,
  isActive,
  height,
  onUserPress,
  onCommentPress,
}) {
  const videoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const lastTap = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.playAsync();
      } else {
        videoRef.current.pauseAsync();
        videoRef.current.setPositionAsync(0);
      }
    }
  }, [isActive]);

  const handleDoubleTap = async () => {
    const now = Date.now();
    if (lastTap.current && now - lastTap.current < 300) {
      // Double tap - like
      if (!isLiked) {
        try {
          setIsLiked(true);
          setLikeCount((prev) => prev + 1);
          await postsAPI.like(post.id);
        } catch (error) {
          setIsLiked(false);
          setLikeCount((prev) => prev - 1);
        }
      }
    } else {
      // Single tap - mute/unmute
      setIsMuted(!isMuted);
    }
    lastTap.current = now;
  };

  const handleLikePress = async () => {
    try {
      if (isLiked) {
        setIsLiked(false);
        setLikeCount((prev) => prev - 1);
        await postsAPI.unlike(post.id);
      } else {
        setIsLiked(true);
        setLikeCount((prev) => prev + 1);
        await postsAPI.like(post.id);
      }
    } catch (error) {
      // Revert on error
      setIsLiked(!isLiked);
      setLikeCount(post.likeCount);
    }
  };

  return (
    <View style={[styles.container, { height }]}>
      <TouchableWithoutFeedback onPress={handleDoubleTap}>
        <View style={styles.videoContainer}>
          <Video
            ref={videoRef}
            source={{ uri: post.videoUrl }}
            style={styles.video}
            resizeMode={ResizeMode.COVER}
            isLooping
            isMuted={isMuted}
            shouldPlay={isActive}
            useNativeControls={false}
          />

          {/* Mute indicator */}
          {isMuted && (
            <View style={styles.muteIndicator}>
              <Text style={styles.muteText}>🔇</Text>
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>

      {/* Overlay content */}
      <View style={styles.overlay}>
        {/* Right side actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={onUserPress}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {post.user.username[0].toUpperCase()}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleLikePress}>
            <Text style={[styles.actionIcon, isLiked && styles.likedIcon]}>
              {isLiked ? '♥' : '♡'}
            </Text>
            <Text style={styles.actionCount}>{formatCount(likeCount)}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={onCommentPress}>
            <Text style={styles.actionIcon}>💬</Text>
            <Text style={styles.actionCount}>{formatCount(post.commentCount)}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>↗</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom info */}
        <View style={styles.info}>
          <TouchableOpacity onPress={onUserPress}>
            <Text style={styles.username}>@{post.user.username}</Text>
          </TouchableOpacity>
          {post.caption && <Text style={styles.caption}>{post.caption}</Text>}
          <Text style={styles.timestamp}>{formatTimeAgo(post.createdAt)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    backgroundColor: colors.black,
  },
  videoContainer: {
    flex: 1,
  },
  video: {
    flex: 1,
  },
  muteIndicator: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: spacing.sm,
  },
  muteText: {
    fontSize: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actions: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.xl,
    alignItems: 'center',
    gap: spacing.lg,
  },
  actionButton: {
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  avatarText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: 'bold',
  },
  actionIcon: {
    fontSize: 28,
    color: colors.white,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  likedIcon: {
    color: colors.heart,
  },
  actionCount: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  info: {
    position: 'absolute',
    left: spacing.md,
    right: 80,
    bottom: spacing.xl,
  },
  username: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  caption: {
    color: colors.white,
    fontSize: fontSize.md,
    marginBottom: spacing.xs,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  timestamp: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
