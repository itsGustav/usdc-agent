'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  showLineNumbers?: boolean;
}

export function CodeBlock({ code, language = 'bash', title, showLineNumbers = false }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split('\n');

  return (
    <div className="relative group">
      {title && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 rounded-t-lg">
          <span className="text-sm text-gray-400 font-mono">{title}</span>
          <span className="text-xs text-gray-500 uppercase">{language}</span>
        </div>
      )}
      <div className={cn(
        "relative bg-gray-900 border border-gray-800 overflow-x-auto",
        title ? "rounded-b-lg" : "rounded-lg"
      )}>
        <button
          onClick={handleCopy}
          className={cn(
            "absolute top-3 right-3 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
            "opacity-0 group-hover:opacity-100",
            copied 
              ? "bg-green-500/20 text-green-400 border border-green-500/30" 
              : "bg-gray-800 text-gray-400 hover:text-gray-300 hover:bg-gray-700 border border-gray-700"
          )}
        >
          {copied ? (
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </span>
          )}
        </button>
        <pre className="p-4 text-sm overflow-x-auto">
          <code className="font-mono text-gray-300">
            {showLineNumbers ? (
              <table className="w-full">
                <tbody>
                  {lines.map((line, i) => (
                    <tr key={i}>
                      <td className="pr-4 text-right text-gray-600 select-none" style={{ width: '1%' }}>
                        {i + 1}
                      </td>
                      <td className="text-gray-300">
                        {highlightSyntax(line, language)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              lines.map((line, i) => (
                <div key={i}>{highlightSyntax(line, language)}</div>
              ))
            )}
          </code>
        </pre>
      </div>
    </div>
  );
}

// Simple syntax highlighting
function highlightSyntax(line: string, language: string) {
  if (language === 'bash' || language === 'shell') {
    // Comments
    if (line.trim().startsWith('#')) {
      return <span className="text-gray-500">{line}</span>;
    }
    // Commands
    const parts = line.split(' ');
    return (
      <>
        <span className="text-blue-400">{parts[0]}</span>
        {parts.length > 1 && <span className="text-gray-300"> {parts.slice(1).join(' ')}</span>}
      </>
    );
  }

  if (language === 'json') {
    // Simple JSON highlighting
    return <span dangerouslySetInnerHTML={{ 
      __html: line
        .replace(/"([^"]+)":/g, '<span class="text-blue-400">"$1"</span>:')
        .replace(/: "([^"]+)"/g, ': <span class="text-green-400">"$1"</span>')
        .replace(/: (\d+)/g, ': <span class="text-orange-400">$1</span>')
        .replace(/: (true|false)/g, ': <span class="text-purple-400">$1</span>')
    }} />;
  }

  if (language === 'javascript' || language === 'typescript') {
    // Keywords
    const keywords = ['const', 'let', 'var', 'function', 'async', 'await', 'return', 'import', 'from', 'export', 'default'];
    let highlighted = line;
    keywords.forEach(keyword => {
      highlighted = highlighted.replace(new RegExp(`\\b${keyword}\\b`, 'g'), `<span class="text-purple-400">${keyword}</span>`);
    });
    return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
  }

  return <span>{line}</span>;
}
