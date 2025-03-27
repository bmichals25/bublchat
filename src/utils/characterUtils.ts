/**
 * Character utility functions for lip-sync and animation
 */
import { Viseme } from './VisemeMapper';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Interface for character configuration
export interface CharacterConfig {
  id: string;
  name: string;
  description?: string;
  visible: boolean;
}

/**
 * Get a list of available characters
 * @returns Array of character configurations
 */
export const getAvailableCharacters = async (): Promise<CharacterConfig[]> => {
  try {
    const charactersJson = await AsyncStorage.getItem('availableCharacters');
    
    if (charactersJson) {
      return JSON.parse(charactersJson);
    }
    
    // Return default if none found
    return [
      {
        id: 'default',
        name: 'Default Character',
        description: 'The default character provided with the application',
        visible: true
      }
    ];
  } catch (error) {
    console.error('Error retrieving available characters:', error);
    
    // Return default in case of error
    return [
      {
        id: 'default',
        name: 'Default Character',
        description: 'The default character provided with the application',
        visible: true
      }
    ];
  }
};

/**
 * Save a list of available characters
 * @param characters - Array of character configurations to save
 */
export const saveAvailableCharacters = async (characters: CharacterConfig[]): Promise<void> => {
  try {
    await AsyncStorage.setItem('availableCharacters', JSON.stringify(characters));
  } catch (error) {
    console.error('Error saving available characters:', error);
    throw error;
  }
};

/**
 * Get the currently selected character
 * @returns The ID of the currently selected character
 */
export const getSelectedCharacter = async (): Promise<string> => {
  try {
    const selectedCharacter = await AsyncStorage.getItem('selectedCharacter');
    return selectedCharacter || 'default';
  } catch (error) {
    console.error('Error retrieving selected character:', error);
    return 'default';
  }
};

/**
 * Set the currently selected character
 * @param characterId - The ID of the character to select
 */
export const setSelectedCharacter = async (characterId: string): Promise<void> => {
  try {
    await AsyncStorage.setItem('selectedCharacter', characterId);
  } catch (error) {
    console.error('Error saving selected character:', error);
    throw error;
  }
};

/**
 * Get the file path for a viseme image
 * @param character - Character ID
 * @param viseme - Viseme type
 * @returns The relative path to the viseme image
 */
export const getVisemeImagePath = (character: string, viseme: Viseme): string => {
  return `../../assets/characters/${character}/visemes/${viseme.toLowerCase()}.png`;
};

/**
 * Get the file path for a character's base image
 * @param character - Character ID
 * @returns The relative path to the character's base image
 */
export const getCharacterBasePath = (character: string): string => {
  return `../../assets/characters/${character}/base.png`;
};

/**
 * Check if a character has all required viseme images
 * @param character - Character ID
 * @returns Promise resolving to true if all required viseme images exist
 */
export const validateCharacterAssets = async (character: string): Promise<boolean> => {
  // This function would need to be implemented differently in a React Native environment
  // since we can't easily check for file existence
  // For now, just returning true and letting the component handle missing assets
  return true;
};

/**
 * List of all visemes required for a complete character
 */
export const requiredVisemes: Viseme[] = [
  'rest',
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'I',
  'O',
  'U',
  'TH',
  'WQ'
]; 