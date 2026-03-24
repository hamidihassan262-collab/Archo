import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, User, Bot, Paperclip, Search, Quote, Loader2, AlertCircle, X, Plus, Copy, ThumbsUp, ThumbsDown, Check } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';
import { supabase } from '../lib/supabase';
import { queryPinecone } from '../lib/pinecone';
import PrimaryButton from './PrimaryButton';
import { UserProfile, MortgageCase } from '../types';
import { incrementMessageCount } from '../services/pricingService';
import { playHoverSound, playClickSound, playModalOpenSound, playModalCloseSound, playSuccessSound, playErrorSound } from '../lib/sounds';
import Logo from './Logo';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sources: { lender: string; text: string }[];
  image?: { data: string; mimeType: string };
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

export default function CopilotChat({ requireAuth, userProfile, onUpgrade, hasProAccess, currentCase, onSessionEnd }: CopilotChatProps) {
  const [sessionId, setSessionId] = useState<string>(() => {
    const saved = localStorage.getItem('archo_chat_session_id');
    if (saved) return saved;
    const newId = crypto.randomUUID();
    localStorage.setItem('archo_chat_session_id', newId);
    return newId;
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ data: string; mimeType: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isFree = !hasProAccess;
  const messageLimit = 5;
  const messagesRemaining = isFree ? Math.max(0, messageLimit - userProfile.daily_message_count) : Infinity;

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
                image: newMessage.metadata?.image || undefined,
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
          image: msg.metadata?.image || undefined,
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

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isTyping) return;

    if (isFree && userProfile.daily_message_count >= messageLimit) {
      setShowLimitModal(true);
      playModalOpenSound();
      return;
    }

    playClickSound();
    const messageText = input;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: messageText,
      sources: [],
      image: selectedImage || undefined,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSelectedImage(null);
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
          metadata: { image: userMsg.image }
        });
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
      if (userMsg.image) {
        currentParts.push({
          inlineData: {
            data: userMsg.image.data,
            mimeType: userMsg.image.mimeType
          }
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

      await supabase
        .from('chat_messages')
        .insert({
          content: assistantText,
          role: 'assistant',
          session_id: sessionId,
          user_id: userProfile.id,
          metadata: { sources }
        });

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const data = base64.split(',')[1];
      setSelectedImage({ data, mimeType: file.type });
      playSuccessSound();
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = () => {
    playClickSound();
    if (isFree) {
      onUpgrade();
      return;
    }
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-w-4xl mx-auto p-8 relative z-10">
      {showLimitModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-arch_deep-black/80 backdrop-blur-sm">
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

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-10 pr-4 scrollbar-hide">
        {messages.length === 0 && !isTyping && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
            <div className="w-20 h-20 bg-archo-brass/10 rounded-full flex items-center justify-center text-archo-brass">
              <Bot size={40} />
            </div>
            <div>
              <h3 className="text-xl font-serif font-bold text-archo-ink">Start a new conversation</h3>
              <p className="text-sm text-archo-slate">Ask Archo anything about criteria or your cases.</p>
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-8 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="w-12 h-12 rounded-2xl bg-archo-ink flex items-center justify-center text-archo-brass-pale flex-shrink-0 shadow-xl border border-archo-brass/20">
                <Logo className="w-6 h-6" />
              </div>
            )}
            
            <div className={`max-w-[80%] p-6 rounded-3xl shadow-xl border border-archo-brass/20 relative group ${
              msg.role === 'user' 
                ? 'bg-archo-ink text-archo-cream' 
                : 'bg-archo-cream/80 backdrop-blur-sm text-archo-ink'
            }`}>
              {msg.role === 'assistant' && (
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <button 
                    onClick={() => handleCopy(msg.text, msg.id)}
                    className="p-1.5 hover:bg-archo-brass/10 rounded-lg text-archo-brass transition-colors"
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

              {msg.image && (
                <div className="mb-4 overflow-hidden rounded-xl border border-archo-brass/20">
                  <img 
                    src={`data:${msg.image.mimeType};base64,${msg.image.data}`} 
                    alt="Attached" 
                    className="max-w-full h-auto object-contain max-h-64"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
              <div className={`markdown-body text-base leading-relaxed font-sans tracking-tight ${msg.role === 'assistant' ? 'font-medium' : ''}`}>
                <Markdown>{msg.text}</Markdown>
              </div>

              <div className={`mt-4 text-[8px] uppercase tracking-widest font-bold ${msg.role === 'user' ? 'text-archo-cream/40' : 'text-archo-muted'}`}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              
              {msg.sources.length > 0 && (
                <div className="mt-8 space-y-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-archo-brass flex items-center gap-2">
                    <Search size={12} /> Cited Sources
                  </p>
                  {msg.sources.map((source, idx) => (
                    <div key={idx} className="bg-archo-cream border border-archo-brass/10 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all">
                      <div className="flex items-center gap-3 mb-3">
                        <Quote size={14} className="text-archo-brass" />
                        <span className="text-sm font-sans font-bold text-archo-ink">{source.lender}</span>
                      </div>
                      <p className="text-sm text-archo-slate italic font-sans">"{source.text}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-12 h-12 rounded-2xl bg-archo-brass flex items-center justify-center text-archo-cream flex-shrink-0 shadow-xl border border-archo-brass-pale/20">
                <User size={24} />
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-8">
            <div className="w-12 h-12 rounded-2xl bg-archo-ink flex items-center justify-center text-archo-brass-pale flex-shrink-0 shadow-xl border border-archo-brass/20 animate-pulse">
              <Logo className="w-6 h-6" />
            </div>
            <div className="bg-archo-cream/80 backdrop-blur-sm p-6 rounded-3xl border border-archo-brass/20 shadow-xl">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-archo-brass rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-archo-brass rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-archo-brass rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-10 relative">
        <div className="absolute -top-14 left-0 right-0 flex justify-between items-center px-4">
          <div className="flex gap-2">
            <div className="bg-archo-cream text-archo-brass px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-3 shadow-md border border-archo-brass/20 backdrop-blur-sm">
              <Sparkles size={14} className={isTyping ? "animate-spin" : "animate-pulse"} /> AI Reasoning Active
            </div>
            <button 
              onClick={handleNewConversation}
              className="bg-archo-cream text-archo-ink px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-3 shadow-md border border-archo-brass/20 hover:bg-archo-paper transition-all"
            >
              <Plus size={14} /> New Conversation
            </button>
          </div>
          {isFree && (
            <div className="bg-archo-ink text-archo-cream px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-md border border-archo-brass/20">
              {messagesRemaining} Messages Left Today
            </div>
          )}
        </div>
        
        <div className="bg-archo-cream border border-archo-brass/20 rounded-3xl p-3 shadow-2xl focus-within:ring-4 focus-within:ring-archo-brass/5 transition-all">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
          
          {selectedImage && (
            <div className="px-5 pt-3 relative group">
              <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-archo-brass/30 relative">
                <img 
                  src={`data:${selectedImage.mimeType};base64,${selectedImage.data}`} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <button 
                  onClick={() => {
                    playClickSound();
                    setSelectedImage(null);
                  }}
                  onMouseEnter={playHoverSound}
                  className="absolute top-1 right-1 bg-archo-ink/80 text-archo-cream p-1 rounded-full hover:bg-archo-ink transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          )}

          <textarea
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), requireAuth(handleSend))}
            placeholder="Ask Archo about lender criteria, affordability, or case advice..."
            className="w-full p-5 bg-transparent focus:outline-none text-archo-ink font-sans text-base resize-none placeholder:text-archo-muted"
          />
          <div className="flex justify-between items-center px-3 pb-3">
            <button 
              onClick={handleFileUpload}
              onMouseEnter={playHoverSound}
              className="p-3 text-archo-muted hover:text-archo-brass transition-colors flex items-center gap-2"
            >
              <Paperclip size={24} />
              {isFree && <span className="text-[8px] font-bold uppercase tracking-tighter bg-archo-brass/10 px-1.5 py-0.5 rounded">Pro</span>}
            </button>
            <PrimaryButton 
              onClick={() => requireAuth(handleSend)}
              disabled={isTyping}
              onMouseEnter={playHoverSound}
              className="p-4 rounded-2xl group disabled:opacity-50"
            >
              <Send size={24} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </PrimaryButton>
          </div>
        </div>
        <p className="text-center text-[10px] text-archo-muted mt-6 font-sans italic tracking-wide">
          Archo provides administrative assistance. Always verify criteria before advising clients.
        </p>
      </div>
    </div>
  );
}
