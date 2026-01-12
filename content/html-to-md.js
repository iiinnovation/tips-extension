/**
 * HTML to Markdown Converter
 * Converts selected HTML content to clean Markdown format
 */

const HtmlToMd = {
  /**
   * Convert HTML string to Markdown
   * @param {string} html - HTML content
   * @param {string} plainText - Plain text fallback
   * @returns {string} Markdown formatted content
   */
  convert(html, plainText) {
    if (!html || html.trim() === plainText?.trim()) {
      return this.escapeMarkdown(plainText || '');
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Clean up scripts and styles
    doc.querySelectorAll('script, style, noscript').forEach(el => el.remove());
    
    return this.processNode(doc.body).trim();
  },

  /**
   * Process a DOM node recursively
   * @param {Node} node - DOM node to process
   * @returns {string} Markdown content
   */
  processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return this.escapeMarkdown(node.textContent);
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const tag = node.tagName.toLowerCase();
    const children = Array.from(node.childNodes)
      .map(child => this.processNode(child))
      .join('');

    switch (tag) {
      // Headings
      case 'h1': return `\n# ${children.trim()}\n\n`;
      case 'h2': return `\n## ${children.trim()}\n\n`;
      case 'h3': return `\n### ${children.trim()}\n\n`;
      case 'h4': return `\n#### ${children.trim()}\n\n`;
      case 'h5': return `\n##### ${children.trim()}\n\n`;
      case 'h6': return `\n###### ${children.trim()}\n\n`;

      // Text formatting
      case 'strong':
      case 'b':
        return `**${children.trim()}**`;
      case 'em':
      case 'i':
        return `*${children.trim()}*`;
      case 'u':
        return `<u>${children}</u>`;
      case 's':
      case 'del':
      case 'strike':
        return `~~${children.trim()}~~`;
      case 'code':
        return `\`${node.textContent}\``;
      case 'mark':
        return `==${children.trim()}==`;

      // Links and images
      case 'a': {
        const href = node.getAttribute('href') || '';
        const text = children.trim() || href;
        if (!href || href.startsWith('javascript:')) {
          return text;
        }
        return `[${text}](${href})`;
      }
      case 'img': {
        const src = node.getAttribute('src') || '';
        const alt = node.getAttribute('alt') || 'image';
        if (!src) return '';
        return `![${alt}](${src})`;
      }

      // Lists
      case 'ul':
        return '\n' + this.processList(node, '- ') + '\n';
      case 'ol':
        return '\n' + this.processList(node, null) + '\n';
      case 'li':
        return children;

      // Block elements
      case 'p':
        return `\n${children.trim()}\n\n`;
      case 'br':
        return '\n';
      case 'hr':
        return '\n---\n\n';
      case 'blockquote':
        return '\n' + children.trim().split('\n').map(line => `> ${line}`).join('\n') + '\n\n';

      // Code blocks
      case 'pre': {
        const codeEl = node.querySelector('code');
        const code = codeEl ? codeEl.textContent : node.textContent;
        const lang = this.detectLanguage(node);
        return `\n\`\`\`${lang}\n${code.trim()}\n\`\`\`\n\n`;
      }

      // Tables
      case 'table':
        return '\n' + this.processTable(node) + '\n';

      // Divs and spans - just return children
      case 'div':
        return children + '\n';
      case 'span':
        return children;

      // Default - return children
      default:
        return children;
    }
  },

  /**
   * Process list elements
   * @param {Element} listEl - ul or ol element
   * @param {string|null} bullet - bullet character or null for numbered
   * @returns {string} Markdown list
   */
  processList(listEl, bullet) {
    const items = Array.from(listEl.children).filter(el => el.tagName.toLowerCase() === 'li');
    return items.map((item, index) => {
      const prefix = bullet || `${index + 1}. `;
      const content = this.processNode(item).trim();
      return `${prefix}${content}`;
    }).join('\n');
  },

  /**
   * Process table to Markdown
   * @param {Element} tableEl - table element
   * @returns {string} Markdown table
   */
  processTable(tableEl) {
    const rows = Array.from(tableEl.querySelectorAll('tr'));
    if (rows.length === 0) return '';

    const result = [];
    
    rows.forEach((row, rowIndex) => {
      const cells = Array.from(row.querySelectorAll('th, td'));
      const rowContent = cells.map(cell => this.processNode(cell).trim()).join(' | ');
      result.push(`| ${rowContent} |`);
      
      // Add separator after header row
      if (rowIndex === 0) {
        const separator = cells.map(() => '---').join(' | ');
        result.push(`| ${separator} |`);
      }
    });

    return result.join('\n');
  },

  /**
   * Detect programming language from code block
   * @param {Element} preEl - pre element
   * @returns {string} language identifier
   */
  detectLanguage(preEl) {
    const codeEl = preEl.querySelector('code');
    if (!codeEl) return '';

    // Check class names for language hints
    const classes = [...preEl.classList, ...codeEl.classList];
    for (const cls of classes) {
      const match = cls.match(/^(?:language-|lang-|hljs-)?([\w-]+)$/);
      if (match && this.isValidLanguage(match[1])) {
        return match[1];
      }
    }

    // Check data attributes
    const dataLang = preEl.dataset.language || codeEl.dataset.language;
    if (dataLang) return dataLang;

    return '';
  },

  /**
   * Check if a string is a valid language identifier
   * @param {string} lang - language string
   * @returns {boolean}
   */
  isValidLanguage(lang) {
    const validLangs = [
      'javascript', 'js', 'typescript', 'ts', 'python', 'py', 'java', 'cpp', 'c',
      'csharp', 'cs', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala',
      'html', 'css', 'scss', 'sass', 'less', 'json', 'yaml', 'yml', 'xml',
      'sql', 'bash', 'shell', 'sh', 'zsh', 'powershell', 'dockerfile',
      'markdown', 'md', 'plaintext', 'text', 'diff', 'git'
    ];
    return validLangs.includes(lang.toLowerCase());
  },

  /**
   * Escape special Markdown characters in plain text
   * @param {string} text - plain text
   * @returns {string} escaped text
   */
  escapeMarkdown(text) {
    if (!text) return '';
    // Only escape characters that would create unintended formatting
    // Be conservative to avoid over-escaping
    return text
      .replace(/\\/g, '\\\\')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]');
  },

  /**
   * Generate frontmatter for saved content
   * @param {Object} metadata - content metadata
   * @returns {string} YAML frontmatter
   */
  generateFrontmatter(metadata) {
    const { source, savedAt, tags } = metadata;
    const lines = ['---'];
    
    if (source) lines.push(`source: ${source}`);
    if (savedAt) lines.push(`saved_at: ${savedAt}`);
    if (tags && tags.length > 0) {
      lines.push(`tags: [${tags.join(', ')}]`);
    }
    
    lines.push('---', '');
    return lines.join('\n');
  }
};

// Make available globally
if (typeof window !== 'undefined') {
  window.HtmlToMd = HtmlToMd;
}
