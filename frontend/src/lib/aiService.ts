/**
 * AI Service for handling LLM API calls
 * Supports OpenAI, Anthropic (Claude), and Google Gemini
 * 
 * Features:
 * - Generic sendPrompt for any AI use case
 * - HomeContext integration for home-aware AI
 * - Response parsing utilities
 * - Rate limiting and error handling
 */

import { useAISettingsStore } from '../store/aiSettingsStore';
import { buildHomeContext, contextToPrompt, contextToCompactJSON, contextToNaturalLanguage } from './homeContext';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  success: boolean;
  content?: string;
  error?: string;
}

export interface SendPromptOptions {
  systemPrompt?: string;
  userPrompt: string;
  conversationHistory?: AIMessage[];
  includeHomeContext?: boolean;
  homeContextFormat?: 'full' | 'compact' | 'summary' | 'natural';
  /** Pre-built home context object to use instead of building one */
  homeContext?: any;
  maxTokens?: number;
  temperature?: number;
  /** Use faster/cheaper model for simple queries */
  preferFast?: boolean;
}

export interface ParsedResponse {
  text: string;
  codeBlocks: { language: string; code: string }[];
  jsonBlocks: any[];
  lists: string[][];
}

// System prompts for different use cases
export const AI_PROMPTS = {
  mermaidAssistant: `You are an expert Mermaid.js diagram assistant for a home management application called HomeTracker. Your role is to help users create, debug, and improve their Mermaid diagrams.

CAPABILITIES:
- Fix syntax errors in Mermaid code
- Suggest improvements for clarity and readability
- Convert user descriptions into Mermaid diagrams
- Explain Mermaid syntax and features
- Create diagrams for home-related topics: network diagrams, floor plans, electrical layouts, plumbing, HVAC systems, process flows

GUIDELINES:
1. Always respond with valid Mermaid syntax when providing code
2. Wrap Mermaid code in \`\`\`mermaid code blocks
3. Keep diagrams clean and readable
4. Use appropriate diagram types (flowchart, graph, sequence, etc.)
5. For home diagrams, use relevant emojis where appropriate (🏠 🔌 💧 📡 etc.)
6. Explain what you changed and why

EXAMPLE INTERACTIONS:
- "Fix this diagram: graph TD A->B" → Provide corrected syntax with -->
- "Create a home network diagram" → Generate a complete network topology
- "Add a new room to my floor plan" → Extend existing diagram logically`,

  diagramExplain: `Explain the following Mermaid diagram in plain language, describing what it represents and how the components relate to each other.`,

  diagramOptimize: `Review this Mermaid diagram and suggest improvements for:
1. Better visual layout
2. Clearer labels
3. More logical flow
4. Any missing connections or elements
Provide the improved diagram code.`,

  diagramFromDescription: `Create a Mermaid diagram based on the following description. Choose the most appropriate diagram type (flowchart, graph, sequence, etc.) and use clear, descriptive labels.`,
};

/**
 * Call OpenAI API
 */
async function callOpenAI(
  apiKey: string,
  model: string,
  messages: AIMessage[],
  maxTokens: number = 1024,
  temperature: number = 0.7
): Promise<AIResponse> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error?.message || `API error: ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      content: data.choices[0]?.message?.content || '',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to connect to OpenAI',
    };
  }
}

/**
 * Call Anthropic (Claude) API
 */
async function callAnthropic(
  apiKey: string,
  model: string,
  messages: AIMessage[],
  maxTokens: number = 1024,
  temperature: number = 0.7
): Promise<AIResponse> {
  try {
    // Extract system message
    const systemMessage = messages.find((m) => m.role === 'system');
    const userMessages = messages.filter((m) => m.role !== 'system');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemMessage?.content || '',
        messages: userMessages.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error?.message || `API error: ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      content: data.content[0]?.text || '',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to connect to Anthropic',
    };
  }
}

/**
 * Call Google Gemini API
 */
async function callGemini(
  apiKey: string,
  model: string,
  messages: AIMessage[],
  maxTokens: number = 1024,
  temperature: number = 0.7
): Promise<AIResponse> {
  try {
    // Combine messages into a single prompt for Gemini
    const systemPrompt = messages.find((m) => m.role === 'system')?.content || '';
    const conversationHistory = messages
      .filter((m) => m.role !== 'system')
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    const fullPrompt = systemPrompt
      ? `${systemPrompt}\n\n${conversationHistory}`
      : conversationHistory;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: fullPrompt }],
            },
          ],
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error?.message || `API error: ${response.status}`,
      };
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return {
      success: true,
      content,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to connect to Gemini',
    };
  }
}

interface CallAIOptions {
  preferFast?: boolean;
  maxTokens?: number;
  temperature?: number;
}

// Fast model variants for each provider
const FAST_MODELS: Record<string, string> = {
  'gpt-4o': 'gpt-4o-mini',
  'gpt-4-turbo': 'gpt-4o-mini',
  'gpt-4': 'gpt-4o-mini',
  'claude-sonnet-4-20250514': 'claude-3-5-haiku-20241022',
  'claude-3-5-sonnet-20241022': 'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229': 'claude-3-5-haiku-20241022',
  'gemini-1.5-pro': 'gemini-1.5-flash',
  'gemini-pro': 'gemini-1.5-flash',
};

/**
 * Main function to call the configured AI provider
 * Supports model switching for speed optimization
 */
export async function callAI(
  messages: AIMessage[], 
  options: CallAIOptions = {}
): Promise<AIResponse> {
  const { preferFast = false, maxTokens = 1024, temperature = 0.7 } = options;
  const store = useAISettingsStore.getState();
  const config = store.getActiveConfig();

  if (!config || !config.apiKey) {
    return {
      success: false,
      error: 'No AI provider configured. Please set up an API key in Settings.',
    };
  }

  // Select model - use fast variant if requested and available
  let model = config.model;
  if (preferFast && FAST_MODELS[model]) {
    model = FAST_MODELS[model];
  }

  switch (config.provider) {
    case 'openai':
      return callOpenAI(config.apiKey, model, messages, maxTokens, temperature);
    case 'anthropic':
      return callAnthropic(config.apiKey, model, messages, maxTokens, temperature);
    case 'gemini':
      return callGemini(config.apiKey, model, messages, maxTokens, temperature);
    default:
      return {
        success: false,
        error: 'Unknown AI provider',
      };
  }
}

/**
 * Helper function for Mermaid diagram assistance
 */
export async function getMermaidAssistance(
  userMessage: string,
  currentCode?: string,
  conversationHistory: AIMessage[] = []
): Promise<AIResponse> {
  const messages: AIMessage[] = [
    { role: 'system', content: AI_PROMPTS.mermaidAssistant },
    ...conversationHistory,
  ];

  // Add context about current code if provided
  if (currentCode) {
    messages.push({
      role: 'user',
      content: `Current Mermaid diagram code:\n\`\`\`mermaid\n${currentCode}\n\`\`\`\n\n${userMessage}`,
    });
  } else {
    messages.push({
      role: 'user',
      content: userMessage,
    });
  }

  return callAI(messages);
}

/**
 * Quick action: Fix diagram errors
 */
export async function fixMermaidDiagram(
  code: string,
  errorMessage?: string
): Promise<AIResponse> {
  const prompt = errorMessage
    ? `Fix this Mermaid diagram. The error is: "${errorMessage}"\n\nCode:\n\`\`\`mermaid\n${code}\n\`\`\``
    : `Review and fix any syntax errors in this Mermaid diagram:\n\`\`\`mermaid\n${code}\n\`\`\``;

  return callAI([
    { role: 'system', content: AI_PROMPTS.mermaidAssistant },
    { role: 'user', content: prompt },
  ]);
}

/**
 * Quick action: Explain diagram
 */
export async function explainMermaidDiagram(code: string): Promise<AIResponse> {
  return callAI([
    { role: 'system', content: AI_PROMPTS.diagramExplain },
    { role: 'user', content: `\`\`\`mermaid\n${code}\n\`\`\`` },
  ]);
}

/**
 * Quick action: Optimize/improve diagram
 */
export async function optimizeMermaidDiagram(code: string): Promise<AIResponse> {
  return callAI([
    { role: 'system', content: AI_PROMPTS.diagramOptimize },
    { role: 'user', content: `\`\`\`mermaid\n${code}\n\`\`\`` },
  ]);
}

/**
 * Quick action: Create diagram from description
 */
export async function createMermaidFromDescription(
  description: string
): Promise<AIResponse> {
  return callAI([
    { role: 'system', content: AI_PROMPTS.diagramFromDescription },
    { role: 'user', content: description },
  ]);
}

/**
 * Extract Mermaid code from AI response
 */
export function extractMermaidCode(response: string): string | null {
  // Try to find mermaid code block
  const mermaidMatch = response.match(/```mermaid\n([\s\S]*?)```/);
  if (mermaidMatch) {
    return mermaidMatch[1].trim();
  }

  // Try to find generic code block
  const codeMatch = response.match(/```\n?([\s\S]*?)```/);
  if (codeMatch) {
    return codeMatch[1].trim();
  }

  return null;
}

// ============================================================================
// Generic AI Functions
// ============================================================================

/**
 * Generic function to send a prompt to the configured AI provider
 * Supports HomeContext injection for home-aware responses
 * 
 * Token optimization:
 * - 'natural' format: Best for conversational responses, ~50% fewer tokens than 'full'
 * - 'summary' format: Minimal tokens, just key stats
 * - preferFast: Uses faster/cheaper model variant when available
 */
export async function sendPrompt(options: SendPromptOptions): Promise<AIResponse> {
  const {
    systemPrompt,
    userPrompt,
    conversationHistory = [],
    includeHomeContext = false,
    homeContextFormat = 'natural', // Default to natural language for better responses
    maxTokens = 1024, // Reduced default for faster responses
    temperature = 0.7,
    preferFast = false,
  } = options;

  const messages: AIMessage[] = [];

  // Build system prompt with optional home context
  let fullSystemPrompt = systemPrompt || '';
  
  if (includeHomeContext) {
    const context = buildHomeContext();
    let contextString: string;
    
    switch (homeContextFormat) {
      case 'full':
        contextString = contextToPrompt(context);
        break;
      case 'compact':
        contextString = contextToCompactJSON(context);
        break;
      case 'natural':
        contextString = contextToNaturalLanguage(context);
        break;
      case 'summary':
        contextString = `Current home status:\n${context.summary.needsAttention.map(a => `- ${a}`).join('\n')}\n\nQuick stats: ${Object.entries(context.summary.quickStats).map(([k,v]) => `${k}: ${v}`).join(', ')}`;
        break;
      default:
        contextString = contextToNaturalLanguage(context);
    }
    
    fullSystemPrompt = `${fullSystemPrompt}\n\n--- HOME DATA ---\n${contextString}\n--- END HOME DATA ---`;
  }

  if (fullSystemPrompt) {
    messages.push({ role: 'system', content: fullSystemPrompt });
  }

  // Add conversation history (limit to last 6 messages to save tokens)
  const recentHistory = conversationHistory.slice(-6);
  messages.push(...recentHistory);

  // Add user prompt
  messages.push({ role: 'user', content: userPrompt });

  return callAI(messages, { preferFast, maxTokens, temperature });
}

/**
 * Parse AI response to extract structured content
 */
export function parseResponse(response: string): ParsedResponse {
  const codeBlocks: { language: string; code: string }[] = [];
  const jsonBlocks: any[] = [];
  const lists: string[][] = [];

  // Extract code blocks
  const codeRegex = /```(\w*)\n([\s\S]*?)```/g;
  let match;
  while ((match = codeRegex.exec(response)) !== null) {
    const language = match[1] || 'text';
    const code = match[2].trim();
    codeBlocks.push({ language, code });

    // Try to parse JSON blocks
    if (language === 'json' || language === '') {
      try {
        const parsed = JSON.parse(code);
        jsonBlocks.push(parsed);
      } catch {
        // Not valid JSON, ignore
      }
    }
  }

  // Extract lists (lines starting with - or *)
  const listRegex = /(?:^|\n)((?:[\-\*]\s+.+\n?)+)/g;
  while ((match = listRegex.exec(response)) !== null) {
    const listItems = match[1]
      .split('\n')
      .map((line) => line.replace(/^[\-\*]\s+/, '').trim())
      .filter((item) => item.length > 0);
    if (listItems.length > 0) {
      lists.push(listItems);
    }
  }

  // Get plain text (remove code blocks)
  const text = response.replace(/```[\s\S]*?```/g, '').trim();

  return {
    text,
    codeBlocks,
    jsonBlocks,
    lists,
  };
}

/**
 * Extract JSON from AI response (first valid JSON object/array found)
 */
export function extractJSON<T = any>(response: string): T | null {
  // Try to find JSON in code blocks first
  const jsonBlockMatch = response.match(/```json\n([\s\S]*?)```/);
  if (jsonBlockMatch) {
    try {
      return JSON.parse(jsonBlockMatch[1].trim());
    } catch {
      // Continue to other methods
    }
  }

  // Try to find raw JSON object or array
  const jsonMatch = response.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch {
      // Not valid JSON
    }
  }

  return null;
}

// ============================================================================
// Home-Aware AI Prompts
// ============================================================================

export const HOME_AI_PROMPTS = {
  homeAssistant: `You are Maple 🍁, a friendly and helpful home management assistant. Your personality is warm, knowledgeable, and practical - like a helpful neighbor who knows a lot about home maintenance.

RESPONSE STYLE:
- Always respond in natural, conversational language - NEVER return raw JSON or code
- Use bullet points or numbered lists for clarity when listing multiple items
- Keep responses concise but friendly (2-4 sentences for simple questions, more for complex ones)
- Include specific names, dates, and numbers from the home data when relevant
- Add helpful tips or suggestions when appropriate

CAPABILITIES:
- Answer questions about the home's inventory, maintenance, and projects
- Suggest maintenance tasks and remind about upcoming deadlines
- Help find items, vendors, and track warranties
- Provide practical home improvement recommendations

EXAMPLE RESPONSES:
User: "What maintenance do I have coming up?"
Good: "You have 2 maintenance tasks coming up! 🔧 First, your HVAC filter is due for replacement next week. Second, your annual furnace inspection is scheduled for December 15th. Would you like me to add any reminders?"

User: "What's in my garage?"
Good: "Based on your inventory, you have 5 items stored in the garage: your lawn mower (purchased 2022), a tool chest, holiday decorations, a spare refrigerator, and your bike collection. The lawn mower's warranty expires in 3 months."`,

  naturalLanguageQuery: `You are Maple, a helpful home assistant. Answer the user's question conversationally using the home data provided.

IMPORTANT RULES:
1. NEVER respond with JSON, code blocks, or raw data structures
2. Write in natural, friendly language like you're talking to a friend
3. If data isn't available, say so naturally: "I don't see any information about that in your home records."
4. Use specific names and dates when available
5. Keep responses focused and helpful`,

  documentExtraction: `Extract structured data from this document text (usually from OCR/receipt scanning).

Return ONLY valid JSON with these possible fields (include only what you can confidently extract):
{
  "vendor": { "name": "", "phone": "", "email": "", "address": "" },
  "items": [{ "name": "", "brand": "", "model": "", "serialNumber": "", "price": 0 }],
  "receipt": { "date": "YYYY-MM-DD", "total": 0, "tax": 0 },
  "warranty": { "provider": "", "startDate": "", "endDate": "", "coverage": "" },
  "maintenance": { "type": "", "date": "", "cost": 0, "notes": "" }
}

Be conservative - only include fields where you have high confidence in the extracted value.`,

  documentClassification: `Analyze this document text (from OCR) and classify it. Return ONLY valid JSON:
{
  "category": "receipt" | "invoice" | "manual" | "warranty" | "photo" | "other",
  "suggestedName": "Brief descriptive name for the document",
  "description": "One sentence description of what this document is about",
  "confidence": 0.0-1.0,
  "detectedVendor": "Vendor/company name if visible",
  "detectedDate": "YYYY-MM-DD if a date is visible",
  "relatedItems": ["List of product/appliance names mentioned"],
  "tags": ["relevant", "tags", "for", "searching"]
}

Classification guidelines:
- "receipt": Purchase receipts, sales slips, transaction records
- "invoice": Bills, statements, quotes from vendors
- "manual": User guides, instructions, specifications
- "warranty": Warranty cards, guarantee documents, extended protection plans
- "photo": Images of items, rooms, damage, before/after
- "other": Contracts, permits, certificates, miscellaneous

Be specific in suggestedName - include brand/product if visible (e.g., "Samsung Refrigerator Receipt" not just "Receipt").`,

  maintenanceRecommendation: `You are a friendly home maintenance advisor. Based on the home data, provide practical recommendations.

RESPONSE FORMAT:
- Start with a brief summary of the home's maintenance status
- List specific recommendations with clear action items
- Prioritize by urgency (🔴 urgent, 🟡 soon, 🟢 routine)
- Include estimated time/cost if relevant
- End with an encouraging note

Write conversationally, NOT as a JSON object or bullet-only list.`,

  projectPlanning: `You are a helpful home improvement planning assistant. Help break down projects into manageable steps.

Respond conversationally with:
1. A brief project overview
2. Suggested phases/subtasks (numbered for clarity)
3. Rough timeline estimate
4. Budget considerations
5. DIY vs professional recommendations

Be encouraging and practical. Write like you're advising a friend, not generating a data structure.`,
};

/**
 * Ask the AI a natural language question about the home
 */
export async function askAboutHome(question: string): Promise<AIResponse> {
  return sendPrompt({
    systemPrompt: HOME_AI_PROMPTS.naturalLanguageQuery,
    userPrompt: question,
    includeHomeContext: true,
    homeContextFormat: 'natural',
    preferFast: true,
    maxTokens: 512,
  });
}

/**
 * Get maintenance recommendations from AI
 */
export async function getMaintenanceRecommendations(): Promise<AIResponse> {
  return sendPrompt({
    systemPrompt: HOME_AI_PROMPTS.maintenanceRecommendation,
    userPrompt: 'Based on my home inventory and maintenance history, what maintenance should I prioritize in the next 30 days?',
    includeHomeContext: true,
    homeContextFormat: 'full',
  });
}

/**
 * Extract data from document text (OCR result)
 */
export async function extractDocumentData(ocrText: string): Promise<AIResponse> {
  return sendPrompt({
    systemPrompt: HOME_AI_PROMPTS.documentExtraction,
    userPrompt: `Extract structured data from this document text:\n\n${ocrText}`,
    includeHomeContext: false,
  });
}

/**
 * Document classification result
 */
export interface DocumentClassification {
  category: 'receipt' | 'invoice' | 'manual' | 'warranty' | 'photo' | 'other';
  suggestedName: string;
  description: string;
  confidence: number;
  detectedVendor?: string;
  detectedDate?: string;
  relatedItems?: string[];
  tags?: string[];
}

/**
 * Classify a document based on its OCR text content
 * Uses fast model for quick classification
 */
export async function classifyDocument(ocrText: string, originalFilename: string): Promise<{
  success: boolean;
  classification?: DocumentClassification;
  error?: string;
}> {
  const response = await sendPrompt({
    systemPrompt: HOME_AI_PROMPTS.documentClassification,
    userPrompt: `Original filename: ${originalFilename}\n\nDocument text:\n${ocrText.substring(0, 2000)}`, // Limit to save tokens
    includeHomeContext: false,
    preferFast: true, // Use fast model for classification
    maxTokens: 512,
  });

  if (!response.success) {
    return { success: false, error: response.error };
  }

  try {
    // Extract JSON from response
    const jsonMatch = response.content?.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const classification = JSON.parse(jsonMatch[0]) as DocumentClassification;
      return { success: true, classification };
    }
    return { success: false, error: 'Could not parse classification response' };
  } catch (e) {
    return { success: false, error: 'Failed to parse classification JSON' };
  }
}

/**
 * Get project planning help
 */
export async function planProject(projectDescription: string): Promise<AIResponse> {
  return sendPrompt({
    systemPrompt: HOME_AI_PROMPTS.projectPlanning,
    userPrompt: projectDescription,
    includeHomeContext: true,
    homeContextFormat: 'compact',
  });
}

/**
 * Smart chat with full home context
 * Uses natural language context for conversational responses
 */
export async function homeChat(
  message: string,
  conversationHistory: AIMessage[] = []
): Promise<AIResponse> {
  // Use fast model for simple queries (short messages, common questions)
  const isSimpleQuery = message.length < 50 || 
    /^(what|when|where|how many|list|show)/i.test(message.trim());
  
  return sendPrompt({
    systemPrompt: HOME_AI_PROMPTS.homeAssistant,
    userPrompt: message,
    conversationHistory,
    includeHomeContext: true,
    homeContextFormat: 'natural', // Use natural language, not JSON
    preferFast: isSimpleQuery,
  });
}

/**
 * Check if AI is properly configured and ready
 */
export function isAIReady(): { ready: boolean; error?: string } {
  const store = useAISettingsStore.getState();
  
  if (store.settings.activeProvider === 'none') {
    return { ready: false, error: 'No AI provider selected' };
  }
  
  const config = store.getActiveConfig();
  if (!config) {
    return { ready: false, error: 'AI provider not configured' };
  }
  
  if (!config.apiKey) {
    return { ready: false, error: 'API key not set' };
  }
  
  if (!config.enabled) {
    return { ready: false, error: 'AI provider is disabled' };
  }
  
  return { ready: true };
}

