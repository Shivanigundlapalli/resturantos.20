import React, { useState, useRef, useEffect } from "react";
import { 
  Send, 
  Mic, 
  Paperclip, 
  Bot, 
  User, 
  Sparkles, 
  Check, 
  Printer, 
  RefreshCw, 
  Calendar,
  Bell,
  ArrowUpRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ChatMessage, RestaurantState } from "../types";
import MarkdownRenderer from "./MarkdownRenderer";

interface AgentViewProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isSending: boolean;
  onTriggerPrompt: (prompt: string) => void;
  restaurantState: RestaurantState;
  onResetDatabase: () => void;
}

export default function AgentView({ 
  messages, 
  onSendMessage, 
  isSending, 
  onTriggerPrompt,
  restaurantState,
  onResetDatabase
}: AgentViewProps) {
  const [inputText, setInputText] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Speech Recognition States and Refs
  const [voiceState, setVoiceState] = useState<"idle" | "listening" | "processing" | "stopped" | "permission-denied" | "error">("idle");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const baseTextRef = useRef<string>("");
  const isExplicitStopRef = useRef<boolean>(false);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    // Set 6 seconds silence timeout to stop automatically if user stops speaking
    silenceTimerRef.current = setTimeout(() => {
      stopListening();
    }, 6000);
  };

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceState("error");
      setVoiceError("Speech recognition is not supported in this browser.");
      return;
    }

    setVoiceError(null);
    isExplicitStopRef.current = false;
    // Capture the current input text as our editing base, so we don't overwrite what the user has already typed
    baseTextRef.current = inputText;

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-IN"; // Tailored for Indian English/Spice Heaven context

      rec.onstart = () => {
        setVoiceState("listening");
        resetSilenceTimer();
      };

      rec.onspeechstart = () => {
        resetSilenceTimer();
      };

      rec.onspeechend = () => {
        setVoiceState("processing");
      };

      rec.onresult = (event: any) => {
        resetSilenceTimer();
        setVoiceState("listening");

        let sessionText = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i] && event.results[i][0]) {
            sessionText += event.results[i][0].transcript;
          }
        }

        const cleanSessionText = sessionText.trim();
        const base = baseTextRef.current ? baseTextRef.current.trim() : "";
        const newVal = base ? `${base} ${cleanSessionText}` : cleanSessionText;

        setInputText(newVal);
      };

      rec.onerror = (event: any) => {
        clearSilenceTimer();

        if (event.error === "not-allowed") {
          setVoiceState("permission-denied");
          setVoiceError("Microphone permission is required.");
        } else if (event.error === "no-speech") {
          // No speech detected is common when they don't say anything, stop gracefully
          setVoiceState("stopped");
        } else {
          setVoiceState("error");
          setVoiceError(`Error: ${event.error || "Unknown recognition error."}`);
        }
      };

      rec.onend = () => {
        clearSilenceTimer();
        // If the API ended but user didn't hit stop, and we are still in active states, attempt to restart
        if (!isExplicitStopRef.current && (voiceState === "listening" || voiceState === "processing")) {
          try {
            rec.start();
            return;
          } catch (e) {
          }
        }
        setVoiceState("stopped");
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err: any) {
      console.error("[Voice] Failed to initialize recognition:", err);
      setVoiceState("error");
      setVoiceError(err?.message || "Failed to start microphone.");
    }
  };

  const stopListening = () => {
    isExplicitStopRef.current = true;
    clearSilenceTimer();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error("[Voice] Error calling stop:", e);
      }
    }
    setVoiceState("stopped");
  };

  const toggleListening = () => {
    if (voiceState === "listening" || voiceState === "processing") {
      stopListening();
    } else {
      startListening();
    }
  };

  // Safe cleanup on unmount
  useEffect(() => {
    return () => {
      isExplicitStopRef.current = true;
      clearSilenceTimer();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;
    stopListening(); // Automatically turn off mic when sending
    onSendMessage(inputText.trim());
    setInputText("");
  };

  const suggestions = [
    { text: "Sales Summary", icon: "📈", prompt: "Show today's sales summary" },
    { text: "Create New Order", icon: "➕", prompt: "Create an order for Rahul. 2 Masala Dosa, 1 Filter Coffee" },
    { text: "Low Stock Items", icon: "⚠", prompt: "Show low stock items" },
    { text: "Today's Profit", icon: "💰", prompt: "Show today's profit" },
    { text: "Top 5 Customers", icon: "👥", prompt: "Show today's top 5 VIP customers" },
    { text: "Supplier Payments", icon: "🚚", prompt: "Show supplier pending payments" },
    { text: "Generate Daily Report", icon: "📄", prompt: "Generate daily operational report" },
    { text: "Recent Orders", icon: "📦", prompt: "List our recent orders" },
  ];

  const handleSuggestionClick = (prompt: string) => {
    if (isSending) return;
    onTriggerPrompt(prompt);
  };

  // Helper to handle interactive invoice printing
  const handlePrintInvoice = (orderId: string) => {
    alert(`🧾 Simulating invoice print for Order ${orderId || "#1042"}...\nPrinting to kitchen thermal receipt printer!`);
  };

  // Format date nicely
  const getFormattedDate = () => {
    const d = new Date();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-warm-bg text-text-main font-sans relative overflow-hidden">
      {/* Top Header */}
      <header className="h-16 border-b border-warm-border bg-warm-bg/80 backdrop-blur-md px-4 lg:px-6 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-2 pl-10 lg:pl-0">
          <span className="text-xl">👋</span>
          <div>
            <h2 className="text-sm font-bold text-text-main tracking-tight">Hello, Spice Heaven!</h2>
            <p className="hidden sm:block text-[10px] text-text-sec font-semibold tracking-wide">Ask your Restaurant Agent anything. It will manage everything for you.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Live Date display — hidden on mobile */}
          <div className="hidden md:flex items-center gap-2 bg-warm-bg px-3.5 py-1.5 rounded-[12px] border border-warm-border text-xs text-text-main font-bold shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-forest-accent" />
            <span>{getFormattedDate()}</span>
          </div>

          {/* Quick Notification alert */}
          <div className="relative cursor-pointer bg-warm-bg hover:bg-warm-bg p-2 rounded-[12px] border border-warm-border transition-colors">
            <Bell className="w-4 h-4 text-text-sec" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
          </div>

          {/* Database Reset button */}
          <button 
            onClick={onResetDatabase}
            className="flex items-center gap-1.5 text-[10px] bg-warm-bg hover:bg-warm-bg border border-warm-border text-text-sec font-bold px-2.5 py-1.5 rounded-[12px] transition-colors shrink-0 cursor-pointer"
            title="Reset Database to default state"
          >
            <RefreshCw className="w-3 h-3 text-text-sec" />
            <span className="hidden sm:inline">Reset DB</span>
          </button>
        </div>
      </header>

      {/* Main Conversation Stream */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6 scrollbar-thin scrollbar-thumb-zinc-700 flex flex-col">
        
        {/* Empty State: Robot Banner + suggestions Grid */}
        <AnimatePresence mode="wait">
          {messages.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="max-w-4xl mx-auto w-full space-y-8 my-auto"
            >
              {/* Premium Hero Banner */}
              <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 rounded-[28px] p-8 text-text-main shadow-md relative overflow-hidden border border-warm-border flex flex-col md:flex-row items-center gap-8">
                {/* Visual Glow */}
                <div className="absolute top-[-50%] right-[-20%] w-[400px] h-[400px] bg-transparent border border-forest-accent/30 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-30%] left-[-10%] w-[300px] h-[300px] bg-transparent border border-forest-accent/30 rounded-full blur-[80px]" />

                {/* Left Side: Chef Robot Illustration */}
                <div className="relative shrink-0 w-28 h-28 bg-warm-bg/5 border border-warm-border rounded-[22px] flex items-center justify-center shadow-inner group">
                  <Bot className="w-16 h-16 text-forest-accent animate-pulse" />
                  <div className="absolute -top-1 -right-1 bg-forest-accent text-zinc-900 p-1.5 rounded-lg shadow-sm">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Right Side: Copy & Info */}
                <div className="flex-1 space-y-4 text-center md:text-left">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-bold tracking-tight">I'm your <span className="text-forest-accent">Restaurant AI Agent</span> 🤖</h3>
                    <p className="text-text-main/80 text-sm leading-relaxed max-w-xl">
                      I can help you manage your orders, inventory, finances, customers, suppliers, compile daily audits, and process bills in real-time. Just talk to me like a human manager.
                    </p>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap justify-center md:justify-start gap-2.5 text-xs font-semibold">
                    <span className="bg-warm-bg/5 text-forest-accent px-3 py-1 rounded-xl border border-warm-border flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Smart Reasoning
                    </span>
                    <span className="bg-warm-bg/5 text-forest-accent px-3 py-1 rounded-xl border border-warm-border flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Instant Sync
                    </span>
                    <span className="bg-warm-bg/5 text-forest-accent px-3 py-1 rounded-xl border border-warm-border flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Accurate Analytics
                    </span>
                  </div>
                </div>
              </div>

              {/* Try Asking Me Section */}
              <div className="space-y-4">
                <div className="text-xs text-text-main font-bold uppercase tracking-wider pl-1">Try asking me something like...</div>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {suggestions.map((sug, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(sug.prompt)}
                      className="bg-warm-bg hover:bg-forest-accent text-zinc-900/5 hover:-translate-y-0.5 hover:border-forest-accent/30 border border-warm-border p-4 rounded-[18px] flex flex-col items-start gap-2 text-left transition-all duration-300 cursor-pointer shadow-xs group"
                    >
                      <div className="w-9 h-9 bg-warm-bg group-hover:bg-transparent border border-forest-accent/30 rounded-xl flex items-center justify-center text-lg transition-colors border border-warm-border">
                        {sug.icon}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-text-main flex items-center gap-1 group-hover:text-forest-accent">
                          <span>{sug.text}</span>
                          <ArrowUpRight className="w-3 h-3 text-text-sec opacity-0 group-hover:opacity-100 transition-all duration-200" />
                        </div>
                        <p className="text-[10px] text-text-sec mt-0.5 font-medium line-clamp-1">{sug.prompt}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            // Chat Logs View
            <div className="max-w-4xl mx-auto w-full space-y-6 flex-1 flex flex-col justify-end">
              {messages.map((msg) => {
                const isAI = msg.sender === "ai";
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`flex items-start gap-3.5 ${!isAI ? "flex-row-reverse" : ""}`}
                  >
                    {/* Avatar icon */}
                    <div className={`w-9 h-9 rounded-xl border shrink-0 flex items-center justify-center text-sm font-semibold shadow-xs ${
                      isAI 
                        ? "bg-transparent border border-forest-accent/30 text-forest-accent border-amber-500/20" 
                        : "bg-warm-bg text-text-main border-transparent"
                    }`}>
                      {isAI ? <Bot className="w-4 h-4 text-forest-accent" /> : <User className="w-4 h-4 text-text-main" />}
                    </div>

                    {/* Chat Bubble Body */}
                    <div className="space-y-2 max-w-[85%]">
                      <div className={`rounded-[18px] px-4 py-3 shadow-xs border ${
                        isAI 
                          ? "bg-warm-bg text-text-main border-warm-border/70" 
                          : "bg-warm-bg text-text-main border-transparent"
                      }`}>
                        {/* Sender details */}
                        <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide uppercase opacity-60 mb-1.5 select-none">
                          <span>{isAI ? "Restaurant OS Agent" : "Chef Spice (Owner)"}</span>
                          <span>•</span>
                          <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        {/* Content text */}
                        <div className={isAI ? "" : "text-sm text-emerald-50 font-medium"}>
                          {isAI ? (
                            <MarkdownRenderer content={msg.text} />
                          ) : (
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                          )}
                        </div>
                      </div>

                      {/* Interactive Confirmation Box for Create Orders */}
                      {isAI && msg.text && msg.text.includes("Order") && msg.text.includes("Created Successfully") && (
                        <div className="bg-warm-bg border border-warm-border rounded-[14px] p-3 shadow-xs max-w-sm flex items-center justify-between gap-3 animate-fade-in">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="w-6 h-6 rounded-lg bg-transparent border border-forest-accent/30 flex items-center justify-center text-forest-accent">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                            <div>
                              <div className="font-semibold text-text-main">Order Completed</div>
                              <p className="text-[10px] text-text-sec">Thermal invoice generated</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handlePrintInvoice("")}
                            className="flex items-center gap-1 text-[11px] bg-transparent border border-forest-accent/30 hover:bg-forest-accent text-zinc-900/15 text-forest-accent font-bold px-3 py-1.5 rounded-lg border border-amber-500/20/50 transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Print Receipt</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {/* Streaming Indicator */}
              {isSending && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3.5"
                >
                  <div className="w-9 h-9 rounded-xl bg-transparent border border-forest-accent/30 border border-amber-500/20 shrink-0 flex items-center justify-center shadow-xs">
                    <Bot className="w-4 h-4 text-forest-accent" />
                  </div>
                  <div className="bg-warm-bg border border-warm-border/70 rounded-2xl px-4 py-3 shadow-xs">
                    <div className="flex items-center gap-1.5 select-none text-[10px] font-bold tracking-wide uppercase opacity-60 mb-1.5">
                      <span>Restaurant OS Agent</span>
                      <span>•</span>
                      <span>Processing...</span>
                    </div>
                    {/* Animated loading dots */}
                    <div className="flex items-center gap-1 px-1 py-1">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </AnimatePresence>

      </div>

      {/* Modern Fixed Chat Input Bar */}
      <footer className="p-3 sm:p-6 bg-warm-bg border-t border-warm-border shrink-0">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative flex flex-col gap-2">
          
          {/* Main Rounded Input Frame */}
          <div className="bg-warm-bg border border-warm-border rounded-[22px] px-4 py-3 shadow-xs flex items-end gap-3 hover:border-warm-border focus-within:border-emerald-500/80 focus-within:ring-2 focus-within:ring-amber-500/20/10 transition-all duration-200">
            {/* Attachment Button */}
            <button
              type="button"
              onClick={() => alert("Simulation: File uploader opened. Support standard JPG/PNG food audits, bills, invoices, receipts, and order excel dumps.")}
              className="p-2 bg-warm-bg hover:bg-warm-bg rounded-xl border border-warm-border text-text-sec hover:text-text-sec transition-colors shrink-0 shadow-2xs"
              title="Attach document or receipt image"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Input Element */}
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              rows={1}
              placeholder="Ask your Restaurant Agent anything..."
              className="flex-1 max-h-32 min-h-[36px] overflow-y-auto outline-none resize-none bg-transparent py-1.5 text-sm font-medium text-text-main placeholder-zinc-500 scrollbar-none"
            />

             {/* Speech microphone / Send combo */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Mic Icon with Ripple Animation */}
              <div className="relative">
                {(voiceState === "listening" || voiceState === "processing") && (
                  <span className="absolute inset-0 rounded-xl bg-emerald-500/20 animate-ping" />
                )}
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`p-2 rounded-xl transition-colors relative z-10 ${
                    voiceState === "listening" || voiceState === "processing"
                      ? "bg-transparent border border-forest-accent/30 text-forest-accent hover:bg-emerald-200"
                      : voiceState === "error" || voiceState === "permission-denied"
                      ? "bg-rose-100 text-rose-500 hover:bg-rose-200"
                      : "hover:bg-warm-bg text-text-sec hover:text-text-sec"
                  }`}
                  title={
                    voiceState === "listening" || voiceState === "processing"
                      ? "Stop listening"
                      : "Voice Input"
                  }
                >
                  <Mic className={`w-4 h-4 ${voiceState === "listening" ? "animate-pulse" : ""}`} />
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!inputText.trim() || isSending}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                  inputText.trim() && !isSending
                    ? "bg-forest-accent text-zinc-900 hover:bg-amber-600 shadow-sm shadow-amber-500/10 active:scale-95"
                    : "bg-warm-bg text-text-sec border border-warm-border"
                }`}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Subtext branding or Voice state */}
          <div className="flex items-center justify-center gap-1.5 text-[10px] font-semibold select-none min-h-[16px]">
            {voiceState === "listening" ? (
              <div className="flex items-center gap-1.5 text-forest-accent animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span>Listening... Speak now</span>
              </div>
            ) : voiceState === "processing" ? (
              <div className="flex items-center gap-1.5 text-blue-600">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Processing voice...</span>
              </div>
            ) : voiceState === "permission-denied" ? (
              <span className="text-rose-500">⚠ Microphone permission is required.</span>
            ) : voiceState === "error" ? (
              <span className="text-rose-500">⚠ {voiceError || "Speech recognition error."}</span>
            ) : voiceState === "stopped" ? (
              <span className="text-forest-accent">🎙 Voice input ready. You can edit before sending.</span>
            ) : (
              <>
                <Sparkles className="w-3 h-3 text-forest-accent animate-pulse" />
                <span className="text-text-sec">Powered by RestaurantOS AI Agent</span>
              </>
            )}
          </div>

        </form>
      </footer>
    </div>
  );
}
