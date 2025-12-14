/**
 * Message Renderer Component
 *
 * Enhanced markdown renderer with:
 * - Syntax-highlighted code blocks
 * - Beautiful tables (GFM)
 * - Math/LaTeX rendering (KaTeX)
 * - Inline code styling
 * - Links that open in new tabs
 * - List styling
 * - Blockquote styling
 * - HTML support in markdown (for <br> tags etc)
 */

'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import type { Components } from 'react-markdown';
import CodeBlock, { InlineCode } from './CodeBlock';
import { Table, TableHead, TableBody, TableRow, TableCell } from './TableRenderer';

// Import KaTeX CSS
import 'katex/dist/katex.min.css';

interface MessageRendererProps {
  content: string;
  className?: string;
}

export default function MessageRenderer({ content, className = '' }: MessageRendererProps) {
  const components: Components = {
    // Code blocks with syntax highlighting
    code({ node, className: codeClassName, children, ...props }) {
      const match = /language-(\w+)/.exec(codeClassName || '');
      const isInline = !match && !String(children).includes('\n');

      if (isInline) {
        return <InlineCode>{children}</InlineCode>;
      }

      return (
        <CodeBlock
          code={String(children).replace(/\n$/, '')}
          language={match ? match[1] : 'text'}
          showLineNumbers={String(children).split('\n').length > 5}
        />
      );
    },

    // Pre tag (wrapper for code blocks)
    pre({ children }) {
      return <>{children}</>;
    },

    // Tables
    table({ children }) {
      return <Table>{children}</Table>;
    },
    thead({ children }) {
      return <TableHead>{children}</TableHead>;
    },
    tbody({ children }) {
      return <TableBody>{children}</TableBody>;
    },
    tr({ children }) {
      return <TableRow>{children}</TableRow>;
    },
    th({ children }) {
      return <TableCell isHeader>{children}</TableCell>;
    },
    td({ children }) {
      return <TableCell>{children}</TableCell>;
    },

    // Links
    a({ href, children }) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300
            underline underline-offset-2 decoration-blue-500/30 hover:decoration-blue-500
            transition-colors"
        >
          {children}
        </a>
      );
    },

    // Paragraphs
    p({ children }) {
      return (
        <p className="mb-4 last:mb-0 leading-relaxed text-gray-800 dark:text-gray-200">
          {children}
        </p>
      );
    },

    // Headings
    h1({ children }) {
      return (
        <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0 text-gray-900 dark:text-white">
          {children}
        </h1>
      );
    },
    h2({ children }) {
      return (
        <h2 className="text-xl font-bold mb-3 mt-5 first:mt-0 text-gray-900 dark:text-white">
          {children}
        </h2>
      );
    },
    h3({ children }) {
      return (
        <h3 className="text-lg font-semibold mb-2 mt-4 first:mt-0 text-gray-900 dark:text-white">
          {children}
        </h3>
      );
    },
    h4({ children }) {
      return (
        <h4 className="text-base font-semibold mb-2 mt-3 first:mt-0 text-gray-900 dark:text-white">
          {children}
        </h4>
      );
    },

    // Lists
    ul({ children }) {
      return (
        <ul className="mb-4 ml-6 space-y-1 list-disc marker:text-gray-400 dark:marker:text-gray-500">
          {children}
        </ul>
      );
    },
    ol({ children }) {
      return (
        <ol className="mb-4 ml-6 space-y-1 list-decimal marker:text-gray-500 dark:marker:text-gray-400">
          {children}
        </ol>
      );
    },
    li({ children }) {
      return (
        <li className="text-gray-700 dark:text-gray-300 pl-1">
          {children}
        </li>
      );
    },

    // Blockquotes
    blockquote({ children }) {
      return (
        <blockquote className="border-l-4 border-blue-500 dark:border-blue-400 pl-4 py-1 my-4
          bg-blue-50 dark:bg-blue-500/10 rounded-r-lg italic text-gray-700 dark:text-gray-300">
          {children}
        </blockquote>
      );
    },

    // Horizontal rule
    hr() {
      return (
        <hr className="my-6 border-gray-200 dark:border-gray-700" />
      );
    },

    // Strong/Bold
    strong({ children }) {
      return (
        <strong className="font-semibold text-gray-900 dark:text-white">
          {children}
        </strong>
      );
    },

    // Emphasis/Italic
    em({ children }) {
      return (
        <em className="italic text-gray-700 dark:text-gray-300">
          {children}
        </em>
      );
    },

    // Images
    img({ src, alt }) {
      return (
        <img
          src={src}
          alt={alt || ''}
          className="rounded-xl my-4 max-w-full h-auto shadow-md"
          loading="lazy"
        />
      );
    },
  };

  return (
    <div className={`prose prose-gray dark:prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
