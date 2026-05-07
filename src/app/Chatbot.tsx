'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, MessageCircle, Bot, User, Sparkles, ChevronDown } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

const KNOWLEDGE_BASE: { patterns: RegExp[]; response: string }[] = [
  {
    patterns: [/what is internly/i, /what('s| is) this/i, /tell me about/i, /what does internly do/i, /about internly/i],
    response:
      'Internly is a comprehensive web-based On-the-Job Training (OJT) management and hours monitoring system. It helps trainees track their daily hours, log activities, generate weekly reports, and monitor their overall progress — all from a single dashboard.',
  },
  {
    patterns: [/feature/i, /what can (it|internly) do/i, /capabilities/i, /offer/i],
    response:
      'Internly offers several powerful features:\n\n⏱️ **Hour Tracking** — Log daily hours with precision\n📝 **Activity Logging** — Record tasks with activity types like Coding, Research, Meetings & more\n📊 **Dashboard Analytics** — Visual charts and stats on your progress\n📄 **Weekly Reports** — Auto-generate PDF reports for your supervisor\n👤 **Profile Management** — Upload a photo, manage your info\n🔔 **Reminders** — Stay on top of your OJT schedule',
  },
  {
    patterns: [/how.*(start|begin|sign|register|create account)/i, /get started/i, /sign ?up/i],
    response:
      'Getting started is easy! Click the **"Get Started"** button at the top of the page or scroll to the sign-up section. You\'ll need to provide your name, email, password, total required hours, and start date. Once registered, you\'ll be taken straight to your dashboard!',
  },
  {
    patterns: [/free|cost|price|pay|subscription|premium/i],
    response:
      'Internly is completely **free to use**! There are no hidden fees, subscriptions, or premium tiers. All features are available to every user at no cost.',
  },
  {
    patterns: [/log|daily|record.*(hour|activit|task)/i, /how.*(track|log|record)/i],
    response:
      'To log your daily activities:\n\n1. Go to your **Dashboard** → **Log** page\n2. Select the date and activity type (Coding, Research, Meeting, etc.)\n3. Enter your task description and hours worked\n4. Assign a supervisor and save\n\nYour log will appear in the History tab where you can also edit or review past entries.',
  },
  {
    patterns: [/report|pdf|generate|weekly|export/i],
    response:
      'Internly can generate **weekly PDF reports** for you! Head to the **Reports** section in your dashboard. Select a week and Internly will compile all your daily logs, total hours, and activities into a professional report you can download and submit to your supervisor.',
  },
  {
    patterns: [/data|privacy|secure|safe|store|local/i, /where.*(data|info)/i],
    response:
      'Your data is stored **locally in your browser** using localStorage. Internly does **not** send your data to any external server. This means your information stays on your device. However, clearing your browser data will erase your records, so keep that in mind!',
  },
  {
    patterns: [/supervisor/i, /who.*(approve|check)/i],
    response:
      'You can add multiple supervisors in your **Settings** page. When logging daily activities, you\'ll select which supervisor oversaw your work that day. Their name will appear in your logs and generated reports.',
  },
  {
    patterns: [/dashboard/i, /overview|stats|analytics/i],
    response:
      'Your **Dashboard** gives you a complete overview of your OJT progress:\n\n📈 Total hours rendered vs. required\n📅 Hours logged this week\n📊 Visual progress charts\n🏆 Completion percentage\n\nIt\'s your command center for tracking everything at a glance!',
  },
  {
    patterns: [/mobile|phone|tablet|responsive/i],
    response:
      'Yes! Internly is fully **responsive** and works great on mobile phones, tablets, and desktops. The layout adapts to your screen size so you can log hours on the go.',
  },
  {
    patterns: [/activity ?type/i, /type.*(activit|task|work)/i, /what types/i, /categories/i],
    response:
      'Internly supports these activity types:\n\n💻 Technical\n📋 Administrative\n🤝 Meeting\n🏗️ Field Work\n👨‍💻 Coding\n📝 Documentation\n🔍 Research\n🎓 Training\n🎤 Presentation\n📦 Other\n\nYou can select multiple types per log entry!',
  },
  {
    patterns: [/hour|progress|remaining|total|how many/i],
    response:
      'Internly tracks your hours automatically! On your dashboard you\'ll see:\n\n• **Total Required Hours** — set during registration\n• **Total Rendered** — accumulated from daily logs\n• **Remaining Hours** — how much is left\n• **Weekly Average** — your weekly pace\n• **Progress %** — visual completion bar\n\nIt updates in real-time as you add logs.',
  },
  {
    patterns: [/profile|photo|avatar|picture|image|upload/i],
    response:
      'You can update your profile in the **Settings** page! Click on your avatar to upload a new profile photo. You can also edit your name, email, and OJT details. Your photo will appear in the sidebar and on your profile.',
  },
  {
    patterns: [/setting|config|customize|preference/i],
    response:
      'The **Settings** page lets you:\n\n• Edit your name, email, and password\n• Update your profile photo\n• Set your total required OJT hours\n• Manage your list of supervisors\n• Toggle reminders on/off\n\nAll changes are saved automatically to your local storage.',
  },
  {
    patterns: [/hello|hi|hey|good (morning|afternoon|evening)|greet/i, /^(yo|sup|what'?s up)/i],
    response:
      'Hello! 👋 I\'m the Internly AI Assistant. I\'m here to help you learn about the platform, its features, and how to get started. Feel free to ask me anything!',
  },
  {
    patterns: [/thank|thanks|thx|appreciate/i],
    response:
      'You\'re welcome! 😊 If you have any more questions about Internly, don\'t hesitate to ask. Happy tracking!',
  },
  {
    patterns: [/bye|goodbye|see you|later/i],
    response:
      'Goodbye! 👋 Best of luck with your OJT journey. Remember, Internly is here whenever you need to track your progress. See you!',
  },
  {
    patterns: [/help|support|contact|issue|problem|bug/i],
    response:
      'Need help? Here are your options:\n\n📧 **Email:** support@internly.app\n🌐 **Website:** www.internly.app\n💬 **This chat:** Ask me anything about features & usage!\n\nYou can also check the **Contact Us** section in the footer for more details.',
  },
  {
    patterns: [/who (made|built|created|developed)/i, /developer|creator|team/i],
    response:
      'Internly was crafted with ❤️ in the Philippines. It\'s designed specifically for OJT students and trainees who need a simple, effective way to manage their training hours and activities.',
  },
];

const SUGGESTED_QUESTIONS = [
  'What is Internly?',
  'What features does it offer?',
  'How do I get started?',
  'Is it free to use?',
  'How do I log my hours?',
  'Can I generate reports?',
];

function getBotResponse(input: string): string {
  const trimmed = input.trim().toLowerCase();

  for (const entry of KNOWLEDGE_BASE) {
    for (const pattern of entry.patterns) {
      if (pattern.test(trimmed)) {
        return entry.response;
      }
    }
  }

  return "I'm not sure I understand that question. Try asking about Internly's **features**, **how to get started**, **tracking hours**, **generating reports**, or **data privacy**. I'm here to help! 😊";
}

function formatMessage(text: string): React.ReactNode {
  // Simple markdown-like formatting: **bold**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} style={{ color: 'var(--slate-100)', fontWeight: 600 }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    // Handle newlines
    return part.split('\n').map((line, j, arr) => (
      <React.Fragment key={`${i}-${j}`}>
        {line}
        {j < arr.length - 1 && <br />}
      </React.Fragment>
    ));
  });
}

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [pulseBtn, setPulseBtn] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  // Initial greeting when first opened
  useEffect(() => {
    if (open && messages.length === 0) {
      setIsTyping(true);
      const timer = setTimeout(() => {
        setMessages([
          {
            id: 'welcome',
            role: 'bot',
            text: "Hi there! 👋 I'm the **Internly AI Assistant**. I can help you learn about our platform, its features, and how to get started with your OJT tracking. What would you like to know?",
            timestamp: new Date(),
          },
        ]);
        setIsTyping(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [open, messages.length]);

  // Disable pulse after a while
  useEffect(() => {
    const timer = setTimeout(() => setPulseBtn(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  const sendMessage = (text?: string) => {
    const msg = (text || input).trim();
    if (!msg) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: msg,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate typing delay (200-800ms based on response length)
    const response = getBotResponse(msg);
    const delay = Math.min(400 + response.length * 2, 1200);

    setTimeout(() => {
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        text: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
      if (!open) setHasNewMessage(true);
    }, delay);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleOpen = () => {
    setOpen(true);
    setHasNewMessage(false);
    setPulseBtn(false);
  };

  return (
    <>
      {/* Floating chat button */}
      {!open && (
        <button
          onClick={handleOpen}
          className="chatbot-fab"
          aria-label="Open chat"
          style={{
            position: 'fixed',
            bottom: 28,
            right: 28,
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: 'var(--gradient-primary)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 8px 32px rgba(16,185,129,0.4), 0 0 0 0 rgba(16,185,129,0.3)',
            transition: 'transform 200ms ease, box-shadow 200ms ease',
            zIndex: 90,
            animation: pulseBtn ? 'chatbotPulse 2s ease-in-out infinite' : undefined,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(16,185,129,0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(16,185,129,0.4)';
          }}
        >
          <MessageCircle size={26} />
          {hasNewMessage && (
            <span
              style={{
                position: 'absolute',
                top: 2,
                right: 2,
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: '#ef4444',
                border: '2px solid var(--slate-950)',
              }}
            />
          )}
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div className="chatbot-window" style={{
          position: 'fixed',
          bottom: 28,
          right: 28,
          width: 400,
          maxWidth: 'calc(100vw - 32px)',
          height: 560,
          maxHeight: 'calc(100vh - 56px)',
          borderRadius: 20,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          boxShadow: '0 24px 80px rgba(0,0,0,0.15)',
          zIndex: 91,
          animation: 'chatbotSlideIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}>
          {/* Header */}
          <div style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            borderBottom: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexShrink: 0,
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'var(--gradient-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Bot size={22} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'white', letterSpacing: '-0.01em' }}>
                Internly AI
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#ffffff',
                  display: 'inline-block',
                  boxShadow: '0 0 6px rgba(255,255,255,0.5)',
                }} />
                Online — Ask me anything
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                border: 'none',
                background: 'rgba(255,255,255,0.2)',
                cursor: 'pointer',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 150ms, color 150ms',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                e.currentTarget.style.color = 'white';
              }}
            >
              <ChevronDown size={18} />
            </button>
          </div>

          {/* Messages area */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 16px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }} className="chatbot-messages">
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  gap: 10,
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  alignItems: 'flex-start',
                  animation: 'chatMsgIn 250ms ease',
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 10,
                    background: msg.role === 'bot'
                      ? '#10b981'
                      : '#f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  {msg.role === 'bot' ? (
                    <Sparkles size={14} color="white" />
                  ) : (
                    <User size={14} color="#6b7280" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  style={{
                    maxWidth: '78%',
                    padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: msg.role === 'user'
                      ? '#10b981'
                      : '#f3f4f6',
                    border: 'none',
                    fontSize: 13.5,
                    lineHeight: 1.65,
                    color: msg.role === 'user' ? 'white' : '#1f2937',
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.role === 'bot' ? formatMessage(msg.text) : msg.text}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', animation: 'chatMsgIn 250ms ease' }}>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 10,
                    background: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  <Sparkles size={14} color="white" />
                </div>
                <div
                  style={{
                    padding: '12px 18px',
                    borderRadius: '16px 16px 16px 4px',
                    background: '#f3f4f6',
                    border: '1px solid #e5e7eb',
                    display: 'flex',
                    gap: 5,
                    alignItems: 'center',
                  }}
                >
                  <span className="chatbot-typing-dot" style={{ animationDelay: '0ms' }} />
                  <span className="chatbot-typing-dot" style={{ animationDelay: '150ms' }} />
                  <span className="chatbot-typing-dot" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            {/* Suggested questions (show only when just the welcome msg) */}
            {messages.length === 1 && messages[0].role === 'bot' && !isTyping && (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                marginTop: 4,
                animation: 'chatMsgIn 300ms ease',
              }}>
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 20,
                      background: '#ecfdf5',
                      border: '1px solid #d1fae5',
                      color: '#10b981',
                      fontSize: 12,
                      cursor: 'pointer',
                      transition: 'all 150ms ease',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#d1fae5';
                      e.currentTarget.style.borderColor = '#a7f3d0';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#ecfdf5';
                      e.currentTarget.style.borderColor = '#d1fae5';
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div style={{
            padding: '12px 16px',
            borderTop: '1px solid #e5e7eb',
            background: '#ffffff',
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            flexShrink: 0,
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your question..."
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 12,
                background: '#f3f4f6',
                border: '1px solid #d1d5db',
                color: '#1f2937',
                fontSize: 13.5,
                outline: 'none',
                transition: 'border-color 150ms',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#10b981')}
              onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isTyping}
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: input.trim() && !isTyping ? '#10b981' : '#e5e7eb',
                border: 'none',
                cursor: input.trim() && !isTyping ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: input.trim() && !isTyping ? 'white' : '#9ca3af',
                transition: 'all 200ms ease',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                if (input.trim() && !isTyping)
                  e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <Send size={18} />
            </button>
          </div>

          {/* Powered-by strip */}
          <div style={{
            padding: '6px 16px 8px',
            textAlign: 'center',
            fontSize: 10,
            color: 'var(--slate-700)',
            background: 'rgba(0,0,0,0.2)',
            letterSpacing: '0.02em',
            flexShrink: 0,
          }}>
            Powered by Internly AI · Knowledge-based assistant
          </div>
        </div>
      )}
    </>
  );
}
