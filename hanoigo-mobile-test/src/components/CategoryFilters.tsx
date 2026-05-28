import React from 'react';
import { ScrollView, Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import { COLORS } from '../constants/theme';

interface CategoryFiltersProps {
  categories: string[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}

export const CategoryFilters: React.FC<CategoryFiltersProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏷️ Bộ lọc danh mục di sản:</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <TouchableOpacity 
          style={[
            styles.chip,
            selectedCategory === null && styles.chipSelected
          ]}
          onPress={() => onSelectCategory(null)}
        >
          <Text style={[
            styles.chipText,
            selectedCategory === null && styles.chipTextSelected
          ]}>
            ⚡ Tất cả
          </Text>
        </TouchableOpacity>

        {categories.map((category) => (
          <TouchableOpacity 
            key={category}
            style={[
              styles.chip,
              selectedCategory === category && styles.chipSelected
            ]}
            onPress={() => onSelectCategory(category)}
          >
            <Text style={[
              styles.chipText,
              selectedCategory === category && styles.chipTextSelected
            ]}>
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  title: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  scroll: {
    flexDirection: 'row',
  },
  scrollContent: {
    paddingHorizontal: 4,
    gap: 8,
    paddingBottom: 4,
  },
  chip: {
    backgroundColor: COLORS.secondary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.secondaryBorder,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryHover,
  },
  chipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
});
