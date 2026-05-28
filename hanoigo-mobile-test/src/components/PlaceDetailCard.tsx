import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import { Place } from '../types';

interface PlaceDetailCardProps {
  place: Place;
  onClose?: () => void;
  onCenterOnPlace?: () => void;
}

export const PlaceDetailCard: React.FC<PlaceDetailCardProps> = ({
  place,
  onClose,
  onCenterOnPlace,
}) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Parse category colors for beautiful badges
  const getCategoryColor = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'temple':
      case 'pagoda':
      case 'chùa':
      case 'đền':
        return '#EF4444'; // Red-ish for spiritual spots
      case 'lake':
      case 'hồ':
        return '#3B82F6'; // Blue-ish for natural/water bodies
      case 'historical':
      case 'di tích':
      case 'lịch sử':
        return '#F59E0B'; // Amber for historic landmarks
      case 'museum':
      case 'bảo tàng':
        return '#10B981'; // Emerald for educational museums
      default:
        return '#8B5CF6'; // Purple as default
    }
  };

  return (
    <View style={[styles.card, SHADOWS.card]}>
      {/* Header bar row */}
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>{place.title}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: getCategoryColor(place.category) }]}>
              <Text style={styles.badgeText}>{place.category}</Text>
            </View>
            {place.district ? (
              <View style={[styles.badge, styles.districtBadge]}>
                <Text style={styles.districtBadgeText}>📍 {place.district}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Main Content (Image + Details) */}
      <View style={styles.contentRow}>
        {place.imageUrl ? (
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: place.imageUrl }} 
              style={styles.image}
              onLoadStart={() => setImageLoading(true)}
              onLoadEnd={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                setImageError(true);
              }}
            />
            {imageLoading && (
              <View style={styles.imagePlaceholder}>
                <ActivityIndicator color={COLORS.primary} size="small" />
              </View>
            )}
            {imageError && (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.errorIcon}>🖼️</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.imageContainer, styles.imageContainerFallback]}>
            <Text style={styles.fallbackIcon}>🏛️</Text>
          </View>
        )}

        <View style={styles.detailsContainer}>
          <Text style={styles.description} numberOfLines={4}>
            {place.description}
          </Text>
        </View>
      </View>

      {/* Actions */}
      {onCenterOnPlace && (
        <TouchableOpacity style={styles.actionButton} onPress={onCenterOnPlace}>
          <Text style={styles.actionButtonText}>📍 Xem vị trí trên bản đồ</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: COLORS.textPrimary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  districtBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  districtBadgeText: {
    color: COLORS.infoText,
    fontSize: 10,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: COLORS.secondary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.secondaryBorder,
  },
  closeButtonText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  contentRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: COLORS.background,
  },
  imageContainerFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 24,
  },
  fallbackIcon: {
    fontSize: 28,
  },
  detailsContainer: {
    flex: 1,
  },
  description: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  actionButton: {
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.secondaryBorder,
    borderRadius: 10,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  actionButtonText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
});
