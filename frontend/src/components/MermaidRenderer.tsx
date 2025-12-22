/**
 * MermaidRenderer - Lazy-loaded wrapper for Mermaid diagram rendering
 * 
 * This component is loaded dynamically to reduce initial bundle size.
 * Mermaid adds ~1.5MB to the bundle.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import mermaid from 'mermaid';
import DOMPurify from 'dompurify';

// Initialize mermaid with secure settings
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: 'basis',
  },
});

interface MermaidRendererProps {
  code: string;
  className?: string;
  onError?: (error: string) => void;
  onSuccess?: () => void;
}

export default function MermaidRenderer({ 
  code, 
  className,
  onError,
  onSuccess 
}: MermaidRendererProps) {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderIdRef = useRef(0);

  const renderDiagram = useCallback(async () => {
    if (!code.trim()) {
      setSvg('');
      setError(null);
      return;
    }

    const renderId = ++renderIdRef.current;

    try {
      // Validate syntax first
      await mermaid.parse(code);
      
      // Render the diagram
      const { svg: renderedSvg } = await mermaid.render(
        `mermaid-${renderId}-${Date.now()}`,
        code
      );
      
      // Only update if this is still the latest render
      if (renderId === renderIdRef.current) {
        // Sanitize the SVG output
        const sanitizedSvg = DOMPurify.sanitize(renderedSvg, {
          USE_PROFILES: { svg: true, svgFilters: true },
          ADD_TAGS: ['foreignObject'],
        });
        
        setSvg(sanitizedSvg);
        setError(null);
        onSuccess?.();
      }
    } catch (err: any) {
      if (renderId === renderIdRef.current) {
        const errorMessage = err?.message || 'Failed to render diagram';
        setError(errorMessage);
        setSvg('');
        onError?.(errorMessage);
      }
    }
  }, [code, onError, onSuccess]);

  useEffect(() => {
    const timeoutId = setTimeout(renderDiagram, 300);
    return () => clearTimeout(timeoutId);
  }, [renderDiagram]);

  if (error) {
    return (
      <div className={`p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg ${className || ''}`}>
        <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-1">Syntax Error</p>
        <p className="text-xs text-red-500 dark:text-red-300 font-mono">{error}</p>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className={`flex items-center justify-center p-8 text-muted-foreground ${className || ''}`}>
        <p className="text-sm">Enter Mermaid code to preview diagram</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`mermaid-container overflow-auto ${className || ''}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

// Export utility for rendering mermaid to SVG string
export async function renderMermaidToSvg(code: string): Promise<string> {
  try {
    await mermaid.parse(code);
    const { svg } = await mermaid.render(`export-${Date.now()}`, code);
    return DOMPurify.sanitize(svg, {
      USE_PROFILES: { svg: true, svgFilters: true },
      ADD_TAGS: ['foreignObject'],
    });
  } catch (err) {
    throw err;
  }
}

// Export utility for getting mermaid SVG as blob
export async function renderMermaidToBlob(code: string, format: 'svg' | 'png' = 'svg'): Promise<Blob> {
  const svg = await renderMermaidToSvg(code);
  
  if (format === 'svg') {
    return new Blob([svg], { type: 'image/svg+xml' });
  }
  
  // For PNG, we need to convert SVG to canvas then to blob
  return new Promise((resolve, reject) => {
    const img = new Image();
    const svgBlob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width * 2; // 2x for better quality
      canvas.height = img.height * 2;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create PNG blob'));
        }
      }, 'image/png');
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG image'));
    };
    
    img.src = url;
  });
}
