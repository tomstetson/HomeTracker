/**
 * TldrawEditor - Lazy-loaded wrapper for tldraw diagram editor
 * 
 * This component is loaded dynamically to reduce initial bundle size.
 * tldraw adds ~1.2MB to the bundle.
 */

import { useRef, forwardRef, useImperativeHandle } from 'react';
import { Tldraw, Editor, exportToBlob } from 'tldraw';
import 'tldraw/tldraw.css';

export interface TldrawEditorRef {
  getEditor: () => Editor | null;
  getSnapshot: () => any;
  exportToPng: () => Promise<Blob | null>;
  exportToSvg: () => Promise<Blob | null>;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  fitToScreen: () => void;
}

interface TldrawEditorProps {
  initialData?: any;
  onMount?: (editor: Editor) => void;
  onChange?: () => void;
  onZoomChange?: (zoom: number) => void;
  className?: string;
}

// Check if tldraw data is compatible with current version
const isValidTldrawData = (data: any): boolean => {
  if (!data || !data.store) return false;
  
  try {
    for (const [key, record] of Object.entries(data.store as Record<string, any>)) {
      if (!key.startsWith('shape:')) continue;
      
      const shape = record as any;
      
      // Text shapes with 'text' in props are incompatible with newer tldraw
      if (shape.type === 'text' && shape.props?.text !== undefined) {
        console.warn('Found incompatible text shape, data needs reset');
        return false;
      }
    }
    return true;
  } catch (e) {
    console.error('Validation check failed:', e);
    return false;
  }
};

const TldrawEditor = forwardRef<TldrawEditorRef, TldrawEditorProps>(
  ({ initialData, onMount, onChange, onZoomChange, className }, ref) => {
    const editorRef = useRef<Editor | null>(null);

    useImperativeHandle(ref, () => ({
      getEditor: () => editorRef.current,
      
      getSnapshot: () => {
        if (!editorRef.current) return null;
        return editorRef.current.store.getSnapshot();
      },
      
      exportToPng: async () => {
        if (!editorRef.current) return null;
        const shapeIds = editorRef.current.getCurrentPageShapeIds();
        if (shapeIds.size === 0) return null;
        return exportToBlob({
          editor: editorRef.current,
          ids: [...shapeIds],
          format: 'png',
          opts: { background: true, padding: 20 },
        });
      },
      
      exportToSvg: async () => {
        if (!editorRef.current) return null;
        const shapeIds = editorRef.current.getCurrentPageShapeIds();
        if (shapeIds.size === 0) return null;
        return exportToBlob({
          editor: editorRef.current,
          ids: [...shapeIds],
          format: 'svg',
          opts: { background: true, padding: 20 },
        });
      },
      
      zoomIn: () => {
        editorRef.current?.zoomIn();
      },
      
      zoomOut: () => {
        editorRef.current?.zoomOut();
      },
      
      resetZoom: () => {
        editorRef.current?.resetZoom();
      },
      
      fitToScreen: () => {
        editorRef.current?.zoomToFit();
      },
    }));

    const handleMount = (editor: Editor) => {
      editorRef.current = editor;
      
      // Load initial data if provided and valid
      if (initialData && initialData.type !== 'mermaid') {
        if (isValidTldrawData(initialData)) {
          try {
            editor.store.loadSnapshot(initialData);
          } catch (e) {
            console.warn('Failed to load diagram data:', e);
          }
        } else {
          console.warn('Incompatible diagram data, starting fresh');
        }
      }
      
      // Listen for document changes
      if (onChange) {
        editor.store.listen(onChange, { scope: 'document' });
      }
      
      // Listen for zoom changes
      if (onZoomChange) {
        onZoomChange(Math.round(editor.getZoomLevel() * 100));
        editor.store.listen(() => {
          onZoomChange(Math.round(editor.getZoomLevel() * 100));
        }, { scope: 'session' });
      }
      
      // Call external onMount handler
      onMount?.(editor);
    };

    return (
      <div className={className || 'w-full h-full'}>
        <Tldraw onMount={handleMount} />
      </div>
    );
  }
);

TldrawEditor.displayName = 'TldrawEditor';

export default TldrawEditor;
