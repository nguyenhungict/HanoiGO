import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SHADOWS } from '../constants/theme';

export const StatusCard: React.FC = () => {
  return (
    <View style={[styles.card, SHADOWS.card]}>
      <Text style={styles.cardTitle}>📱 Trạng Thái Môi Trường</Text>
      <View style={styles.statusRow}>
        <View style={styles.statusDotActive} />
        <Text style={styles.statusText}>Thiết bị: iPhone của bạn (Expo Go)</Text>
      </View>
      <View style={styles.statusRow}>
        <View style={styles.statusDotActive} />
        <Text style={styles.statusText}>Máy chủ phát triển: Windows LAN Server</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
    marginRight: 10,
  },
  statusText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});
