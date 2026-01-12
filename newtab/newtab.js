const STORAGE_KEY = 'tips_items';

class NewTabPage {
  constructor() {
    this.items = [];
    this.currentItem = null;
    this.currentIndex = -1;
    this.init();
  }

  async init() {
    await this.loadItems();
    this.bindEvents();
    this.showRandomItem();
  }

  async loadItems() {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    this.items = result[STORAGE_KEY] || [];
  }

  bindEvents() {
    const nextBtn = document.getElementById('nextBtn');
    const openTips = document.getElementById('openTips');
    const openTipsEmpty = document.getElementById('openTipsEmpty');
    
    if (nextBtn) nextBtn.addEventListener('click', () => this.showRandomItem());
    if (openTips) openTips.addEventListener('click', () => this.openTipsPopup());
    if (openTipsEmpty) openTipsEmpty.addEventListener('click', () => this.openTipsPopup());
  }

  showRandomItem() {
    if (this.items.length === 0) {
      this.showEmptyState();
      return;
    }

    let newIndex;
    if (this.items.length === 1) {
      newIndex = 0;
    } else {
      do {
        newIndex = Math.floor(Math.random() * this.items.length);
      } while (newIndex === this.currentIndex);
    }

    this.currentIndex = newIndex;
    this.currentItem = this.items[newIndex];
    this.renderItem(this.currentItem);
    this.updateStats();
  }

  renderItem(item) {
    const card = document.getElementById('card');
    const emptyState = document.getElementById('emptyState');
    
    if (card) card.classList.remove('hidden');
    if (emptyState) emptyState.classList.add('hidden');

    const contentEl = document.getElementById('content');
    if (contentEl) contentEl.innerHTML = this.formatContent(item.content);
    
    const dateEl = document.getElementById('date');
    if (dateEl) dateEl.textContent = this.formatDate(item.createdAt);
    
    const sourceEl = document.getElementById('source');
    if (sourceEl) {
      const host = this.extractHost(item.source);
      const favicon = `https://www.google.com/s2/favicons?domain=${host}&sz=32`;
      sourceEl.innerHTML = `
        <img class="source-icon" src="${favicon}" alt="" onerror="this.style.display='none'">
        <span class="source-text">${item.sourceTitle || host}</span>
      `;
    }

    const tagsEl = document.getElementById('tags');
    if (tagsEl) {
      tagsEl.innerHTML = (item.tags || [])
        .map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`)
        .join('');
    }

    const viewSourceBtn = document.getElementById('viewSource');
    if (viewSourceBtn) {
      viewSourceBtn.href = item.source || '#';
      viewSourceBtn.style.display = item.source ? 'inline-flex' : 'none';
    }
  }

  formatContent(content) {
    if (!content) return '<p class="loading">内容为空</p>';
    
    let html = this.escapeHtml(content);
    
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/```([\s\S]*?)```/g, '<pre>$1</pre>');
    
    html = html.split('\n\n').map(p => `<p>${p}</p>`).join('');
    html = html.replace(/<p><\/p>/g, '');
    
    return html || '<p class="loading">内容为空</p>';
  }

  formatDate(dateStr) {
    if (!dateStr) return '';
    
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '今天保存';
    if (days === 1) return '昨天保存';
    if (days < 7) return `${days} 天前保存`;
    if (days < 30) return `${Math.floor(days / 7)} 周前保存`;
    if (days < 365) return `${Math.floor(days / 30)} 个月前保存`;
    return `${Math.floor(days / 365)} 年前保存`;
  }

  extractHost(url) {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return '';
    }
  }

  showEmptyState() {
    const card = document.getElementById('card');
    const emptyState = document.getElementById('emptyState');
    const stats = document.getElementById('stats');
    
    if (card) card.classList.add('hidden');
    if (emptyState) emptyState.classList.remove('hidden');
    if (stats) stats.textContent = '';
  }

  updateStats() {
    const statsEl = document.getElementById('stats');
    if (statsEl) statsEl.textContent = `共 ${this.items.length} 条收藏`;
  }

  openTipsPopup() {
    chrome.action.openPopup().catch(() => {
      chrome.tabs.create({ url: chrome.runtime.getURL('popup/popup.html') });
    });
  }

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new NewTabPage();
});
