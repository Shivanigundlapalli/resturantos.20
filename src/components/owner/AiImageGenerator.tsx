import React, { useState } from "react";
import { X, Wand2, Image as ImageIcon, Download, CheckCircle2, Loader2, Sparkles, RefreshCw } from "lucide-react";
import imageCompression from "browser-image-compression";
import { supabase } from "../../lib/supabase";

interface AiImageGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  initialFoodName: string;
  onSelectImage: (url: string, type: 'cover' | 'gallery') => void;
}

export default function AiImageGenerator({ isOpen, onClose, initialFoodName, onSelectImage }: AiImageGeneratorProps) {
  const [prompt, setPrompt] = useState(initialFoodName || "");
  const [style, setStyle] = useState("Premium Restaurant");
  const [angle, setAngle] = useState("45 Degree");
  const [background, setBackground] = useState("Wooden Table");
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [processingImage, setProcessingImage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError("");
    setGeneratedImages([]);
    
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, style, angle, background })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate images");
      
      setGeneratedImages(data.images);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const processAndUploadImage = async (imageUrl: string, type: 'cover' | 'gallery') => {
    setProcessingImage(imageUrl);
    try {
      // 1. Fetch image to Blob
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) throw new Error("Failed to download image for processing.");
      const blob = await imgRes.blob();
      
      // 2. Compress Image
      const compressedFile = await imageCompression(new File([blob], "ai-image.jpg", { type: "image/jpeg" }), {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1200,
        useWebWorker: true
      });
      
      // 3. Upload to Supabase Storage
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const { data, error: uploadError } = await supabase.storage
        .from('menu-images')
        .upload(fileName, compressedFile, { cacheControl: '3600', upsert: false });
        
      if (uploadError) {
        // If bucket doesn't exist, this will fail. We'll fallback to returning the original URL for demo purposes if storage fails.
        console.error("Supabase Upload Error:", uploadError);
        onSelectImage(imageUrl, type);
        return;
      }
      
      // 4. Get Public URL
      const { data: publicUrlData } = supabase.storage.from('menu-images').getPublicUrl(fileName);
      
      onSelectImage(publicUrlData.publicUrl, type);
    } catch (err) {
      console.error(err);
      alert("Failed to process and upload image. Using original instead.");
      onSelectImage(imageUrl, type); // Fallback
    } finally {
      setProcessingImage(null);
    }
  };

  const handleDownload = async (url: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `food-gen-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      alert("Download failed due to CORS. Please save to gallery instead.");
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-zinc-100 bg-zinc-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-zinc-900 tracking-tight">AI Food Image Studio</h2>
              <p className="text-sm font-medium text-zinc-500">Generate stunning, mouth-watering photography for your menu.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Controls Sidebar */}
          <div className="w-80 bg-zinc-50 border-r border-zinc-100 p-6 flex flex-col gap-6 overflow-y-auto">
            <div>
              <label className="block text-xs font-black text-zinc-800 uppercase tracking-wider mb-2">Subject (Food Name)</label>
              <input 
                type="text" 
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-sm shadow-sm"
                placeholder="e.g. Chicken Dum Biryani"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-zinc-800 uppercase tracking-wider mb-2">Photography Style</label>
              <select value={style} onChange={e => setStyle(e.target.value)} className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-sm shadow-sm appearance-none">
                <option>Realistic</option>
                <option>Premium Restaurant</option>
                <option>Dark Theme</option>
                <option>Bright Cafe</option>
                <option>Street Food</option>
                <option>Minimal</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-zinc-800 uppercase tracking-wider mb-2">Camera Angle</label>
              <select value={angle} onChange={e => setAngle(e.target.value)} className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-sm shadow-sm appearance-none">
                <option>Top View</option>
                <option>45 Degree</option>
                <option>Side View</option>
                <option>Close Up</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-zinc-800 uppercase tracking-wider mb-2">Background</label>
              <select value={background} onChange={e => setBackground(e.target.value)} className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-sm shadow-sm appearance-none">
                <option>Wooden Table</option>
                <option>Marble</option>
                <option>Restaurant Table</option>
                <option>Dark Slate</option>
                <option>Transparent/White</option>
              </select>
            </div>

            <div className="mt-auto pt-6 border-t border-zinc-200">
              <button 
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
              >
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                {isGenerating ? 'Generating...' : 'Generate 4 Images'}
              </button>
            </div>
          </div>

          {/* Results Area */}
          <div className="flex-1 p-6 overflow-y-auto bg-white relative">
            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-medium flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0">!</div>
                <div className="flex-1">
                  <p className="font-bold">Generation Failed</p>
                  <p className="opacity-90">{error}</p>
                </div>
                <button onClick={handleGenerate} className="px-4 py-2 bg-white text-red-700 font-bold rounded-lg shadow-sm hover:bg-red-50">Retry</button>
              </div>
            )}

            {isGenerating ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400">
                <div className="relative mb-6">
                  <div className="w-24 h-24 border-4 border-indigo-100 rounded-full"></div>
                  <div className="w-24 h-24 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin absolute inset-0"></div>
                  <Sparkles className="w-8 h-8 text-indigo-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                <h3 className="text-xl font-bold text-zinc-800 mb-2">Cooking up masterpiece images...</h3>
                <p className="text-sm">Applying {style} styling with {background} background.</p>
              </div>
            ) : generatedImages.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 h-full">
                {generatedImages.map((url, i) => (
                  <div key={i} className="group relative bg-zinc-100 rounded-2xl overflow-hidden border border-zinc-200">
                    <img src={url} alt={`Generated option ${i+1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={() => processAndUploadImage(url, 'cover')}
                          disabled={processingImage !== null}
                          className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold rounded-xl shadow-lg backdrop-blur-md flex items-center justify-center gap-1.5 transition-colors"
                        >
                          {processingImage === url ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                          Set as Cover
                        </button>
                        <button 
                          onClick={() => processAndUploadImage(url, 'gallery')}
                          disabled={processingImage !== null}
                          className="flex-1 py-2.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-xl shadow-lg backdrop-blur-md flex items-center justify-center gap-1.5 transition-colors"
                        >
                          {processingImage === url ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
                          Add to Gallery
                        </button>
                        <button 
                          onClick={() => handleDownload(url)}
                          className="w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-xl shadow-lg backdrop-blur-md flex items-center justify-center shrink-0 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-300">
                <ImageIcon className="w-24 h-24 mb-6 opacity-20" />
                <h3 className="text-xl font-bold text-zinc-400">Ready to Generate</h3>
                <p className="text-sm mt-2 text-zinc-400">Tweak the settings on the left and click generate to see the magic.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
