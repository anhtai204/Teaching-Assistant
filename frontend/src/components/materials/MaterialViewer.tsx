"use client";

import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FileText,
  Video,
  Headphones,
  Maximize2,
  X,
  Download,
  Share2,
  Clock,
  Bookmark,
  ChevronLeft,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface MaterialViewerProps {
  material: {
    id: string;
    name: string;
    type: string;
    url: string;
    course_name?: string;
    markdown_content?: string;
  };
  initialTimestamp?: number;
  initialPage?: number;
  highlightText?: string;
  onClose?: () => void;
}

export const MaterialViewer: React.FC<MaterialViewerProps> = ({ material, initialTimestamp, initialPage, highlightText, onClose }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const renderContent = () => {
    const type = material.type.toLowerCase();

    if (['mp4', 'mov', 'webm'].includes(type)) {
      return <VideoViewer url={material.url} initialTimestamp={initialTimestamp} />;
    }

    if (['mp3', 'wav', 'm4a'].includes(type)) {
      return <AudioViewer url={material.url} name={material.name} initialTimestamp={initialTimestamp} />;
    }

    // If we have converted markdown (for DOCX, PPTX, etc.), use it!
    // But for PDFs, we prefer the original DocumentViewer to support #page=X
    if (material.markdown_content && type !== 'pdf') {
      return <MarkdownViewer url="" staticContent={material.markdown_content} highlightText={highlightText} />;
    }

    if (type === 'md' || material.url.toLowerCase().endsWith('.md')) {
      return <MarkdownViewer url={material.url} highlightText={highlightText} />;
    }

    if (type === 'txt' || type === 'text' || material.url.toLowerCase().endsWith('.txt')) {
      return <TextViewer url={material.url} highlightText={highlightText} />;
    }

    // Default to Document Viewer (PDF, etc.)
    return <DocumentViewer url={material.url} initialPage={initialPage} />;
  };

  return (
    <div className="flex flex-col h-screen bg-[#0F0F23] text-[#E2E8F0] font-['Source_Sans_3'] overflow-hidden">
      {/* Header - Spatial UI Style */}
      <header className="h-20 px-8 flex items-center justify-between glass-dark sticky top-0 z-50 border-b border-white/5">
        <div className="flex items-center gap-6">
          <button
            onClick={onClose}
            className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors group"
          >
            <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div className="h-10 w-[1px] bg-white/10 hidden sm:block" />
          <div className="space-y-0.5">
            <h1 className="text-lg font-bold font-['Lexend'] tracking-tight truncate max-w-md text-white">
              {material.name}
            </h1>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-400">
              <span>{material.course_name || "Course Material"}</span>
              <span className="h-1 w-1 rounded-full bg-white/40" />
              <span className="text-white/60">{material.type}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="hidden sm:flex text-white/60 hover:text-white hover:bg-white/10 rounded-xl gap-2 font-bold uppercase tracking-widest text-[10px]">
            <Bookmark className="w-4 h-4" />
            Save
          </Button>
          <a href={material.url} download>
            <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10 rounded-xl gap-2 font-bold uppercase tracking-widest text-[10px]">
              <Download className="w-4 h-4" />
              Download
            </Button>
          </a>
          <Button
            onClick={() => setIsFullscreen(!isFullscreen)}
            variant="ghost"
            size="sm"
            className="text-white/60 hover:text-white hover:bg-white/10 rounded-xl"
          >
            <Maximize2 className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main Viewer Area */}
      <main className="flex-1 relative overflow-hidden flex items-center justify-center p-4 sm:p-8 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#1A1A3A] to-[#0F0F23]">
        <div className={`w-full h-full max-w-7xl mx-auto rounded-[2rem] overflow-hidden spatial-shadow bg-black/40 backdrop-blur-sm border border-white/5 relative`}>
          {renderContent()}
        </div>
      </main>

      {/* Footer Info (Optional) */}
      <footer className="h-16 px-8 flex items-center justify-center glass-dark text-[10px] font-bold text-white/30 uppercase tracking-[0.3em]">
        Spatial Learning Environment • AI Enhanced
      </footer>
    </div>
  );
};

/* Sub-Components for Different Types */

const TextViewer: React.FC<{ url: string; highlightText?: string }> = ({ url, highlightText }) => {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAndDecode = async () => {
      try {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        let decoder = new TextDecoder("utf-8");
        let text = decoder.decode(buffer);
        if (text.includes('\ufffd')) {
          text = new TextDecoder("windows-1258").decode(buffer);
        }
        setContent(text);
      } catch (err) {
        console.error("Error decoding text file:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAndDecode();
  }, [url]);

  useEffect(() => {
    if (!loading && highlightText && containerRef.current) {
      // 1. Ultra-clean normalization
      const normalize = (t: string) => t.toLowerCase().replace(/[#*_\->`\[\]\(\)]/g, '').replace(/\s+/g, ' ').trim();
      const cleanHighlight = normalize(highlightText);

      if (!cleanHighlight || cleanHighlight.length < 3) return;

      setTimeout(() => {
        const pre = containerRef.current?.querySelector('pre');
        if (pre) {
          const text = pre.textContent || "";
          const normalizedContent = normalize(text);
          const index = normalizedContent.indexOf(cleanHighlight);

          if (index !== -1) {
            // Because we normalized, we need to find the approximate original index
            // For simple pre tags, we can just search for the first 10 chars of cleanHighlight
            const searchPart = cleanHighlight.substring(0, 10);
            const originalIndex = text.toLowerCase().indexOf(searchPart);

            if (originalIndex !== -1) {
              const actualMatchedText = text.substring(originalIndex, originalIndex + cleanHighlight.length + 10).split('\n')[0]; // Get at least the first line
              pre.innerHTML = text.replace(actualMatchedText, `<mark class="bg-yellow-300 text-black px-1 rounded shadow-sm">${actualMatchedText}</mark>`);
              const mark = pre.querySelector('mark');
              mark?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        }
      }, 800);
    }
  }, [loading, highlightText]);

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <span className="text-xs font-bold text-white/20 tracking-widest uppercase">Decoding Text...</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full overflow-auto bg-white/95 p-12">
      <pre className="max-w-4xl mx-auto text-slate-800 font-mono text-sm whitespace-pre-wrap break-words leading-relaxed">
        {content}
      </pre>
    </div>
  );
};

const MarkdownViewer: React.FC<{ url: string; staticContent?: string; highlightText?: string }> = ({ url, staticContent, highlightText }) => {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (staticContent) {
      setContent(staticContent);
      setLoading(false);
      return;
    }

    if (!url) {
      setLoading(false);
      return;
    }

    fetch(url)
      .then(res => res.text())
      .then(text => {
        setContent(text);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching markdown:", err);
        setLoading(false);
      });
  }, [url, staticContent]);

  useEffect(() => {
    if (!loading && highlightText && containerRef.current) {
      // 1. Ultra-clean normalization
      const normalize = (t: string) => t.toLowerCase().replace(/[#*_\->`\[\]\(\)]/g, '').replace(/\s+/g, ' ').trim();
      const cleanHighlight = normalize(highlightText);

      if (!cleanHighlight || cleanHighlight.length < 3) return;

      setTimeout(() => {
        // 2. Find all potential text-containing elements
        const elements = containerRef.current?.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, span, td, th, div');
        if (!elements) return;

        let targetElement: HTMLElement | null = null;

        // Search for the deep-most element that contains our text
        for (let i = 0; i < elements.length; i++) {
          const el = elements[i] as HTMLElement;
          // Use innerText as it represents what the user actually sees (strips tags)
          const elText = normalize(el.innerText);

          if (elText.includes(cleanHighlight)) {
            // Check if it's a leaf-ish element (doesn't have children that also match)
            // This ensures we scroll to the H3 instead of the whole container div
            targetElement = el;
          }
        }

        // Fallback to partial match if no exact match found
        if (!targetElement && cleanHighlight.length > 8) {
          const partial = cleanHighlight.substring(0, Math.min(20, cleanHighlight.length));
          for (let i = 0; i < elements.length; i++) {
            const el = elements[i] as HTMLElement;
            if (normalize(el.innerText).includes(partial)) {
              targetElement = el;
              break;
            }
          }
        }

        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetElement.classList.add('bg-yellow-100', 'dark:bg-yellow-900/30', 'transition-all', 'duration-1000', 'ring-4', 'ring-yellow-400/20', 'rounded-lg', 'px-2');
        }
      }, 1200);
    }
  }, [loading, highlightText]);

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <span className="text-xs font-bold text-white/20 tracking-widest uppercase">Reading Data...</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full overflow-auto bg-white/95 p-12">
      <div className="max-w-4xl mx-auto prose prose-indigo prose-lg">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
};

const VideoViewer: React.FC<{ url: string; initialTimestamp?: number }> = ({ url, initialTimestamp }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const handleLoadedMetadata = () => {
    if (videoRef.current && initialTimestamp !== undefined) {
      videoRef.current.currentTime = initialTimestamp;
    }
  };

  useEffect(() => {
    // Fallback if metadata is already loaded when the effect runs
    if (videoRef.current && initialTimestamp !== undefined && videoRef.current.readyState >= 1) {
      videoRef.current.currentTime = initialTimestamp;
    }
  }, [initialTimestamp, url]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-black">
      <video
        ref={videoRef}
        src={url}
        controls
        autoPlay
        onLoadedMetadata={handleLoadedMetadata}
        className="w-full h-full object-contain"
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

const AudioViewer: React.FC<{ url: string, name: string, initialTimestamp?: number }> = ({ url, name, initialTimestamp }) => {
  const audioRef = React.useRef<HTMLAudioElement>(null);

  const handleLoadedMetadata = () => {
    if (audioRef.current && initialTimestamp !== undefined) {
      audioRef.current.currentTime = initialTimestamp;
    }
  };

  useEffect(() => {
    if (audioRef.current && initialTimestamp !== undefined && audioRef.current.readyState >= 1) {
      audioRef.current.currentTime = initialTimestamp;
    }
  }, [initialTimestamp, url]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-12 space-y-12">
      <div className="relative">
        <div className="absolute -inset-10 bg-purple-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="h-48 w-48 rounded-[3rem] bg-gradient-to-br from-purple-600 to-rose-600 flex items-center justify-center text-white spatial-shadow relative z-10">
          <Headphones className="w-24 h-24" />
        </div>
      </div>

      <div className="text-center space-y-4 relative z-10">
        <h2 className="text-3xl font-bold font-['Lexend'] text-white tracking-tight">{name}</h2>
        <p className="text-purple-400 font-bold uppercase tracking-widest text-xs">Audio Resource • Listen & Learn</p>
      </div>

      <div className="w-full max-w-2xl glass-dark p-8 rounded-3xl border border-white/10 spatial-shadow">
        <audio ref={audioRef} src={url} controls autoPlay onLoadedMetadata={handleLoadedMetadata} className="w-full h-12" />
        <div className="mt-6 flex justify-between text-[10px] font-black text-white/40 uppercase tracking-widest">
          <span>Stereo Output</span>
          <span>Adaptive Bitrate</span>
        </div>
      </div>
    </div>
  );
};

const DocumentViewer: React.FC<{ url: string; initialPage?: number }> = ({ url, initialPage }) => {
  const isOffice = /\.(docx|pptx|xlsx|doc|ppt|xls)$/i.test(url);
  
  // Use Microsoft Office Online Viewer for Office files to prevent downloads
  const finalUrl = isOffice 
    ? `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`
    : (initialPage ? `${url}#page=${initialPage}` : url);

  return (
    <div className="w-full h-full bg-white relative">
      <iframe
        src={finalUrl}
        className="w-full h-full border-none"
        title="Document Viewer"
      />
    </div>
  );
};
