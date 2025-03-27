/**
 * VisemeMapper.ts
 * Maps phonemes from ElevenLabs API to standardized visemes for lip-sync animation
 * with enhanced features for realistic mouth movements
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

// Map of IPA phonemes to visemes - enhanced with more comprehensive mapping
const phonemeToVisemeMap: Record<string, Viseme> = {
  // IPA Vowels
  'ɑ': 'A',
  'æ': 'A',
  'ə': 'E',
  'ɛ': 'E',
  'ɪ': 'I',
  'ɔ': 'O',
  'ʊ': 'U',
  'ʌ': 'A', // "uh" as in "cut"
  'ɒ': 'O', // "o" as in "lot" (British English)
  'y': 'U', // Front rounded vowel (French "u")
  'ø': 'O', // Front rounded vowel (French "eu")
  'œ': 'E', // Open-mid front rounded vowel
  'ɜ': 'E', // "er" as in "bird"
  'ɝ': 'E', // R-colored schwa
  'ɚ': 'E', // R-colored schwa

  // Plain letter mappings for direct text to viseme conversion
  // Simple vowels (these were duplicated before)
  'a': 'A',
  'e': 'E',
  'i': 'I',
  'o': 'O',
  'u': 'U',
  
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
  'l': 'D',
  'ɫ': 'D', // Velarized "l" (dark l)
  
  // Postalveolar consonants
  'ʃ': 'C', // "sh"
  'ʒ': 'C', // "zh"
  'tʃ': 'C', // "ch"
  'dʒ': 'C', // "j"
  'sh': 'C', // Direct "sh" mapping for text
  'ch': 'C', // Direct "ch" mapping for text
  
  // Velar consonants
  'k': 'G',
  'g': 'G',
  'ŋ': 'G', // "ng"
  'x': 'G', // Voiceless velar fricative
  'ɣ': 'G', // Voiced velar fricative
  
  // Other consonants
  'θ': 'TH', // "th" in "thin"
  'ð': 'TH', // "th" in "this"
  'th': 'TH', // Direct "th" mapping for text
  'h': 'A',  // Usually minimal mouth movement
  'j': 'I',  // "y" sound (but not duplicated with "j" above)
  'r': 'WQ',  // American "r" - more like w
  'ɹ': 'WQ',  // Another "r" variant
  'w': 'WQ', // "w" sound
  'wh': 'WQ', // Direct "wh" mapping for text
  'q': 'WQ', // Similar mouth shape to "w"
  'ʔ': 'A',  // Glottal stop
  
  // Default for any unrecognized phoneme
  '': 'rest'
};

// Weight for viseme interpolation
// Higher values mean more strong anticipatory coarticulation
const COARTICULATION_WEIGHT = 0.3;

// Viseme compatibility matrix for smoother transitions
// Higher values mean more compatible transitions (less mouth movement required)
const visemeCompatibility: Record<Viseme, Record<Viseme, number>> = {
  'rest': { 'rest': 1.0, 'A': 0.7, 'B': 0.6, 'C': 0.5, 'D': 0.6, 'E': 0.7, 'F': 0.5, 'G': 0.6, 'I': 0.7, 'O': 0.7, 'U': 0.7, 'TH': 0.5, 'WQ': 0.6 },
  'A': { 'rest': 0.7, 'A': 1.0, 'B': 0.3, 'C': 0.4, 'D': 0.5, 'E': 0.6, 'F': 0.3, 'G': 0.5, 'I': 0.4, 'O': 0.6, 'U': 0.5, 'TH': 0.4, 'WQ': 0.4 },
  'B': { 'rest': 0.6, 'A': 0.3, 'B': 1.0, 'C': 0.2, 'D': 0.3, 'E': 0.3, 'F': 0.2, 'G': 0.3, 'I': 0.3, 'O': 0.3, 'U': 0.3, 'TH': 0.2, 'WQ': 0.3 },
  'C': { 'rest': 0.5, 'A': 0.4, 'B': 0.2, 'C': 1.0, 'D': 0.5, 'E': 0.4, 'F': 0.5, 'G': 0.4, 'I': 0.5, 'O': 0.3, 'U': 0.3, 'TH': 0.6, 'WQ': 0.3 },
  'D': { 'rest': 0.6, 'A': 0.5, 'B': 0.3, 'C': 0.5, 'D': 1.0, 'E': 0.5, 'F': 0.4, 'G': 0.5, 'I': 0.5, 'O': 0.4, 'U': 0.4, 'TH': 0.5, 'WQ': 0.3 },
  'E': { 'rest': 0.7, 'A': 0.6, 'B': 0.3, 'C': 0.4, 'D': 0.5, 'E': 1.0, 'F': 0.4, 'G': 0.5, 'I': 0.7, 'O': 0.5, 'U': 0.5, 'TH': 0.4, 'WQ': 0.4 },
  'F': { 'rest': 0.5, 'A': 0.3, 'B': 0.2, 'C': 0.5, 'D': 0.4, 'E': 0.4, 'F': 1.0, 'G': 0.4, 'I': 0.4, 'O': 0.3, 'U': 0.3, 'TH': 0.7, 'WQ': 0.3 },
  'G': { 'rest': 0.6, 'A': 0.5, 'B': 0.3, 'C': 0.4, 'D': 0.5, 'E': 0.5, 'F': 0.4, 'G': 1.0, 'I': 0.5, 'O': 0.5, 'U': 0.5, 'TH': 0.4, 'WQ': 0.4 },
  'I': { 'rest': 0.7, 'A': 0.4, 'B': 0.3, 'C': 0.5, 'D': 0.5, 'E': 0.7, 'F': 0.4, 'G': 0.5, 'I': 1.0, 'O': 0.4, 'U': 0.5, 'TH': 0.4, 'WQ': 0.4 },
  'O': { 'rest': 0.7, 'A': 0.6, 'B': 0.3, 'C': 0.3, 'D': 0.4, 'E': 0.5, 'F': 0.3, 'G': 0.5, 'I': 0.4, 'O': 1.0, 'U': 0.7, 'TH': 0.3, 'WQ': 0.7 },
  'U': { 'rest': 0.7, 'A': 0.5, 'B': 0.3, 'C': 0.3, 'D': 0.4, 'E': 0.5, 'F': 0.3, 'G': 0.5, 'I': 0.5, 'O': 0.7, 'U': 1.0, 'TH': 0.3, 'WQ': 0.6 },
  'TH': { 'rest': 0.5, 'A': 0.4, 'B': 0.2, 'C': 0.6, 'D': 0.5, 'E': 0.4, 'F': 0.7, 'G': 0.4, 'I': 0.4, 'O': 0.3, 'U': 0.3, 'TH': 1.0, 'WQ': 0.3 },
  'WQ': { 'rest': 0.6, 'A': 0.4, 'B': 0.3, 'C': 0.3, 'D': 0.3, 'E': 0.4, 'F': 0.3, 'G': 0.4, 'I': 0.4, 'O': 0.7, 'U': 0.6, 'TH': 0.3, 'WQ': 1.0 }
};

// Importance weights for different phoneme types
// Vowels and specific consonants are more visually distinctive
const visemeImportance: Record<Viseme, number> = {
  'rest': 0.0,
  'A': 1.0,    // Very visible
  'B': 0.9,    // Clear lip closure
  'C': 0.7,
  'D': 0.6,
  'E': 0.8,
  'F': 0.8,    // Clearly visible (teeth on lip)
  'G': 0.5,
  'I': 0.8,
  'O': 1.0,    // Very rounded and visible
  'U': 0.9,    // Quite visible
  'TH': 0.8,   // Visible tongue position
  'WQ': 0.9    // Distinctive rounding
};

// Duration thresholds in seconds
const MIN_VISEME_DURATION = 0.05;  // Minimum time to show a viseme
const BLEND_DURATION = 0.03;       // Time to blend between visemes

/**
 * Maps a phoneme to its corresponding viseme
 * @param phoneme - The phoneme to map (IPA notation)
 * @returns The corresponding viseme
 */
export const mapPhonemeToViseme = (phoneme: string): Viseme => {
  if (!phoneme) return 'rest';
  
  // Normalize the phoneme by removing stress markers and other non-essential notation
  const normalizedPhoneme = phoneme.replace(/ˈ|ˌ|ː|̩|̯|͡/g, '').toLowerCase();
  
  // Add logging for debugging
  console.log(`[VisemeMapper] Mapping phoneme: "${phoneme}" (normalized: "${normalizedPhoneme}")`);
  
  // Try to match the exact phoneme
  if (normalizedPhoneme in phonemeToVisemeMap) {
    const viseme = phonemeToVisemeMap[normalizedPhoneme];
    console.log(`[VisemeMapper] Direct match: "${normalizedPhoneme}" → ${viseme}`);
    return viseme;
  }
  
  // Check for combined phonemes (e.g., diphthongs or affricates)
  for (let i = normalizedPhoneme.length; i > 0; i--) {
    const subPhoneme = normalizedPhoneme.substring(0, i);
    if (subPhoneme in phonemeToVisemeMap) {
      const viseme = phonemeToVisemeMap[subPhoneme];
      console.log(`[VisemeMapper] Partial match: "${normalizedPhoneme}" → "${subPhoneme}" → ${viseme}`);
      return viseme;
    }
  }
  
  // If we don't have an exact match, try the first character
  // This helps with combined phonemes
  const firstChar = normalizedPhoneme.charAt(0);
  if (firstChar in phonemeToVisemeMap) {
    const viseme = phonemeToVisemeMap[firstChar];
    console.log(`[VisemeMapper] First char match: "${normalizedPhoneme}" → "${firstChar}" → ${viseme}`);
    return viseme;
  }
  
  // Default to rest position if no match found
  console.log(`[VisemeMapper] No match found for "${normalizedPhoneme}", defaulting to 'rest'`);
  return 'rest';
};

/**
 * Maps ElevenLabs detailed metadata to a sequence of visemes with timing information
 * @param alignmentData - The alignment data from ElevenLabs API
 * @returns Array of visemes with timing information
 */
export const createVisemeSequence = (alignmentData: any): { viseme: Viseme; startTime: number; duration: number; weight: number }[] => {
  if (!alignmentData || !alignmentData.phonemes || !alignmentData.phonemes.length) {
    console.log('[VisemeMapper] No phoneme data in alignment data');
    return [{ viseme: 'rest', startTime: 0, duration: 0, weight: 0 }];
  }
  
  console.log(`[VisemeMapper] Processing ${alignmentData.phonemes.length} phonemes`);
  
  const rawVisemes = alignmentData.phonemes.map((phoneme: any) => {
    const viseme = mapPhonemeToViseme(phoneme.phoneme);
    return {
      viseme,
      startTime: phoneme.start_time,
      duration: phoneme.end_time - phoneme.start_time,
      weight: visemeImportance[viseme] || 0.5 // Default to middle importance if not found
    };
  });
  
  // Log the raw visemes before processing
  console.log(`[VisemeMapper] Raw viseme sequence:`, 
    rawVisemes.map((v: { viseme: Viseme; startTime: number; duration: number; weight: number }) => 
      `${v.viseme}(${v.startTime.toFixed(2)}-${(v.startTime+v.duration).toFixed(2)}s)`
    ).join(', ')
  );
  
  // Apply smoothing and coarticulation to the raw viseme sequence
  const processedVisemes = applyCoarticulation(rawVisemes);
  
  // Check if all viseme types are represented
  const allVisemeTypes: Viseme[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'I', 'O', 'U', 'TH', 'WQ'];
  const usedVisemes = new Set(processedVisemes.map(v => v.viseme));
  
  // If total duration is very short and we don't have all viseme types, 
  // add missing ones at the end with short durations
  const missingVisemes = allVisemeTypes.filter(v => !usedVisemes.has(v));
  
  if (missingVisemes.length > 0 && processedVisemes.length > 0) {
    console.log(`[VisemeMapper] Adding ${missingVisemes.length} missing viseme types: ${missingVisemes.join(', ')}`);
    
    // Find the last time point
    const lastTime = processedVisemes.reduce((max, v) => Math.max(max, v.startTime + v.duration), 0);
    const shortDuration = 0.1; // 100ms for each missing viseme
    
    // Add missing visemes with short durations at the end
    missingVisemes.forEach((viseme, index) => {
      processedVisemes.push({
        viseme,
        startTime: lastTime + (index * shortDuration),
        duration: shortDuration * 0.8, // 80% of the time slot to leave gaps
        weight: 0.7 // Medium weight so they're noticeable but not dominant
      });
    });
  }
  
  // Log the processed viseme sequence
  console.log(`[VisemeMapper] Processed viseme sequence:`, 
    processedVisemes.map((v: { viseme: Viseme; startTime: number; duration: number; weight: number }) => 
      `${v.viseme}(${v.startTime.toFixed(2)}-${(v.startTime+v.duration).toFixed(2)}s)`
    ).join(', ')
  );
  
  return processedVisemes;
};

/**
 * Apply coarticulation and smoothing to the viseme sequence
 * This makes lip movements more natural by anticipating upcoming sounds
 * and removing very brief visemes that wouldn't be visible
 */
const applyCoarticulation = (
  visemeSequence: { viseme: Viseme; startTime: number; duration: number; weight: number }[]
): { viseme: Viseme; startTime: number; duration: number; weight: number }[] => {
  if (visemeSequence.length <= 1) return visemeSequence;
  
  const processed: { viseme: Viseme; startTime: number; duration: number; weight: number }[] = [];
  
  // First pass: Remove visemes that are too short to be perceived
  const filteredVisemes = visemeSequence.filter(v => v.duration >= MIN_VISEME_DURATION);
  
  // If we filtered out all visemes, return the original to avoid empty sequence
  if (filteredVisemes.length === 0) return visemeSequence;
  
  // Second pass: Apply coarticulation (look ahead to smooth transitions)
  for (let i = 0; i < filteredVisemes.length; i++) {
    const current = filteredVisemes[i];
    
    // Add the current viseme
    processed.push({ ...current });
    
    // Add anticipatory coarticulation by checking ahead
    if (i < filteredVisemes.length - 1) {
      const next = filteredVisemes[i + 1];
      const timeBetween = next.startTime - (current.startTime + current.duration);
      
      // Only add a transition if there's enough time between visemes
      if (timeBetween >= BLEND_DURATION) {
        // Create a transition viseme based on compatibility between current and next
        const currentViseme = current.viseme;
        const nextViseme = next.viseme;
        const compatibility = visemeCompatibility[currentViseme][nextViseme] || 0.5;
        
        // Higher compatibility means smoother transition with less mouth movement
        const transitionStart = current.startTime + current.duration;
        const transitionDuration = timeBetween;
        
        processed.push({
          viseme: nextViseme, // Anticipate the next viseme
          startTime: transitionStart,
          duration: transitionDuration,
          weight: next.weight * COARTICULATION_WEIGHT * compatibility // Lower weight for transition
        });
      }
    }
  }
  
  return processed;
};

/**
 * Gets the current viseme based on playback time with improved interpolation
 * @param visemeSequence - The sequence of visemes with timing
 * @param currentTime - Current playback time in seconds
 * @returns The viseme that should be displayed at the current time
 */
export const getCurrentViseme = (
  visemeSequence: { viseme: Viseme; startTime: number; duration: number; weight?: number }[],
  currentTime: number
): Viseme => {
  // Default to rest position
  if (!visemeSequence.length) return 'rest';
  
  // Very beginning or end of speech
  if (currentTime < visemeSequence[0].startTime) {
    return 'rest';
  }
  
  const lastViseme = visemeSequence[visemeSequence.length - 1];
  if (currentTime >= lastViseme.startTime + lastViseme.duration) {
    return 'rest';
  }
  
  // Find all visemes that overlap with the current time
  // This handles coarticulation with multiple active visemes
  const activeVisemes = visemeSequence.filter(visemeData => {
    const endTime = visemeData.startTime + visemeData.duration;
    return currentTime >= visemeData.startTime && currentTime < endTime;
  });
  
  if (activeVisemes.length === 0) {
    // No active visemes, find the closest one before current time
    let closestViseme: typeof visemeSequence[0] | null = null;
    let smallestDiff = Infinity;
    
    for (const visemeData of visemeSequence) {
      const endTime = visemeData.startTime + visemeData.duration;
      const diff = Math.abs(currentTime - endTime);
      
      if (endTime <= currentTime && diff < smallestDiff) {
        closestViseme = visemeData;
        smallestDiff = diff;
      }
    }
    
    return closestViseme ? closestViseme.viseme : 'rest';
  }
  
  if (activeVisemes.length === 1) {
    return activeVisemes[0].viseme;
  }
  
  // Multiple active visemes, choose the one with highest weight or most recent
  return activeVisemes.reduce((prev, current) => {
    const prevWeight = prev.weight || 0.5;
    const currentWeight = current.weight || 0.5;
    
    // Prioritize weight first, then recency
    if (currentWeight > prevWeight) {
      return current;
    } else if (currentWeight < prevWeight) {
      return prev;
    } else {
      // Same weight, choose the more recent one
      return current.startTime > prev.startTime ? current : prev;
    }
  }).viseme;
}; 