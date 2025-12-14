/**
 * CodeOutputCard Component
 *
 * Displays code execution results in chat with:
 * - Syntax highlighted code
 * - Output/error display
 * - Copy code button
 * - Language and version info
 */

'use client';

import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

interface CodeOutputCardProps {
  code: string;
  language: string;
  version?: string;
  output: string;
  error?: string | null;
  exitCode?: number;
}

export default function CodeOutputCard({
  code,
  language,
  version,
  output,
  error,
  exitCode = 0,
}: CodeOutputCardProps) {
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(true);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const isError = exitCode !== 0 || !!error;

  // Map language names for syntax highlighter
  const syntaxLanguage = language === 'cpp' ? 'cpp' : language;

  return (
    <div className="rounded-xl overflow-hidden bg-gray-900 border border-gray-700 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          {/* Language Icon */}
          <span className="text-lg">
            {language === 'python' && '🐍'}
            {language === 'javascript' && '💛'}
            {language === 'typescript' && '💙'}
            {language === 'java' && '☕'}
            {language === 'go' && '🔷'}
            {language === 'rust' && '🦀'}
            {language === 'ruby' && '💎'}
            {language === 'php' && '🐘'}
            {(language === 'c' || language === 'cpp') && '⚙️'}
          </span>
          <span className="text-sm font-medium text-gray-300 capitalize">
            {language}
          </span>
          {version && (
            <span className="text-xs text-gray-500">v{version}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle Code/Output */}
          <button
            onClick={() => setShowCode(!showCode)}
            className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
          >
            {showCode ? 'Hide Code' : 'Show Code'}
          </button>
          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
            title="Copy code"
          >
            {copied ? (
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Code Section */}
      {showCode && (
        <div className="max-h-64 overflow-auto">
          <SyntaxHighlighter
            language={syntaxLanguage}
            style={oneDark}
            customStyle={{
              margin: 0,
              padding: '1rem',
              fontSize: '0.875rem',
              background: 'transparent',
            }}
            showLineNumbers
          >
            {code}
          </SyntaxHighlighter>
        </div>
      )}

      {/* Output Section */}
      <div className={`border-t ${isError ? 'border-red-500/50' : 'border-gray-700'}`}>
        <div className={`px-4 py-2 text-xs font-medium flex items-center gap-2 ${
          isError ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'
        }`}>
          {isError ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Error (exit code: {exitCode})
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Output
            </>
          )}
        </div>
        <div className={`px-4 py-3 font-mono text-sm max-h-48 overflow-auto ${
          isError ? 'bg-red-950/20 text-red-300' : 'bg-gray-950 text-gray-200'
        }`}>
          <pre className="whitespace-pre-wrap break-words">
            {isError && error ? error : output}
          </pre>
        </div>
      </div>
    </div>
  );
}
