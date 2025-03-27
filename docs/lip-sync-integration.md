# Lip-Sync Integration with ElevenLabs

This document explains how to use the lip-sync feature in the application, which uses ElevenLabs' timing and phonetic information to animate a character's mouth in sync with speech.

## Overview

The lip-sync feature has the following components:

1. **Enhanced TTS API Integration**: Uses ElevenLabs' detailed metadata API to get phoneme-level timing information.
2. **VisemeMapper**: Maps phonemes to visemes (visual mouth positions).
3. **CharacterAvatar**: Displays and animates the character based on the current viseme.
4. **LipSync**: Combines character display with progressive text for a complete experience.

## Setting Up Character Assets

To use the lip-sync feature, you need to provide character assets:

1. Create or obtain images for your character, including:
   - A base image with neutral expression
   - Images for each viseme (mouth position)

2. Place these images in the correct directory structure:
   ```
   assets/characters/[character-name]/
   ├── base.png
   └── visemes/
       ├── rest.png
       ├── a.png
       ├── b.png
       ... etc.
   ```

3. See the README.md in the `assets/characters/` directory for detailed requirements.

## Using Lip-Sync in Your Application

### Basic Usage

The lip-sync functionality is already integrated with the message display system. When a message is played with TTS, it will automatically use the lip-sync feature if detailed metadata is available from ElevenLabs.

### Manually Using LipSync Component

To manually use the LipSync component in another part of your application:

```tsx
import { Audio } from 'expo-av';
import LipSync from '../components/CharacterAvatar/LipSync';
import { speakText } from '../utils/tts';

// In your component:
const [sound, setSound] = useState<Audio.Sound | null>(null);
const [alignmentData, setAlignmentData] = useState<any>(null);

const handleSpeak = async () => {
  const result = await speakText({
    text: "Your text here",
    detailed_metadata: true
  });
  
  setSound(result.sound);
  setAlignmentData(result.alignmentData);
};

// In your render function:
return (
  <View>
    <LipSync
      text="Your text here"
      sound={sound}
      alignmentData={alignmentData}
      characterSize={200}
      character="default" // or your custom character
      textColor="#000000"
      fontSize={16}
      isDark={false}
      onComplete={() => console.log('Playback complete')}
    />
    
    <Button title="Speak" onPress={handleSpeak} />
  </View>
);
```

### Using Just the Character Avatar

If you only want the character avatar without the text:

```tsx
import CharacterAvatar from '../components/CharacterAvatar';

// In your render function:
return (
  <CharacterAvatar
    sound={sound}
    alignmentData={alignmentData}
    size={200}
    character="default"
  />
);
```

## Technical Details

### Phoneme to Viseme Mapping

The system uses a standard mapping of phonemes (sound units) to visemes (mouth positions):

- 'rest': Neutral mouth position
- 'A': "ah" as in "father"
- 'B': "b", "m", "p" - closed lips
- 'C': "ch", "j", "sh" sounds
- 'D': "d", "t", "z" sounds
- 'E': "e" as in "bed"
- 'F': "f", "v" sounds
- 'G': "g", "k" sounds
- 'I': "i" as in "sit"
- 'O': "o" as in "go"
- 'U': "u" as in "put"
- 'TH': "th" sound
- 'WQ': "w", "q" sounds

### ElevenLabs API Integration

The system tries to use the detailed metadata endpoint from ElevenLabs, which provides phoneme-level timing information. If this fails, it falls back to the standard timestamp endpoint or estimated timing.

### Animation Details

- Viseme transitions happen based on the phoneme timing data
- The current implementation uses simple image swapping for animation
- For smoother animation, consider implementing interpolation between visemes

## Troubleshooting

### No Lip Movement

If the character's mouth isn't moving:

1. Check that you have a valid ElevenLabs API key configured
2. Verify that your character assets are correctly placed and named
3. Ensure that the detailed metadata option is enabled when calling speakText()
4. Check the console logs for any error messages

### Misaligned Animation

If the animation looks off:

1. Make sure all your viseme images are properly aligned 
2. Check that the mouth positions correctly represent each phoneme
3. Try adjusting the animation timing parameters in CharacterAvatar.tsx

## Further Improvements

Some ideas for enhancing the lip-sync feature:

1. Add support for facial expressions based on sentiment analysis
2. Implement smoother transitions between visemes using opacity blending
3. Add more detailed mouth positions for even more accurate lip-sync
4. Support for 3D character models instead of 2D images
5. Add head movement and other animations to increase realism 