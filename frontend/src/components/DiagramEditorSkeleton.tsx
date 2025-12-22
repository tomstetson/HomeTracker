/**
 * DiagramEditorSkeleton - Loading placeholder for diagram editors
 */

import { Loader2 } from 'lucide-react';

interface DiagramEditorSkeletonProps {
  type?: 'tldraw' | 'mermaid';
}

export default function DiagramEditorSkeleton({ type = 'tldraw' }: DiagramEditorSkeletonProps) {
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          Loading {type === 'mermaid' ? 'Mermaid' : 'diagram'} editor...
        </p>
      </div>
    </div>
  );
}
