import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants/theme';

interface HeaderProps {
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSignOut }) => {
  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>
          HanoiGO <Text style={styles.headerHighlight}>Mobile 🚀</Text>
        </Text>
        <TouchableOpacity style={styles.signOutButton} onPress={onSignOut}>
          <Text style={styles.signOutButtonText}>🔒 Đăng xuất</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.headerSubtitle}>Môi Trường Kiểm Thử Ứng Dụng iOS (Expo Go)</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 6,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  headerHighlight: {
    color: COLORS.primary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textHelper,
    marginTop: 6,
    textAlign: 'center',
  },
  signOutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  signOutButtonText: {
    color: COLORS.errorText,
    fontSize: 12,
    fontWeight: '600',
  },
});
