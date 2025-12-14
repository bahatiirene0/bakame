/**
 * Streaming Renderer Component
 *
 * Uses flowtoken for smooth word-by-word animations during streaming,
 * then switches to Streamdown for complete messages (with full math/table support)
 */

'use client';

import { useEffect, useRef } from 'react';
import { AnimatedMarkdown } from 'flowtoken';
import { Streamdown } from 'streamdown';
import 'flowtoken/dist/styles.css';
import './streaming.css';

interface StreamingRendererProps {
  content: string;
  isStreaming: boolean;
  className?: string;
}

export default function StreamingRenderer({
  content,
  isStreaming,
  className = '',
}: StreamingRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll during streaming
  useEffect(() => {
    if (isStreaming && containerRef.current) {
      const parent = containerRef.current.closest('.overflow-y-auto');
      if (parent) {
        parent.scrollTop = parent.scrollHeight;
      }
    }
  }, [content, isStreaming]);

  return (
    <div
      ref={containerRef}
      className={`streaming-renderer ${isStreaming ? 'is-streaming' : ''} ${className}`}
    >
      {isStreaming ? (
        // During streaming: use flowtoken for smooth word fade-in animation
        <AnimatedMarkdown
          content={content}
          sep="word"
          animation="fadeIn"
          animationDuration="0.3s"
          animationTimingFunction="ease-out"
        />
      ) : (
        // After streaming: use Streamdown for full math/table rendering
        <Streamdown mode="static">{content}</Streamdown>
      )}

      {/* Animated cursor while streaming */}
      {isStreaming && (
        <span className="streaming-cursor" aria-hidden="true" />
      )}
    </div>
  );
}
