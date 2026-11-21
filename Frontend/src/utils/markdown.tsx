import React from 'react';

function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const tokenRe = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = tokenRe.exec(text)) !== null) {
    if (match.index > lastIdx) {
      nodes.push(text.slice(lastIdx, match.index));
    }
    const token = match[0];
    const key = `${keyPrefix}-${idx++}`;
    if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(
        <strong key={key} className="font-semibold text-current">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(
        <code
          key={key}
          className="rounded bg-slate-200/80 px-1.5 py-0.5 font-mono text-[12px] text-cyan-800 dark:bg-slate-800 dark:text-cyan-300"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('[')) {
      const m = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (m && isSafeHttpUrl(m[2])) {
        nodes.push(
          <a
            key={key}
            href={m[2].trim()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-600 underline hover:text-cyan-500 dark:text-cyan-400"
          >
            {m[1]}
          </a>
        );
      } else {
        nodes.push(m ? m[1] : token);
      }
    }
    lastIdx = match.index + token.length;
  }

  if (lastIdx < text.length) {
    nodes.push(text.slice(lastIdx));
  }
  return nodes;
}

export const SafeMarkdown: React.FC<{ content: string; className?: string }> = ({
  content,
  className = '',
}) => {
  const lines = String(content || '').split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];

  const flushList = (key: string) => {
    if (listItems.length === 0) return;
    elements.push(
      <ul key={key} className="list-disc pl-5 space-y-1.5 text-sm leading-relaxed">
        {listItems.map((item, idx) => (
          <li key={`${key}-li-${idx}`}>{renderInline(item, `${key}-li-${idx}`)}</li>
        ))}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((rawLine, i) => {
    const line = rawLine.trimEnd();
    if (line.trim().startsWith('```')) {
      flushList(`list-${i}`);
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLines = [];
      } else {
        inCodeBlock = false;
        elements.push(
          <pre
            key={`code-${i}`}
            className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-950 p-3.5 font-mono text-xs text-cyan-200 dark:border-slate-800"
          >
            <code>{codeLines.join('\n')}</code>
          </pre>
        );
        codeLines = [];
      }
      return;
    }

    if (inCodeBlock) {
      codeLines.push(rawLine);
      return;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      flushList(`list-${i}`);
      return;
    }

    if (trimmed.startsWith('### ')) {
      flushList(`list-${i}`);
      elements.push(
        <h3 key={`h3-${i}`} className="font-display text-base font-bold pt-1">
          {renderInline(trimmed.slice(4), `h3-${i}`)}
        </h3>
      );
      return;
    }
    if (trimmed.startsWith('## ')) {
      flushList(`list-${i}`);
      elements.push(
        <h2 key={`h2-${i}`} className="font-display text-lg font-bold pt-1">
          {renderInline(trimmed.slice(3), `h2-${i}`)}
        </h2>
      );
      return;
    }
    if (trimmed.startsWith('# ')) {
      flushList(`list-${i}`);
      elements.push(
        <h1 key={`h1-${i}`} className="font-display text-xl font-extrabold pt-1">
          {renderInline(trimmed.slice(2), `h1-${i}`)}
        </h1>
      );
      return;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      listItems.push(trimmed.slice(2));
      return;
    }

    flushList(`list-${i}`);
    elements.push(
      <p key={`p-${i}`} className="text-sm leading-relaxed">
        {renderInline(trimmed, `p-${i}`)}
      </p>
    );
  });

  flushList('list-end');

  return <div className={`space-y-3 ${className}`}>{elements}</div>;
};
