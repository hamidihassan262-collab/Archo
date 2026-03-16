import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, User, Bot, Paperclip, Search, Quote } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';
import { supabase } from '../../supabaseClient';

const currentSessionId = 'default-session'; // In a real app, this would be dynamic

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sources: { lender: string; text: string }[];
}

export default function CopilotChat() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', text: "Hello Hassan. I'm Archo, your mortgage specialist AI. How can I help you with your cases or criteria research today?", sources: [] },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    loadChatHistory();

    // Set up real-time subscription
    const channel = supabase
      .channel('chat-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const newMessage = payload.new;
          if (newMessage.session_id === currentSessionId) {
            setMessages(prev => {
              // Avoid duplicate messages if the local state was already updated
              if (prev.some(m => m.id === newMessage.id)) return prev;
              
              return [...prev, {
                id: newMessage.id,
                role: newMessage.role as 'user' | 'assistant',
                text: newMessage.content,
                sources: []
              }];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadChatHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', currentSessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Supabase load error:', error);
      } else if (data && data.length > 0) {
        const history: Message[] = data.map((msg: any) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          text: msg.content,
          sources: []
        }));
        setMessages(history);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const messageText = input;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: messageText,
      sources: []
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Save user message to Supabase
    try {
      await supabase
        .from('chat_messages')
        .insert({
          content: messageText,
          role: 'user',
          session_id: currentSessionId
        });
    } catch (err) {
      console.error('Failed to save user message:', err);
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: messageText,
        config: {
          systemInstruction: "You are Archo, a professional mortgage specialist AI for UK mortgage brokers. You help with lender criteria, affordability, and case placement. Be concise, professional, and helpful. If you mention specific lenders, try to format them clearly.",
        }
      });

      const assistantText = response.text || "I'm sorry, I couldn't process that request.";
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: assistantText,
        sources: []
      };

      setMessages(prev => [...prev, assistantMsg]);

      // Save assistant message to Supabase
      await supabase
        .from('chat_messages')
        .insert({
          content: assistantText,
          role: 'assistant',
          session_id: currentSessionId
        });

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: "I encountered an error while connecting to my brain. Please try again later.",
        sources: []
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-w-4xl mx-auto p-8 relative z-10">
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-10 pr-4 scrollbar-hide">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-8 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="w-12 h-12 rounded-2xl bg-archo-ink flex items-center justify-center text-archo-brass-pale flex-shrink-0 shadow-xl border border-archo-brass/20">
                <Bot size={24} />
              </div>
            )}
            
            <div className={`max-w-[80%] p-6 rounded-3xl shadow-xl border border-archo-brass/20 ${
              msg.role === 'user' 
                ? 'bg-archo-ink text-archo-cream' 
                : 'bg-archo-cream/80 backdrop-blur-sm text-archo-ink'
            }`}>
              <div className={`markdown-body text-base leading-relaxed font-sans tracking-tight ${msg.role === 'assistant' ? 'font-medium' : ''}`}>
                <Markdown>{msg.text}</Markdown>
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
              <Bot size={24} />
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
        <div className="absolute -top-14 left-0 right-0 flex justify-center">
          <div className="bg-archo-cream text-archo-brass px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-3 shadow-md border border-archo-brass/20 backdrop-blur-sm">
            <Sparkles size={14} className={isTyping ? "animate-spin" : "animate-pulse"} /> AI Reasoning Active
          </div>
        </div>
        
        <div className="bg-archo-cream border border-archo-brass/20 rounded-3xl p-3 shadow-2xl focus-within:ring-4 focus-within:ring-archo-brass/5 transition-all">
          <textarea
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder="Ask Archo about lender criteria, affordability, or case advice..."
            className="w-full p-5 bg-transparent focus:outline-none text-archo-ink font-sans text-base resize-none placeholder:text-archo-muted"
          />
          <div className="flex justify-between items-center px-3 pb-3">
            <button 
              onClick={() => alert('File attachment functionality coming soon!')}
              className="p-3 text-archo-muted hover:text-archo-brass transition-colors"
            >
              <Paperclip size={24} />
            </button>
            <button 
              onClick={handleSend}
              disabled={isTyping}
              className="bg-archo-ink text-archo-brass-pale p-4 rounded-2xl hover:bg-archo-brass hover:text-archo-cream transition-all shadow-xl group disabled:opacity-50"
            >
              <Send size={24} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </button>
          </div>
        </div>
        <p className="text-center text-[10px] text-archo-muted mt-6 font-sans italic tracking-wide">
          Archo provides administrative assistance. Always verify criteria before advising clients.
        </p>
      </div>
    </div>
  );
}
