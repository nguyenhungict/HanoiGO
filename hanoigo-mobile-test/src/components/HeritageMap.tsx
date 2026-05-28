import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { COLORS, SHADOWS } from '../constants/theme';
import { Place, GpsData, GpsStatus } from '../types';

interface HeritageMapProps {
  mapRef: React.RefObject<MapView | null>;
  fullMapRef: React.RefObject<MapView | null>;
  places: Place[];
  selectedPlaceId: string | null;
  onSelectPlace: (place: Place) => void;
  gpsStatus: GpsStatus;
  gpsData: GpsData | null;
  isMapFullScreen: boolean;
  setIsMapFullScreen: (val: boolean) => void;
  onSimulateGps: () => void;
}

export const HeritageMap: React.FC<HeritageMapProps> = ({
  mapRef,
  fullMapRef,
  places,
  selectedPlaceId,
  onSelectPlace,
  gpsStatus,
  gpsData,
  isMapFullScreen,
  setIsMapFullScreen,
  onSimulateGps,
}) => {
  return (
    <View style={[styles.card, SHADOWS.card]}>
      <Text style={styles.cardTitle}>🗺️ Bản Đồ Di Sản & Định Vị GPS Thực Tế</Text>
      <Text style={styles.helperText}>
        Bản đồ tương tác native chạy trực tiếp trên iPhone. Nhấn nút bên dưới để định vị vị trí giả lập tại trung tâm Hà Nội.
      </Text>

      {/* Native MapView */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: 21.028511,
            longitude: 105.854167,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          }}
          userInterfaceStyle="dark"
        >
          {/* Render Places Markers */}
          {places.map((place) => (
            <Marker
              key={place.id}
              coordinate={{ latitude: place.latitude, longitude: place.longitude }}
              title={place.title}
              description={place.description}
              pinColor={selectedPlaceId === place.id ? '#10B981' : '#3B82F6'}
              onPress={() => onSelectPlace(place)}
            />
          ))}

          {/* Render Simulated GPS location Marker */}
          {gpsStatus === 'success' && gpsData && (
            <Marker
              coordinate={{ latitude: gpsData.lat, longitude: gpsData.lng }}
              title="Thiết Bị Của Bạn 📍"
              description="Vị trí GPS định vị giả lập thành công!"
              pinColor="#EF4444"
            />
          )}
        </MapView>
        
        {/* Floating Expand button */}
        <TouchableOpacity 
          style={styles.expandButton} 
          onPress={() => setIsMapFullScreen(true)}
        >
          <Text style={styles.expandButtonText}>🔍 Xem toàn màn hình</Text>
        </TouchableOpacity>
      </View>

      {/* Places Selector Horizontal Chip List */}
      <Text style={styles.placesListTitle}>🏰 Điểm di sản trong khu vực (Chạm để xem):</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.placesList}
        contentContainerStyle={styles.placesListContent}
      >
        {places.map((place) => (
          <TouchableOpacity 
            key={place.id}
            style={[
              styles.placeChip,
              selectedPlaceId === place.id && styles.placeChipSelected
            ]}
            onPress={() => onSelectPlace(place)}
          >
            <Text style={[
              styles.placeChipText,
              selectedPlaceId === place.id && styles.placeChipTextSelected
            ]}>
              {place.title}
            </Text>
          </TouchableOpacity>
        ))}
        {places.length === 0 && (
          <Text style={styles.emptyListText}>Không tìm thấy địa điểm nào...</Text>
        )}
      </ScrollView>

      {/* Simulator Actions */}
      <TouchableOpacity 
        style={styles.buttonSecondary} 
        onPress={onSimulateGps}
        disabled={gpsStatus === 'loading'}
      >
        <Text style={styles.buttonText}>
          {gpsStatus === 'loading' ? '🛰️ Đang đọc GPS...' : '🛰️ Đọc Định Vị & Vẽ Lên Bản Đồ'}
        </Text>
      </TouchableOpacity>

      {gpsStatus === 'success' && gpsData && (
        <View style={[styles.resultBox, styles.resultGps]}>
          <Text style={styles.gpsLabel}>Vị trí đã đánh dấu trên bản đồ:</Text>
          <Text style={styles.gpsValue}>{gpsData.place}</Text>
          <View style={styles.gpsCoordinatesRow}>
            <Text style={styles.gpsCoord}>Kinh độ: <Text style={styles.gpsHighlight}>{gpsData.lat.toFixed(6)}</Text></Text>
            <Text style={styles.gpsCoord}>Vĩ độ: <Text style={styles.gpsHighlight}>{gpsData.lng.toFixed(6)}</Text></Text>
          </View>
          <Text style={styles.gpsNote}>
            💡 *Bản đồ đang chạy dạng Native sử dụng Apple Maps (trên iOS) cho hiệu năng 60fps mượt mà nhất.*
          </Text>
        </View>
      )}

      {/* Full Screen Native Map Overlay */}
      {isMapFullScreen && (
        <View style={[StyleSheet.absoluteFillObject, { zIndex: 9999 }]}>
          <MapView
            ref={fullMapRef}
            style={StyleSheet.absoluteFillObject}
            initialRegion={{
              latitude: 21.028511,
              longitude: 105.854167,
              latitudeDelta: 0.015,
              longitudeDelta: 0.015,
            }}
            userInterfaceStyle="dark"
          >
            {/* Render Places Markers */}
            {places.map((place) => (
              <Marker
                key={place.id}
                coordinate={{ latitude: place.latitude, longitude: place.longitude }}
                title={place.title}
                description={place.description}
                pinColor={selectedPlaceId === place.id ? '#10B981' : '#3B82F6'}
                onPress={() => onSelectPlace(place)}
              />
            ))}

            {/* Render Simulated GPS location Marker */}
            {gpsStatus === 'success' && gpsData && (
              <Marker
                coordinate={{ latitude: gpsData.lat, longitude: gpsData.lng }}
                title="Thiết Bị Của Bạn 📍"
                description="Vị trí GPS định vị giả lập thành công!"
                pinColor="#EF4444"
              />
            )}
          </MapView>

          {/* Floating Heritage Chips in Full Screen Mode (at top) */}
          <View style={styles.floatingChipsContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.placesListContent}
            >
              {places.map((place) => (
                <TouchableOpacity 
                  key={place.id}
                  style={[
                    styles.placeChip,
                    selectedPlaceId === place.id && styles.placeChipSelected,
                    { backgroundColor: COLORS.transparentBlack, borderColor: COLORS.cardBorder }
                  ]}
                  onPress={() => onSelectPlace(place)}
                >
                  <Text style={[
                    styles.placeChipText,
                    selectedPlaceId === place.id && styles.placeChipTextSelected
                  ]}>
                    {place.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          
          {/* Floating overlay control zone (thumb zone optimized) */}
          <View style={styles.floatingControls}>
            <TouchableOpacity 
              style={[styles.floatingButton, styles.floatingButtonPrimary]} 
              onPress={onSimulateGps}
              disabled={gpsStatus === 'loading'}
            >
              <Text style={styles.floatingButtonText}>
                {gpsStatus === 'loading' ? '🛰️ Đang định vị...' : '🛰️ Định Vị'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.floatingButton, styles.floatingButtonClose]} 
              onPress={() => setIsMapFullScreen(false)}
            >
              <Text style={styles.floatingButtonText}>❌ Đóng</Text>
            </TouchableOpacity>
          </View>
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
  mapContainer: {
    height: 220,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 16,
    marginTop: 8,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  expandButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: COLORS.transparentBlack,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  expandButtonText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '600',
  },
  buttonSecondary: {
    backgroundColor: COLORS.secondary,
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.secondaryBorder,
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
  resultGps: {
    backgroundColor: COLORS.infoBg,
    borderColor: COLORS.infoText,
  },
  gpsLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  gpsValue: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  gpsCoordinatesRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  gpsCoord: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginRight: 16,
  },
  gpsHighlight: {
    color: COLORS.infoText,
    fontWeight: '600',
  },
  gpsNote: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontStyle: 'italic',
    lineHeight: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(59, 130, 246, 0.2)',
    paddingTop: 8,
    marginTop: 4,
  },
  placesListTitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  placesList: {
    marginBottom: 16,
  },
  placesListContent: {
    paddingLeft: 4,
    paddingRight: 20,
    gap: 8,
  },
  placeChip: {
    backgroundColor: COLORS.secondary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.secondaryBorder,
  },
  placeChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryHover,
  },
  placeChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  placeChipTextSelected: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  emptyListText: {
    color: COLORS.textHelper,
    fontSize: 13,
    fontStyle: 'italic',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  floatingChipsContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 36,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 1002,
  },
  floatingControls: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 24,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 1001,
  },
  floatingButton: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.floatingButton,
  },
  floatingButtonPrimary: {
    backgroundColor: COLORS.primary,
    marginRight: 12,
  },
  floatingButtonClose: {
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.secondaryBorder,
  },
  floatingButtonText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
});
