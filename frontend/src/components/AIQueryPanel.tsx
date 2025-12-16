/**
 * AIQueryPanel - A reusable AI chat component for HomeTracker
 * 
 * Features:
 * - Chat-style interface with message history
 * - Quick action buttons for common queries
 * - Context-aware based on current page
 * - Collapsible/expandable design
 * - Markdown rendering for AI responses
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Sparkles, 
  Send, 
  X, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle, 
  Settings, 
  RefreshCw,
  Lightbulb,
  Wrench,
  Package,
  ClipboardList,
  Home,
  Trash2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';
import { useAISettingsStore } from '../store/aiSettingsStore';
import { homeChat, isAIReady, AIMessage, parseResponse } from '../lib/aiService';

// ============================================================================
// Types
// ============================================================================

export interface QuickAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  prompt: string;
}

export interface AIQueryPanelProps {
  /** Title shown in the panel header */
  title?: string;
  /** Initial system context hint (e.g., "inventory", "maintenance") */
  context?: 'inventory' | 'maintenance' | 'projects' | 'vendors' | 'home' | 'general';
  /** Custom quick actions to show */
  quickActions?: QuickAction[];
  /** Whether to show as floating panel (vs inline) */
  floating?: boolean;
  /** Initial collapsed state */
  defaultCollapsed?: boolean;
  /** Callback when panel is toggled */
  onToggle?: (isOpen: boolean) => void;
  /** Custom class name */
  className?: string;
  /** Minimum height when expanded */
  minHeight?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isError?: boolean;
}

// ============================================================================
// Default Quick Actions by Context
// ============================================================================

const QUICK_ACTIONS: Record<string, QuickAction[]> = {
  general: [
    { id: 'overview', label: 'Home Overview', icon: <Home className="w-3 h-3" />, prompt: 'Give me a quick overview of my home status. What needs attention?' },
    { id: 'maintenance', label: 'Maintenance Due', icon: <Wrench className="w-3 h-3" />, prompt: 'What maintenance tasks are overdue or coming up soon?' },
    { id: 'warranties', label: 'Expiring Warranties', icon: <Package className="w-3 h-3" />, prompt: 'Which warranties are expiring in the next 90 days?' },
    { id: 'recommendations', label: 'Recommendations', icon: <Lightbulb className="w-3 h-3" />, prompt: 'Based on my home data, what should I prioritize this month?' },
  ],
  inventory: [
    { id: 'low-stock', label: 'Low Stock Items', icon: <Package className="w-3 h-3" />, prompt: 'Which consumables are low on stock and need reordering?' },
    { id: 'warranties', label: 'Expiring Warranties', icon: <Package className="w-3 h-3" />, prompt: 'List all items with warranties expiring in the next 90 days.' },
    { id: 'value', label: 'Total Value', icon: <Package className="w-3 h-3" />, prompt: 'What is the total value of my inventory? Break it down by category.' },
    { id: 'replacement', label: 'Needs Replacement', icon: <RefreshCw className="w-3 h-3" />, prompt: 'Which consumable items need replacement soon?' },
  ],
  maintenance: [
    { id: 'overdue', label: 'Overdue Tasks', icon: <AlertCircle className="w-3 h-3" />, prompt: 'What maintenance tasks are overdue?' },
    { id: 'upcoming', label: 'Upcoming Tasks', icon: <ClipboardList className="w-3 h-3" />, prompt: 'What maintenance is due in the next 30 days?' },
    { id: 'suggest', label: 'Suggest Tasks', icon: <Lightbulb className="w-3 h-3" />, prompt: 'Based on my inventory, suggest maintenance tasks I should add.' },
    { id: 'seasonal', label: 'Seasonal Tips', icon: <Home className="w-3 h-3" />, prompt: 'What seasonal maintenance should I do this month?' },
  ],
  projects: [
    { id: 'status', label: 'Project Status', icon: <ClipboardList className="w-3 h-3" />, prompt: 'Give me a status update on all active projects.' },
    { id: 'budget', label: 'Budget Analysis', icon: <ClipboardList className="w-3 h-3" />, prompt: 'How are my projects tracking against budget?' },
    { id: 'stalled', label: 'Stalled Projects', icon: <AlertCircle className="w-3 h-3" />, prompt: 'Are any projects stalled or on hold? What can I do to move them forward?' },
    { id: 'plan', label: 'Plan Next Steps', icon: <Lightbulb className="w-3 h-3" />, prompt: 'What are the next steps for my in-progress projects?' },
  ],
  vendors: [
    { id: 'preferred', label: 'Preferred Vendors', icon: <Wrench className="w-3 h-3" />, prompt: 'List my preferred vendors by category.' },
    { id: 'recent', label: 'Recently Used', icon: <ClipboardList className="w-3 h-3" />, prompt: 'Which vendors have I used recently?' },
    { id: 'recommend', label: 'Recommendations', icon: <Lightbulb className="w-3 h-3" />, prompt: 'Based on my upcoming maintenance, which vendors should I contact?' },
  ],
  home: [
    { id: 'value', label: 'Home Value', icon: <Home className="w-3 h-3" />, prompt: 'What is my current home value and how has it changed?' },
    { id: 'emergency', label: 'Emergency Info', icon: <AlertCircle className="w-3 h-3" />, prompt: 'List my emergency contacts and important shutoff locations.' },
    { id: 'overview', label: 'Full Overview', icon: <Home className="w-3 h-3" />, prompt: 'Give me a complete overview of my home including all systems and important information.' },
  ],
};

// ============================================================================
// Component
// ============================================================================

export function AIQueryPanel({
  title = 'AI Assistant',
  context = 'general',
  quickActions,
  floating = true,
  defaultCollapsed = true,
  onToggle,
  className,
  minHeight = '400px',
}: AIQueryPanelProps) {
  const [isOpen, setIsOpen] = useState(!defaultCollapsed);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { isAIEnabled } = useAISettingsStore();
  const aiReady = isAIReady();
  const aiEnabled = isAIEnabled();

  // Get quick actions for current context
  const actions = quickActions || QUICK_ACTIONS[context] || QUICK_ACTIONS.general;

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleToggle = useCallback(() => {
    const newState = !isOpen;
    setIsOpen(newState);
    onToggle?.(newState);
  }, [isOpen, onToggle]);

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
      // Build conversation history for context
      const history: AIMessage[] = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await homeChat(messageText, history);

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.success ? response.content || 'No response received.' : response.error || 'An error occurred.',
        timestamp: new Date(),
        isError: !response.success,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${error.message || 'Failed to get response'}`,
        timestamp: new Date(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleClearChat = useCallback(() => {
    setMessages([]);
  }, []);

  // Render message content with markdown formatting
  const renderMessageContent = (content: string) => {
    // Parse response for code blocks
    const parsed = parseResponse(content);
    
    if (parsed.codeBlocks.length > 0) {
      // Render with code blocks
      const parts = content.split(/```[\s\S]*?```/);
      const codeBlocksRendered = parsed.codeBlocks.map((block, i) => (
        <pre key={i} className="bg-muted/50 p-2 rounded-md text-xs font-mono overflow-x-auto my-2">
          <code>{block.code}</code>
        </pre>
      ));

      return (
        <div>
          {parts.map((part, i) => (
            <React.Fragment key={i}>
              {renderFormattedText(part)}
              {codeBlocksRendered[i]}
            </React.Fragment>
          ))}
        </div>
      );
    }

    return renderFormattedText(content);
  };

  // Format text with basic markdown support (bold, bullet points, etc.)
  const renderFormattedText = (text: string) => {
    // Split by lines to handle bullet points
    const lines = text.split('\n');
    
    return (
      <div className="space-y-1">
        {lines.map((line, i) => {
          // Skip empty lines but preserve spacing
          if (!line.trim()) return <div key={i} className="h-2" />;
          
          // Bullet points (-, *, •)
          const bulletMatch = line.match(/^(\s*)[-*•]\s+(.*)$/);
          if (bulletMatch) {
            const [, indent, content] = bulletMatch;
            const level = Math.floor(indent.length / 2);
            return (
              <div key={i} className={cn("flex items-start gap-2", level > 0 && `ml-${level * 4}`)}>
                <span className="text-primary mt-1">•</span>
                <span>{formatInlineStyles(content)}</span>
              </div>
            );
          }
          
          // Numbered lists
          const numMatch = line.match(/^(\s*)(\d+)[.)] (.*)$/);
          if (numMatch) {
            const [, indent, num, content] = numMatch;
            const level = Math.floor(indent.length / 2);
            return (
              <div key={i} className={cn("flex items-start gap-2", level > 0 && `ml-${level * 4}`)}>
                <span className="text-muted-foreground min-w-[1.5rem]">{num}.</span>
                <span>{formatInlineStyles(content)}</span>
              </div>
            );
          }
          
          // Regular text
          return <div key={i}>{formatInlineStyles(line)}</div>;
        })}
      </div>
    );
  };

  // Handle inline formatting (bold, emoji indicators)
  const formatInlineStyles = (text: string): React.ReactNode => {
    // Handle **bold** text
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  // Floating panel wrapper
  const panelClasses = cn(
    'bg-card border border-border rounded-lg shadow-lg transition-all duration-300 ease-in-out overflow-hidden',
    floating && 'fixed bottom-4 right-4 z-50',
    isOpen ? 'w-96' : 'w-48',
    className
  );

  return (
    <div className={panelClasses} style={{ maxHeight: isOpen ? minHeight : 'auto' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white cursor-pointer"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          <span className="font-semibold text-sm">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {!aiReady.ready && (
            <AlertCircle className="w-4 h-4 text-yellow-300" />
          )}
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </div>
      </div>

      {/* Body */}
      {isOpen && (
        <div className="flex flex-col" style={{ height: `calc(${minHeight} - 48px)` }}>
          {!aiReady.ready ? (
            // Not configured state
            <div className="flex-1 flex flex-col items-center justify-center p-4 text-center text-muted-foreground">
              <AlertCircle className="w-10 h-10 mb-3 text-amber-500" />
              <p className="font-medium mb-2">AI Assistant Not Configured</p>
              <p className="text-sm mb-4">{aiReady.error}</p>
              <Link to="/settings">
                <Button size="sm" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Configure in Settings
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
                {messages.length === 0 ? (
                  // Empty state with quick actions
                  <div className="text-center py-4">
                    <Sparkles className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                    <p className="font-medium text-foreground mb-1">How can I help?</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Ask me anything about your home
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {actions.slice(0, 4).map((action) => (
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
                              : message.isError
                              ? 'bg-destructive/10 text-destructive border border-destructive/20'
                              : 'bg-muted text-foreground'
                          )}
                        >
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
                    placeholder="Ask about your home..."
                    className={cn(
                      'flex-1 min-h-[40px] max-h-[100px] p-2 rounded-lg border border-input bg-background text-sm text-foreground',
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
                    className="h-10 w-10 shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default AIQueryPanel;




