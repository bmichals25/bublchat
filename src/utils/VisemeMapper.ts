/**
 * VisemeMapper.ts
 * Maps phonemes from ElevenLabs API to standardized visemes for lip-sync animation
 */

export type Viseme = 
  | 'rest'    // Neutral mouth position
  | 'A'       // "ah" as in "father"
  | 'B'       // "b", "m", "p" - closed lips 
  | 'C'       // "ch", "j", "sh" sounds
  | 'D'       // "d", "t", "z" sounds
  | 'E'       // "e" as in "bed"
  | 'F'       // "f", "v" sounds
  | 'G'       // "g", "k" sounds
  | 'I'       // "i" as in "sit"
  | 'O'       // "o" as in "go"
  | 'U'       // "u" as in "put"
  | 'TH'      // "th" sound
  | 'WQ';     // "w", "q" sounds

// Map of IPA phonemes to visemes
const phonemeToVisemeMap: Record<string, Viseme> = {
  // Vowels
  'a': 'A',
  'ɑ': 'A',
  'æ': 'A',
  'ə': 'E',
  'ɛ': 'E',
  'e': 'E',
  'i': 'I',
  'ɪ': 'I',
  'o': 'O',
  'ɔ': 'O',
  'u': 'U',
  'ʊ': 'U',
  
  // Bilabial consonants (involve both lips)
  'b': 'B',
  'p': 'B',
  'm': 'B',
  
  // Labiodental consonants (involve lips and teeth)
  'f': 'F',
  'v': 'F',
  
  // Dental and alveolar consonants
  't': 'D',
  'd': 'D',
  'n': 'D',
  's': 'D',
  'z': 'D',
  'ɾ': 'D',
  
  // Postalveolar consonants
  'ʃ': 'C', // "sh"
  'ʒ': 'C', // "zh"
  'tʃ': 'C', // "ch"
  'dʒ': 'C', // "j"
  
  // Velar consonants
  'k': 'G',
  'g': 'G',
  'ŋ': 'G', // "ng"
  
  // Other consonants
  'θ': 'TH', // "th" in "thin"
  'ð': 'TH', // "th" in "this"
  'h': 'A',
  'j': 'I', // "y" sound
  'l': 'D',
  'r': 'E',
  'w': 'WQ',
  
  // Default for any unrecognized phoneme
  '': 'rest'
};

/**
 * Maps a phoneme to its corresponding viseme
 * @param phoneme - The phoneme to map (IPA notation)
 * @returns The corresponding viseme
 */
export const mapPhonemeToViseme = (phoneme: string): Viseme => {
  if (!phoneme) return 'rest';
  
  // Try to match the exact phoneme
  if (phoneme in phonemeToVisemeMap) {
    return phonemeToVisemeMap[phoneme];
  }
  
  // If we don't have an exact match, try the first character
  // This helps with combined phonemes
  const firstChar = phoneme.charAt(0);
  if (firstChar in phonemeToVisemeMap) {
    return phonemeToVisemeMap[firstChar];
  }
  
  // Default to rest position if no match found
  return 'rest';
};

/**
 * Maps ElevenLabs detailed metadata to a sequence of visemes with timing information
 * @param alignmentData - The alignment data from ElevenLabs API
 * @returns Array of visemes with timing information
 */
export const createVisemeSequence = (alignmentData: any): { viseme: Viseme; startTime: number; duration: number }[] => {
  if (!alignmentData || !alignmentData.phonemes || !alignmentData.phonemes.length) {
    return [{ viseme: 'rest', startTime: 0, duration: 0 }];
  }
  
  return alignmentData.phonemes.map((phoneme: any) => {
    return {
      viseme: mapPhonemeToViseme(phoneme.phoneme),
      startTime: phoneme.start_time,
      duration: phoneme.end_time - phoneme.start_time
    };
  });
};

/**
 * Gets the current viseme based on playback time
 * @param visemeSequence - The sequence of visemes with timing
 * @param currentTime - Current playback time in seconds
 * @returns The viseme that should be displayed at the current time
 */
export const getCurrentViseme = (
  visemeSequence: { viseme: Viseme; startTime: number; duration: number }[],
  currentTime: number
): Viseme => {
  // Default to rest position
  if (!visemeSequence.length) return 'rest';
  
  // Find the viseme for the current time
  for (let i = 0; i < visemeSequence.length; i++) {
    const visemeData = visemeSequence[i];
    const endTime = visemeData.startTime + visemeData.duration;
    
    if (currentTime >= visemeData.startTime && currentTime < endTime) {
      return visemeData.viseme;
    }
    
    // If we've gone past the current time, return the previous viseme
    if (currentTime < visemeData.startTime && i > 0) {
      return visemeSequence[i - 1].viseme;
    }
  }
  
  // If we're past all visemes, return the last one
  // This ensures the mouth returns to a natural position at the end
  if (visemeSequence.length > 0 && currentTime >= visemeSequence[visemeSequence.length - 1].startTime) {
    return visemeSequence[visemeSequence.length - 1].viseme;
  }
  
  return 'rest';
}; 