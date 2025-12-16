import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/Button';
import { useToast } from './ui/Toast';
import { useAISettingsStore, AI_PROVIDER_INFO } from '../store/aiSettingsStore';
import {
  getMermaidAssistance,
  fixMermaidDiagram,
  explainMermaidDiagram,
  optimizeMermaidDiagram,
  createMermaidFromDescription,
  extractMermaidCode,
  AIMessage,
} from '../lib/aiService';
import {
  Bot,
  Send,
  Sparkles,
  Wrench,
  Lightbulb,
  FileText,
  Wand2,
  Settings,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Loader2,
  X,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import { cn } from '../lib/utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  extractedCode?: string;
}

interface MermaidAIAssistantProps {
  currentCode: string;
  onApplyCode: (code: string) => void;
  mermaidError: string | null;
}

export function MermaidAIAssistant({
  currentCode,
  onApplyCode,
  mermaidError,
}: MermaidAIAssistantProps) {
  const toast = useToast();
  const { settings, isAIEnabled } = useAISettingsStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const aiEnabled = isAIEnabled();
  const activeProvider = settings.activeProvider;
  const providerInfo = AI_PROVIDER_INFO[activeProvider];

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    const extractedCode = role === 'assistant' ? extractMermaidCode(content) : undefined;
    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role,
      content,
      timestamp: new Date(),
      extractedCode,
    };
    setMessages((prev) => [...prev, newMessage]);
    return newMessage;
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    addMessage('user', userMessage);
    setIsLoading(true);

    try {
      const conversationHistory: AIMessage[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await getMermaidAssistance(
        userMessage,
        currentCode,
        conversationHistory
      );

      if (response.success && response.content) {
        addMessage('assistant', response.content);
      } else {
        addMessage('assistant', `❌ Error: ${response.error || 'Failed to get response'}`);
      }
    } catch (error: any) {
      addMessage('assistant', `❌ Error: ${error.message || 'An error occurred'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = async (
    action: 'fix' | 'explain' | 'optimize' | 'create',
    description?: string
  ) => {
    if (isLoading) return;
    if (!currentCode && action !== 'create') {
      toast.info('No Code', 'Enter some Mermaid code first');
      return;
    }

    setIsLoading(true);
    let response;

    try {
      switch (action) {
        case 'fix':
          addMessage('user', `🔧 Fix the errors in my diagram${mermaidError ? `: "${mermaidError}"` : ''}`);
          response = await fixMermaidDiagram(currentCode, mermaidError || undefined);
          break;
        case 'explain':
          addMessage('user', '💡 Explain what this diagram represents');
          response = await explainMermaidDiagram(currentCode);
          break;
        case 'optimize':
          addMessage('user', '✨ Suggest improvements for this diagram');
          response = await optimizeMermaidDiagram(currentCode);
          break;
        case 'create':
          if (!description) return;
          addMessage('user', `🎨 Create a diagram: ${description}`);
          response = await createMermaidFromDescription(description);
          break;
      }

      if (response?.success && response.content) {
        addMessage('assistant', response.content);
      } else {
        addMessage('assistant', `❌ Error: ${response?.error || 'Failed to get response'}`);
      }
    } catch (error: any) {
      addMessage('assistant', `❌ Error: ${error.message || 'An error occurred'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyCode = (code: string) => {
    onApplyCode(code);
    toast.success('Applied', 'Code applied to editor');
  };

  const handleCopyCode = (code: string, messageId: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(messageId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Not configured state
  if (!aiEnabled) {
    return (
      <div className="border-t border-border bg-card/50">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-3 py-2 flex items-center justify-between text-sm hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <Bot className="w-4 h-4" />
            <span>AI Assistant</span>
            <span className="px-1.5 py-0.5 text-[10px] bg-muted rounded">Not Configured</span>
          </div>
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>

        {isExpanded && (
          <div className="p-4 border-t border-border">
            <div className="text-center py-6">
              <Bot className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
              <h3 className="font-medium text-foreground mb-2">AI Assistant Not Configured</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Set up an AI provider to get help with your diagrams
              </p>
              <Button
                size="sm"
                onClick={() => window.location.href = '/settings'}
              >
                <Settings className="w-4 h-4 mr-2" />
                Configure in Settings
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="border-t border-border bg-card/50 flex flex-col">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between text-sm hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" />
          <span className="font-medium">AI Assistant</span>
          <span className="px-1.5 py-0.5 text-[10px] bg-primary/10 text-primary rounded">
            {providerInfo.name}
          </span>
          {messages.length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] bg-muted rounded">
              {messages.length} messages
            </span>
          )}
        </div>
        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
      </button>

      {isExpanded && (
        <div className="flex flex-col border-t border-border" style={{ height: '320px' }}>
          {/* Quick Actions */}
          <div className="flex gap-1 p-2 border-b border-border bg-muted/30 overflow-x-auto">
            <button
              onClick={() => handleQuickAction('fix')}
              disabled={isLoading || !currentCode}
              className={cn(
                "flex items-center gap-1 px-2 py-1 text-xs rounded-md whitespace-nowrap transition-colors",
                mermaidError
                  ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                  : "bg-muted hover:bg-muted/80",
                (isLoading || !currentCode) && "opacity-50 cursor-not-allowed"
              )}
            >
              <Wrench className="w-3 h-3" />
              Fix Errors
            </button>
            <button
              onClick={() => handleQuickAction('explain')}
              disabled={isLoading || !currentCode}
              className={cn(
                "flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-muted hover:bg-muted/80 whitespace-nowrap transition-colors",
                (isLoading || !currentCode) && "opacity-50 cursor-not-allowed"
              )}
            >
              <Lightbulb className="w-3 h-3" />
              Explain
            </button>
            <button
              onClick={() => handleQuickAction('optimize')}
              disabled={isLoading || !currentCode}
              className={cn(
                "flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-muted hover:bg-muted/80 whitespace-nowrap transition-colors",
                (isLoading || !currentCode) && "opacity-50 cursor-not-allowed"
              )}
            >
              <Sparkles className="w-3 h-3" />
              Improve
            </button>
            <button
              onClick={() => {
                const desc = prompt('Describe the diagram you want to create:');
                if (desc) handleQuickAction('create', desc);
              }}
              disabled={isLoading}
              className={cn(
                "flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-primary/10 text-primary hover:bg-primary/20 whitespace-nowrap transition-colors",
                isLoading && "opacity-50 cursor-not-allowed"
              )}
            >
              <Wand2 className="w-3 h-3" />
              Create New
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-2 space-y-3">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-4">
                <MessageSquare className="w-8 h-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Ask me to help with your Mermaid diagram
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Try: "Create a home network diagram" or use quick actions above
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col gap-1",
                    msg.role === 'user' ? "items-end" : "items-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[90%] rounded-lg px-3 py-2 text-sm",
                      msg.role === 'user'
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                  </div>
                  
                  {/* Actions for assistant messages with code */}
                  {msg.role === 'assistant' && msg.extractedCode && (
                    <div className="flex gap-1 mt-1">
                      <button
                        onClick={() => handleApplyCode(msg.extractedCode!)}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
                      >
                        <Check className="w-3 h-3" />
                        Apply to Editor
                      </button>
                      <button
                        onClick={() => handleCopyCode(msg.extractedCode!, msg.id)}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-muted rounded hover:bg-muted/80 transition-colors"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        Copy
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
            
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Thinking...</span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-2 border-t border-border">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your diagram... (Enter to send)"
                rows={1}
                className="flex-1 px-3 py-2 text-sm bg-background border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={isLoading}
              />
              <Button
                size="sm"
                onClick={handleSend}
                disabled={!inputValue.trim() || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}






