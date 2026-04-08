import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, User, Bot, Paperclip, Search, Quote, Loader2, AlertCircle, X, Plus, Copy, ThumbsUp, ThumbsDown, Check, Menu, MessageSquare, Clock, MoreVertical, ChevronDown, File, FileText, FileImage, FileSpreadsheet } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';
import { supabase } from '../lib/supabase';
import { queryPinecone } from '../lib/pinecone';
import PrimaryButton from './PrimaryButton';
import { UserProfile, MortgageCase, UserPlan } from '../types';
import { incrementMessageCount } from '../services/pricingService';
import { playHoverSound, playClickSound, playModalOpenSound, playModalCloseSound, playSuccessSound, playErrorSound } from '../lib/sounds';
import Logo from './Logo';
import { motion, AnimatePresence } from 'motion/react';

interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  data: string; // base64
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sources: { lender: string; text: string }[];
  files?: AttachedFile[];
  timestamp: string;
  rating?: 'up' | 'down';
}

interface CopilotChatProps {
  requireAuth: (cb: () => void) => void;
  userProfile: UserProfile;
  onUpgrade: () => void;
  hasProAccess?: boolean;
  currentCase?: MortgageCase | null;
  onSessionEnd?: () => void;
}

interface Session {
  id: string;
  title: string;
  date: string;
  rawDate: string;
  period: 'Today' | 'Yesterday' | 'This Week' | 'Earlier';
}

export default function CopilotChat({ requireAuth, userProfile, onUpgrade, hasProAccess, currentCase, onSessionEnd }: CopilotChatProps) {
  const [sessionId, setSessionId] = useState<string>(() => {
    const saved = localStorage.getItem('archo_chat_session_id');
    if (saved) return saved;
    const newId = crypto.randomUUID();
    localStorage.setItem('archo_chat_session_id', newId);
    return newId;
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState('');
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<AttachedFile[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isFree = !hasProAccess;
  const messageLimit = 5;
  const messagesRemaining = isFree ? Math.max(0, messageLimit - userProfile.daily_message_count) : Infinity;

  const currentSession = sessions.find(s => s.id === sessionId);
  const conversationTitle = currentSession?.title || 'New Conversation';

  const getRelativePeriod = (date: Date): 'Today' | 'Yesterday' | 'This Week' | 'Earlier' => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    if (date >= today) return 'Today';
    if (date >= yesterday) return 'Yesterday';
    if (date >= lastWeek) return 'This Week';
    return 'Earlier';
  };

  const fetchSessions = async () => {
    if (!userProfile.id) return;
    setIsLoadingSessions(true);
    try {
      // Fetch distinct session IDs by getting the latest message for each session
      // We use the new conversation_title and is_deleted columns
      const { data, error } = await supabase
        .from('chat_messages')
        .select('session_id, conversation_title, created_at')
        .eq('user_id', userProfile.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const sessionMap = new Map();
      data.forEach(msg => {
        if (!sessionMap.has(msg.session_id)) {
          const date = new Date(msg.created_at);
          sessionMap.set(msg.session_id, {
            id: msg.session_id,
            title: msg.conversation_title || 'New Conversation',
            date: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined }),
            rawDate: msg.created_at,
            period: getRelativePeriod(date)
          });
        }
      });

      const sortedSessions = Array.from(sessionMap.values());
      setSessions(sortedSessions);
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  useEffect(() => {
    fetchSessions();

    if (!userProfile.id) return;

    // Real-time subscription for the conversation list
    const channel = supabase
      .channel('sessions-list')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'chat_messages', 
          filter: `user_id=eq.${userProfile.id}` 
        },
        () => {
          fetchSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  useEffect(() => {
    loadChatHistory();

    // Set up real-time subscription
    const channel = supabase
      .channel(`chat-feed-${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const newMessage = payload.new;
          if (newMessage.session_id === sessionId) {
            setMessages(prev => {
              if (prev.some(m => m.id === newMessage.id)) return prev;
              
              return [...prev, {
                id: newMessage.id,
                role: newMessage.role as 'user' | 'assistant',
                text: newMessage.content,
                sources: newMessage.metadata?.sources || [],
                files: newMessage.metadata?.files || (newMessage.metadata?.image ? [{
                  id: 'legacy',
                  name: 'Image',
                  size: 0,
                  type: newMessage.metadata.image.mimeType,
                  data: newMessage.metadata.image.data
                }] : undefined),
                timestamp: newMessage.created_at,
                rating: newMessage.rating
              }];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // Summarize on unmount
  useEffect(() => {
    return () => {
      if (messages.length > 0) {
        summarizeSession().then(() => {
          if (onSessionEnd) onSessionEnd();
        });
      }
    };
  }, [messages, onSessionEnd]);

  const summarizeSession = async () => {
    if (messages.length < 2) return;
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const historyText = messages.map(m => `${m.role}: ${m.text}`).join('\n');
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Summarize the following conversation between a mortgage broker and Archo AI. Extract key information about the broker (preferences, typical clients, repeated scenarios) and their clients' details. Format as bullet points.\n\n${historyText}`,
        config: {
          systemInstruction: "You are a memory extraction assistant. Your goal is to summarize key broker and client info into a concise JSON-like summary for long-term memory."
        }
      });

      const summary = response.text;
      if (summary && userProfile.id) {
        const newMemory = {
          ...userProfile.ai_memory,
          summary: summary
        };

        await supabase
          .from('user_profiles')
          .update({ ai_memory: newMemory })
          .eq('id', userProfile.id);
      }
    } catch (err) {
      console.error('Failed to summarize session:', err);
    }
  };

  const loadChatHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(20);

      if (error) {
        console.error('Supabase load error:', error);
      } else if (data) {
        const history: Message[] = data.map((msg: any) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          text: msg.content,
          sources: msg.metadata?.sources || [],
          files: msg.metadata?.files || (msg.metadata?.image ? [{
            id: 'legacy',
            name: 'Image',
            size: 0,
            type: msg.metadata.image.mimeType,
            data: msg.metadata.image.data
          }] : undefined),
          timestamp: msg.created_at,
          rating: msg.rating
        }));
        setMessages(history);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  const handleNewConversation = () => {
    playClickSound();
    const newId = crypto.randomUUID();
    setSessionId(newId);
    localStorage.setItem('archo_chat_session_id', newId);
    setMessages([]);
    setSelectedFiles([]);
    setFileError(null);
    setIsHistoryOpen(false);
  };

  const handleRename = async (id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ conversation_title: newTitle })
        .eq('session_id', id);

      if (error) throw error;
      
      setRenamingId(null);
      fetchSessions();
      playSuccessSound();
    } catch (err) {
      console.error('Failed to rename:', err);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this conversation?')) return;
    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ is_deleted: true })
        .eq('session_id', id);

      if (error) throw error;
      
      if (id === sessionId) {
        handleNewConversation();
      }
      fetchSessions();
      playSuccessSound();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handleExport = () => {
    const text = messages.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `archo-chat-${sessionId.substring(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    playSuccessSound();
  };

  const handleSuggestionClick = (text: string) => {
    setInput(text);
    requireAuth(() => handleSend(text));
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    playSuccessSound();
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRate = async (id: string, rating: 'up' | 'down') => {
    playClickSound();
    setMessages(prev => prev.map(m => m.id === id ? { ...m, rating } : m));
    
    try {
      await supabase
        .from('chat_messages')
        .update({ rating })
        .eq('id', id);
    } catch (err) {
      console.error('Failed to save rating:', err);
    }
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isAtBottom);
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  const handleSend = async (overrideInput?: string) => {
    const messageText = overrideInput || input;
    if ((!messageText.trim() && selectedFiles.length === 0) || isTyping) return;

    if (isFree && userProfile.daily_message_count >= messageLimit) {
      setShowLimitModal(true);
      playModalOpenSound();
      return;
    }

    playClickSound();
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: messageText,
      sources: [],
      files: selectedFiles.length > 0 ? selectedFiles : undefined,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSelectedFiles([]);
    setFileError(null);
    setIsTyping(true);

    await incrementMessageCount(userProfile.id);

    try {
      await supabase
        .from('chat_messages')
        .insert({
          content: messageText,
          role: 'user',
          session_id: sessionId,
          user_id: userProfile.id,
          metadata: { files: userMsg.files }
        });
      
      // Refresh sessions list if this is the first message
      if (messages.length === 0) {
        fetchSessions();
      }
    } catch (err) {
      console.error('Failed to save user message:', err);
    }

    try {
      const pineconeMatches = await queryPinecone(messageText);
      const sources = pineconeMatches.map(m => ({
        lender: m.metadata.lender,
        text: m.metadata.text
      }));

      const knowledgeContext = sources.length > 0 
        ? `Use the following context to answer the user's question:\n${sources.map(s => `[Lender: ${s.lender}] ${s.text}`).join('\n')}`
        : "No specific lender criteria found in knowledge base. Use your general knowledge but advise caution.";

      const brokerName = userProfile.full_name?.split(' ')[0] || 'Broker';
      const brokerMemory = userProfile.ai_memory?.summary || "No previous memory of this broker.";
      
      let caseContext = "";
      if (currentCase) {
        caseContext = `\n\nCURRENT CASE CONTEXT:\nClient: ${currentCase.clientName}\nProperty Value: £${currentCase.propertyValue}\nLoan Amount: £${currentCase.loanAmount}\nLTV: ${currentCase.ltv}%\nStage: ${currentCase.stage}`;
      }

      const systemPrompt = `Archo is an expert Australian mortgage broker AI assistant with deep knowledge of Australian lender criteria, APRA regulations, ASIC responsible lending obligations, and mortgage products. The broker using Archo is a licensed mortgage broker. Always refer to the broker by their first name: ${brokerName}. Always provide specific actionable advice rather than generic information. When recommending lenders always explain why that lender suits the specific scenario. Always remind the broker to verify criteria directly with lenders before advising clients.

BROKER MEMORY CONTEXT:
${brokerMemory}
${caseContext}

${knowledgeContext}`;

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // Full conversation history
      const historyParts = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      const currentParts: any[] = [{ text: messageText }];
      if (userMsg.files) {
        userMsg.files.forEach(file => {
          currentParts.push({
            inlineData: {
              data: file.data,
              mimeType: file.type
            }
          });
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          ...historyParts,
          { role: 'user', parts: currentParts }
        ],
        config: {
          systemInstruction: systemPrompt,
        }
      });

      const assistantText = response.text || "I'm sorry, I couldn't process that request.";
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: assistantText,
        sources: sources,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMsg]);
      playSuccessSound();

      // Auto-generate title on second message (after first user message and assistant reply)
      let autoTitle = undefined;
      if (messages.length === 0) {
        autoTitle = messageText.substring(0, 40) + (messageText.length > 40 ? '...' : '');
      }

      await supabase
        .from('chat_messages')
        .insert({
          content: assistantText,
          role: 'assistant',
          session_id: sessionId,
          user_id: userProfile.id,
          metadata: { sources },
          ...(autoTitle ? { conversation_title: autoTitle } : {})
        });

      if (autoTitle) {
        // Update the first message's title too
        await supabase
          .from('chat_messages')
          .update({ conversation_title: autoTitle })
          .eq('session_id', sessionId);
        
        fetchSessions();
      }

    } catch (error) {
      console.error(error);
      playErrorSound();
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: "I encountered an error while connecting to my brain. Please try again later.",
        sources: [],
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const planLimit = userProfile.plan === 'free' ? 3 : 10;
    const currentCount = selectedFiles.length;
    
    if (currentCount >= planLimit) {
      setFileError(userProfile.plan === 'free' 
        ? `You have reached the 3 file limit on the Free plan. Upgrade to Pro to attach up to 10 files.`
        : `Maximum of 10 files per message reached.`);
      playErrorSound();
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv'
    ];

    const newFiles: AttachedFile[] = [];
    let hasUnsupported = false;

    for (const file of files) {
      if (selectedFiles.length + newFiles.length >= planLimit) break;

      if (!allowedTypes.includes(file.type)) {
        hasUnsupported = true;
        continue;
      }

      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.readAsDataURL(file);
      });

      newFiles.push({
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        type: file.type,
        data: base64.split(',')[1]
      });
    }

    if (hasUnsupported) {
      setFileError('Some file types are not supported.');
      playErrorSound();
    } else {
      setFileError(null);
    }

    if (newFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...newFiles]);
      playSuccessSound();
    }

    // Reset input so the same file can be selected again if removed
    e.target.value = '';
  };

  const removeFile = (id: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== id));
    setFileError(null);
    playClickSound();
  };

  const handleFileUpload = () => {
    playClickSound();
    fileInputRef.current?.click();
  };

  return (
    <div className="flex h-[calc(100vh-80px)] relative z-10 overflow-hidden">
      {/* History Slide-out Panel */}
      <AnimatePresence>
        {isHistoryOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHistoryOpen(false)}
              className="fixed inset-0 bg-archo-ink/10 backdrop-blur-[2px] z-[60]"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="fixed right-0 top-20 bottom-20 w-[280px] bg-archo-cream/95 backdrop-blur-md z-[70] shadow-2xl flex flex-col border-l border-archo-brass/30"
            >
              <div className="px-6 py-4 flex items-center justify-between">
                <h3 className="text-archo-brass font-serif text-[14px] uppercase tracking-[0.2em]">Conversations</h3>
                <button 
                  onClick={() => setIsHistoryOpen(false)}
                  className="p-1 text-archo-brass hover:text-archo-gold transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              
              <div className="h-px bg-archo-brass/10 mx-6" />

              <div className="p-4">
                <button 
                  onClick={handleNewConversation}
                  className="w-full py-3 px-4 bg-transparent border border-dashed border-archo-brass/50 rounded-xl text-archo-brass hover:bg-archo-brass/5 transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest"
                >
                  <Plus size={16} /> New Conversation
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-6 scrollbar-hide">
                {isLoadingSessions ? (
                  <div className="space-y-4 px-2">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="space-y-2 animate-pulse">
                        <div className="h-3 bg-archo-brass/10 rounded w-3/4"></div>
                        <div className="h-2 bg-archo-brass/5 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : sessions.length > 0 ? (
                  (['Today', 'Yesterday', 'This Week', 'Earlier'] as const).map(period => {
                    const periodSessions = sessions.filter(s => s.period === period);
                    if (periodSessions.length === 0) return null;

                    return (
                      <div key={period} className="space-y-1">
                        <h4 className="px-4 text-[10px] font-bold text-archo-muted uppercase tracking-widest mb-2">{period}</h4>
                        {periodSessions.map((session) => (
                          <div 
                            key={session.id}
                            className="relative group px-2"
                            onMouseEnter={() => setActiveMenuId(null)}
                          >
                            <button
                              onClick={() => {
                                playClickSound();
                                setSessionId(session.id);
                                localStorage.setItem('archo_chat_session_id', session.id);
                                if (window.innerWidth < 1024) setIsHistoryOpen(false);
                              }}
                              className={`w-full text-left p-3 rounded-xl transition-all relative overflow-hidden ${
                                sessionId === session.id 
                                  ? 'bg-archo-brass/10 border-l-2 border-archo-brass' 
                                  : 'hover:bg-archo-brass/5'
                              }`}
                            >
                              {renamingId === session.id ? (
                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                  <input
                                    type="text"
                                    value={tempTitle}
                                    onChange={(e) => setTempTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleRename(session.id, tempTitle);
                                      if (e.key === 'Escape') setRenamingId(null);
                                    }}
                                    className="w-full bg-white border border-archo-brass/30 rounded px-2 py-1 text-xs focus:outline-none"
                                    autoFocus
                                  />
                                </div>
                              ) : (
                                <>
                                  <p className="text-xs font-medium text-archo-ink truncate pr-6">{session.title}</p>
                                  <p className="text-[10px] text-archo-muted mt-0.5">{session.date}</p>
                                </>
                              )}
                            </button>

                            {renamingId !== session.id && (
                              <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(activeMenuId === session.id ? null : session.id);
                                  }}
                                  className="p-1 text-archo-muted hover:text-archo-brass"
                                >
                                  <MoreVertical size={14} />
                                </button>
                                
                                <AnimatePresence>
                                  {activeMenuId === session.id && (
                                    <>
                                      <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
                                      <motion.div 
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="absolute right-0 mt-1 w-24 bg-white border border-archo-brass/20 rounded-lg shadow-xl z-20 overflow-hidden"
                                      >
                                        <button 
                                          onClick={() => {
                                            setRenamingId(session.id);
                                            setTempTitle(session.title);
                                            setActiveMenuId(null);
                                          }}
                                          className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase text-archo-ink hover:bg-archo-brass/5"
                                        >
                                          Rename
                                        </button>
                                        <button 
                                          onClick={() => {
                                            handleDeleteConversation(session.id);
                                            setActiveMenuId(null);
                                          }}
                                          className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase text-rose-600 hover:bg-rose-50"
                                        >
                                          Delete
                                        </button>
                                      </motion.div>
                                    </>
                                  )}
                                </AnimatePresence>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                    <div className="w-12 h-12 bg-archo-brass/5 rounded-full flex items-center justify-center mb-4">
                      <MessageSquare size={24} className="text-archo-brass/30" />
                    </div>
                    <p className="text-xs font-bold text-archo-muted uppercase tracking-widest mb-1">No conversations yet</p>
                    <p className="text-[10px] text-archo-muted/60">Start a new one below.</p>
                  </div>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative bg-transparent">
        {showLimitModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-archo-ink/80 backdrop-blur-sm">
            <div className="bg-archo-cream rounded-3xl p-8 max-w-md w-full shadow-2xl border border-archo-brass/20">
              <div className="w-16 h-16 bg-archo-gold/10 rounded-full flex items-center justify-center mb-6 mx-auto">
                <AlertCircle size={32} className="text-archo-gold" />
              </div>
              <h3 className="text-2xl font-serif font-bold text-archo-ink text-center mb-4">Daily Limit Reached</h3>
              <p className="text-archo-slate text-center mb-8 leading-relaxed">
                You've used your 5 free AI messages for today. Upgrade to Pro for unlimited chat, document uploads, and priority response speeds.
              </p>
              <div className="flex flex-col gap-3">
                <PrimaryButton 
                  onClick={() => { 
                    playClickSound();
                    setShowLimitModal(false); 
                    onUpgrade(); 
                  }} 
                  onMouseEnter={playHoverSound}
                  className="w-full py-4 rounded-xl"
                >
                  Upgrade to Pro
                </PrimaryButton>
                <button 
                  onClick={() => {
                    playModalCloseSound();
                    setShowLimitModal(false);
                  }}
                  onMouseEnter={playHoverSound}
                  className="w-full py-4 text-archo-muted font-bold hover:text-archo-ink transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chat Header Bar */}
        <div className="w-full max-w-[720px] mx-auto px-4 lg:px-8 py-4 flex items-center justify-between z-20">
          <div className="flex items-center gap-4">
            {isRenaming ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRename(sessionId, tempTitle)}
                  className="bg-archo-cream border border-archo-brass/30 rounded-lg px-2 py-1 text-sm font-serif font-bold text-archo-ink focus:outline-none"
                  autoFocus
                />
                <button onClick={() => handleRename(sessionId, tempTitle)} className="text-emerald-600"><Check size={16} /></button>
                <button onClick={() => setIsRenaming(false)} className="text-rose-600"><X size={16} /></button>
              </div>
            ) : (
              <h2 
                onClick={() => {
                  setTempTitle(conversationTitle);
                  setIsRenaming(true);
                }}
                className="text-lg font-serif font-bold text-archo-ink cursor-pointer hover:text-archo-brass transition-colors"
              >
                {conversationTitle}
              </h2>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsHistoryOpen(true)}
              className="p-2 text-archo-muted hover:text-archo-brass transition-colors"
              title="Conversation History"
            >
              <Clock size={20} />
            </button>
            <div className="relative">
              <button 
                onClick={() => setShowOptions(!showOptions)}
                className="p-2 text-archo-muted hover:text-archo-brass transition-colors"
              >
                <MoreVertical size={20} />
              </button>
              <AnimatePresence>
                {showOptions && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowOptions(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-48 bg-archo-cream border border-archo-brass/20 rounded-xl shadow-2xl z-40 overflow-hidden"
                    >
                      <button 
                        onClick={() => {
                          setIsRenaming(true);
                          setTempTitle(conversationTitle);
                          setShowOptions(false);
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-archo-ink hover:bg-archo-brass/10 flex items-center gap-3 transition-colors"
                      >
                        <MessageSquare size={16} /> Rename
                      </button>
                      <button 
                        onClick={() => {
                          handleExport();
                          setShowOptions(false);
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-archo-ink hover:bg-archo-brass/10 flex items-center gap-3 transition-colors"
                      >
                        <Copy size={16} /> Export as Text
                      </button>
                      <div className="h-px bg-archo-brass/10 mx-2" />
                      <button 
                        onClick={() => {
                          handleDeleteConversation(sessionId);
                          setShowOptions(false);
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-3 transition-colors"
                      >
                        <X size={16} /> Delete
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div 
          ref={scrollRef} 
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6 scrollbar-hide max-w-[720px] mx-auto w-full relative"
        >
          {messages.length === 0 && !isTyping && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
              <div className="w-16 h-16 bg-archo-brass/10 rounded-full flex items-center justify-center text-archo-brass">
                <Logo className="w-10 h-10" />
              </div>
              <h3 className="text-4xl font-serif font-bold text-archo-ink">What can I help you with today?</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                {[
                  "Which lenders accept self employed with 1 year accounts",
                  "What is the maximum LTV for a first home buyer in NSW",
                  "Can you help me assess affordability for a client earning 95000",
                  "What are the APRA serviceability buffer requirements"
                ].map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="p-4 text-left bg-archo-cream/50 border border-archo-brass/30 rounded-2xl hover:bg-archo-cream hover:border-archo-brass transition-all text-sm text-archo-ink font-medium shadow-sm"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id} 
              className={`flex gap-4 lg:gap-6 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {msg.role === 'assistant' ? (
                <div className="w-8 h-8 rounded-lg bg-archo-ink flex items-center justify-center text-archo-brass-pale flex-shrink-0 shadow-sm border border-archo-brass/20">
                  <Logo className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-archo-brass flex items-center justify-center text-archo-cream flex-shrink-0 shadow-sm border border-archo-brass-pale/20 font-serif font-bold text-[10px]">
                  {userProfile.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || userProfile.email?.charAt(0).toUpperCase()}
                </div>
              )}
              
              <div className={`max-w-[85%] lg:max-w-[80%] relative group ${
                msg.role === 'user' 
                  ? 'bg-archo-cream p-4 rounded-2xl shadow-sm border border-archo-brass/10' 
                  : 'text-archo-ink'
              }`}>
                {msg.role === 'assistant' && (
                  <div className="absolute -bottom-8 left-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-10">
                    <button 
                      onClick={() => handleCopy(msg.text, msg.id)}
                      className="p-1.5 hover:bg-archo-brass/10 rounded-lg text-archo-muted hover:text-archo-brass transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedId === msg.id ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                    <button 
                      onClick={() => handleRate(msg.id, 'up')}
                      className={`p-1.5 hover:bg-emerald-50 rounded-lg transition-colors ${msg.rating === 'up' ? 'text-emerald-600 bg-emerald-50' : 'text-archo-muted'}`}
                    >
                      <ThumbsUp size={14} />
                    </button>
                    <button 
                      onClick={() => handleRate(msg.id, 'down')}
                      className={`p-1.5 hover:bg-red-50 rounded-lg transition-colors ${msg.rating === 'down' ? 'text-red-600 bg-red-50' : 'text-archo-muted'}`}
                    >
                      <ThumbsDown size={14} />
                    </button>
                  </div>
                )}

                {msg.files && msg.files.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {msg.files.map((file) => (
                      <div key={file.id} className="max-w-full">
                        {file.type.startsWith('image/') ? (
                          <div className="overflow-hidden rounded-xl border border-archo-brass/20">
                            <img 
                              src={`data:${file.type};base64,${file.data}`} 
                              alt={file.name} 
                              className="max-w-full h-auto object-contain max-h-64"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 p-3 bg-archo-cream border border-archo-brass/20 rounded-xl shadow-sm">
                            <div className="p-2 bg-archo-brass/10 rounded-lg text-archo-brass">
                              {file.type === 'application/pdf' ? <FileText size={20} /> : <File size={20} />}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-archo-ink truncate max-w-[150px]">{file.name}</span>
                              <span className="text-[10px] text-archo-muted">{(file.size / 1024).toFixed(1)} KB</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div className={`markdown-body text-sm lg:text-[15px] leading-relaxed font-sans tracking-tight ${msg.role === 'assistant' ? 'font-normal' : 'font-medium'}`}>
                  <Markdown>{msg.text}</Markdown>
                </div>
                
                {msg.sources.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-archo-brass flex items-center gap-2">
                      <Search size={10} /> Cited Sources
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {msg.sources.map((source, idx) => (
                        <div key={idx} className="bg-archo-cream/50 border border-archo-brass/10 px-3 py-1.5 rounded-full shadow-sm">
                          <span className="text-[10px] font-sans font-bold text-archo-ink">{source.lender}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          {isTyping && (
            <div className="flex gap-4 lg:gap-6">
              <div className="w-8 h-8 rounded-lg bg-archo-ink flex items-center justify-center text-archo-brass-pale flex-shrink-0 shadow-sm border border-archo-brass/20 animate-pulse">
                <Logo className="w-5 h-5" />
              </div>
              <div className="p-4">
                <div className="flex gap-1.5">
                  <div className="w-1.5 h-1.5 bg-archo-brass rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-archo-brass rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-archo-brass rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chat Input Area */}
        <div className="px-2 lg:px-4 pb-4 lg:pb-8 pt-0 w-full max-w-[720px] mx-auto relative">
          <div className="w-full">
            {/* Action Buttons Row */}
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="bg-archo-cream/50 backdrop-blur-sm text-archo-brass px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 shadow-sm border border-archo-brass/20">
                <Sparkles size={12} className={isTyping ? "animate-spin" : "animate-pulse"} /> AI Reasoning Active
              </div>
              <button 
                onClick={handleNewConversation}
                className="bg-archo-cream/50 backdrop-blur-sm text-archo-ink px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 shadow-sm border border-archo-brass/20 hover:bg-archo-paper transition-all"
              >
                <Plus size={12} /> New Conversation
              </button>
            </div>

            {/* Scroll to Bottom Button */}
            <AnimatePresence>
              {showScrollButton && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute -top-12 left-1/2 -translate-x-1/2 z-30"
                >
                  <button
                    onClick={scrollToBottom}
                    className="w-10 h-10 rounded-full bg-archo-ink/60 backdrop-blur-md border border-archo-gold text-archo-gold flex items-center justify-center hover:bg-archo-ink/80 transition-all shadow-lg"
                  >
                    <ChevronDown size={20} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* File Preview Chips */}
            {selectedFiles.length > 0 && (
              <div className="flex items-center gap-2 mb-3 overflow-x-auto scrollbar-hide pb-1">
                {selectedFiles.map((file) => (
                  <div 
                    key={file.id}
                    className="flex items-center gap-2 px-3 py-2 bg-archo-cream border border-archo-brass/20 rounded-full shadow-sm flex-shrink-0"
                  >
                    <div className="text-archo-brass">
                      {file.type.startsWith('image/') ? <FileImage size={14} /> : 
                       file.type === 'application/pdf' ? <FileText size={14} /> :
                       file.type === 'text/csv' ? <FileSpreadsheet size={14} /> :
                       <File size={14} />}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-archo-ink max-w-[100px] truncate">
                        {file.name.length > 20 ? file.name.substring(0, 17) + '...' : file.name}
                      </span>
                      <span className="text-[8px] text-archo-muted">
                        {file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)}MB` : `${(file.size / 1024).toFixed(0)}KB`}
                      </span>
                    </div>
                    <button 
                      onClick={() => removeFile(file.id)}
                      className="p-0.5 hover:bg-archo-brass/10 rounded-full text-archo-gold transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* File Error/Limit Message */}
            {fileError && (
              <div className="mb-3 px-4 py-2 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2">
                <p className="text-[10px] text-rose-600 font-medium">
                  {fileError}
                  {fileError.includes('Free plan') && (
                    <button 
                      onClick={onUpgrade}
                      className="ml-2 text-archo-gold font-bold hover:underline"
                    >
                      Upgrade
                    </button>
                  )}
                </p>
                <button onClick={() => setFileError(null)} className="text-rose-400 hover:text-rose-600">
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Rounded Rectangle Input Bar */}
            <div className="relative group">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.txt,.csv" 
                multiple
                className="hidden" 
              />
              
              <div className="bg-archo-cream border border-archo-brass/30 rounded-2xl shadow-xl focus-within:ring-4 focus-within:ring-archo-brass/5 transition-all flex items-end p-2 pl-4 overflow-hidden min-h-[52px]">
                <div className="relative mb-1">
                  <button 
                    onClick={handleFileUpload}
                    onMouseEnter={playHoverSound}
                    className="p-2.5 text-archo-muted hover:text-archo-brass transition-colors flex-shrink-0"
                    title="Attach files"
                  >
                    <Paperclip size={20} />
                  </button>
                  {selectedFiles.length > 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-archo-gold text-archo-cream text-[8px] font-bold rounded-full flex items-center justify-center shadow-sm border border-archo-cream">
                      {selectedFiles.length}
                    </div>
                  )}
                </div>

                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), requireAuth(() => handleSend()))}
                  placeholder="Message Archo"
                  className="flex-1 bg-transparent focus:outline-none text-archo-ink font-sans text-[15px] py-3.5 px-5 placeholder:text-archo-muted resize-none max-h-[120px] scrollbar-hide"
                />

                <button 
                  onClick={() => requireAuth(() => handleSend())}
                  disabled={isTyping || (!input.trim() && selectedFiles.length === 0)}
                  onMouseEnter={playHoverSound}
                  className="w-10 h-10 rounded-full bg-archo-gold text-archo-cream flex items-center justify-center hover:bg-archo-brass transition-all disabled:opacity-30 flex-shrink-0 mb-1 ml-2"
                >
                  <Send size={18} />
                </button>
              </div>

              {/* Legacy Image Preview Overlay (Removed in favor of chips) */}
            </div>
            
            <p className="text-center text-[9px] text-archo-muted mt-4 font-sans italic tracking-wide">
              Archo provides administrative assistance. Always verify criteria before advising clients.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
