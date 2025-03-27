import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';

interface TextKaraokeProps {
  text: string;
  sound: Audio.Sound | null;
  alignmentData?: any;
  highlightColor?: string;
  textColor?: string;
  fontSize?: number;
  isDark?: boolean;
}

const TextKaraoke: React.FC<TextKaraokeProps> = ({
  text,
  sound,
  alignmentData,
  highlightColor = '#54C6EB',
  textColor = '#333',
  fontSize = 18,
  isDark = false
}) => {
  const [currentCharIndex, setCurrentCharIndex] = useState<number>(-1);
  const scrollViewRef = useRef<ScrollView>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  
  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
  
  // Start tracking playback when sound and alignment data are provided
  useEffect(() => {
    if (!sound || !alignmentData) return;
    
    // Get the character array and timing info
    const { characters, character_start_times_seconds } = alignmentData;
    
    // Configure playback status updates to track time
    const updatePlaybackStatus = async () => {
      try {
        const status = await sound.getStatusAsync() as AVPlaybackStatus & { positionMillis: number };
        
        if (!status.isLoaded) return;
        
        const currentTimeSeconds = status.positionMillis / 1000;
        
        // Find the current character based on time
        let newIndex = -1;
        for (let i = 0; i < character_start_times_seconds.length; i++) {
          if (character_start_times_seconds[i] > currentTimeSeconds) {
            newIndex = i - 1;
            break;
          }
        }
        
        // If we're at the end of the text
        if (newIndex === -1 && currentTimeSeconds > 0) {
          newIndex = character_start_times_seconds.length - 1;
        }
        
        if (newIndex !== currentCharIndex) {
          setCurrentCharIndex(newIndex);
          
          // Auto-scroll to make highlighted text visible
          if (scrollViewRef.current && newIndex > 0 && newIndex % 20 === 0) {
            scrollViewRef.current.scrollTo({
              y: (newIndex / characters.length) * 300, // Approximate scroll position
              animated: true
            });
          }
        }
      } catch (error) {
        console.error("Error updating playback status:", error);
      }
    };
    
    // Set up interval to check playback position
    intervalRef.current = setInterval(updatePlaybackStatus, 50);
    
    // Start time reference for manual timing (fallback)
    startTimeRef.current = Date.now();
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [sound, alignmentData, currentCharIndex]);
  
  // Render highlighted text
  const renderHighlightedText = () => {
    if (!alignmentData) {
      return <Text style={[styles.text, { color: textColor, fontSize }]}>{text}</Text>;
    }
    
    const { characters } = alignmentData;
    
    // Split text into highlighted and non-highlighted parts
    const highlightedText = (
      <Text style={[styles.text, { color: textColor, fontSize }]}>
        {characters.map((char: string, index: number) => (
          <Text
            key={index}
            style={{
              color: index <= currentCharIndex ? highlightColor : (isDark ? '#e5e7eb' : textColor),
              fontWeight: index <= currentCharIndex ? 'bold' : 'normal',
            }}
          >
            {char}
          </Text>
        ))}
      </Text>
    );
    
    return highlightedText;
  };
  
  return (
    <View style={styles.container}>
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}
      >
        {renderHighlightedText()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: 8,
  },
  text: {
    lineHeight: 28,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});

export default TextKaraoke; 