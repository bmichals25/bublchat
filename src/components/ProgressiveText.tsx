import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';

interface ProgressiveTextProps {
  text: string;
  sound: Audio.Sound;
  alignmentData: any;
  textColor?: string;
  fontSize?: number;
  isDark?: boolean;
  onComplete?: () => void;
}

const ProgressiveText: React.FC<ProgressiveTextProps> = ({
  text,
  sound,
  alignmentData,
  textColor = '#000000',
  fontSize = 16,
  isDark = false,
  onComplete
}) => {
  const [visibleCharIndex, setVisibleCharIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    console.log('[ProgressiveText] Initializing with alignment data type:', 
      alignmentData ? (alignmentData.characters ? 'character-based' : alignmentData.words ? 'word-based' : 'unknown') : 'none');
    
    // Set up a listener for playback status updates
    const playbackListener = sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
      if (!status.isLoaded) return;
      
      if (status.didJustFinish) {
        // When audio finishes, show all text
        setVisibleCharIndex(text.length);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (onComplete) onComplete();
      }
    });
    
    // Start the polling interval to update text visibility
    intervalRef.current = setInterval(async () => {
      try {
        const status = await sound.getStatusAsync();
        if (!status.isLoaded || !status.isPlaying) return;
        
        const currentTime = status.positionMillis / 1000; // Convert to seconds
        updateVisibleCharacters(currentTime);
      } catch (error) {
        console.error('[ProgressiveText] Error getting audio status:', error);
      }
    }, 33); // Update at approximately 30fps for smoother text appearance
    
    // Start with a small number of characters visible to show something immediately
    setVisibleCharIndex(10);
    
    // Clean up function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Remove the playback status listener
      sound.setOnPlaybackStatusUpdate(null);
    };
  }, [sound, text, onComplete]);
  
  // Function to determine which characters should be visible based on current playback time
  const updateVisibleCharacters = (currentTime: number) => {
    if (!alignmentData) {
      // If no alignment data, just show all text
      setVisibleCharIndex(text.length);
      return;
    }
    
    // Character-level alignment data (from with-timestamps endpoint)
    if (alignmentData.characters && alignmentData.character_start_times_seconds) {
      const { characters, character_start_times_seconds } = alignmentData;
      
      let visibleIndex = 0;
      
      // Find the last character that should be visible at the current time
      for (let i = 0; i < character_start_times_seconds.length; i++) {
        if (character_start_times_seconds[i] <= currentTime) {
          visibleIndex = i + 1;
        } else {
          break;
        }
      }
      
      console.log('[ProgressiveText] Character-based timing, visible chars:', visibleIndex);
      setVisibleCharIndex(Math.min(visibleIndex, text.length));
      return;
    }
    
    // Word-level alignment data (from our fallback)
    if (alignmentData.words) {
      // Find the last character that should be visible at the current time
      let lastVisibleIndex = 0;
      let wordCount = 0;
      
      for (const word of alignmentData.words) {
        wordCount++;
        const wordEndTime = word.start + word.duration;
        
        if (currentTime >= wordEndTime) {
          // If we're past this word's end time, all of its characters are visible
          lastVisibleIndex += word.word.length;
        } else if (currentTime >= word.start) {
          // We're in the middle of this word - calculate which characters should be visible
          const wordProgress = (currentTime - word.start) / word.duration;
          const visibleCharCount = Math.ceil(word.word.length * wordProgress);
          lastVisibleIndex += visibleCharCount;
        } else {
          // We haven't reached this word yet
          break;
        }
      }
      
      if (wordCount % 5 === 0) {
        console.log('[ProgressiveText] Word-based timing, visible chars:', lastVisibleIndex, 'currentTime:', currentTime.toFixed(2));
      }
      
      setVisibleCharIndex(Math.min(lastVisibleIndex, text.length));
      return;
    }
    
    // Fallback - show all text
    setVisibleCharIndex(text.length);
  };
  
  // When visible text changes, scroll to keep the latest text in view
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [visibleCharIndex]);
  
  // Get the visible text
  const visibleText = text.substring(0, visibleCharIndex);
  
  return (
    <ScrollView 
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[
        styles.text,
        { color: textColor, fontSize },
        isDark && styles.darkText
      ]}>
        {visibleText}
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    maxHeight: 300,
    width: '100%',
  },
  contentContainer: {
    paddingBottom: 8,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
  },
  darkText: {
    color: '#f3f4f6',
  },
});

export default ProgressiveText; 