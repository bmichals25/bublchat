import React from 'react';
import { View, StyleSheet, useWindowDimensions, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const LoadingAnimation: React.FC = () => {
  // Get window dimensions to match message width constraints
  const dimensions = useWindowDimensions();
  
  // Get theme from context
  const { theme, isDark } = useTheme();
  
  return (
    <View style={[
      styles.container,
      { paddingHorizontal: dimensions.width > 600 ? 145 : 16 }
    ]}>
      <View style={[
        styles.messageWrapper,
        { maxWidth: dimensions.width > 600 ? '70%' : '85%' }
      ]}>
        <View style={[
          styles.loadingContainer,
          { backgroundColor: isDark ? '#2a2a2a' : '#f3f4f6' }
        ]}>
          <ActivityIndicator 
            size="large" 
            color={isDark ? "#ffffff" : "#54C6EB"}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 12,
    justifyContent: 'flex-start',
    width: '100%',
  },
  messageWrapper: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginLeft: 16,
  },
  loadingContainer: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 20,
    borderTopLeftRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
    minHeight: 60,
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
  }
});

export default LoadingAnimation; 