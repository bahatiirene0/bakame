/**
 * Code Block Component
 *
 * Beautiful syntax-highlighted code blocks with:
 * - Language badge
 * - Copy button with feedback
 * - Line numbers (optional)
 * - Multiple theme support
 */

'use client';

import { useState, useCallback } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { motion, AnimatePresence } from 'framer-motion';

interface CodeBlockProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  className?: string;
}

// Language display names and colors
const languageConfig: Record<string, { name: string; color: string }> = {
  javascript: { name: 'JavaScript', color: 'bg-yellow-500' },
  js: { name: 'JavaScript', color: 'bg-yellow-500' },
  typescript: { name: 'TypeScript', color: 'bg-blue-500' },
  ts: { name: 'TypeScript', color: 'bg-blue-500' },
  tsx: { name: 'TSX', color: 'bg-blue-500' },
  jsx: { name: 'JSX', color: 'bg-yellow-500' },
  python: { name: 'Python', color: 'bg-green-500' },
  py: { name: 'Python', color: 'bg-green-500' },
  java: { name: 'Java', color: 'bg-red-500' },
  cpp: { name: 'C++', color: 'bg-blue-600' },
  c: { name: 'C', color: 'bg-gray-500' },
  csharp: { name: 'C#', color: 'bg-purple-500' },
  cs: { name: 'C#', color: 'bg-purple-500' },
  go: { name: 'Go', color: 'bg-cyan-500' },
  rust: { name: 'Rust', color: 'bg-orange-500' },
  ruby: { name: 'Ruby', color: 'bg-red-600' },
  php: { name: 'PHP', color: 'bg-indigo-500' },
  swift: { name: 'Swift', color: 'bg-orange-600' },
  kotlin: { name: 'Kotlin', color: 'bg-purple-600' },
  html: { name: 'HTML', color: 'bg-orange-500' },
  css: { name: 'CSS', color: 'bg-blue-500' },
  scss: { name: 'SCSS', color: 'bg-pink-500' },
  sql: { name: 'SQL', color: 'bg-amber-500' },
  json: { name: 'JSON', color: 'bg-gray-600' },
  yaml: { name: 'YAML', color: 'bg-red-400' },
  yml: { name: 'YAML', color: 'bg-red-400' },
  bash: { name: 'Bash', color: 'bg-gray-700' },
  sh: { name: 'Shell', color: 'bg-gray-700' },
  shell: { name: 'Shell', color: 'bg-gray-700' },
  markdown: { name: 'Markdown', color: 'bg-gray-500' },
  md: { name: 'Markdown', color: 'bg-gray-500' },
  text: { name: 'Text', color: 'bg-gray-400' },
  plaintext: { name: 'Text', color: 'bg-gray-400' },
};

export default function CodeBlock({
  code,
  language = 'text',
  showLineNumbers = false,
  className = '',
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const langConfig = languageConfig[language.toLowerCase()] || {
    name: language.toUpperCase(),
    color: 'bg-gray-500',
  };

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [code]);

  // Check if dark mode
  const isDark = typeof window !== 'undefined' &&
    document.documentElement.classList.contains('dark');

  return (
    <div
      className={`relative group rounded-xl overflow-hidden my-4 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 dark:bg-gray-900 border-b border-gray-700">
        {/* Language badge */}
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${langConfig.color}`} />
          <span className="text-xs font-medium text-gray-300">
            {langConfig.name}
          </span>
        </div>

        {/* Copy button */}
        <motion.button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium
            bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white
            transition-colors duration-200"
          whileTap={{ scale: 0.95 }}
        >
          <AnimatePresence mode="wait">
            {copied ? (
              <motion.span
                key="check"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1.5 text-green-400"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </motion.span>
            ) : (
              <motion.span
                key="copy"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Code content */}
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          language={language.toLowerCase()}
          style={oneDark}
          showLineNumbers={showLineNumbers}
          customStyle={{
            margin: 0,
            padding: '1rem',
            background: '#1e1e1e',
            fontSize: '0.875rem',
            lineHeight: '1.5',
          }}
          codeTagProps={{
            style: {
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
            },
          }}
          lineNumberStyle={{
            minWidth: '2.5em',
            paddingRight: '1em',
            color: '#6b7280',
            userSelect: 'none',
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

/**
 * Inline code component for single-line code
 */
export function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 rounded-md text-sm font-mono
      bg-gray-100 dark:bg-gray-800 text-pink-500 dark:text-pink-400
      border border-gray-200 dark:border-gray-700">
      {children}
    </code>
  );
}
