"use client";

import { useState, useEffect } from "react";
import puter from "@heyputer/puter.js";

interface Message {
  role: "user" | "assistant";
  content: string;
  time: string;
}

interface Memory {
  prompt: string;
  response: string;
  model: string;
  timestamp: number;
}

const quickActions = [
  { icon: "📝", label: "Summarize", prompt: "Please summarize: " },
  { icon: "💻", label: "Code", prompt: "Write code for: " },
  { icon: "🔍", label: "Analyze", prompt: "Analyze and explain: " },
  { icon: "💡", label: "Explain", prompt: "Explain in simple terms: " },
  { icon: "🔄", label: "Translate", prompt: "Translate to Spanish: " },
  { icon: "✍️", label: "Write", prompt: "Write about: " },
];

const chatModels = [
  { group: "Claude 4.7", options: [
    { value: "claude-opus-4-7", label: "Claude Opus 4.7" },
    { value: "claude-sonnet-4-7", label: "Claude Sonnet 4.7" },
    { value: "claude-haiku-4-7", label: "Claude Haiku 4.7" },
  ]},
  { group: "Claude 4.6", options: [
    { value: "claude-opus-4-6", label: "Claude Opus 4.6" },
    { value: "claude-opus-4-6-fast", label: "Claude Opus 4.6 Fast" },
    { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
    { value: "claude-haiku-4-6", label: "Claude Haiku 4.6" },
  ]},
  { group: "Claude 4.5", options: [
    { value: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
  ]},
  { group: "Other AI", options: [
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
  ]},
];

const imageModels = [
  { group: "GPT Image", options: [
    { value: "gpt-image-1-mini", label: "GPT Image 1 Mini" },
    { value: "gpt-image-1.5", label: "GPT Image 1.5" },
    { value: "gpt-image-2", label: "GPT Image 2" },
  ]},
  { group: "Google Imagen", options: [
    { value: "google/imagen-4.0-fast", label: "Imagen 4 Fast" },
    { value: "google/imagen-4.0-preview", label: "Imagen 4" },
    { value: "google/imagen-4.0-ultra", label: "Imagen 4 Ultra" },
  ]},
  { group: "Gemini Nano", options: [
    { value: "flash-image-2.5", label: "Gemini 2.5 Flash" },
    { value: "gemini-3.1-flash-image-preview", label: "Gemini 3.1 Flash" },
    { value: "gemini-3-pro-image-preview", label: "Gemini 3 Pro" },
  ]},
  { group: "xAI Grok", options: [
    { value: "grok-2-image", label: "Grok 2" },
  ]},
];

export default function PuterChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState("claude-sonnet-4-6");
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Initializing...");
  const [activeTab, setActiveTab] = useState<"chat" | "crawler" | "image" | "memory">("chat");
  const [memories, setMemories] = useState<Memory[]>([]);
  const [crawlUrl, setCrawlUrl] = useState("");
  const [crawlResult, setCrawlResult] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageGenerating, setImageGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState("");
  const [imageModel, setImageModel] = useState("gpt-image-1-mini");
  const [toast, setToast] = useState<{message: string; type: string} | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("puterMemory");
    if (saved) setMemories(JSON.parse(saved));
    
    const checkPuter = setInterval(() => {
      if (puter && puter.ai) {
        setReady(true);
        setStatus("Ready");
        clearInterval(checkPuter);
      }
    }, 500);
    
    return () => clearInterval(checkPuter);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && !e.shiftKey) {
        if (e.key === "1") { e.preventDefault(); setActiveTab("chat"); }
        if (e.key === "2") { e.preventDefault(); setActiveTab("crawler"); }
        if (e.key === "3") { e.preventDefault(); setActiveTab("image"); }
        if (e.key === "4") { e.preventDefault(); setActiveTab("memory"); }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function showToast(message: string, type: string = "info") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function sendMessage() {
    if (!input.trim() || !ready) return;
    
    const userMsg: Message = { role: "user", content: input, time: new Date().toLocaleTimeString() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    
    try {
      const response: any = await puter.ai.chat(input, { model });
      const content = response?.message?.content;
      let text = "No response";
      if (Array.isArray(content) && content[0]) {
        text = content[0].text || "No response";
      } else if (content?.text) {
        text = content.text;
      }
      const assistantMsg: Message = { role: "assistant", content: text, time: new Date().toLocaleTimeString() };
      setMessages(prev => [...prev, assistantMsg]);
      saveMemory(input, text);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : "Error";
      setMessages(prev => [...prev, { role: "assistant", content: `Error: ${errMsg}`, time: new Date().toLocaleTimeString() }]);
    }
    setLoading(false);
  }

  function saveMemory(prompt: string, response: string) {
    const newMemory: Memory = { prompt, response, model, timestamp: Date.now() };
    const updated = [newMemory, ...memories].slice(0, 20);
    setMemories(updated);
    localStorage.setItem("puterMemory", JSON.stringify(updated));
  }

  async function crawlWebsite() {
    if (!crawlUrl.trim()) return;
    setCrawlResult("Crawling...");
    try {
      const fetchResp = await fetch("https://r.jina.ai/" + crawlUrl);
      const text = await fetchResp.text();
      if (text.length > 100) {
        const aiResp: any = await puter.ai.chat("Summarize: " + text.substring(0, 8000), { model });
        const aiContent = aiResp?.message?.content;
        const aiText = Array.isArray(aiContent) ? aiContent[0]?.text : aiContent?.text;
        setCrawlResult(aiText || "No response");
      } else {
        setCrawlResult("Could not fetch content");
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : "Error";
      setCrawlResult("Error: " + errMsg);
    }
  }

  async function generateImage() {
    if (!imagePrompt.trim() || !ready) return;
    setImageGenerating(true);
    setGeneratedImage("");
    try {
      const result: any = await puter.ai.txt2img(imagePrompt, { model: imageModel });
      const imgSrc = result?.src || result?.props?.src || String(result);
      setGeneratedImage(imgSrc);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : "Error";
      alert("Error: " + errMsg);
    }
    setImageGenerating(false);
  }

  function formatContent(content: string) {
    return content
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-gray-800 p-3 rounded-lg overflow-x-auto my-2"><code>$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code class="bg-gray-800 px-1 rounded">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  return (
    <div className="flex h-screen bg-[#0d1117] text-[#c9d1d9]">
      {/* Sidebar */}
      <div className="w-64 bg-[#161b22] border-r border-[#30363d] p-4 flex flex-col">
        <h1 className="text-xl font-bold text-[#58a6ff] mb-6">🤖 Nitesh's Agent</h1>
        
        <button onClick={() => setActiveTab("chat")} className={`p-3 rounded-lg mb-2 flex justify-between ${activeTab === "chat" ? "bg-[#58a6ff] text-white" : "border border-[#30363d] hover:border-[#58a6ff]"}`}>
          <span>💬 Chat</span><span className="text-xs opacity-50">1</span>
        </button>
        <button onClick={() => setActiveTab("crawler")} className={`p-3 rounded-lg mb-2 flex justify-between ${activeTab === "crawler" ? "bg-[#58a6ff] text-white" : "border border-[#30363d] hover:border-[#58a6ff]"}`}>
          <span>🕷️ Crawler</span><span className="text-xs opacity-50">2</span>
        </button>
        <button onClick={() => setActiveTab("image")} className={`p-3 rounded-lg mb-2 flex justify-between ${activeTab === "image" ? "bg-[#58a6ff] text-white" : "border border-[#30363d] hover:border-[#58a6ff]"}`}>
          <span>🎨 Image</span><span className="text-xs opacity-50">3</span>
        </button>
        <button onClick={() => setActiveTab("memory")} className={`p-3 rounded-lg mb-2 flex justify-between ${activeTab === "memory" ? "bg-[#58a6ff] text-white" : "border border-[#30363d] hover:border-[#58a6ff]"}`}>
          <span>🧠 Memory</span><span className="text-xs opacity-50">4</span>
        </button>
        
        <div className="mt-auto pt-4 border-t border-[#30363d]">
          <button onClick={() => { if (confirm("Clear chat?")) setMessages([]); }} className="p-3 rounded-lg border border-[#30363d] hover:border-[#f85149] text-[#f85149] w-full">
            🗑️ Clear Chat
          </button>
        </div>
      </div>
      
      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#30363d] bg-[#161b22] flex justify-between items-center">
          {activeTab === "image" ? (
            <select value={imageModel} onChange={(e) => setImageModel(e.target.value)} className="bg-[#21262d] border border-[#30363d] text-[#c9d1d9] px-4 py-2 rounded-lg">
              {imageModels.map(g => (
                <optgroup key={g.group} label={g.group}>
                  {g.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </optgroup>
              ))}
            </select>
          ) : (
            <select value={model} onChange={(e) => setModel(e.target.value)} className="bg-[#21262d] border border-[#30363d] text-[#c9d1d9] px-4 py-2 rounded-lg">
              {chatModels.map(g => (
                <optgroup key={g.group} label={g.group}>
                  {g.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </optgroup>
              ))}
            </select>
          )}
          <div className="flex items-center gap-2 text-sm">
            <span className={`w-2 h-2 rounded-full ${ready ? "bg-[#3fb950]" : "bg-[#d29922]"}`}></span>
            <span>{status}</span>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === "chat" && (
            <div className="space-y-4">
              {messages.length === 0 && (
                <>
                  <div className="text-center text-[#8b949e] mt-10 mb-6">
                    <p className="text-2xl font-bold text-[#c9d1d9] mb-2">👋 Welcome!</p>
                    <p className="text-lg">Select a model and start chatting</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 mb-8">
                    {quickActions.map((a, i) => (
                      <button key={i} onClick={() => setInput(a.prompt)} className="bg-[#21262d] border border-[#30363d] hover:border-[#58a6ff] px-4 py-2 rounded-full text-sm flex items-center gap-2 transition-all hover:scale-105">
                        <span>{a.icon}</span> {a.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {messages.map((msg, i) => (
                <div key={i} className="group flex gap-4 hover:bg-[#161b22] -mx-2 px-2 rounded-lg">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg ${msg.role === "user" ? "bg-[#58a6ff]" : "bg-[#a371f7]"}`}>
                    {msg.role === "user" ? "👤" : "🤖"}
                  </div>
                  <div className="flex-1">
                    <div className="relative">
                      <div dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }} />
                      <button onClick={() => { navigator.clipboard.writeText(msg.content); showToast("Copied!", "success"); }} className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 text-[#8b949e] hover:text-[#58a6ff] text-xs px-2 py-1">
                        📋
                      </button>
                    </div>
                    <div className="text-xs text-[#8b949e] mt-1">{msg.time}</div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-4">
                  <div className="w-9 h-9 rounded-lg bg-[#a371f7] flex items-center justify-center">🤖</div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-[#58a6ff] rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-[#58a6ff] rounded-full animate-bounce" style={{animationDelay: "0.2s"}}></span>
                    <span className="w-2 h-2 bg-[#58a6ff] rounded-full animate-bounce" style={{animationDelay: "0.4s"}}></span>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {activeTab === "crawler" && (
            <div className="max-w-2xl mx-auto">
              <input value={crawlUrl} onChange={(e) => setCrawlUrl(e.target.value)} placeholder="Enter URL..." className="w-full bg-[#21262d] border border-[#30363d] text-[#c9d1d9] px-4 py-3 rounded-lg mb-4" />
              <button onClick={crawlWebsite} className="bg-[#3fb950] text-white px-6 py-3 rounded-lg mb-4 w-full">🔍 Crawl & Summarize</button>
              {crawlResult && <div className="bg-[#21262d] p-4 rounded-lg whitespace-pre-wrap">{crawlResult}</div>}
            </div>
          )}
          
          {activeTab === "image" && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-[#21262d] border border-[#30363d] rounded-lg p-3 mb-4">
                <span className="text-[#8b949e] text-sm">🖼️ Native Image Gen</span>
                <p className="text-xs text-[#8b949e] mt-1">Select model, describe, generate</p>
              </div>
              <textarea value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)} placeholder="Describe image..." className="w-full bg-[#21262d] border border-[#30363d] text-[#c9d1d9] px-4 py-3 rounded-lg mb-4 h-32" />
              <button onClick={generateImage} disabled={imageGenerating || !ready} className="bg-[#a371f7] text-white px-6 py-3 rounded-lg mb-4 w-full disabled:opacity-50">
                {imageGenerating ? "⏳ Generating..." : "🎨 Generate Image"}
              </button>
              {generatedImage && (
                <div className="rounded-lg overflow-hidden border border-[#30363d]">
                  <img src={generatedImage} alt="Generated" className="w-full" />
                  <div className="flex gap-2 mt-2">
                    <a href={generatedImage} download="image.png" className="bg-[#3fb950] text-white px-4 py-2 rounded-lg text-sm">⬇️ Download</a>
                    <button onClick={() => { navigator.clipboard.writeText(generatedImage); showToast("URL copied!", "success"); }} className="bg-[#21262d] border border-[#30363d] px-4 py-2 rounded-lg text-sm">📋 Copy URL</button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {activeTab === "memory" && (
            <div className="max-w-2xl mx-auto">
              {memories.length === 0 ? <div className="text-center text-[#8b949e] mt-20">No saved memories</div> : memories.map((m, i) => (
                <div key={i} onClick={() => { setActiveTab("chat"); setMessages([]); }} className="bg-[#21262d] p-4 rounded-lg mb-3 cursor-pointer border border-transparent hover:border-[#58a6ff]">
                  <div className="text-[#58a6ff] font-semibold text-sm">{m.model}</div>
                  <div className="text-[#8b949e] text-sm truncate">{m.prompt.substring(0, 40)}...</div>
                  <div className="text-xs text-[#8b949e] mt-1">{new Date(m.timestamp).toLocaleString()}</div>
                </div>
              ))}
              {memories.length > 0 && <button onClick={() => { if (confirm("Clear all?")) { setMemories([]); localStorage.removeItem("puterMemory"); } }} className="bg-[#f85149] text-white px-4 py-2 rounded-lg w-full mt-4">Clear Memory</button>}
            </div>
          )}
        </div>
        
        {activeTab === "chat" && (
          <div className="p-4 border-t border-[#30363d] bg-[#161b22]">
            <div className="flex gap-2">
              <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && (e.ctrlKey || e.metaKey)) { e.preventDefault(); sendMessage(); } }} placeholder="Message... (Ctrl+Enter)" rows={1} className="flex-1 bg-[#21262d] border border-[#30363d] text-[#c9d1d9] px-4 py-3 rounded-lg resize-none focus:border-[#58a6ff] outline-none" />
              <button onClick={sendMessage} disabled={loading || !ready} className="bg-[#58a6ff] hover:bg-[#79c0ff] text-white px-6 rounded-lg disabled:opacity-50">
                {loading ? "⏳" : "➤"}
              </button>
            </div>
            <div className="text-xs text-[#8b949e] mt-2 flex justify-between">
              <span>Ctrl+Enter to send</span>
              <span>{input.length} chars</span>
            </div>
          </div>
        )}
      </div>
      
      {toast && (
        <div className={`fixed bottom-20 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg ${toast.type === "success" ? "bg-[#3fb950]" : toast.type === "error" ? "bg-[#f85149]" : "bg-[#58a6ff]"} text-white font-medium animate-bounce`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}