import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import { NetworkStatus } from '../types';

interface BackendTestCardProps {
  ipAddress: string;
  setIpAddress: (ip: string) => void;
  backendStatus: NetworkStatus;
  backendMessage: string;
  onTestConnection: () => void;
}

export const BackendTestCard: React.FC<BackendTestCardProps> = ({
  ipAddress,
  setIpAddress,
  backendStatus,
  backendMessage,
  onTestConnection,
}) => {
  return (
    <View style={[styles.card, SHADOWS.card]}>
      <Text style={styles.cardTitle}>🔌 Kiểm Tra Kết Nối Backend (NestJS)</Text>
      <Text style={styles.helperText}>
        Nhập địa chỉ IP mạng nội bộ (LAN) của máy tính Windows để iPhone của bạn có thể gọi tới API cổng 8888.
      </Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputPrefix}>http://</Text>
        <TextInput 
          style={styles.input}
          value={ipAddress}
          onChangeText={setIpAddress}
          placeholder="192.168.1.X"
          placeholderTextColor={COLORS.textHelper}
          keyboardType="numeric"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.inputSuffix}>:8888/</Text>
      </View>

      <TouchableOpacity 
        style={styles.buttonPrimary} 
        onPress={onTestConnection}
        disabled={backendStatus === 'loading'}
      >
        {backendStatus === 'loading' ? (
          <ActivityIndicator color={COLORS.textPrimary} size="small" />
        ) : (
          <Text style={styles.buttonText}>Thử Kết Nối Backend ⚡</Text>
        )}
      </TouchableOpacity>

      {/* Results display */}
      {backendStatus === 'success' && (
        <View style={[styles.resultBox, styles.resultSuccess]}>
          <Text style={styles.resultTextSuccess}>🎉 {backendMessage}</Text>
        </View>
      )}
      
      {backendStatus === 'error' && (
        <View style={[styles.resultBox, styles.resultError]}>
          <Text style={styles.resultTextError}>❌ {backendMessage}</Text>
        </View>
      )}
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
  helperText: {
    fontSize: 13,
    color: COLORS.textHelper,
    lineHeight: 18,
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 16,
  },
  inputPrefix: {
    color: COLORS.textHelper,
    fontSize: 14,
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 15,
    paddingHorizontal: 4,
    height: '100%',
  },
  inputSuffix: {
    color: COLORS.textHelper,
    fontSize: 14,
  },
  buttonPrimary: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.floatingButton,
  },
  buttonText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  resultBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  resultSuccess: {
    backgroundColor: COLORS.successBg,
    borderColor: COLORS.success,
  },
  resultTextSuccess: {
    color: COLORS.successText,
    fontSize: 13,
    lineHeight: 18,
  },
  resultError: {
    backgroundColor: COLORS.errorBg,
    borderColor: COLORS.error,
  },
  resultTextError: {
    color: COLORS.errorText,
    fontSize: 13,
    lineHeight: 18,
  },
});
