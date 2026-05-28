import React, { useState, useRef, useEffect } from 'react';
import { 
  ScrollView, 
  View, 
  Text, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  SafeAreaView
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import MapView from 'react-native-maps';
import { COLORS } from '../constants/theme';
import { Place, GpsData, GpsStatus, NetworkStatus } from '../types';

// Components
import { Header } from '../components/Header';
import { StatusCard } from '../components/StatusCard';
import { BackendTestCard } from '../components/BackendTestCard';
import { CategoryFilters } from '../components/CategoryFilters';
import { PlaceDetailCard } from '../components/PlaceDetailCard';
import { HeritageMap } from '../components/HeritageMap';

interface DashboardScreenProps {
  ipAddress: string;
  setIpAddress: (ip: string) => void;
  onSignOut: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  ipAddress,
  setIpAddress,
  onSignOut,
}) => {
  const [backendStatus, setBackendStatus] = useState<NetworkStatus>('idle');
  const [backendMessage, setBackendMessage] = useState('');
  
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('idle');
  const [gpsData, setGpsData] = useState<GpsData | null>(null);
  const [isMapFullScreen, setIsMapFullScreen] = useState(false);
  
  const mapRef = useRef<MapView>(null);
  const fullMapRef = useRef<MapView>(null);
  
  // Real DB dynamic state
  const [heritagePlaces, setHeritagePlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Dynamic category extraction
  const categories = Array.from(new Set(heritagePlaces.map(p => p.category))).filter(Boolean);

  // API Live Place fetch
  const fetchPlacesFromBackend = async () => {
    try {
      const response = await fetch(`http://${ipAddress.trim()}:8888/places?limit=100`);
      if (response.ok) {
        const data = await response.json();
        if (data.places && data.places.length > 0) {
          const formattedPlaces: Place[] = data.places.map((place: any, index: number) => ({
            id: place.id || String(index + 1),
            title: place.name || 'Địa điểm di sản',
            description: place.descriptionEn || place.address || 'Không có mô tả',
            latitude: place.lat,
            longitude: place.lng,
            category: place.category || 'Di tích',
            district: place.district || '',
            imageUrl: place.imageUrl || null,
          }));
          setHeritagePlaces(formattedPlaces);
          // Auto select first place as starting preview
          setSelectedPlace(formattedPlaces[0]);
        }
      }
    } catch (error) {
      console.log('Không thể tải địa điểm từ DB:', error);
    }
  };

  // Trigger fetch on dashboard enter
  useEffect(() => {
    fetchPlacesFromBackend();
  }, []);

  // Animates map to focus coordinates
  const centerOnPlaceCoords = (latitude: number, longitude: number, isFullScreen: boolean) => {
    const region = {
      latitude,
      longitude,
      latitudeDelta: 0.008,
      longitudeDelta: 0.008,
    };
    
    if (isFullScreen) {
      fullMapRef.current?.animateToRegion(region, 800);
    } else {
      mapRef.current?.animateToRegion(region, 800);
    }
  };

  const handleSelectPlace = (place: Place) => {
    setSelectedPlace(place);
    centerOnPlaceCoords(place.latitude, place.longitude, isMapFullScreen);
  };

  // Test backend connection
  const testBackendConnection = async () => {
    if (!ipAddress || ipAddress === '192.168.1.') {
      setBackendStatus('error');
      setBackendMessage('Vui lòng nhập địa chỉ IP LAN hợp lệ của máy tính!');
      return;
    }
    
    setBackendStatus('loading');
    setBackendMessage('');
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      
      const response = await fetch(`http://${ipAddress.trim()}:8888/`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok || response.status === 404) {
        setBackendStatus('success');
        setBackendMessage(
          response.status === 404
            ? 'KẾT NỐI MẠNG LAN THÀNH CÔNG! 🎉\n(Lỗi 404: iPhone đã tìm thấy và chạm được tới NestJS trên máy tính Windows, chỉ là NestJS không đăng ký đường dẫn nào ở trang chủ "/")'
            : `Kết nối THÀNH CÔNG! Phản hồi: ${await response.text() || 'OK (200)'}`
        );
        // Refresh places list on successful LAN test
        fetchPlacesFromBackend();
      } else {
        setBackendStatus('error');
        setBackendMessage(`Lỗi server: Mã trạng thái ${response.status}`);
      }
    } catch (error: any) {
      setBackendStatus('error');
      if (error.name === 'AbortError') {
        setBackendMessage('Kết nối bị quá giờ (Timeout). Hãy chắc chắn NestJS đang chạy và iPhone đang kết nối chung Wifi mạng LAN!');
      } else {
        setBackendMessage(`Kết nối THẤT BẠI!\nChi tiết: ${error.message}\n💡 Mẹo: Kiểm tra IP máy tính hoặc Tường lửa Windows.`);
      }
    }
  };

  // Simulate GPS coordinates
  const simulateGps = () => {
    setGpsStatus('loading');
    setTimeout(() => {
      setGpsStatus('success');
      const mockGps: GpsData = {
        lat: 21.028511,
        lng: 105.854167,
        accuracy: 5.4,
        place: 'Hồ Hoàn Kiếm, Hà Nội 📍'
      };
      setGpsData(mockGps);
      // Center map on GPS simulated spot
      centerOnPlaceCoords(mockGps.lat, mockGps.lng, isMapFullScreen);
    }, 1200);
  };

  // Filter items in real time
  const filteredPlaces = selectedCategory
    ? heritagePlaces.filter(p => p.category === selectedCategory)
    : heritagePlaces;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer} 
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <Header onSignOut={onSignOut} />

          {/* Quick Environment Info */}
          <StatusCard />

          {/* Backend Connection Test Utility */}
          <BackendTestCard 
            ipAddress={ipAddress}
            setIpAddress={setIpAddress}
            backendStatus={backendStatus}
            backendMessage={backendMessage}
            onTestConnection={testBackendConnection}
          />

          {/* Dynamic Category Chips Filters */}
          {categories.length > 0 && (
            <CategoryFilters 
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          )}

          {/* Active Heritage Spot Detail Drawer */}
          {selectedPlace && (
            <PlaceDetailCard 
              place={selectedPlace}
              onClose={() => setSelectedPlace(null)}
              onCenterOnPlace={() => centerOnPlaceCoords(selectedPlace.latitude, selectedPlace.longitude, false)}
            />
          )}

          {/* Interactive Native Map Panel */}
          <HeritageMap 
            mapRef={mapRef}
            fullMapRef={fullMapRef}
            places={filteredPlaces}
            selectedPlaceId={selectedPlace ? selectedPlace.id : null}
            onSelectPlace={handleSelectPlace}
            gpsStatus={gpsStatus}
            gpsData={gpsData}
            isMapFullScreen={isMapFullScreen}
            setIsMapFullScreen={setIsMapFullScreen}
            onSimulateGps={simulateGps}
          />

          {/* Instructions */}
          <View style={styles.instructionCard}>
            <Text style={styles.instructionTitle}>📖 Hướng Dẫn Chạy Trên iPhone</Text>
            <Text style={styles.instructionStep}>1️⃣ Tải ứng dụng <Text style={styles.bold}>Expo Go</Text> trên App Store về iPhone.</Text>
            <Text style={styles.instructionStep}>2️⃣ Đảm bảo máy tính Windows và iPhone đang kết nối <Text style={styles.bold}>chung một mạng Wifi / Hotspot</Text>.</Text>
            <Text style={styles.instructionStep}>3️⃣ Chạy lệnh <Text style={styles.codeText}>npm run start</Text> trên terminal máy tính.</Text>
            <Text style={styles.instructionStep}>4️⃣ Dùng Camera iPhone để quét mã QR hiển thị ở màn hình terminal. Trình duyệt Expo Go sẽ tự động tải app lên điện thoại của bạn!</Text>
          </View>

          <Text style={styles.footerText}>HanoiGO Project © 2026 - Phát triển bởi Antigravity Kit</Text>
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
  scrollContainer: {
    padding: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  instructionCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.secondaryBorder,
    marginTop: 16,
  },
  instructionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 14,
  },
  instructionStep: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 10,
  },
  bold: {
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    backgroundColor: COLORS.background,
    color: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 12,
  },
  footerText: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
});
