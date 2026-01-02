# Maple AI Assistant - Complete Analysis & Implementation Guide

> **Document Purpose:** Comprehensive analysis of HomeTracker's AI assistant ("Maple"), including current state, architecture, integration points, and implementation roadmap.
>
> **Last Updated:** 2026-01-02
> **Status:** Phase 2.5 - Planning Stage

---

## Executive Summary

HomeTracker already has a **sophisticated AI assistant foundation** with BYOK (Bring Your Own Key) support for multiple AI providers. The AI infrastructure is ~80% complete. What's missing is:

1. **Branding** - Currently generic "AI Assistant", needs "Maple 🍁" branding
2. **Deep Workflow Integration** - AI is a floating panel, not embedded in workflows
3. **Smart Actions** - AI can answer questions but can't modify data
4. **Proactive Suggestions** - AI is reactive, not proactive
5. **Voice Input** - Text-only currently
6. **Conversation Persistence** - Memory resets on page reload

**Bottom Line:** You have the engine, you just need to build the car around it.

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [BYOK Architecture](#byok-architecture-already-implemented)
3. [How Maple Works (Technical Deep Dive)](#how-maple-works-technical-deep-dive)
4. [Integration Points with HomeTracker Workflows](#integration-points-with-hometracker-workflows)
5. [Gap Analysis: What's Missing](#gap-analysis-whats-missing)
6. [Implementation Roadmap](#implementation-roadmap)
7. [Code Examples](#code-examples)
8. [Testing Strategy](#testing-strategy)

---

## Current State Analysis

### ✅ What EXISTS and WORKS

| Component | File | Status | Description |
|-----------|------|--------|-------------|
| **AIQueryPanel** | `frontend/src/components/AIQueryPanel.tsx` | ✅ Complete | Floating chat panel with message history, quick actions, context-aware |
| **AI Service** | `frontend/src/lib/aiService.ts` | ✅ Complete | Multi-provider AI integration (OpenAI, Anthropic, Google) |
| **Home Context Builder** | `frontend/src/lib/homeContext.ts` | ✅ Complete | Aggregates all HomeTracker data for AI context |
| **BYOK Support** | `frontend/src/store/aiSettingsStore.ts` | ✅ Complete | User provides own API keys for any provider |
| **AI Suggestions (Backend)** | `backend/src/services/ai-suggestions.service.ts` | ✅ Complete | Pattern-based category/maintenance suggestions |
| **Mermaid Diagram Assistant** | `frontend/src/lib/aiService.ts` | ✅ Complete | AI-powered diagram creation/fixing |
| **Document Intelligence** | `frontend/src/lib/aiService.ts` | ✅ Complete | OCR + AI data extraction from receipts/manuals |

### 🔄 What's PARTIALLY IMPLEMENTED

| Feature | Status | What Works | What's Missing |
|---------|--------|------------|----------------|
| **Natural Language Queries** | 🟡 60% | Can ask questions about home data | Limited to read-only queries |
| **Dashboard Integration** | 🟡 50% | AIQueryPanel appears on Dashboard | Only shows when AI is configured |
| **Conversation History** | 🟡 40% | Messages stored in component state | Lost on page reload, no backend persistence |
| **Quick Actions** | 🟡 70% | Pre-built prompts for common questions | Can't trigger actual app actions |

### ❌ What's MISSING (Planned for Phase 2.5)

- 🍁 **Maple Branding** - No "Maple" name, no maple leaf icon, generic feel
- **Smart Actions** - Can't create/update/delete items via chat
- **Proactive Notifications** - Doesn't pro actively suggest maintenance or warn about issues
- **Voice Input** - Text-only, no speech-to-text
- **Multi-Page Integration** - Only on Dashboard, not embedded in Items/Projects/etc.
- **Conversation Memory** - No long-term memory across sessions
- **Context Switching** - Can't remember "the refrigerator we just talked about"

---

## BYOK Architecture (Already Implemented!)

### Overview

HomeTracker's AI uses a **Bring Your Own Key (BYOK)** model - users provide their own API keys for whichever AI provider they prefer. No vendor lock-in, no HomeTracker backend AI costs.

### Supported Providers

| Provider | Models | Status | API Endpoint |
|----------|--------|--------|--------------|
| **OpenAI** | GPT-4o, GPT-4o-mini, GPT-4-Turbo | ✅ Working | `api.openai.com` |
| **Anthropic** | Claude Sonnet 4, Claude 3.5 Sonnet, Claude Haiku | ✅ Working | `api.anthropic.com` |
| **Google** | Gemini 1.5 Pro, Gemini Flash | ✅ Working | `generativelanguage.googleapis.com` |
| **Local LLMs** | Ollama, LM Studio (OpenAI-compatible) | 🟡 Untested | Custom endpoint |

### How It Works

```typescript
// File: frontend/src/store/aiSettingsStore.ts

interface AISettings {
  activeProvider: 'none' | 'openai' | 'anthropic' | 'gemini';
  providers: {
    openai: {
      apiKey: string;
      model: string;  // 'gpt-4o', 'gpt-4o-mini', etc.
      enabled: boolean;
    };
    anthropic: {
      apiKey: string;
      model: string;  // 'claude-sonnet-4-20250514', etc.
      enabled: boolean;
    };
    gemini: {
      apiKey: string;
      model: string;  // 'gemini-1.5-pro', 'gemini-1.5-flash'
      enabled: boolean;
    };
  };
  features: {
    enableSmartAssistant: boolean;
    enableGlobalSearch: boolean;
    enableMermaidAssistant: boolean;
    enableDocumentIntelligence: boolean;
  };
}
```

### API Call Flow

```
User Query
    ↓
AIQueryPanel.tsx
    ↓
aiService.homeChat(message, history)
    ↓
sendPrompt({
  systemPrompt: HOME_AI_PROMPTS.homeAssistant,
  userPrompt: message,
  includeHomeContext: true,  // <-- Key: injects all home data
  homeContextFormat: 'natural'
})
    ↓
callAI(messages, { preferFast: isSimpleQuery })
    ↓
[Based on activeProvider:]
├─→ callOpenAI() → fetch('https://api.openai.com/v1/chat/completions')
├─→ callAnthropic() → fetch('https://api.anthropic.com/v1/messages')
└─→ callGemini() → fetch('https://generativelanguage.googleapis.com/...')
    ↓
Response
    ↓
Display in AIQueryPanel
```

### Smart Model Selection

The system automatically selects faster/cheaper models for simple queries:

```typescript
// File: frontend/src/lib/aiService.ts:256-266

const FAST_MODELS: Record<string, string> = {
  'gpt-4o': 'gpt-4o-mini',
  'claude-sonnet-4-20250514': 'claude-3-5-haiku-20241022',
  'gemini-1.5-pro': 'gemini-1.5-flash',
};

// Usage:
const isSimpleQuery = message.length < 50 ||
  /^(what|when|where|how many|list|show)/i.test(message.trim());

return sendPrompt({
  ...
  preferFast: isSimpleQuery,  // Uses gpt-4o-mini instead of gpt-4o
});
```

**Cost Savings:**
- Simple queries ("What maintenance is due?") → Fast model (90% cheaper)
- Complex queries ("Analyze my budget trends and suggest improvements") → Primary model

### User Configuration UI

Users configure AI in Settings page:

1. **Settings → AI Configuration**
2. Select provider (OpenAI / Anthropic / Google)
3. Enter API key (stored in browser LocalStorage)
4. Select model
5. Enable/disable AI features

**Security:** API keys are stored in browser LocalStorage only, never sent to HomeTracker backend.

---

## How Maple Works (Technical Deep Dive)

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER INTERFACE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Dashboard                Items Page           Maintenance Page  │
│      │                        │                       │          │
│      └────────────────────────┴───────────────────────┘          │
│                              │                                   │
│                     AIQueryPanel.tsx                             │
│              (Floating chat panel with 🍁 icon)                  │
│                              │                                   │
└──────────────────────────────┼───────────────────────────────────┘
                               │
┌──────────────────────────────┼───────────────────────────────────┐
│                   FRONTEND AI LAYER                              │
├──────────────────────────────┼───────────────────────────────────┤
│                              ↓                                   │
│                      aiService.ts                                │
│          ┌───────────────────────────────────┐                   │
│          │  homeChat(message, history)       │                   │
│          │  ├─ Build system prompt           │                   │
│          │  ├─ Include homeContext           │                   │
│          │  └─ Select model (fast/primary)   │                   │
│          └───────────────────┬───────────────┘                   │
│                              │                                   │
│          ┌──────────────────┴────────────────┐                   │
│          │  homeContext.ts                   │                   │
│          │  ├─ Aggregate all stores          │                   │
│          │  ├─ Build inventory context       │                   │
│          │  ├─ Build maintenance context     │                   │
│          │  ├─ Build projects context        │                   │
│          │  ├─ Build vendors context         │                   │
│          │  └─ Generate summary              │                   │
│          └───────────────────┬───────────────┘                   │
│                              │                                   │
└──────────────────────────────┼───────────────────────────────────┘
                               │
┌──────────────────────────────┼───────────────────────────────────┐
│                     DATA STORES                                  │
├──────────────────────────────┼───────────────────────────────────┤
│                              ↓                                   │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐     │
│  │inventoryStore  │  │maintenanceStore│  │ projectStore   │     │
│  │ (items, ware)  │  │ (tasks)        │  │ (projects)     │     │
│  └────────────────┘  └────────────────┘  └────────────────┘     │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐     │
│  │ vendorStore    │  │ documentStore  │  │homeVitalsStore │     │
│  │ (vendors)      │  │ (docs)         │  │ (home info)    │     │
│  └────────────────┘  └────────────────┘  └────────────────┘     │
│                                                                  │
└──────────────────────────────┼───────────────────────────────────┘
                               │
┌──────────────────────────────┼───────────────────────────────────┐
│                      AI PROVIDERS                                │
├──────────────────────────────┼───────────────────────────────────┤
│                              ↓                                   │
│        [Based on activeProvider setting]                         │
│                              │                                   │
│         ┌────────────────────┼────────────────────┐              │
│         │                    │                    │              │
│    callOpenAI()         callAnthropic()      callGemini()       │
│         │                    │                    │              │
│         ↓                    ↓                    ↓              │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐     │
│  │ OpenAI API  │      │Anthropic API│      │ Gemini API  │     │
│  │ (GPT-4o)    │      │(Claude 4)   │      │ (Gemini Pro)│     │
│  └─────────────┘      └─────────────┘      └─────────────┘     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow Example: "What maintenance is due this week?"

**Step 1: User Input**
```tsx
// AIQueryPanel.tsx:159-203
const handleSend = async () => {
  const userMessage = { role: 'user', content: "What maintenance is due this week?" };
  setMessages([...messages, userMessage]);

  // Call AI service
  const response = await homeChat(messageText, conversationHistory);

  const aiMessage = { role: 'assistant', content: response.content };
  setMessages([...messages, userMessage, aiMessage]);
};
```

**Step 2: Build Home Context**
```typescript
// homeContext.ts:92-155
function buildMaintenanceContext(): MaintenanceContext {
  const store = useMaintenanceStore.getState();
  const overdueTasks = store.getOverdueTasks();
  const upcomingTasks = store.getUpcomingTasks();

  return {
    totalTasks: tasks.length,
    overdueTasks,  // Tasks past due date
    upcomingTasks,  // Tasks due in next 30 days
    pendingTasks,
    completedRecently,
    tasksByCategory: { 'HVAC': 3, 'Plumbing': 1, ... },
    tasksByPriority: { 'high': 2, 'medium': 5, ... },
  };
}

function buildHomeContext(): HomeContext {
  return {
    timestamp: new Date().toISOString(),
    inventory: buildInventoryContext(),
    maintenance: buildMaintenanceContext(),  // <-- Used here
    projects: buildProjectContext(),
    vendors: buildVendorContext(),
    documents: buildDocumentContext(),
    homeInfo: buildHomeInfoContext(),
    summary: buildHomeSummary(),
  };
}
```

**Step 3: Generate Natural Language Context**
```typescript
// homeContext.ts (contextToNaturalLanguage function)
function contextToNaturalLanguage(context: HomeContext): string {
  return `
Current Home Status:

MAINTENANCE:
- You have ${context.maintenance.totalTasks} total maintenance tasks
- ${context.maintenance.overdueTasks.length} tasks are OVERDUE:
  ${context.maintenance.overdueTasks.map(t => `  • ${t.title} (due ${t.dueDate})`).join('\n')}
- ${context.maintenance.upcomingTasks.length} tasks due in next 30 days:
  ${context.maintenance.upcomingTasks.map(t => `  • ${t.title} (due ${t.dueDate})`).join('\n')}

INVENTORY:
- ${context.inventory.totalItems} items tracked
- ${context.inventory.expiringWarranties.length} warranties expiring soon
...
`;
}
```

**Step 4: Build AI Prompt**
```typescript
// aiService.ts:745-761
export async function homeChat(message: string, conversationHistory: AIMessage[] = []): Promise<AIResponse> {
  const isSimpleQuery = message.length < 50 || /^(what|when|where|how many|list|show)/i.test(message.trim());

  return sendPrompt({
    systemPrompt: HOME_AI_PROMPTS.homeAssistant,  // Personality + instructions
    userPrompt: message,  // "What maintenance is due this week?"
    conversationHistory,  // Previous messages for context
    includeHomeContext: true,  // <-- THE MAGIC
    homeContextFormat: 'natural',  // Natural language, not JSON
    preferFast: isSimpleQuery,  // Use cheap model for simple queries
  });
}
```

**Step 5: Final Prompt Sent to AI**
```
System Prompt:
You are HomeTracker AI, a friendly and helpful home management assistant. Your personality is warm, knowledgeable, and practical...

--- HOME DATA ---
Current Home Status:

MAINTENANCE:
- You have 12 total maintenance tasks
- 2 tasks are OVERDUE:
  • Replace HVAC filter (due 2025-12-28)
  • Check smoke detectors (due 2025-12-30)
- 3 tasks due in next 30 days:
  • Deep clean refrigerator coils (due 2026-01-05)
  • Test garage door safety (due 2026-01-12)
  • Flush water heater (due 2026-01-20)

INVENTORY:
- 47 items tracked
- 2 warranties expiring soon
...
--- END HOME DATA ---

User: What maintenance is due this week?
```

**Step 6: AI Response**
```
You have 3 maintenance tasks due this week! 🔧

**Overdue (needs immediate attention):**
1. Replace HVAC filter - was due December 28th
2. Check smoke detectors - was due December 30th

**Upcoming this week:**
3. Deep clean refrigerator coils - due January 5th

I recommend tackling the HVAC filter first, as it affects your heating efficiency. The smoke detector test is also important for safety. Would you like me to mark any of these as completed?
```

### Context Optimization

The system has 4 context formats to balance token usage:

| Format | Tokens | Use Case | Example |
|--------|--------|----------|---------|
| `'full'` | ~3000 | Complex analysis, detailed queries | "Analyze my spending patterns" |
| `'natural'` | ~1500 | Conversational queries | "What's due this week?" |
| `'compact'` | ~800 | Quick facts, simple questions | "How many items?" |
| `'summary'` | ~200 | Ultra-fast queries | "Any alerts?" |

```typescript
// File: frontend/src/lib/aiService.ts:439-455

switch (homeContextFormat) {
  case 'full':
    contextString = contextToPrompt(context);  // Full JSON
    break;
  case 'natural':
    contextString = contextToNaturalLanguage(context);  // Readable paragraphs
    break;
  case 'compact':
    contextString = contextToCompactJSON(context);  // Minimal JSON
    break;
  case 'summary':
    contextString = `Quick stats: ${context.summary.quickStats}...`;  // One-liners
    break;
}
```

---

## Integration Points with HomeTracker Workflows

### Where Maple SHOULD Appear

Currently, Maple (AIQueryPanel) only appears on the Dashboard. It should be integrated into every major workflow:

| Page | Current State | Ideal Integration | Example Query |
|------|---------------|-------------------|---------------|
| **Dashboard** | ✅ Has AIQueryPanel | Expand to show proactive alerts | "You have 2 overdue tasks and 1 warranty expiring this week" |
| **Items** | ❌ No AI | Inline helper for adding items | "I just bought a Samsung fridge" → Auto-fills form |
| **Maintenance** | ❌ No AI | Suggest tasks based on inventory | "Based on your HVAC system, here are recommended tasks..." |
| **Projects** | ❌ No AI | Project planning assistant | "Break down my kitchen renovation into subtasks" |
| **Warranties** | ❌ No AI | Warranty expiration reminders | "Your fridge warranty expires in 30 days. Here's how to renew..." |
| **Vendors** | ❌ No AI | Vendor recommendations | "For HVAC work, I recommend ABC Heating (4.5 stars, used 3 times)" |
| **Documents** | ✅ Has AI (OCR) | Expand to document Q&A | "Find my fridge's model number from the manual" |
| **Diagrams** | ✅ Has AI (Mermaid) | Already working | "Create a network diagram for my home" |
| **Budget** | ❌ No AI | Spending analysis | "Where am I overspending?" |

### Integration Pattern: Contextual Quick Actions

Instead of a single floating panel, Maple should offer **contextual quick actions** on each page:

```tsx
// Example: Items.tsx with Maple integration
<div className="flex justify-between items-center mb-4">
  <h1>Inventory</h1>

  <div className="flex gap-2">
    <Button onClick={openQuickAdd}>
      <Plus /> Add Item
    </Button>

    {/* Maple Quick Action */}
    <Button variant="outline" onClick={() => openMaple("Tell me about an item you want to add")}>
      🍁 Ask Maple to Add
    </Button>
  </div>
</div>

{/* Maple Inline Panel */}
{mapleOpen && (
  <Card className="mb-4 bg-amber-50 dark:bg-amber-900/20">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        🍁 Maple - Inventory Assistant
      </CardTitle>
    </CardHeader>
    <CardContent>
      <AIQueryPanel
        context="inventory"
        title="Maple"
        floating={false}  // Inline, not floating
        quickActions={[
          { id: 'add', label: 'Add Item', prompt: 'Help me add a new item to my inventory' },
          { id: 'find', label: 'Find Item', prompt: 'Help me find an item' },
          { id: 'low-stock', label: 'Low Stock', prompt: 'What consumables are low on stock?' },
        ]}
      />
    </CardContent>
  </Card>
)}
```

### Smart Actions (NOT YET IMPLEMENTED)

The big gap: **Maple can answer questions but can't take actions**.

**Example of what SHOULD work:**

**User:** "Add a new Samsung refrigerator to my kitchen inventory"

**Maple (Ideal Response):**
```
Great! I'll help you add that. I've pre-filled the form with:
- Name: Samsung Refrigerator
- Category: Kitchen Appliances
- Location: Kitchen

[Show pre-filled Add Item form]

Would you like to add any additional details like model number, purchase date, or warranty information?
```

**How to implement:** See [Implementation Roadmap → Smart Actions](#63-smart-actions-10-days) below.

---

## Gap Analysis: What's Missing

### 1. Branding: "Maple" Identity

**Current:** Generic "AI Assistant" with ✨ Sparkles icon
**Target:** Branded "Maple 🍁" with personality

```tsx
// Current (frontend/src/components/AIQueryPanel.tsx:317)
<Sparkles className="w-4 h-4" />
<span className="font-semibold text-sm">{title}</span>  // title = "AI Assistant"

// Target:
<span className="text-2xl">🍁</span>
<span className="font-semibold text-sm">Maple</span>
```

**Changes needed:**
- AIQueryPanel → MapleChat
- Icon: ✨ → 🍁
- Colors: Purple/Blue gradient → Amber/Maple colors
- Personality: Already defined in `HOME_AI_PROMPTS.homeAssistant` ✅

---

### 2. Smart Actions: Intent Classification + API Calls

**Current:** Maple can answer questions but can't modify data.

**Target:** Maple can:
- Create items, projects, maintenance tasks
- Update existing records
- Complete tasks, mark warranties as renewed
- Add vendors, upload documents

**Architecture:**

```typescript
// New file: frontend/src/lib/mapleActions.ts

export type MapleIntent =
  | 'query'       // Read-only question
  | 'create'      // Create new record
  | 'update'      // Update existing record
  | 'delete'      // Delete record
  | 'complete';   // Mark task/project complete

interface MapleAction {
  intent: MapleIntent;
  entity: 'item' | 'project' | 'task' | 'vendor' | 'document';
  data: Record<string, any>;
  confidence: number;
}

export async function classifyIntent(message: string, context: HomeContext): Promise<MapleAction> {
  // Use AI to extract intent + structured data
  const response = await sendPrompt({
    systemPrompt: MAPLE_PROMPTS.intentClassifier,
    userPrompt: message,
    includeHomeContext: true,
    homeContextFormat: 'compact',
    preferFast: true,
  });

  return extractJSON<MapleAction>(response.content);
}

export async function executeAction(action: MapleAction): Promise<{ success: boolean; message: string }> {
  switch (action.intent) {
    case 'create':
      return await createEntity(action);
    case 'update':
      return await updateEntity(action);
    case 'delete':
      return await deleteEntity(action);
    case 'complete':
      return await completeEntity(action);
    default:
      return { success: false, message: 'Unknown intent' };
  }
}
```

**Example:**

**User:** "Mark the HVAC filter task as complete"

**1. Classify Intent:**
```json
{
  "intent": "complete",
  "entity": "task",
  "data": {
    "taskName": "Replace HVAC filter"
  },
  "confidence": 0.95
}
```

**2. Execute Action:**
```typescript
async function completeEntity(action: MapleAction) {
  const task = useMaintenanceStore.getState().tasks.find(t => t.title.includes('HVAC filter'));

  if (!task) {
    return { success: false, message: "I couldn't find that task. Can you be more specific?" };
  }

  await useMaintenanceStore.getState().completeTask(task.id);

  return { success: true, message: `✅ Marked "${task.title}" as complete!` };
}
```

**3. Maple Response:**
```
✅ Marked "Replace HVAC filter" as complete!

Great job! Your next maintenance task is "Check smoke detectors" (due Dec 30).
```

---

### 3. Proactive Suggestions

**Current:** Maple waits for user to ask questions.
**Target:** Maple proactively alerts users to issues.

**Implementation:**

```typescript
// New file: frontend/src/lib/mapleProactive.ts

interface MapleAlert {
  id: string;
  severity: 'info' | 'warning' | 'urgent';
  title: string;
  message: string;
  actions: { label: string; action: () => void }[];
}

export function generateProactiveAlerts(context: HomeContext): MapleAlert[] {
  const alerts: MapleAlert[] = [];

  // Check for overdue tasks
  if (context.maintenance.overdueTasks.length > 0) {
    alerts.push({
      id: 'overdue-tasks',
      severity: 'warning',
      title: `${context.maintenance.overdueTasks.length} Overdue Tasks`,
      message: `You have ${context.maintenance.overdueTasks.length} maintenance tasks that are overdue.`,
      actions: [
        { label: 'View Tasks', action: () => navigate('/maintenance') },
        { label: 'Remind me tomorrow', action: () => snoozeAlert('overdue-tasks', 1) },
      ],
    });
  }

  // Check for expiring warranties
  if (context.inventory.expiringWarranties.length > 0) {
    alerts.push({
      id: 'expiring-warranties',
      severity: 'info',
      title: 'Warranties Expiring Soon',
      message: `${context.inventory.expiringWarranties.length} warranties will expire in the next 90 days.`,
      actions: [
        { label: 'View Warranties', action: () => navigate('/items') },
        { label: 'Dismiss', action: () => dismissAlert('expiring-warranties') },
      ],
    });
  }

  // ... more alert types

  return alerts;
}
```

**UI:**

```tsx
// Dashboard.tsx - Add at top of page
const MapleAlerts = () => {
  const context = buildHomeContext();
  const alerts = generateProactiveAlerts(context);

  if (alerts.length === 0) return null;

  return (
    <div className="mb-6 space-y-3">
      {alerts.map(alert => (
        <Alert key={alert.id} variant={alert.severity === 'urgent' ? 'destructive' : 'default'}>
          <div className="flex items-start justify-between">
            <div>
              <AlertTitle className="flex items-center gap-2">
                🍁 Maple Alert: {alert.title}
              </AlertTitle>
              <AlertDescription>{alert.message}</AlertDescription>
            </div>
            <div className="flex gap-2">
              {alert.actions.map(action => (
                <Button key={action.label} size="sm" onClick={action.action}>
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        </Alert>
      ))}
    </div>
  );
};
```

---

### 4. Voice Input

**Current:** Text-only input
**Target:** Speech-to-text support

**Implementation:**

```tsx
// AIQueryPanel.tsx - Add voice input button

import { Mic, MicOff } from 'lucide-react';

const [isListening, setIsListening] = useState(false);
const recognitionRef = useRef<SpeechRecognition | null>(null);

useEffect(() => {
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;

    recognitionRef.current.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      setInput(transcript);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };
  }
}, []);

const toggleVoiceInput = () => {
  if (!recognitionRef.current) {
    alert('Speech recognition not supported in this browser');
    return;
  }

  if (isListening) {
    recognitionRef.current.stop();
    setIsListening(false);
  } else {
    recognitionRef.current.start();
    setIsListening(true);
  }
};

// UI:
<div className="flex items-end gap-2">
  <textarea ... />

  {/* Voice input button */}
  <Button
    onClick={toggleVoiceInput}
    variant={isListening ? 'destructive' : 'outline'}
    size="icon"
    className="h-10 w-10 shrink-0"
  >
    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
  </Button>

  <Button onClick={() => handleSend()} ... >
    <Send className="w-4 h-4" />
  </Button>
</div>
```

---

### 5. Conversation Persistence

**Current:** Conversation history lost on page reload
**Target:** Persistent conversation memory across sessions

**Backend Implementation:**

```typescript
// backend/src/services/maple-conversation.service.ts

interface MapleConversation {
  id: string;
  userId: string;
  propertyId: string;
  messages: MapleMessage[];
  createdAt: string;
  lastMessageAt: string;
}

interface MapleMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: {
    intent?: string;
    actionTaken?: string;
    contextUsed?: 'full' | 'compact' | 'natural' | 'summary';
  };
}

class MapleConversationService {
  // Get or create active conversation for user
  async getActiveConversation(userId: string, propertyId: string): Promise<MapleConversation> {
    const existing = db.prepare(`
      SELECT * FROM maple_conversations
      WHERE user_id = ? AND property_id = ?
      ORDER BY last_message_at DESC
      LIMIT 1
    `).get(userId, propertyId);

    if (existing) return this.hydrate(existing);

    return this.createConversation(userId, propertyId);
  }

  // Add message to conversation
  async addMessage(conversationId: string, message: MapleMessage): Promise<void> {
    db.prepare(`
      INSERT INTO maple_messages (id, conversation_id, role, content, timestamp, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      message.id,
      conversationId,
      message.role,
      message.content,
      message.timestamp,
      JSON.stringify(message.metadata)
    );

    // Update conversation last_message_at
    db.prepare(`
      UPDATE maple_conversations
      SET last_message_at = ?
      WHERE id = ?
    `).run(message.timestamp, conversationId);
  }

  // Get conversation history (with limit for context window)
  async getConversationHistory(conversationId: string, limit: number = 20): Promise<MapleMessage[]> {
    return db.prepare(`
      SELECT * FROM maple_messages
      WHERE conversation_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(conversationId, limit).reverse();
  }
}
```

**Frontend Integration:**

```tsx
// AIQueryPanel.tsx - Load persisted conversation on mount

const [conversationId, setConversationId] = useState<string | null>(null);

useEffect(() => {
  const loadConversation = async () => {
    const response = await fetch('/api/maple/conversation');
    const data = await response.json();

    setConversationId(data.conversation.id);
    setMessages(data.conversation.messages);
  };

  if (aiReady.ready) {
    loadConversation();
  }
}, [aiReady.ready]);

const handleSend = async (prompt?: string) => {
  // ... existing code ...

  // Save message to backend
  await fetch(`/api/maple/conversation/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      role: 'user',
      content: messageText,
    }),
  });

  // Get AI response
  const response = await homeChat(messageText, history);

  // Save AI response
  await fetch(`/api/maple/conversation/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      role: 'assistant',
      content: response.content,
    }),
  });
};
```

---

## Implementation Roadmap

### Phase 2.5: Maple AI Assistant (Total: ~35-45 days)

#### 6.1: Branding & UX Polish (3-5 days)

**Tasks:**
- [ ] Rename `AIQueryPanel` to `MapleChat`
- [ ] Replace ✨ Sparkles icon with 🍁 Maple leaf
- [ ] Update color scheme: Purple/Blue → Amber/Maple (#F59E0B, #D97706)
- [ ] Add "Maple" to system prompt personality
- [ ] Create Maple mascot/avatar (optional: stylized maple leaf character)
- [ ] Update Settings page: "AI Configuration" → "Maple Configuration"
- [ ] Add intro message: "Hi! I'm Maple 🍁, your home assistant. How can I help?"

**Files to modify:**
- `frontend/src/components/AIQueryPanel.tsx` → Rename to `MapleChat.tsx`
- `frontend/src/lib/aiService.ts` (Update `homeAssistant` prompt)
- `frontend/src/pages/Settings.tsx`
- `frontend/src/pages/Dashboard.tsx`

---

#### 6.2: Multi-Page Integration (5-7 days)

**Tasks:**
- [ ] Add Maple to Items page (context: 'inventory')
- [ ] Add Maple to Maintenance page (context: 'maintenance')
- [ ] Add Maple to Projects page (context: 'projects')
- [ ] Add Maple to Vendors page (context: 'vendors')
- [ ] Add Maple to Budget page (context: 'budget')
- [ ] Create context-specific quick actions for each page
- [ ] Add inline mode (floating={false}) for embedded use
- [ ] Add keyboard shortcut (Cmd/Ctrl + K) to summon Maple globally

**Example integration:**

```tsx
// frontend/src/pages/Items.tsx

import { MapleChat } from '../components/MapleChat';

const [mapleOpen, setMapleOpen] = useState(false);

// Add button in header
<Button variant="outline" onClick={() => setMapleOpen(!mapleOpen)}>
  🍁 Ask Maple
</Button>

// Render inline panel
{mapleOpen && (
  <div className="mb-4">
    <MapleChat
      context="inventory"
      floating={false}
      defaultCollapsed={false}
      quickActions={[
        { id: 'add', label: 'Add Item', prompt: 'Help me add a new item' },
        { id: 'find', label: 'Find Item', prompt: 'Help me find an item' },
        { id: 'warranties', label: 'Check Warranties', prompt: 'Which warranties are expiring soon?' },
      ]}
    />
  </div>
)}
```

---

#### 6.3: Smart Actions (10-14 days)

**Tasks:**
- [ ] Create `mapleActions.ts` service
- [ ] Implement intent classification AI prompt
- [ ] Build action executors:
  - [ ] `createItem` - Add inventory item
  - [ ] `updateItem` - Update item details
  - [ ] `completeTask` - Mark maintenance task complete
  - [ ] `createProject` - Add new project
  - [ ] `addVendor` - Add vendor to directory
  - [ ] `createMaintenanceTask` - Schedule new task
- [ ] Add confirmation flow for destructive actions (delete)
- [ ] Integrate actions into MapleChat response handling
- [ ] Add "Undo" feature for recent actions
- [ ] Create action history log

**Backend routes needed:**

```typescript
// backend/src/routes/maple.routes.ts

router.post('/action', async (req, res) => {
  const { action, data, confirmationToken } = req.body;

  // Validate action
  const result = await mapleActionService.execute(action, data, req.user.id);

  res.json({ success: true, result });
});
```

**Frontend integration:**

```tsx
// MapleChat.tsx - Handle AI responses with actions

const handleAIResponse = async (response: AIResponse) => {
  // Check if response contains an action
  const action = extractAction(response.content);

  if (action) {
    // Show confirmation UI
    setProposedAction(action);
    setShowConfirmation(true);
  } else {
    // Regular message
    addMessage({ role: 'assistant', content: response.content });
  }
};

// Confirmation UI
{showConfirmation && proposedAction && (
  <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
    <p className="font-medium mb-2">Maple wants to take this action:</p>
    <div className="bg-white p-3 rounded border mb-3">
      <code>{JSON.stringify(proposedAction, null, 2)}</code>
    </div>
    <div className="flex gap-2">
      <Button onClick={executeAction}>Confirm</Button>
      <Button variant="outline" onClick={cancelAction}>Cancel</Button>
    </div>
  </div>
)}
```

---

#### 6.4: Proactive Suggestions (5-7 days)

**Tasks:**
- [ ] Create `mapleProactive.ts` service
- [ ] Implement alert generation logic:
  - [ ] Overdue maintenance tasks
  - [ ] Expiring warranties (30/60/90 days)
  - [ ] Low stock consumables
  - [ ] Stalled projects (no activity in 30 days)
  - [ ] Budget warnings (spending above average)
  - [ ] Seasonal maintenance reminders
- [ ] Add alert dismissal/snooze functionality
- [ ] Integrate alerts into Dashboard
- [ ] Add notification badge to Maple icon (number of active alerts)
- [ ] Create settings: "Proactive Notifications" on/off

**UI on Dashboard:**

```tsx
// Dashboard.tsx
<div className="mb-6">
  <MapleAlerts />
</div>
```

---

#### 6.5: Voice Input (3-4 days)

**Tasks:**
- [ ] Add Web Speech API integration
- [ ] Create voice button UI (mic icon)
- [ ] Add recording indicator (pulsing animation)
- [ ] Handle speech recognition errors gracefully
- [ ] Add browser compatibility check
- [ ] Create fallback message for unsupported browsers
- [ ] Add voice input toggle in settings (on/off)

**Browser support:** Chrome, Edge, Safari (iOS 14.5+), NOT Firefox

---

#### 6.6: Conversation Persistence (5-7 days)

**Tasks:**
- [ ] Create database schema:
  - [ ] `maple_conversations` table
  - [ ] `maple_messages` table
- [ ] Create backend service `maple-conversation.service.ts`
- [ ] Create API routes:
  - [ ] `GET /api/maple/conversation` - Get active conversation
  - [ ] `POST /api/maple/conversation/messages` - Add message
  - [ ] `DELETE /api/maple/conversation/:id` - Clear conversation
  - [ ] `GET /api/maple/conversations/history` - Get past conversations
- [ ] Update `MapleChat` to load/save messages
- [ ] Add "Clear Conversation" button in UI
- [ ] Add "Conversation History" panel to view past chats

**Database schema:**

```sql
-- backend/src/migrations/maple_conversations.sql

CREATE TABLE IF NOT EXISTS maple_conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_message_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (property_id) REFERENCES properties(id)
);

CREATE TABLE IF NOT EXISTS maple_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  metadata TEXT,  -- JSON: { intent, actionTaken, contextUsed }
  FOREIGN KEY (conversation_id) REFERENCES maple_conversations(id) ON DELETE CASCADE
);

CREATE INDEX idx_maple_conversations_user ON maple_conversations(user_id, property_id);
CREATE INDEX idx_maple_messages_conversation ON maple_messages(conversation_id, timestamp);
```

---

#### 6.7: Testing & Refinement (5-7 days)

**Tasks:**
- [ ] Unit tests for `mapleActions.ts`
- [ ] Unit tests for `mapleProactive.ts`
- [ ] Integration tests for conversation persistence
- [ ] E2E tests with Playwright:
  - [ ] Test: Add item via Maple
  - [ ] Test: Complete task via Maple
  - [ ] Test: Voice input
  - [ ] Test: Proactive alerts
- [ ] User acceptance testing
- [ ] Fix bugs identified in testing
- [ ] Performance optimization (reduce token usage)
- [ ] Documentation: User guide for Maple

---

## Code Examples

### Example 1: Maple-Powered Item Creation

**User says:** "I just bought a Samsung fridge for $2500"

**Maple's response flow:**

```typescript
// 1. Classify intent
const intent = await classifyIntent(userMessage, context);
// Result: { intent: 'create', entity: 'item', data: {...}, confidence: 0.92 }

// 2. Extract structured data
const itemData = intent.data;
// {
//   name: "Samsung Refrigerator",
//   category: "Kitchen Appliances",
//   purchasePrice: 2500,
//   purchaseDate: "2026-01-02",  // Today
// }

// 3. Pre-fill form (or auto-create with confirmation)
const confirmation = {
  message: "I'll add that to your inventory. Here's what I captured:",
  proposedAction: {
    type: 'createItem',
    data: itemData,
    preview: <ItemCard item={itemData} />
  },
  actions: [
    { label: 'Confirm', onClick: () => executeAction() },
    { label: 'Edit Details', onClick: () => openEditForm(itemData) },
    { label: 'Cancel', onClick: () => cancelAction() },
  ]
};

return confirmation;
```

---

### Example 2: Proactive Maintenance Alert

```typescript
// mapleProactive.ts

function checkOverdueMaintenanceTasks(context: HomeContext): MapleAlert | null {
  const overdue = context.maintenance.overdueTasks;

  if (overdue.length === 0) return null;

  // Group by priority
  const highPriority = overdue.filter(t => t.priority === 'high');
  const mediumPriority = overdue.filter(t => t.priority === 'medium');

  let message = `You have ${overdue.length} overdue maintenance task${overdue.length > 1 ? 's' : ''}. `;

  if (highPriority.length > 0) {
    message += `\n\n🔴 **High Priority:**\n`;
    message += highPriority.slice(0, 3).map(t => `- ${t.title} (due ${formatDate(t.dueDate)})`).join('\n');
  }

  if (mediumPriority.length > 0 && highPriority.length < 3) {
    message += `\n\n🟡 **Medium Priority:**\n`;
    message += mediumPriority.slice(0, 3 - highPriority.length).map(t => `- ${t.title} (due ${formatDate(t.dueDate)})`).join('\n');
  }

  return {
    id: 'overdue-maintenance',
    severity: highPriority.length > 0 ? 'urgent' : 'warning',
    title: `${overdue.length} Overdue Maintenance Task${overdue.length > 1 ? 's' : ''}`,
    message,
    actions: [
      {
        label: 'View All Tasks',
        action: () => navigate('/maintenance?filter=overdue')
      },
      {
        label: 'Complete First Task',
        action: async () => {
          const first = highPriority[0] || mediumPriority[0];
          await useMaintenanceStore.getState().completeTask(first.id);
          dismissAlert('overdue-maintenance');
        }
      },
      {
        label: 'Remind Me Tomorrow',
        action: () => snoozeAlert('overdue-maintenance', 1)
      }
    ],
  };
}
```

---

### Example 3: Maple Settings Panel

```tsx
// frontend/src/pages/Settings.tsx - Maple configuration section

<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      🍁 Maple AI Assistant
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Provider selection */}
    <div>
      <label className="text-sm font-medium">AI Provider</label>
      <Select value={activeProvider} onChange={setActiveProvider}>
        <option value="none">Disabled</option>
        <option value="openai">OpenAI (GPT-4o)</option>
        <option value="anthropic">Anthropic (Claude)</option>
        <option value="gemini">Google (Gemini)</option>
      </Select>
    </div>

    {/* API Key input */}
    {activeProvider !== 'none' && (
      <div>
        <label className="text-sm font-medium">API Key</label>
        <Input
          type="password"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder="sk-..."
        />
        <p className="text-xs text-muted-foreground mt-1">
          Your API key is stored locally and never sent to HomeTracker servers.
          {activeProvider === 'openai' && ' Get one at platform.openai.com'}
          {activeProvider === 'anthropic' && ' Get one at console.anthropic.com'}
          {activeProvider === 'gemini' && ' Get one at makersuite.google.com'}
        </p>
      </div>
    )}

    {/* Model selection */}
    {activeProvider !== 'none' && (
      <div>
        <label className="text-sm font-medium">Model</label>
        <Select value={model} onChange={setModel}>
          {activeProvider === 'openai' && (
            <>
              <option value="gpt-4o">GPT-4o (Recommended)</option>
              <option value="gpt-4o-mini">GPT-4o mini (Faster, cheaper)</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
            </>
          )}
          {activeProvider === 'anthropic' && (
            <>
              <option value="claude-sonnet-4-20250514">Claude Sonnet 4 (Recommended)</option>
              <option value="claude-3-5-haiku-20241022">Claude Haiku (Faster, cheaper)</option>
            </>
          )}
          {activeProvider === 'gemini' && (
            <>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro (Recommended)</option>
              <option value="gemini-1.5-flash">Gemini Flash (Faster, cheaper)</option>
            </>
          )}
        </Select>
      </div>
    )}

    {/* Feature toggles */}
    <div className="space-y-2 pt-4 border-t">
      <h4 className="font-medium text-sm">Maple Features</h4>

      <div className="flex items-center justify-between">
        <label className="text-sm">Smart Assistant (Maple Chat)</label>
        <Switch checked={enableSmartAssistant} onChange={setEnableSmartAssistant} />
      </div>

      <div className="flex items-center justify-between">
        <label className="text-sm">Proactive Suggestions</label>
        <Switch checked={enableProactiveSuggestions} onChange={setEnableProactiveSuggestions} />
      </div>

      <div className="flex items-center justify-between">
        <label className="text-sm">Voice Input</label>
        <Switch checked={enableVoiceInput} onChange={setEnableVoiceInput} />
      </div>

      <div className="flex items-center justify-between">
        <label className="text-sm">Global Search AI Enhancement</label>
        <Switch checked={enableGlobalSearch} onChange={setEnableGlobalSearch} />
      </div>

      <div className="flex items-center justify-between">
        <label className="text-sm">Mermaid Diagram Assistant</label>
        <Switch checked={enableMermaidAssistant} onChange={setEnableMermaidAssistant} />
      </div>

      <div className="flex items-center justify-between">
        <label className="text-sm">Document Intelligence (OCR + AI)</label>
        <Switch checked={enableDocumentIntelligence} onChange={setEnableDocumentIntelligence} />
      </div>
    </div>

    {/* Test connection */}
    <Button onClick={testConnection} disabled={!apiKey}>
      Test Connection
    </Button>
  </CardContent>
</Card>
```

---

## Testing Strategy

### Unit Tests

```typescript
// frontend/src/lib/mapleActions.test.ts

describe('MapleActions', () => {
  describe('classifyIntent', () => {
    it('should classify "add refrigerator" as create intent', async () => {
      const intent = await classifyIntent('Add a new Samsung refrigerator', context);

      expect(intent.intent).toBe('create');
      expect(intent.entity).toBe('item');
      expect(intent.data.name).toContain('refrigerator');
      expect(intent.data.category).toBe('Kitchen Appliances');
    });

    it('should classify "mark task complete" as complete intent', async () => {
      const intent = await classifyIntent('Mark the HVAC filter task as done', context);

      expect(intent.intent).toBe('complete');
      expect(intent.entity).toBe('task');
    });
  });

  describe('executeAction', () => {
    it('should create item when action.intent is create', async () => {
      const action: MapleAction = {
        intent: 'create',
        entity: 'item',
        data: { name: 'Test Item', category: 'Test' },
        confidence: 0.9,
      };

      const result = await executeAction(action);

      expect(result.success).toBe(true);
      expect(result.message).toContain('added');
    });
  });
});
```

### Integration Tests

```typescript
// frontend/src/components/MapleChat.test.tsx

describe('MapleChat', () => {
  it('should render with default state', () => {
    render(<MapleChat context="general" />);

    expect(screen.getByText('🍁')).toBeInTheDocument();
    expect(screen.getByText('Maple')).toBeInTheDocument();
  });

  it('should send message and display response', async () => {
    render(<MapleChat context="general" />);

    const input = screen.getByPlaceholderText('Ask about your home...');
    const sendBtn = screen.getByRole('button', { name: /send/i });

    await userEvent.type(input, 'What maintenance is due?');
    await userEvent.click(sendBtn);

    await waitFor(() => {
      expect(screen.getByText(/You have \d+ maintenance tasks/)).toBeInTheDocument();
    });
  });

  it('should show confirmation for actions', async () => {
    render(<MapleChat context="inventory" />);

    const input = screen.getByPlaceholderText('Ask about your home...');
    await userEvent.type(input, 'Add a new refrigerator');
    await userEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText(/Maple wants to take this action/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    });
  });
});
```

### E2E Tests

```typescript
// e2e/maple.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Maple AI Assistant', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Configure AI
    await page.goto('/settings');
    await page.selectOption('select[name="ai-provider"]', 'openai');
    await page.fill('input[name="api-key"]', process.env.TEST_OPENAI_KEY);
    await page.click('button:has-text("Save")');

    await page.goto('/');
  });

  test('should open Maple on Dashboard', async ({ page }) => {
    await expect(page.locator('text=🍁')).toBeVisible();

    await page.click('div:has-text("Maple")');

    await expect(page.locator('text=How can I help?')).toBeVisible();
  });

  test('should answer query about maintenance', async ({ page }) => {
    await page.click('div:has-text("Maple")');
    await page.fill('textarea[placeholder*="Ask about your home"]', 'What maintenance is due this week?');
    await page.click('button[aria-label="Send"]');

    await expect(page.locator('text=/You have \d+ (maintenance|tasks)/i')).toBeVisible({ timeout: 10000 });
  });

  test('should create item via Maple', async ({ page }) => {
    await page.goto('/items');
    await page.click('button:has-text("🍁 Ask Maple")');

    await page.fill('textarea', 'Add a new Samsung refrigerator to my kitchen');
    await page.click('button[aria-label="Send"]');

    // Wait for confirmation
    await expect(page.locator('text=Maple wants to take this action')).toBeVisible({ timeout: 10000 });

    // Confirm action
    await page.click('button:has-text("Confirm")');

    // Verify item was created
    await expect(page.locator('text=Samsung refrigerator')).toBeVisible();
  });

  test('should show proactive alerts', async ({ page }) => {
    // Create an overdue task
    await page.goto('/maintenance');
    await page.click('button:has-text("Add Task")');
    await page.fill('input[name="title"]', 'Overdue Test Task');
    await page.fill('input[name="dueDate"]', '2025-12-01'); // Past date
    await page.click('button:has-text("Save")');

    // Go to Dashboard
    await page.goto('/');

    // Check for proactive alert
    await expect(page.locator('text=Maple Alert:')).toBeVisible();
    await expect(page.locator('text=Overdue Test Task')).toBeVisible();
  });
});
```

---

## Summary & Next Steps

### What You Have Today ✅

- **Fully functional AI assistant** with chat interface
- **BYOK support** for OpenAI, Anthropic, Google (no vendor lock-in)
- **Home context aggregation** from all data sources
- **Smart model selection** (fast/cheap for simple queries)
- **Specialized AI features**: Mermaid diagrams, document OCR, global search

### What's Missing for "Maple" ❌

- **Branding** (name, icon, personality)
- **Multi-page integration** (only on Dashboard currently)
- **Smart actions** (can't create/update data)
- **Proactive suggestions** (reactive only)
- **Voice input**
- **Conversation persistence**

### Recommended Priority

**Phase 1 (Quick Wins - 1-2 weeks):**
1. Branding & UX polish → Rename to "Maple 🍁"
2. Multi-page integration → Add to Items, Maintenance, Projects pages
3. Proactive alerts → Dashboard alerts for overdue tasks, expiring warranties

**Phase 2 (Core Features - 3-4 weeks):**
4. Smart actions → Intent classification + data modification
5. Conversation persistence → Backend storage, history panel
6. Voice input → Web Speech API integration

**Phase 3 (Polish - 1 week):**
7. Testing & refinement → E2E tests, bug fixes, performance optimization

---

**Total Estimated Effort:** 35-45 days (~7-9 weeks)

**Current Completion:** ~80% of infrastructure complete

**Your next step:** Review this document and decide which features to prioritize. Start with Phase 1 for quick impact.
