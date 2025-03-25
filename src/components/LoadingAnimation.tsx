import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, useWindowDimensions } from 'react-native';

const LoadingAnimation: React.FC = () => {
  // Get window dimensions to match message width constraints
  const dimensions = useWindowDimensions();
  
  // Create three animated values for the three dots
  const dot1Animation = useRef(new Animated.Value(0)).current;
  const dot2Animation = useRef(new Animated.Value(0)).current;
  const dot3Animation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Function to create animation for a single dot with delay
    const createDotAnimation = (dotAnim: Animated.Value, delay: number) => {
      return Animated.sequence([
        Animated.delay(delay),
        Animated.timing(dotAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(dotAnim, {
          toValue: 0.3,
          duration: 300,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ]);
    };

    // Create the looping animation sequence
    const startAnimation = () => {
      Animated.loop(
        Animated.parallel([
          createDotAnimation(dot1Animation, 0),
          createDotAnimation(dot2Animation, 150),
          createDotAnimation(dot3Animation, 300),
        ]),
        { iterations: -1 } // Infinite loop
      ).start();
    };

    startAnimation();

    // Cleanup animations on unmount
    return () => {
      dot1Animation.stopAnimation();
      dot2Animation.stopAnimation();
      dot3Animation.stopAnimation();
    };
  }, [dot1Animation, dot2Animation, dot3Animation]);

  return (
    <View style={styles.container}>
      <View style={[
        styles.messageWrapper,
        { maxWidth: dimensions.width > 600 ? '70%' : '85%' }
      ]}>
        <View style={styles.loadingContainer}>
          <Animated.View 
            style={[
              styles.dot, 
              { opacity: dot1Animation, transform: [{ scale: dot1Animation.interpolate({
                inputRange: [0.3, 1],
                outputRange: [0.8, 1]
              }) }] 
              }
            ]} 
          />
          <Animated.View 
            style={[
              styles.dot, 
              { opacity: dot2Animation, transform: [{ scale: dot2Animation.interpolate({
                inputRange: [0.3, 1],
                outputRange: [0.8, 1]
              }) }] 
              }
            ]} 
          />
          <Animated.View 
            style={[
              styles.dot, 
              { opacity: dot3Animation, transform: [{ scale: dot3Animation.interpolate({
                inputRange: [0.3, 1],
                outputRange: [0.8, 1]
              }) }] 
              }
            ]} 
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 8,
    paddingHorizontal: 0,
    justifyContent: 'flex-start',
  },
  messageWrapper: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginLeft: 16,
  },
  loadingContainer: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderTopLeftRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6b7280',
    marginHorizontal: 3,
  },
});

export default LoadingAnimation; 