"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function LogViewer({ content }: { content: string }) {
  return (
    <div className="prose prose-invert max-w-none text-sm leading-relaxed text-gray-200">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-purple-300 mb-4 mt-2 pb-2 border-b border-gray-700">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold text-blue-300 mb-3 mt-6 flex items-center gap-2">
              👉 {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-md font-bold text-green-300 mb-2 mt-3">
              {children}
            </h3>
          ),
          ul: ({ children }) => (
            <ul className="list-disc ml-5 space-y-1 text-gray-300 my-2">
              {children}
            </ul>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          strong: ({ children }) => (
            <strong className="text-yellow-200 font-semibold bg-yellow-900/20 px-1 rounded">
              {children}
            </strong>
          ),
          code: ({ children }) => (
            <code className="bg-gray-900 px-1.5 py-0.5 rounded text-pink-300 font-mono text-xs border border-gray-700">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="bg-black/50 p-4 rounded-lg overflow-x-auto border border-gray-700 my-4 shadow-inner">
              {children}
            </pre>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
