import React from 'react';

const formatMessageText = (text) => {
  if (!text) return null;

  const formatInlineMarkdown = (str) => {
    const parts = [];
    let lastIndex = 0;
    let boldRegex = /\*\*(.+?)\*\*/g;
    let italicRegex = /\*(.+?)\*/g;
    let match;

    const allMatches = [];
    
    while ((match = boldRegex.exec(str)) !== null) {
      allMatches.push({ type: 'bold', start: match.index, end: match.index + match[0].length, content: match[1] });
    }
    
    while ((match = italicRegex.exec(str)) !== null) {
      const isBold = allMatches.some(m => m.start <= match.index && m.end >= match.index + match[0].length);
      if (!isBold) {
        allMatches.push({ type: 'italic', start: match.index, end: match.index + match[0].length, content: match[1] });
      }
    }

    allMatches.sort((a, b) => a.start - b.start);

    allMatches.forEach((match, idx) => {
      if (match.start > lastIndex) {
        parts.push(str.substring(lastIndex, match.start));
      }
      if (match.type === 'bold') {
        parts.push(<strong key={`bold-${idx}`}>{match.content}</strong>);
      } else if (match.type === 'italic') {
        parts.push(<em key={`italic-${idx}`}>{match.content}</em>);
      }
      lastIndex = match.end;
    });

    if (lastIndex < str.length) {
      parts.push(str.substring(lastIndex));
    }

    return parts.length > 0 ? <>{parts}</> : str;
  };

  const lines = text.split('\n');
  const elements = [];
  let listType = null;
  let listItems = [];

  const flushList = () => {
    if (listItems.length > 0) {
      if (listType === 'bullet') {
        elements.push(
          <ul key={`list-${elements.length}`} className="list-disc list-outside space-y-1.5 my-2 ml-6 pl-2">
            {listItems.map((item, idx) => (
              <li key={idx} className="pl-1">{formatInlineMarkdown(item.trim())}</li>
            ))}
          </ul>
        );
      } else if (listType === 'numbered') {
        elements.push(
          <ol key={`list-${elements.length}`} className="list-decimal list-outside space-y-1.5 my-2 ml-6 pl-2">
            {listItems.map((item, idx) => (
              <li key={idx} className="pl-1">{formatInlineMarkdown(item.trim())}</li>
            ))}
          </ol>
        );
      }
      listItems = [];
      listType = null;
    }
  };

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith('- ')) {
      if (listType !== 'bullet') {
        flushList();
        listType = 'bullet';
      }
      listItems.push(trimmedLine.substring(2).trim());
    } else if (/^\d+\.\s/.test(trimmedLine)) {
      if (listType !== 'numbered') {
        flushList();
        listType = 'numbered';
      }
      const match = trimmedLine.match(/^\d+\.\s+(.+)$/) || trimmedLine.match(/^\d+\.\s(.+)$/);
      if (match && match[1]) {
        listItems.push(match[1].trim());
      } else {
        listItems.push('');
      }
    } else if (/^\*\*[^*]+:\*\*/.test(trimmedLine)) {
      flushList();
      const titleMatch = trimmedLine.match(/^\*\*([^*]+?):\*\*\s*(.*)$/);
      if (titleMatch) {
        const titleText = titleMatch[1];
        const titleContent = titleMatch[2].trim();
        elements.push(
          <div key={`title-${index}`} className="mt-4 mb-2 first:mt-0">
            <strong className="font-semibold">{titleText}:</strong>
            {titleContent && <span className="ml-1">{formatInlineMarkdown(titleContent)}</span>}
          </div>
        );
      } else {
        const titleText = trimmedLine.replace(/^\*\*|\*\*$/g, '');
        elements.push(
          <div key={`title-${index}`} className="mt-4 mb-2 first:mt-0">
            <strong className="font-semibold">{formatInlineMarkdown(titleText)}</strong>
          </div>
        );
      }
    } else {
      flushList();
      if (trimmedLine) {
        elements.push(
          <span key={`line-${index}`} className="block">
            {formatInlineMarkdown(trimmedLine)}
          </span>
        );
      } else if (index < lines.length - 1) {
        elements.push(<br key={`br-${index}`} />);
      }
    }
  });

  flushList();

  return elements.length > 0 ? <>{elements}</> : text;
};

export default formatMessageText;

