import React, { useState, useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Easing } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Viseme, getCurrentViseme, createVisemeSequence } from '../../utils/VisemeMapper';

// Import character images statically
// Default character images
const characterImages = {
  default: {
    base: require('../../../assets/characters/default/base.png'),
    blink: require('../../../assets/characters/default/blink.png'),
    visemes: {
      rest: require('../../../assets/characters/default/visemes/rest.png'),
      a: require('../../../assets/characters/default/visemes/a.png'),
      b: require('../../../assets/characters/default/visemes/b.png'),
      c: require('../../../assets/characters/default/visemes/c.png'),
      d: require('../../../assets/characters/default/visemes/d.png'),
      e: require('../../../assets/characters/default/visemes/e.png'),
      f: require('../../../assets/characters/default/visemes/f.png'),
      g: require('../../../assets/characters/default/visemes/g.png'),
      i: require('../../../assets/characters/default/visemes/i.png'),
      o: require('../../../assets/characters/default/visemes/o.png'),
      u: require('../../../assets/characters/default/visemes/u.png'),
      th: require('../../../assets/characters/default/visemes/th.png'),
      wq: require('../../../assets/characters/default/visemes/wq.png')
    }
  }
};

interface CharacterAvatarProps {
  sound?: Audio.Sound | null;
  alignmentData?: any;
  size?: number;
  character?: string;
  style?: any;
  blinkingEnabled?: boolean;
}

const DEFAULT_CHARACTER = 'default';
const DEFAULT_SIZE = 200;
const ANIMATION_DURATION = 100; // ms for transition between visemes

// Enhanced blinking parameters for more natural behavior
const BLINK_INTERVAL_MIN = 2000; // Min time between blinks (ms)
const BLINK_INTERVAL_MAX = 7000; // Max time between blinks (ms)
const BLINK_DURATION_MIN = 180; // Min blink duration (ms)
const BLINK_DURATION_MAX = 250; // Max blink duration (ms)
const RAPID_BLINK_CHANCE = 0.15; // 15% chance of a rapid double-blink
const RAPID_BLINK_DELAY = 400; // Delay before the second blink in a rapid sequence (ms)

// Floating animation parameters
const FLOAT_AMPLITUDE = 8; // How far to move up and down (pixels)
const FLOAT_CYCLE_DURATION = 4000; // Complete up and down cycle time (ms)
const WOBBLE_AMPLITUDE = 3; // Slight horizontal wobble (pixels)
const WOBBLE_FREQUENCY = 2; // How many horizontal wobbles per vertical cycle

const CharacterAvatar: React.FC<CharacterAvatarProps> = ({
  sound,
  alignmentData,
  size = DEFAULT_SIZE,
  character = DEFAULT_CHARACTER,
  style,
  blinkingEnabled = true
}) => {
  const [currentViseme, setCurrentViseme] = useState<Viseme>('rest');
  const [visemeSequence, setVisemeSequence] = useState<{ viseme: Viseme; startTime: number; duration: number }[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current; // For floating animation
  const wobbleAnim = useRef(new Animated.Value(0)).current; // For horizontal wobble
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const blinkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const doubleBlinkTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Process alignment data when it changes
  useEffect(() => {
    if (alignmentData && alignmentData.phonemes) {
      const sequence = createVisemeSequence(alignmentData);
      setVisemeSequence(sequence);
      console.log(`[CharacterAvatar] Processed ${sequence.length} visemes from alignment data`);
    } else if (alignmentData) {
      console.log('[CharacterAvatar] Alignment data present but no phoneme information');
    }
    
    // Fade in the character
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
    
    setIsReady(true);
  }, [alignmentData, fadeAnim]);
  
  // Set up floating animation
  useEffect(() => {
    // Create continuous floating animations
    const startFloatingAnimation = () => {
      // Vertical bobbing
      Animated.loop(
        Animated.sequence([
          // Float up
          Animated.timing(floatAnim, {
            toValue: 1,
            duration: FLOAT_CYCLE_DURATION / 2,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          // Float down
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: FLOAT_CYCLE_DURATION / 2,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          })
        ])
      ).start();
      
      // Horizontal wobble
      Animated.loop(
        Animated.timing(wobbleAnim, {
          toValue: WOBBLE_FREQUENCY * 2 * Math.PI, // Complete cycles
          duration: FLOAT_CYCLE_DURATION,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    };
    
    startFloatingAnimation();
    
    // Clean up animation on unmount
    return () => {
      floatAnim.stopAnimation();
      wobbleAnim.stopAnimation();
    };
  }, [floatAnim, wobbleAnim]);
  
  // Set up audio playback monitoring for lip-sync
  useEffect(() => {
    if (!sound || !visemeSequence.length) {
      setCurrentViseme('rest');
      return () => {};
    }
    
    // Set up interval to check audio position and update viseme
    intervalRef.current = setInterval(async () => {
      try {
        const status = await sound.getStatusAsync() as AVPlaybackStatus & { positionMillis: number };
        
        if (!status.isLoaded || !status.isPlaying) {
          // If not playing, set to rest position
          if (currentViseme !== 'rest') {
            setCurrentViseme('rest');
          }
          return;
        }
        
        const currentTime = status.positionMillis / 1000; // Convert to seconds
        const newViseme = getCurrentViseme(visemeSequence, currentTime);
        
        if (newViseme !== currentViseme) {
          setCurrentViseme(newViseme);
        }
      } catch (error) {
        console.error('[CharacterAvatar] Error updating lip-sync:', error);
      }
    }, 50); // Update at 20fps for smooth animation
    
    // Cleanup interval on unmount or when sound changes
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [sound, visemeSequence, currentViseme]);
  
  // Enhanced natural blinking with variable timing and occasional double-blinks
  useEffect(() => {
    if (!blinkingEnabled) return;
    
    const performBlink = (duration = getRandomInRange(BLINK_DURATION_MIN, BLINK_DURATION_MAX)) => {
      // Start a blink
      setIsBlinking(true);
      
      // End the blink after variable duration
      setTimeout(() => {
        setIsBlinking(false);
      }, duration);
    };
    
    const scheduleNextBlink = () => {
      // Clear any existing timers
      if (blinkTimerRef.current) {
        clearTimeout(blinkTimerRef.current);
      }
      if (doubleBlinkTimerRef.current) {
        clearTimeout(doubleBlinkTimerRef.current);
      }
      
      // Random time until next blink with variable duration
      const nextBlinkIn = getRandomInRange(BLINK_INTERVAL_MIN, BLINK_INTERVAL_MAX);
      
      // Schedule the next blink
      blinkTimerRef.current = setTimeout(() => {
        // Perform the first blink
        performBlink();
        
        // Randomly decide if we should do a rapid double-blink
        if (Math.random() < RAPID_BLINK_CHANCE) {
          doubleBlinkTimerRef.current = setTimeout(() => {
            // Perform a second blink
            performBlink();
            // Schedule the next regular blink cycle
            scheduleNextBlink();
          }, RAPID_BLINK_DELAY);
        } else {
          // Schedule the next regular blink cycle
          scheduleNextBlink();
        }
      }, nextBlinkIn);
    };
    
    // Start the blink cycle
    scheduleNextBlink();
    
    // Clean up on unmount or when blinkingEnabled changes
    return () => {
      if (blinkTimerRef.current) {
        clearTimeout(blinkTimerRef.current);
        blinkTimerRef.current = null;
      }
      if (doubleBlinkTimerRef.current) {
        clearTimeout(doubleBlinkTimerRef.current);
        doubleBlinkTimerRef.current = null;
      }
    };
  }, [blinkingEnabled]);
  
  // Helper function to get a random number within a range
  const getRandomInRange = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };
  
  // Handle component unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (blinkTimerRef.current) {
        clearTimeout(blinkTimerRef.current);
        blinkTimerRef.current = null;
      }
      if (doubleBlinkTimerRef.current) {
        clearTimeout(doubleBlinkTimerRef.current);
        doubleBlinkTimerRef.current = null;
      }
    };
  }, []);
  
  // Get character base image path (blinking or regular)
  const getCharacterImagePath = () => {
    try {
      // Use blink image when isBlinking is true
      const imageName = isBlinking ? 'blink' : 'base';
      // Only support default character for now
      return characterImages.default[imageName];
    } catch (error) {
      console.error(`[CharacterAvatar] Failed to load character image: ${error}`);
      return null;
    }
  };
  
  // Get mouth viseme image path
  const getMouthImagePath = () => {
    try {
      const visemeKey = currentViseme.toLowerCase() as keyof typeof characterImages.default.visemes;
      return characterImages.default.visemes[visemeKey] || characterImages.default.visemes.rest;
    } catch (error) {
      console.warn(`[CharacterAvatar] Failed to load viseme image for ${currentViseme}, falling back to rest`);
      return characterImages.default.visemes.rest;
    }
  };
  
  // Calculate the vertical position for floating animation
  const floatTranslateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -FLOAT_AMPLITUDE] // Move up when value increases (negative Y is up)
  });
  
  // Calculate the horizontal position for wobble animation
  const wobbleTranslateX = wobbleAnim.interpolate({
    inputRange: [0, Math.PI/2, Math.PI, Math.PI*3/2, Math.PI*2],
    outputRange: [0, WOBBLE_AMPLITUDE, 0, -WOBBLE_AMPLITUDE, 0],
    extrapolate: 'extend'
  });
  
  return (
    <Animated.View 
      style={[
        styles.container, 
        { width: size, height: size },
        { 
          opacity: fadeAnim,
          transform: [
            { translateY: floatTranslateY }, // Apply vertical bobbing
            { translateX: wobbleTranslateX } // Apply horizontal wobble
          ]
        },
        style
      ]}
    >
      {isReady && (
        <>
          {/* Base character image (with eye state) */}
          <Image
            source={getCharacterImagePath()}
            style={styles.characterImage}
            resizeMode="contain"
          />
          
          {/* Mouth overlay for current viseme */}
          <Image
            source={getMouthImagePath()}
            style={styles.mouthOverlay}
            resizeMode="contain"
          />
          
          {/* Debug info - can be removed in production */}
          {__DEV__ && (
            <View style={styles.debugInfo}>
              <View style={[styles.visemeIndicator, { backgroundColor: getVisemeColor(currentViseme) }]} />
              {isBlinking && <View style={styles.blinkIndicator} />}
            </View>
          )}
        </>
      )}
    </Animated.View>
  );
};

// Helper function to get a color for each viseme (for debug purposes)
const getVisemeColor = (viseme: Viseme): string => {
  const colors: Record<Viseme, string> = {
    'rest': '#cccccc',
    'A': '#ff0000',
    'B': '#00ff00',
    'C': '#0000ff',
    'D': '#ffff00',
    'E': '#ff00ff',
    'F': '#00ffff',
    'G': '#ff8800',
    'I': '#8800ff',
    'O': '#00ff88',
    'U': '#0088ff',
    'TH': '#88ff00',
    'WQ': '#ff0088'
  };
  
  return colors[viseme];
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  characterImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  mouthOverlay: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  debugInfo: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  visemeIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 5,
  },
  blinkIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ffffff',
    marginLeft: 5,
  }
});

export default CharacterAvatar; 