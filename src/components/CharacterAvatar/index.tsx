import React, { useState, useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Easing, Text, Platform } from 'react-native';
import { Audio } from 'expo-av';
import { Viseme, getCurrentViseme, createVisemeSequence } from '../../utils/VisemeMapper';

// Import character images statically
// Default character images
const characterImages = {
  default: {
    base: require('../../../assets/characters/default/base.png'),
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

// Dynamically imported images (using require statements here can cause issues)
let eyesOpen = null;
let eyesClosed = null;

try {
  eyesOpen = require('../../../assets/characters/default/eyes/open.png');
} catch (e) {
  console.warn('[CharacterAvatar] Failed to load open eyes image');
}

try {
  eyesClosed = require('../../../assets/characters/default/eyes/closed.png');
} catch (e) {
  console.warn('[CharacterAvatar] Failed to load closed eyes image');
}

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
const BLINK_TRANSITION_DURATION = 20; // ms for cross-fade between blink states

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

// First, add a direct character-to-viseme mapping function at the top of the file, after imports
const mapCharacterToViseme = (char: string): Viseme => {
  // Skip spaces and most punctuation - show a neutral position
  if (/[\s.,!?;:'"()[\]{}]/.test(char)) {
    return 'rest';
  }
  
  // Convert to lowercase for easier mapping
  const lowerChar = char.toLowerCase();
  
  // Map vowels
  if ('aàáâä'.includes(lowerChar)) return 'A';
  if ('eèéêë'.includes(lowerChar)) return 'E';
  if ('iìíîï'.includes(lowerChar)) return 'I';
  if ('oòóôö'.includes(lowerChar)) return 'O';
  if ('uùúûü'.includes(lowerChar)) return 'U';
  
  // Map consonants
  if ('bpm'.includes(lowerChar)) return 'B';
  if ('fv'.includes(lowerChar)) return 'F';
  if ('tdnsz'.includes(lowerChar)) return 'D';
  if ('kg'.includes(lowerChar)) return 'G';
  if ('lr'.includes(lowerChar)) return 'D';
  if ('cjy'.includes(lowerChar)) return 'C';
  if ('wq'.includes(lowerChar)) return 'WQ';
  if ('th'.includes(lowerChar)) return 'TH'; // Will only match individual 't' or 'h' but that's ok
  
  // Default for any character not explicitly mapped
  return 'rest';
};

// Replace the convertCharacterLevelToPhonemes function with this simplified version
const processCharacterLevelMetadata = (metadata: any): any => {
  // Check if we have character-level metadata
  if (!metadata) return null;
  
  console.log("[CharacterAvatar] Processing character-level metadata");
  console.log("[CharacterAvatar] Metadata keys:", Object.keys(metadata));
  
  // Extract the necessary data for direct character-to-viseme mapping
  let characterSequence: Array<{viseme: Viseme, startTime: number, endTime: number}> = [];
  let text = '';
  
  // Case 1: Direct character and timing arrays
  if (metadata.characters && (metadata.character_start_times_seconds || metadata.character_end_times_seconds)) {
    console.log(`[CharacterAvatar] Found ${metadata.characters.length} characters with timing data`);
    
    text = typeof metadata.characters === 'string' 
      ? metadata.characters 
      : metadata.characters.join('');
      
    // Build the sequence from characters and timing arrays
    for (let i = 0; i < metadata.characters.length; i++) {
      const char = typeof metadata.characters[i] === 'string' 
        ? metadata.characters[i] 
        : (metadata.characters[i]?.character || '');
        
      const startTime = metadata.character_start_times_seconds?.[i] || 0;
      const endTime = metadata.character_end_times_seconds?.[i] || (startTime + 0.1);
      
      // Map character directly to viseme
      const viseme = mapCharacterToViseme(char);
      
      if (char && viseme) {
        characterSequence.push({
          viseme,
          startTime,
          endTime
        });
      }
    }
  }
  // Case 2: Text and separate timing arrays
  else if (metadata.text && (metadata.character_start_times_seconds || metadata.character_end_times_seconds)) {
    console.log(`[CharacterAvatar] Found text "${metadata.text.substring(0, 20)}..." with timing arrays`);
    
    text = metadata.text;
    const chars = text.split('');
    
    // Build the sequence from text and timing arrays
    for (let i = 0; i < chars.length; i++) {
      if (i >= (metadata.character_start_times_seconds?.length || 0)) break;
      
      const startTime = metadata.character_start_times_seconds[i] || 0;
      const endTime = metadata.character_end_times_seconds?.[i] || (startTime + 0.1);
      
      // Map character directly to viseme
      const viseme = mapCharacterToViseme(chars[i]);
      
      if (viseme) {
        characterSequence.push({
          viseme,
          startTime,
          endTime
        });
      }
    }
  }
  // Case 3: Still try to handle phoneme data if it exists
  else if (metadata.alignment && metadata.alignment.phonemes) {
    console.log("[CharacterAvatar] Found phoneme-level data, using existing phoneme processor");
    return metadata.alignment;
  }
  // Case 4: Handle word alignment data
  else if (metadata.word_alignments) {
    console.log("[CharacterAvatar] Found word alignment data, using existing processor");
    return metadata;
  }
  
  // If we have a character sequence, create a viseme sequence directly
  if (characterSequence.length > 0) {
    console.log(`[CharacterAvatar] Created ${characterSequence.length} viseme mappings from characters`);
    console.log(`[CharacterAvatar] First few visemes:`, 
      characterSequence.slice(0, 3).map((v: {viseme: Viseme, startTime: number, endTime: number}) => 
        `${v.viseme} (${v.startTime.toFixed(3)}s-${v.endTime.toFixed(3)}s)`));
    
    // Return a viseme sequence directly
    return { visemeSequence: characterSequence };
  }
  
  console.log("[CharacterAvatar] No recognizable metadata format found");
  return null;
};

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
  const [baseImageLoaded, setBaseImageLoaded] = useState(false);
  const [mouthPosition, setMouthPosition] = useState({ x: 0, y: 0 });
  const mouthOffsetX = useRef(new Animated.Value(0)).current;
  const mouthOffsetY = useRef(new Animated.Value(0)).current;
  const mouthScale = useRef(new Animated.Value(1)).current;
  
  // Fade animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current; // For floating animation
  const wobbleAnim = useRef(new Animated.Value(0)).current; // For horizontal wobble
  const blinkFadeAnim = useRef(new Animated.Value(0)).current; // For cross-fading between blink states
  
  // References for timers
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const blinkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const doubleBlinkTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Inside the component, add a new state for tracking viseme history
  const [visemeHistory, setVisemeHistory] = useState<{viseme: Viseme; timestamp: number}[]>([]);
  const MAX_HISTORY_LENGTH = 10;
  
  // Preload images
  useEffect(() => {
    // Nothing to do here, as the static import automatically preloads the images
    console.log('[CharacterAvatar] Character images preloaded');
    
    // Fade in the character once images are loaded
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
    
    setIsReady(true);
  }, [fadeAnim]);
  
  // Modify the useEffect that processes alignment data to use the simplified approach
  useEffect(() => {
    if (!alignmentData) {
      setVisemeSequence([]);
      return;
    }
    
    try {
      console.log("[CharacterAvatar] Processing alignment data:", 
        typeof alignmentData === 'object' ? Object.keys(alignmentData).join(', ') : typeof alignmentData);
      
      // Process character-level data directly
      const processedData = processCharacterLevelMetadata(alignmentData);
      
      if (processedData) {
        // If we already have a viseme sequence, use it directly
        if (processedData.visemeSequence) {
          console.log(`[CharacterAvatar] Using ${processedData.visemeSequence.length} pre-processed visemes`);
          setVisemeSequence(processedData.visemeSequence);
          
          // Force an initial viseme to display to verify rendering
          if (processedData.visemeSequence.length > 0 && currentViseme === 'rest') {
            const firstViseme = processedData.visemeSequence[0].viseme;
            console.log(`[CharacterAvatar] Setting initial viseme to ${firstViseme} to test rendering`);
            setCurrentViseme(firstViseme);
          }
        }
        // Otherwise use the createVisemeSequence function for phoneme data
        else if (processedData.phonemes) {
          const sequence = createVisemeSequence(processedData);
          console.log(`[CharacterAvatar] Processed ${sequence.length} visemes from phoneme data`);
          setVisemeSequence(sequence);
        }
        else {
          console.log('[CharacterAvatar] No valid data for viseme animation found');
          setVisemeSequence([]);
        }
      } else {
        console.log('[CharacterAvatar] Could not process alignment data. No valid data found.');
        setVisemeSequence([]);
      }
    } catch (error) {
      console.error('[CharacterAvatar] Error processing alignment data:', error);
      setVisemeSequence([]);
    }
  }, [alignmentData, currentViseme]);
  
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
  
  // Also update the interval to respond faster to character changes
  // Modify the useEffect for playing and monitoring sound
  useEffect(() => {
    if (!sound || !visemeSequence.length) {
      const resetTimer = setTimeout(() => {
        if (currentViseme !== 'rest') {
          console.log('[CharacterAvatar] No sound or viseme sequence, resetting to rest position');
          setCurrentViseme('rest');
        }
      }, 500);
      
      return () => clearTimeout(resetTimer);
    }
    
    console.log('[CharacterAvatar] Setting up audio position checking interval with', visemeSequence.length, 'visemes');
    console.log('[CharacterAvatar] First few visemes:', 
      visemeSequence.slice(0, 3).map(v => 
        `${v.viseme} (${v.startTime.toFixed(3)}s-${((v as any).endTime || (v.startTime + v.duration)).toFixed(3)}s)`
      ).join(', ')
    );
    console.log('[CharacterAvatar] Component instance ID:', Date.now().toString(36), 'Size:', size);
    
    // Set up interval to check audio position and update viseme
    intervalRef.current = setInterval(async () => {
      try {
        const status = await sound.getStatusAsync();
        
        if (!status.isLoaded) {
          console.log('[CharacterAvatar] Sound not loaded');
          return;
        }
        
        if (!status.isPlaying) {
          console.log('[CharacterAvatar] Sound not playing, position:', status.positionMillis);
          return;
        }
        
        const currentTime = status.positionMillis / 1000; // Convert to seconds
        console.log(`[CharacterAvatar-${size}] Current time: ${currentTime.toFixed(3)}s, playing: ${status.isPlaying}, visemeSeq.length: ${visemeSequence.length}`);
        
        // Find the current viseme for this time point
        let newViseme: Viseme = 'rest';
        let foundMatch = false;
        
        for (const item of visemeSequence) {
          const startTime = item.startTime;
          const endTime = (item as any).endTime || (item.startTime + item.duration);
          
          if (currentTime >= startTime && currentTime <= endTime) {
            newViseme = item.viseme;
            foundMatch = true;
            console.log(`[CharacterAvatar-${size}] Found matching viseme: ${newViseme} at time ${currentTime.toFixed(3)}s (${startTime.toFixed(3)}s-${endTime.toFixed(3)}s)`);
            break;
          }
        }
        
        if (!foundMatch) {
          // If we're past the end of all visemes, go back to rest
          const lastViseme = visemeSequence[visemeSequence.length - 1];
          const lastEndTime = (lastViseme as any).endTime || (lastViseme.startTime + lastViseme.duration);
          
          if (currentTime > lastEndTime) {
            newViseme = 'rest';
            console.log(`[CharacterAvatar-${size}] Past all visemes (${lastEndTime.toFixed(3)}s), returning to rest`);
          }
        }
        
        if (newViseme !== currentViseme) {
          console.log(`[CharacterAvatar-${size}] Changing viseme: ${currentViseme} -> ${newViseme} at time ${currentTime.toFixed(3)}s`);
          setCurrentViseme(newViseme);
          
          // Update viseme history
          setVisemeHistory(prev => {
            const updated = [{ viseme: newViseme, timestamp: Date.now() }, ...prev];
            return updated.slice(0, MAX_HISTORY_LENGTH);
          });
          
          // Animate mouth movement based on the new viseme
          switch (newViseme) {
            case 'A':
              Animated.parallel([
                Animated.spring(mouthOffsetY, {
                  toValue: 3,
                  friction: 7,
                  tension: 80,
                  useNativeDriver: true
                }),
                Animated.spring(mouthScale, {
                  toValue: 1.2,
                  friction: 7,
                  tension: 80,
                  useNativeDriver: true
                })
              ]).start();
              break;
            case 'B':
              Animated.parallel([
                Animated.spring(mouthOffsetY, {
                  toValue: 0,
                  friction: 7,
                  tension: 80,
                  useNativeDriver: true
                }),
                Animated.spring(mouthScale, {
                  toValue: 0.8,
                  friction: 7,
                  tension: 80,
                  useNativeDriver: true
                })
              ]).start();
              break;
            case 'O':
            case 'U':
            case 'WQ':
              Animated.parallel([
                Animated.spring(mouthOffsetY, {
                  toValue: 1,
                  friction: 7,
                  tension: 80,
                  useNativeDriver: true
                }),
                Animated.spring(mouthScale, {
                  toValue: 1.1,
                  friction: 7,
                  tension: 80,
                  useNativeDriver: true
                })
              ]).start();
              break;
            case 'F':
            case 'TH':
              Animated.parallel([
                Animated.spring(mouthOffsetY, {
                  toValue: 0,
                  friction: 7,
                  tension: 80,
                  useNativeDriver: true
                }),
                Animated.spring(mouthScale, {
                  toValue: 0.9,
                  friction: 7,
                  tension: 80,
                  useNativeDriver: true
                })
              ]).start();
              break;
            case 'E':
            case 'I':
              Animated.parallel([
                Animated.spring(mouthOffsetY, {
                  toValue: 1,
                  friction: 7,
                  tension: 80,
                  useNativeDriver: true
                }),
                Animated.spring(mouthScale, {
                  toValue: 1.05,
                  friction: 7,
                  tension: 80,
                  useNativeDriver: true
                })
              ]).start();
              break;
            default:
              // Reset to neutral for any other viseme
              Animated.parallel([
                Animated.spring(mouthOffsetY, {
                  toValue: 0,
                  friction: 7,
                  tension: 80,
                  useNativeDriver: true
                }),
                Animated.spring(mouthScale, {
                  toValue: 1,
                  friction: 7,
                  tension: 80,
                  useNativeDriver: true
                })
              ]).start();
          }
        }
      } catch (error) {
        console.error('[CharacterAvatar] Error in viseme update:', error);
      }
    }, 16); // Check every 16ms for smoother updates (60fps)
    
    // Clean up on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log('[CharacterAvatar] Cleared audio position checking interval');
      }
    };
  }, [sound, visemeSequence, currentViseme, mouthOffsetY, mouthScale]);
  
  // Enhanced natural blinking with variable timing, occasional double-blinks, and cross-fade
  useEffect(() => {
    if (!blinkingEnabled) return;
    
    // Animate blink state with crossfade
    const animateBlinkState = (shouldBlink: boolean, duration = BLINK_TRANSITION_DURATION) => {
      Animated.timing(blinkFadeAnim, {
        toValue: shouldBlink ? 1 : 0,
        duration: duration,
        useNativeDriver: true,
        easing: Easing.linear,
      }).start();
      setIsBlinking(shouldBlink);
    };
    
    const performBlink = (duration = getRandomInRange(BLINK_DURATION_MIN, BLINK_DURATION_MAX)) => {
      // Start a blink with crossfade
      animateBlinkState(true);
      
      // End the blink after variable duration with crossfade
      setTimeout(() => {
        animateBlinkState(false);
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
  }, [blinkingEnabled, blinkFadeAnim]);
  
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
  
  // Handle base image load
  const handleBaseImageLoad = () => {
    setBaseImageLoaded(true);
    console.log('[CharacterAvatar] Base image loaded successfully');
  };
  
  // Add this useEffect to animate the mouth based on the current viseme
  useEffect(() => {
    // Different visemes should have slightly different positions/animations
    // to make the speech look more natural and less robotic
    let targetX = 0;
    let targetY = 0;
    let targetScale = 1;
    
    // Customize mouth movements based on viseme type with more exaggerated movements
    switch(currentViseme) {
      case 'A': // Open mouth vowel
        targetY = 1.0;  // More exaggerated movement
        targetScale = 1.1; // Larger scale for more visibility
        break;
      case 'B': // Closed lips
        targetY = -0.8; // Move up more
        targetScale = 0.9; // Smaller for lip closure
        break;
      case 'F': // Teeth on lip
        targetY = 0.4;
        targetX = 0.2; // Slight asymmetry for realism
        break;
      case 'O': // Rounded lips
        targetScale = 1.15; // More pronounced rounding
        targetY = 0.3;
        break;
      case 'WQ': // Strong rounding
        targetScale = 1.2;
        targetX = 0.5; // More side movement
        break;
      case 'TH': // Tongue visible
        targetY = 0.5;
        targetX = -0.3;
        targetScale = 1.05;
        break;
      case 'I': // Smile-like
        targetX = 0.2;
        targetY = -0.3;
        targetScale = 1.08;
        break;
      case 'E': // E sound
        targetY = 0.4;
        targetScale = 1.05;
        break;
      case 'U': // U sound
        targetScale = 1.1;
        targetY = 0.2;
        break;
      default:
        // Reset to neutral position
        targetX = 0;
        targetY = 0;
        targetScale = 1;
    }
    
    // Animate to the new position with faster spring for more responsiveness
    Animated.parallel([
      Animated.spring(mouthOffsetX, {
        toValue: targetX,
        friction: 6, // Less friction = faster movement
        tension: 80, // Higher tension = more responsive
        useNativeDriver: true,
      }),
      Animated.spring(mouthOffsetY, {
        toValue: targetY,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.spring(mouthScale, {
        toValue: targetScale,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      })
    ]).start();
    
    // Store the current position for other calculations
    setMouthPosition({ x: targetX, y: targetY });
  }, [currentViseme, mouthOffsetX, mouthOffsetY, mouthScale]);
  
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
      {/* Base character image - Always render this first */}
      <Image
        source={characterImages.default.base}
        style={styles.characterImage}
        resizeMode="contain"
        onLoad={handleBaseImageLoad}
      />
      
      {isReady && baseImageLoaded && (
        <>
          {eyesOpen && (
            <Animated.Image
              source={eyesOpen}
              style={[
                styles.eyesOverlay,
                {
                  opacity: blinkFadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0], // Fade out when blinking
                  })
                }
              ]}
              resizeMode="contain"
            />
          )}
          
          {eyesClosed && (
            <Animated.Image
              source={eyesClosed}
              style={[
                styles.eyesOverlay,
                {
                  opacity: blinkFadeAnim // Fade in when blinking
                }
              ]}
              resizeMode="contain"
            />
          )}
          
          {/* Mouth overlay for current viseme */}
          <Animated.Image
            source={(() => {
              try {
                const visemeKey = currentViseme.toLowerCase() as keyof typeof characterImages.default.visemes;
                return characterImages.default.visemes[visemeKey] || characterImages.default.visemes.rest;
              } catch (error) {
                console.warn(`[CharacterAvatar] Failed to load viseme image for ${currentViseme}, falling back to rest`);
                return characterImages.default.visemes.rest;
              }
            })()}
            style={[
              styles.mouthOverlay,
              {
                transform: [
                  { translateX: mouthOffsetX },
                  { translateY: mouthOffsetY },
                  { scale: mouthScale }
                ]
              }
            ]}
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
      
      {/* Add a debug panel to the component render */}
      {__DEV__ && (
        <View style={styles.visemeDebugPanel}>
          <Text style={styles.visemeDebugTitle}>Current: {currentViseme}</Text>
          <View style={styles.visemeHistoryContainer}>
            {visemeHistory.map((item, index) => (
              <Text key={index} style={styles.visemeHistoryItem}>
                {item.viseme} @ {new Date(item.timestamp).toISOString().substr(17, 6)}
              </Text>
            ))}
          </View>
          <Text style={styles.visemeDebugTitle}>Available Sequence:</Text>
          <View style={styles.visemeHistoryContainer}>
            {visemeSequence.slice(0, 20).map((item, index) => (
              <Text key={index} style={styles.visemeHistoryItem}>
                {item.viseme} ({item.startTime.toFixed(2)}s-{(item.startTime + item.duration).toFixed(2)}s)
              </Text>
            ))}
            {visemeSequence.length > 20 && <Text style={styles.visemeHistoryItem}>... {visemeSequence.length - 20} more</Text>}
          </View>
        </View>
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
    zIndex: 1, // Ensure base is always rendered
  },
  eyesOverlay: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 2,
  },
  mouthOverlay: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 3,
  },
  debugInfo: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 4,
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
  },
  visemeDebugPanel: {
    position: 'absolute',
    left: -220, // Move to the left of the character
    top: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
    borderRadius: 5,
    maxWidth: 200,
    maxHeight: 300,
    zIndex: 1000,
  },
  visemeDebugTitle: {
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  visemeHistoryContainer: {
    marginBottom: 8,
  },
  visemeHistoryItem: {
    color: '#fff',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});

export default CharacterAvatar; 