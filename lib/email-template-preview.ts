export function escapeEmailText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function highlightEmailHtml(value: string): string {
  const escaped = escapeEmailText(value);
  return escaped
    .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="htmlComment">$1</span>')
    .replace(
      /(&lt;\/?)([a-z][a-z\d:-]*)([\s\S]*?)(\/??&gt;)/gi,
      (_tag, open, name, attrs, close) => {
        const highlightedAttrs = attrs.replace(
          /([a-z_:][\w:.-]*)(=)(&quot;[\s\S]*?&quot;|&#39;[\s\S]*?&#39;)/gi,
          '<span class="htmlAttribute">$1</span>$2<span class="htmlString">$3</span>',
        );
        return `<span class="htmlDelimiter">${open}</span><span class="htmlTag">${name}</span>${highlightedAttrs}<span class="htmlDelimiter">${close}</span>`;
      },
    )
    .replace(/{{\s*([a-z_]+)\s*}}/g, '<span class="htmlVariable">{{$1}}</span>');
}

export function findEmailVariables(value: string): string[] {
  const variables: string[] = [];
  const expression = /{{\s*([a-z_]+)\s*}}/g;
  let match: RegExpExecArray | null;
  while ((match = expression.exec(value)) !== null) variables.push(match[1]);
  return variables;
}

export function findUnsupportedEmailVariables(value: string, supported: string[]): string[] {
  const allowed = new Set(supported);
  return Array.from(
    new Set(findEmailVariables(value).filter((variable) => !allowed.has(variable))),
  );
}

export function replaceEmailVariables(value: string, data: Record<string, string>): string {
  const withRowsHidden = value.replace(/<(tr|blockquote|p)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, (block) => {
    const hasEmptyValue = findEmailVariables(block).some((key) => !String(data[key] ?? '').trim());
    return hasEmptyValue ? '' : block;
  });
  const withOptionalBlocksHidden = withRowsHidden.replace(
    /<table\b[^>]*>\s*<tbody>\s*<\/tbody>\s*<\/table>/gi,
    '',
  );
  if (typeof DOMParser !== 'undefined') {
    const document = new DOMParser().parseFromString(withOptionalBlocksHidden, 'text/html');
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let currentNode = walker.nextNode();
    while (currentNode) {
      textNodes.push(currentNode as Text);
      currentNode = walker.nextNode();
    }
    textNodes.forEach((textNode) => {
      const text = textNode.textContent || '';
      const expression = /{{\s*([a-z_]+)\s*}}/g;
      let match: RegExpExecArray | null;
      let offset = 0;
      const replacement = document.createDocumentFragment();
      while ((match = expression.exec(text)) !== null) {
        replacement.appendChild(document.createTextNode(text.slice(offset, match.index)));
        if (data[match[1]]) {
          replacement.appendChild(document.createTextNode(data[match[1]]));
        }
        offset = match.index + match[0].length;
      }
      if (offset > 0) {
        replacement.appendChild(document.createTextNode(text.slice(offset)));
        textNode.replaceWith(replacement);
      }
    });

    document.body.querySelectorAll('*').forEach((element) => {
      Array.from(element.attributes).forEach((attribute) => {
        if (!attribute.value.includes('{{')) return;
        const name = attribute.name.toLowerCase();
        if (name === 'style') {
          element.removeAttribute(attribute.name);
          return;
        }
        const value = attribute.value.replace(
          /{{\s*([a-z_]+)\s*}}/g,
          (_token, key: string) => data[key] || '',
        );
        if (name === 'href' && /^tel:/i.test(value)) {
          const number = value.slice(4).replace(/[^\d+*#]/g, '');
          if (number) element.setAttribute(attribute.name, `tel:${number}`);
          else element.removeAttribute(attribute.name);
        } else if ((name === 'href' || name === 'src') && !value.trim()) {
          element.removeAttribute(attribute.name);
        } else if (name === 'href' && /^(javascript|data|vbscript):/i.test(value.trim())) {
          element.removeAttribute(attribute.name);
        } else if (name === 'src' && !/^https?:\/\//i.test(value.trim())) {
          element.removeAttribute(attribute.name);
        } else {
          element.setAttribute(attribute.name, value);
        }
      });
    });
    return document.body.innerHTML;
  }
  return withOptionalBlocksHidden.replace(/{{\s*([a-z_]+)\s*}}/g, (_token, key: string) => {
    return escapeEmailText(data[key] || '');
  });
}

export function insertAtSelection(
  value: string,
  start: number,
  end: number,
  insertion: string,
): { value: string; cursor: number } {
  const safeStart = Math.max(0, Math.min(start, value.length));
  const safeEnd = Math.max(safeStart, Math.min(end, value.length));
  return {
    value: `${value.slice(0, safeStart)}${insertion}${value.slice(safeEnd)}`,
    cursor: safeStart + insertion.length,
  };
}

export function createDebouncer<T>(callback: (value: T) => void, delay = 300) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const schedule = (value: T) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => callback(value), delay);
  };
  schedule.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
  };
  return schedule;
}

const allowedTags = new Set([
  'A',
  'B',
  'BLOCKQUOTE',
  'BR',
  'CAPTION',
  'CODE',
  'DIV',
  'EM',
  'H1',
  'H2',
  'H3',
  'H4',
  'HR',
  'I',
  'IMG',
  'LI',
  'OL',
  'P',
  'PRE',
  'SPAN',
  'STRONG',
  'TABLE',
  'TBODY',
  'TD',
  'TFOOT',
  'TH',
  'THEAD',
  'TR',
  'U',
  'UL',
]);
const allowedAttributes = new Set([
  'align',
  'alt',
  'bgcolor',
  'border',
  'cellpadding',
  'cellspacing',
  'class',
  'colspan',
  'height',
  'href',
  'role',
  'rowspan',
  'src',
  'style',
  'target',
  'title',
  'valign',
  'width',
]);

export function sanitizeEmailHtml(value: string): string {
  if (typeof DOMParser === 'undefined') {
    return value
      .replace(
        /<(script|iframe|object|embed|form|svg|math|style|link|meta|base)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,
        '',
      )
      .replace(/\s(on[a-z]+|srcdoc)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/\s(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, '');
  }

  const document = new DOMParser().parseFromString(value, 'text/html');
  document
    .querySelectorAll('script,iframe,object,embed,form,svg,math,style,link,meta,base')
    .forEach((node) => node.remove());
  document.body.querySelectorAll('*').forEach((element) => {
    if (!allowedTags.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes));
      return;
    }
    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const content = attribute.value.trim();
      if (!allowedAttributes.has(name) || name.startsWith('on') || name === 'srcdoc') {
        element.removeAttribute(attribute.name);
        return;
      }
      if (name === 'href' || name === 'src') {
        if (/^(javascript|data|vbscript):/i.test(content)) element.removeAttribute(attribute.name);
      }
      if (
        name === 'style' &&
        /(url\s*\(|expression\s*\(|@import|javascript:|-moz-binding)/i.test(content)
      ) {
        element.removeAttribute(attribute.name);
      }
    });
  });
  return document.body.innerHTML;
}
