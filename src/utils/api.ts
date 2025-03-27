import AsyncStorage from '@react-native-async-storage/async-storage';

// Define interfaces for API responses
interface LLMResponse {
  text: string;
  model: string;
}

// Interface for API call options
interface APICallOptions {
  model: string;
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  abortController?: AbortController;
}

// Function to get API key with error handling
export const getApiKey = async (provider: string): Promise<string | null> => {
  try {
    let storageKey: string;
    
    switch (provider.toLowerCase()) {
      case 'openai':
        storageKey = 'openaiApiKey';
        break;
      case 'anthropic':
        storageKey = 'anthropicApiKey';
        break;
      case 'google':
        storageKey = 'googleApiKey';
        break;
      case 'mistral':
        storageKey = 'mistralApiKey';
        break;
      default:
        console.error(`Unknown provider: ${provider}`);
        return null;
    }
    
    const key = await AsyncStorage.getItem(storageKey);
    if (!key) {
      console.warn(`No API key found for ${provider}`);
    }
    return key;
  } catch (error) {
    console.error(`Error retrieving ${provider} API key:`, error);
    return null;
  }
};

// Function to save API key with error handling
export const saveApiKey = async (provider: string, key: string): Promise<boolean> => {
  try {
    let storageKey: string;
    
    switch (provider.toLowerCase()) {
      case 'openai':
        storageKey = 'openaiApiKey';
        break;
      case 'anthropic':
        storageKey = 'anthropicApiKey';
        break;
      case 'google':
        storageKey = 'googleApiKey';
        break;
      case 'mistral':
        storageKey = 'mistralApiKey';
        break;
      default:
        console.error(`Unknown provider: ${provider}`);
        return false;
    }
    
    await AsyncStorage.setItem(storageKey, key);
    console.log(`Successfully saved API key for ${provider}`);
    return true;
  } catch (error) {
    console.error(`Error saving ${provider} API key:`, error);
    return false;
  }
};

// Function to determine provider from model name
const getProviderFromModel = (model: string): string => {
  model = model.toLowerCase();
  
  if (model.includes('gpt') || model.includes('openai')) {
    return 'openai';
  } else if (model.includes('claude')) {
    return 'anthropic';
  } else if (model.includes('mistral')) {
    return 'mistral';
  } else if (model.includes('gemini')) {
    return 'google';
  } else {
    return 'unknown';
  }
};

// Get model ID for API calls based on display name
const getModelId = (modelName: string): string => {
  const modelMap: { [key: string]: string } = {
    // OpenAI models
    'gpt-4': 'gpt-4',
    'gpt-4o': 'gpt-4o',
    'gpt-3.5': 'gpt-3.5-turbo',
    
    // Anthropic models
    'claude 3 opus': 'claude-3-opus-20240229',
    'claude 3 sonnet': 'claude-3-sonnet-20240229',
    'claude 3 haiku': 'claude-3-haiku-20240307',
    
    // Mistral models
    'mistral tiny': 'mistral-tiny',
    'mistral small': 'mistral-small',
    'mistral medium': 'mistral-medium',
    
    // Add other models as needed
  };
  
  const normalizedName = modelName.toLowerCase();
  return modelMap[normalizedName] || normalizedName;
};

// Helper function to parse conversation history from formatted prompt
const parseConversationHistory = (prompt: string) => {
  const messages = [];
  const lines = prompt.split('\n\n');
  
  for (const line of lines) {
    if (line.startsWith('User:')) {
      messages.push({
        role: 'user',
        content: line.substring(6).trim()
      });
    } else if (line.startsWith('Assistant:')) {
      messages.push({
        role: 'assistant',
        content: line.substring(11).trim()
      });
    }
  }
  
  // If no messages were parsed, use the entire prompt as a user message
  if (messages.length === 0) {
    messages.push({
      role: 'user',
      content: prompt
    });
  }
  
  return messages;
};

// Main function to call LLM APIs
export const callLLM = async (options: APICallOptions): Promise<LLMResponse> => {
  const { 
    model, 
    prompt, 
    systemPrompt = "You are a helpful assistant.", 
    maxTokens = 1000, 
    temperature = 0.7,
    abortController = new AbortController()
  } = options;
  
  const provider = getProviderFromModel(model);
  const apiKey = await getApiKey(provider);
  
  if (!apiKey) {
    throw new Error(`API key not found for provider: ${provider}`);
  }
  
  const modelId = getModelId(model);
  
  try {
    let response: LLMResponse;
    
    switch (provider) {
      case 'openai':
        response = await callOpenAI(apiKey, modelId, prompt, systemPrompt, maxTokens, temperature, abortController);
        break;
      case 'anthropic':
        response = await callAnthropic(apiKey, modelId, prompt, systemPrompt, maxTokens, temperature, abortController);
        break;
      case 'mistral':
        response = await callMistral(apiKey, modelId, prompt, systemPrompt, maxTokens, temperature, abortController);
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
    
    return response;
  } catch (error) {
    // Check if this is an AbortError, which means the request was canceled
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.log('Request was aborted');
      // Return an empty response to indicate it was aborted
      return {
        text: '',
        model: model
      };
    }
    
    console.error(`Error calling ${provider} API:`, error);
    throw error;
  }
};

// Implementation for OpenAI
const callOpenAI = async (
  apiKey: string,
  model: string,
  prompt: string,
  systemPrompt: string,
  maxTokens: number,
  temperature: number,
  abortController: AbortController
): Promise<LLMResponse> => {
  const url = 'https://api.openai.com/v1/chat/completions';
  
  // Parse conversation history
  const conversationMessages = parseConversationHistory(prompt);
  
  // Create full message array with system message at the beginning
  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationMessages
  ];
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature
    }),
    signal: abortController.signal // Add signal from AbortController
  });
  
  // Check if response is ok before parsing
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
  }
  
  const data = await response.json();
  
  return {
    text: data.choices[0].message.content,
    model: data.model
  };
};

// Implementation for Anthropic
const callAnthropic = async (
  apiKey: string,
  model: string,
  prompt: string,
  systemPrompt: string,
  maxTokens: number,
  temperature: number,
  abortController: AbortController
): Promise<LLMResponse> => {
  const url = 'https://api.anthropic.com/v1/messages';
  
  // Parse conversation history
  const messages = parseConversationHistory(prompt);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      messages,
      system: systemPrompt,
      max_tokens: maxTokens,
      temperature
    }),
    signal: abortController.signal // Add signal from AbortController
  });
  
  // Check if response is ok before parsing
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Anthropic API error: ${errorData.error?.message || response.statusText}`);
  }
  
  const data = await response.json();
  
  return {
    text: data.content[0].text,
    model: data.model
  };
};

// Implementation for Mistral
const callMistral = async (
  apiKey: string,
  model: string,
  prompt: string,
  systemPrompt: string,
  maxTokens: number,
  temperature: number,
  abortController: AbortController
): Promise<LLMResponse> => {
  const url = 'https://api.mistral.ai/v1/chat/completions';
  
  // Parse conversation history
  const conversationMessages = parseConversationHistory(prompt);
  
  // Create full message array with system message at the beginning
  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationMessages
  ];
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature
    }),
    signal: abortController.signal // Add signal from AbortController
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Mistral API error: ${errorData.error?.message || response.statusText}`);
  }
  
  const data = await response.json();
  
  return {
    text: data.choices[0].message.content,
    model: data.model
  };
}; 