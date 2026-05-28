import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  SafeAreaView
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS, SHADOWS } from '../constants/theme';
import { AuthMode, NetworkStatus } from '../types';

interface LoginScreenProps {
  ipAddress: string;
  setIpAddress: (ip: string) => void;
  onLoginSuccess: (token: string, username: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  ipAddress,
  setIpAddress,
  onLoginSuccess,
}) => {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authStatus, setAuthStatus] = useState<NetworkStatus>('idle');
  const [authMessage, setAuthMessage] = useState('');

  const handleAuth = async () => {
    if (!ipAddress || ipAddress === '192.168.1.') {
      setAuthStatus('error');
      setAuthMessage('Vui lòng điền IP LAN của máy tính ở bên dưới!');
      return;
    }
    
    if (!authEmail || !authPassword || (authMode === 'register' && !authUsername)) {
      setAuthStatus('error');
      setAuthMessage('Vui lòng điền đầy đủ các thông tin yêu cầu!');
      return;
    }

    setAuthStatus('loading');
    setAuthMessage('');

    try {
      const endpoint = authMode === 'login' ? 'login' : 'register';
      const bodyPayload = authMode === 'login' 
        ? { email: authEmail.trim(), password: authPassword }
        : { email: authEmail.trim(), password: authPassword, username: authUsername.trim() };

      const response = await fetch(`http://${ipAddress.trim()}:8888/auth/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyPayload),
      });

      const data = await response.json();

      if (response.ok) {
        setAuthStatus('success');
        if (authMode === 'login') {
          setAuthMessage(`Đăng nhập THÀNH CÔNG! 🎉\nToken JWT: ${data.access_token?.substring(0, 30)}...\nUsername: ${data.user?.username || 'N/A'}`);
          
          // Triggers transition to main dashboard screen
          setTimeout(() => {
            onLoginSuccess(data.access_token, data.user?.username || 'N/A');
          }, 800);
        } else {
          setAuthMessage(`Đăng ký THÀNH CÔNG! 📝\nEmail: ${data.email}\n💡 Mẹo: Bây giờ bạn có thể chuyển sang "Đăng Nhập" để test thử.`);
          setAuthMode('login');
        }
      } else {
        setAuthStatus('error');
        const errMsg = Array.isArray(data.message) ? data.message.join(', ') : data.message;
        setAuthMessage(`Thất bại: ${errMsg || 'Sai thông tin hoặc lỗi máy chủ'}`);
      }
    } catch (error: any) {
      setAuthStatus('error');
      setAuthMessage(`Lỗi kết nối: ${error.message}`);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.loginScreenContainer} 
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.loginLogoContainer}>
            <Text style={styles.loginLogo}>
              HanoiGO <Text style={styles.headerHighlight}>🚀</Text>
            </Text>
            <Text style={styles.loginTagline}>Khám phá di sản Hà Nội trên nền tảng di động</Text>
          </View>

          {/* Auth Card */}
          <View style={[styles.loginCard, SHADOWS.loginCard]}>
            <Text style={styles.loginCardTitle}>
              {authMode === 'login' ? 'Đăng Nhập Hệ Thống 🔑' : 'Đăng Ký Tài Khoản 📝'}
            </Text>
            
            {/* Toggle Modes */}
            <View style={styles.authToggleRow}>
              <TouchableOpacity 
                style={[styles.authToggleTab, authMode === 'login' && styles.authToggleTabActive]}
                onPress={() => {
                  setAuthMode('login');
                  setAuthStatus('idle');
                  setAuthMessage('');
                }}
              >
                <Text style={[styles.authToggleText, authMode === 'login' && styles.authToggleTextActive]}>
                  Đăng Nhập
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.authToggleTab, authMode === 'register' && styles.authToggleTabActive]}
                onPress={() => {
                  setAuthMode('register');
                  setAuthStatus('idle');
                  setAuthMessage('');
                }}
              >
                <Text style={[styles.authToggleText, authMode === 'register' && styles.authToggleTextActive]}>
                  Đăng Ký
                </Text>
              </TouchableOpacity>
            </View>

            {/* Username field (Register only) */}
            {authMode === 'register' && (
              <View style={styles.authInputContainer}>
                <Text style={styles.authInputLabel}>Tên tài khoản (username):</Text>
                <TextInput 
                  style={styles.authTextInput}
                  value={authUsername}
                  onChangeText={setAuthUsername}
                  placeholder="Ví dụ: hung_nguyen"
                  placeholderTextColor={COLORS.textHelper}
                  autoCapitalize="none"
                />
              </View>
            )}

            {/* Email Field */}
            <View style={styles.authInputContainer}>
              <Text style={styles.authInputLabel}>Địa chỉ Email:</Text>
              <TextInput 
                style={styles.authTextInput}
                value={authEmail}
                onChangeText={setAuthEmail}
                placeholder="explorer@hanoigo.vn"
                placeholderTextColor={COLORS.textHelper}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Password Field */}
            <View style={styles.authInputContainer}>
              <Text style={styles.authInputLabel}>Mật khẩu:</Text>
              <TextInput 
                style={styles.authTextInput}
                value={authPassword}
                onChangeText={setAuthPassword}
                placeholder="********"
                placeholderTextColor={COLORS.textHelper}
                secureTextEntry
                autoCapitalize="none"
              />
              {authMode === 'register' && (
                <Text style={styles.passwordHint}>
                  *Mật khẩu tối thiểu 8 ký tự, chữ hoa, số và ký tự đặc biệt.
                </Text>
              )}
            </View>

            {/* LAN Configuration Input inside login */}
            <View style={styles.authInputContainer}>
              <Text style={styles.authInputLabel}>IP LAN Máy Tính (Kết nối NestJS):</Text>
              <TextInput 
                style={styles.authTextInput}
                value={ipAddress}
                onChangeText={setIpAddress}
                placeholder="172.20.10.3"
                placeholderTextColor={COLORS.textHelper}
                keyboardType="numeric"
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity 
              style={styles.buttonPrimary} 
              onPress={handleAuth}
              disabled={authStatus === 'loading'}
            >
              {authStatus === 'loading' ? (
                <ActivityIndicator color={COLORS.textPrimary} size="small" />
              ) : (
                <Text style={styles.buttonText}>
                  {authMode === 'login' ? 'Đăng Nhập 🔑' : 'Tạo Tài Khoản 📝'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Results display */}
            {authStatus === 'success' && (
              <View style={[styles.resultBox, styles.resultSuccess, { marginTop: 16 }]}>
                <Text style={styles.resultTextSuccess}>{authMessage}</Text>
              </View>
            )}
            
            {authStatus === 'error' && (
              <View style={[styles.resultBox, styles.resultError, { marginTop: 16 }]}>
                <Text style={styles.resultTextError}>{authMessage}</Text>
              </View>
            )}
          </View>

          {/* LAN Info */}
          <View style={styles.loginLanInfo}>
            <Text style={styles.loginLanText}>🔗 Kết nối tới Server LAN máy tính: {ipAddress}:8888</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loginScreenContainer: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 80 : 50,
    paddingBottom: 40,
    justifyContent: 'center',
    flexGrow: 1,
  },
  loginLogoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  loginLogo: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  headerHighlight: {
    color: COLORS.primary,
  },
  loginTagline: {
    fontSize: 13,
    color: COLORS.textHelper,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 18,
  },
  loginCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  loginCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  authToggleRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  authToggleTab: {
    flex: 1,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  authToggleTabActive: {
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.secondaryBorder,
  },
  authToggleText: {
    color: COLORS.textHelper,
    fontSize: 13,
    fontWeight: '600',
  },
  authToggleTextActive: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  authInputContainer: {
    marginBottom: 16,
  },
  authInputLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  authTextInput: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    color: COLORS.textPrimary,
    fontSize: 14,
    height: 48,
    paddingHorizontal: 16,
  },
  passwordHint: {
    color: COLORS.textHelper,
    fontSize: 10,
    marginTop: 4,
    lineHeight: 14,
  },
  buttonPrimary: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.floatingButton,
    marginTop: 8,
  },
  buttonText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  resultBox: {
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
  loginLanInfo: {
    alignItems: 'center',
    marginTop: 24,
  },
  loginLanText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
