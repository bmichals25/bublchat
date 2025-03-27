# Character Assets for Lip-Sync

This directory contains character assets used for lip-sync animation in the application.

## Directory Structure

Each character should have its own directory with the following structure:

```
characters/
└── [character-name]/
    ├── base.png           # Character with eyes open
    ├── blink.png          # Character with eyes closed (for blinking animation)
    └── visemes/           # Directory containing mouth shapes
        ├── rest.png       # Neutral mouth position
        ├── a.png          # "ah" as in "father"
        ├── b.png          # "b", "m", "p" - closed lips
        ├── c.png          # "ch", "j", "sh" sounds
        ├── d.png          # "d", "t", "z" sounds
        ├── e.png          # "e" as in "bed"
        ├── f.png          # "f", "v" sounds
        ├── g.png          # "g", "k" sounds
        ├── i.png          # "i" as in "sit"
        ├── o.png          # "o" as in "go"
        ├── u.png          # "u" as in "put"
        ├── th.png         # "th" sound
        └── wq.png         # "w", "q" sounds
```

## Character Image Requirements

1. **Base Images**:
   - `base.png`: Character with eyes open and a neutral expression
   - `blink.png`: Same character with eyes closed (for blinking animation)
   - Both images should be identical except for the eye state

2. **Viseme (Mouth) Images**:
   - Each viseme image should contain ONLY the mouth shape
   - Images must have transparent backgrounds
   - The mouth position should be aligned to overlay correctly on the base character
   - All viseme images must be the same size as the base images

3. **Image Specifications**:
   - Recommended minimum size is 512x512 pixels for good quality
   - All images should be in PNG format with transparency
   - Keep face/mouth position consistent across all images for proper alignment

## Character Animation Features

The system implements two types of animation:

1. **Lip-Sync Animation**:
   - Mouth shapes (visemes) are displayed based on speech phonemes
   - The mouth overlay is synchronized with audio playback
   - Transitions between mouth shapes follow the timing from ElevenLabs API

2. **Natural Blinking**:
   - The character blinks at random intervals (between 2-6 seconds)
   - Blinking lasts for a short duration (200ms by default)
   - This adds lifelike qualities to the character

## Creating Your Character Assets

1. **Create Base Character**:
   - Design your character with a neutral expression and eyes open
   - Create a duplicate version with eyes closed for blinking
   - Save these as `base.png` and `blink.png`

2. **Create Mouth Shapes**:
   - For each viseme, create an image with ONLY the mouth
   - The mouth should be positioned to align correctly when overlaid on the base image
   - Each mouth should be a transparent PNG with the same dimensions as the base image
   - Save these in the visemes directory with the correct names (all lowercase)

3. **Important Alignment Tips**:
   - Ensure all images have exactly the same dimensions
   - Keep the character's face in the exact same position in both base and blink images
   - Position each mouth shape to align perfectly when overlaid on the base image

## Using in the App

Your character will automatically be used in the lip-sync animation when you specify its name:

```jsx
<LipSync
  character="your-character-name"
  // ... other props
/>
```

If you don't specify a character name, the system will default to using the "default" character.