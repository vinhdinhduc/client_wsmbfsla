import { Fragment, type ReactNode } from 'react';
import { safeChatHref } from '@/lib/chat-widget';

// Render a deliberately small Markdown subset as React text nodes. Raw HTML is
// never inserted; links are checked before creating an anchor.
function inline(text: string, depth = 0): ReactNode[] {
  if (depth > 3) return [text];
  const token =
    /(`[^`\n]+`|\*\*[^*\n]+\*\*|\[[^\]\n]+\]\([^\s)]+\)|https?:\/\/[^\s<>]+|(?:\+84|0)\d(?:[ .-]?\d){8,9}|1800[ .-]?\d{4}|1900[ .-]?\d{4})/g;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const match of text.matchAll(token)) {
    const index = match.index!;
    if (index > cursor) nodes.push(text.slice(cursor, index));
    const value = match[0];
    let node: ReactNode = value;
    if (value.startsWith('`')) node = <code>{value.slice(1, -1)}</code>;
    else if (value.startsWith('**'))
      node = <strong>{inline(value.slice(2, -2), depth + 1)}</strong>;
    else if (value.startsWith('[')) {
      const link = /^\[([^\]]+)\]\((.+)\)$/.exec(value)!;
      const href = safeChatHref(link[2]);
      if (href)
        node = (
          <a
            href={href}
            target={href.startsWith('tel:') ? undefined : '_blank'}
            rel="noopener noreferrer"
          >
            {link[1]}
          </a>
        );
    } else if (/^https?:/.test(value)) {
      const cleaned = value.replace(/[.,;!?]+$/, '');
      const href = safeChatHref(cleaned);
      if (href)
        node = (
          <>
            <a href={href} target="_blank" rel="noopener noreferrer">
              {cleaned}
            </a>
            {value.slice(cleaned.length)}
          </>
        );
    } else {
      const before = text[index - 1] || '';
      const after = text[index + value.length] || '';
      if (!/[\d\w]/.test(before) && !/[\d\w]/.test(after))
        node = <a href={`tel:${value.replace(/[^\d+]/g, '')}`}>{value}</a>;
    }
    nodes.push(<Fragment key={index}>{node}</Fragment>);
    cursor = index + value.length;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

export function ChatMarkdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  for (let index = 0; index < lines.length; ) {
    if (!lines[index].trim()) {
      index++;
      continue;
    }
    const list = /^(?:\s*[-*+]\s+|\s*\d+\.\s+)/;
    if (list.test(lines[index])) {
      const ordered = /^\s*\d+\./.test(lines[index]);
      const items: ReactNode[] = [];
      const start = index;
      while (
        index < lines.length &&
        list.test(lines[index]) &&
        /^\s*\d+\./.test(lines[index]) === ordered
      ) {
        items.push(<li key={index}>{inline(lines[index].replace(list, ''))}</li>);
        index++;
      }
      blocks.push(ordered ? <ol key={start}>{items}</ol> : <ul key={start}>{items}</ul>);
    } else {
      const start = index;
      const paragraph: ReactNode[] = [];
      while (index < lines.length && lines[index].trim() && !list.test(lines[index])) {
        if (paragraph.length) paragraph.push(<br key={`br-${index}`} />);
        paragraph.push(<Fragment key={index}>{inline(lines[index])}</Fragment>);
        index++;
      }
      blocks.push(<p key={start}>{paragraph}</p>);
    }
  }
  return <>{blocks}</>;
}
