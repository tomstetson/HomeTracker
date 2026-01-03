/**
 * GlobalMaple - Context-Aware AI Assistant
 *
 * A global floating chat interface for Maple that:
 * - Appears on all pages
 * - Knows which page the user is viewing
 * - Can execute actions (create tasks, add items, navigate, etc.)
 * - Maintains conversation history within the session
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Send,
  AlertCircle,
  Settings,
  RefreshCw,
  Lightbulb,
  Wrench,
  Package,
  ClipboardList,
  Home,
  Trash2,
  Sparkles,
  CheckCircle,
  X,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';
import { isAIReady, AIMessage } from '../lib/aiService';
import { useAISettingsStore } from '../store/aiSettingsStore';
import {
  buildMapleSystemPrompt,
  parseActionFromResponse,
  executeAction,
  getPageContext,
  ActionResult,
} from '../lib/mapleActions';

// ============================================================================
// Types
// ============================================================================

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'action';
  content: string;
  timestamp: Date;
  isError?: boolean;
  actionResult?: ActionResult;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  prompt: string;
}

// ============================================================================
// Quick Actions by Route
// ============================================================================

const getQuickActionsForRoute = (pathname: string): QuickAction[] => {
  const baseActions: QuickAction[] = [
    { id: 'help', label: 'What can you do?', icon: <Sparkles className="w-3 h-3" />, prompt: 'What actions can you help me with?' },
  ];

  const routeActions: Record<string, QuickAction[]> = {
    '/': [
      { id: 'overview', label: 'Home Overview', icon: <Home className="w-3 h-3" />, prompt: 'Give me a quick overview of my home. What needs attention?' },
      { id: 'maintenance', label: 'Due Tasks', icon: <Wrench className="w-3 h-3" />, prompt: 'What maintenance tasks are overdue or due soon?' },
    ],
    '/items': [
      { id: 'add-item', label: 'Add Item', icon: <Package className="w-3 h-3" />, prompt: 'Help me add a new item to my inventory' },
      { id: 'warranties', label: 'Expiring Warranties', icon: <AlertCircle className="w-3 h-3" />, prompt: 'Which items have warranties expiring soon?' },
    ],
    '/maintenance': [
      { id: 'add-task', label: 'Add Task', icon: <ClipboardList className="w-3 h-3" />, prompt: 'Help me create a new maintenance task' },
      { id: 'overdue', label: 'Overdue Tasks', icon: <AlertCircle className="w-3 h-3" />, prompt: 'Show me all overdue maintenance tasks' },
    ],
    '/projects': [
      { id: 'add-project', label: 'New Project', icon: <ClipboardList className="w-3 h-3" />, prompt: 'Help me start a new home project' },
      { id: 'status', label: 'Project Status', icon: <Lightbulb className="w-3 h-3" />, prompt: 'Give me a status update on my active projects' },
    ],
    '/vendors': [
      { id: 'add-vendor', label: 'Add Vendor', icon: <Wrench className="w-3 h-3" />, prompt: 'Help me add a new vendor or contractor' },
      { id: 'recommend', label: 'Recommendations', icon: <Lightbulb className="w-3 h-3" />, prompt: 'Based on my maintenance needs, which vendors should I contact?' },
    ],
  };

  return [...baseActions, ...(routeActions[pathname] || [])];
};

// ============================================================================
// Component
// ============================================================================

export function GlobalMaple() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const aiReady = isAIReady();
  const { settings: aiSettings } = useAISettingsStore();
  const quickActions = getQuickActionsForRoute(location.pathname);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle sending messages
  const handleSend = useCallback(async (prompt?: string) => {
    const messageText = prompt || input.trim();
    if (!messageText || isLoading) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build conversation history
      const history: AIMessage[] = messages.slice(-10).map((m) => ({
        role: m.role === 'action' ? 'assistant' : m.role,
        content: m.content,
      }));

      // Get AI provider config
      const provider = aiSettings.activeProvider;
      if (provider === 'none') {
        throw new Error('No AI provider configured');
      }

      const config = aiSettings.providers[provider];
      if (!config.apiKey) {
        throw new Error('API key not configured');
      }

      // Build system prompt with context
      const systemPrompt = buildMapleSystemPrompt(location.pathname);

      // Make API call based on provider
      let response: string;

      if (provider === 'openai') {
        response = await callOpenAI(config.apiKey, config.model, systemPrompt, messageText, history);
      } else if (provider === 'anthropic') {
        response = await callAnthropic(config.apiKey, config.model, systemPrompt, messageText, history);
      } else if (provider === 'gemini') {
        response = await callGemini(config.apiKey, config.model, systemPrompt, messageText, history);
      } else {
        throw new Error(`Unsupported provider: ${provider}`);
      }

      // Check if response contains an action
      const action = parseActionFromResponse(response);

      if (action) {
        // Execute the action
        const result = await executeAction(action);

        // Add action result message
        const actionMessage: ChatMessage = {
          id: `action-${Date.now()}`,
          role: 'action',
          content: result.message,
          timestamp: new Date(),
          isError: !result.success,
          actionResult: result,
        };
        setMessages((prev) => [...prev, actionMessage]);

        // Clean the response (remove the JSON block) for display
        const cleanedResponse = response
          .replace(/```json[\s\S]*?```/g, '')
          .replace(/\{"action":[^}]+\}\}/g, '')
          .trim();

        if (cleanedResponse) {
          const assistantMessage: ChatMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: cleanedResponse,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }

        // Navigate if action specifies
        if (result.navigateTo) {
          setTimeout(() => navigate(result.navigateTo!), 500);
        }
      } else {
        // Regular response without action
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}`,
        timestamp: new Date(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, aiSettings, location.pathname, navigate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleClearChat = useCallback(() => {
    setMessages([]);
  }, []);

  // Panel sizing
  const panelHeight = isExpanded ? '600px' : '450px';
  const panelWidth = isExpanded ? '450px' : '380px';

  return (
    <>
      {/* Floating Button (when closed) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-4 z-50 lg:bottom-4 w-14 h-14 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center text-white hover:scale-105"
          title="Open Maple AI Assistant"
        >
          <span className="text-2xl">🍁</span>
        </button>
      )}

      {/* Chat Panel (when open) */}
      {isOpen && (
        <div
          className="fixed bottom-20 right-4 z-50 lg:bottom-4 bg-card border border-border rounded-xl shadow-2xl transition-all duration-300 overflow-hidden"
          style={{ width: panelWidth, maxHeight: panelHeight }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
            <div className="flex items-center gap-2">
              <span className="text-xl">🍁</span>
              <div>
                <span className="font-semibold text-sm">Maple</span>
                <span className="text-xs text-white/80 ml-2">
                  {getPageContext(location.pathname).split(' - ')[0]}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 hover:bg-white/20 rounded transition-colors"
                title={isExpanded ? 'Minimize' : 'Expand'}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex flex-col" style={{ height: `calc(${panelHeight} - 56px)` }}>
            {!aiReady.ready ? (
              // Not configured state
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                <div className="text-5xl mb-4">🍁</div>
                <p className="font-medium text-foreground mb-2">Maple Not Configured</p>
                <p className="text-sm mb-4">{aiReady.error}</p>
                <Link to="/settings" onClick={() => setIsOpen(false)}>
                  <Button size="sm" className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Configure AI Provider
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
                  {messages.length === 0 ? (
                    // Empty state with quick actions
                    <div className="text-center py-6">
                      <div className="text-5xl mb-3">🍁</div>
                      <p className="font-medium text-foreground mb-1">Hi! I'm Maple</p>
                      <p className="text-xs text-muted-foreground mb-4">
                        Your AI assistant for managing your home
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {quickActions.map((action) => (
                          <Button
                            key={action.id}
                            variant="outline"
                            size="sm"
                            onClick={() => handleSend(action.prompt)}
                            className="text-xs flex items-center gap-1"
                          >
                            {action.icon}
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    // Chat messages
                    <>
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={cn(
                            'flex',
                            message.role === 'user' ? 'justify-end' : 'justify-start'
                          )}
                        >
                          <div
                            className={cn(
                              'max-w-[85%] p-3 rounded-lg text-sm',
                              message.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : message.role === 'action'
                                ? message.isError
                                  ? 'bg-destructive/10 text-destructive border border-destructive/20'
                                  : 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20'
                                : message.isError
                                ? 'bg-destructive/10 text-destructive border border-destructive/20'
                                : 'bg-muted text-foreground'
                            )}
                          >
                            {message.role === 'action' && (
                              <div className="flex items-center gap-2 mb-1">
                                {message.isError ? (
                                  <AlertCircle className="w-4 h-4" />
                                ) : (
                                  <CheckCircle className="w-4 h-4" />
                                )}
                                <span className="font-medium text-xs uppercase">
                                  {message.isError ? 'Action Failed' : 'Action Completed'}
                                </span>
                              </div>
                            )}
                            {renderMessageContent(message.content)}
                          </div>
                        </div>
                      ))}
                      {isLoading && (
                        <div className="flex justify-start">
                          <div className="bg-muted text-foreground p-3 rounded-lg text-sm flex items-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Thinking...</span>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Input area */}
                <div className="border-t border-border p-3 flex-shrink-0">
                  {messages.length > 0 && (
                    <div className="flex justify-end mb-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearChat}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Clear Chat
                      </Button>
                    </div>
                  )}
                  <div className="flex items-end gap-2">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask Maple anything..."
                      className={cn(
                        'flex-1 min-h-[44px] max-h-[100px] p-2.5 rounded-lg border border-input bg-background text-sm text-foreground',
                        'placeholder:text-muted-foreground resize-none',
                        'focus:outline-none focus:ring-2 focus:ring-ring'
                      )}
                      rows={1}
                      disabled={isLoading}
                    />
                    <Button
                      onClick={() => handleSend()}
                      disabled={!input.trim() || isLoading}
                      size="icon"
                      className="h-11 w-11 shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function renderMessageContent(content: string): React.ReactNode {
  // Basic markdown-like rendering
  const lines = content.split('\n');

  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />;

        // Bullet points
        const bulletMatch = line.match(/^[-*•]\s+(.*)$/);
        if (bulletMatch) {
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>{formatInlineStyles(bulletMatch[1])}</span>
            </div>
          );
        }

        // Numbered lists
        const numMatch = line.match(/^(\d+)[.)]\s+(.*)$/);
        if (numMatch) {
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="text-muted-foreground min-w-[1.5rem]">{numMatch[1]}.</span>
              <span>{formatInlineStyles(numMatch[2])}</span>
            </div>
          );
        }

        return <div key={i}>{formatInlineStyles(line)}</div>;
      })}
    </div>
  );
}

function formatInlineStyles(text: string): React.ReactNode {
  // Handle **bold** text
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

// ============================================================================
// API Call Functions
// ============================================================================

async function callOpenAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  history: AIMessage[]
): Promise<string> {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: userMessage },
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

async function callAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  history: AIMessage[]
): Promise<string> {
  const messages = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ];

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
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0]?.text || '';
}

async function callGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  history: AIMessage[]
): Promise<string> {
  const contents = [
    ...history.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    { role: 'user', parts: [{ text: userMessage }] },
  ];

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates[0]?.content?.parts[0]?.text || '';
}

export default GlobalMaple;
