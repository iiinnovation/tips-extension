class TipsPopup {
  constructor() {
    this.items = [];
    this.tags = [];
    this.currentFilter = { type: 'all' };
    this.currentItemId = null;
    this.editingTags = [];
    this.reviewItem = null;
    
    this.init();
  }

  async init() {
    try {
      await this.loadData();
      this.bindEvents();
      this.render();
      this.showReviewCard();
      this.checkStorageWarning();
    } catch (error) {
      console.error('Tips: Init error', error);
    }
  }

  async loadData() {
    try {
      this.items = await this.sendMessage({ type: 'GET_ITEMS' }) || [];
      this.tags = await this.sendMessage({ type: 'GET_TAGS' }) || [];
    } catch (error) {
      console.error('Tips: Load data error', error);
      this.items = [];
      this.tags = [];
    }
  }

  sendMessage(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Tips: Message error', chrome.runtime.lastError);
          resolve(null);
        } else {
          resolve(response);
        }
      });
    });
  }

  bindEvents() {
    this.addEvent('searchInput', 'input', this.debounce(() => this.handleSearch(), 300));
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleFilterClick(e));
    });

    this.addEvent('exportBtn', 'click', () => this.handleExport());
    this.addEvent('settingsBtn', 'click', () => this.showSettingsModal());
    this.addEvent('closeSettings', 'click', () => this.hideModal('settingsModal'));
    this.addEvent('closeDetail', 'click', () => this.hideModal('detailModal'));
    this.addEvent('closeTagEdit', 'click', () => this.hideModal('tagEditModal'));

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        if (modal) this.hideModal(modal.id);
      });
    });

    this.addEvent('copyContentBtn', 'click', () => this.copyCurrentContent());
    this.addEvent('editTagsBtn', 'click', () => this.showTagEditModal());
    this.addEvent('deleteItemBtn', 'click', () => this.deleteCurrentItem());

    this.addEvent('newTagInput', 'keydown', (e) => {
      if (e.key === 'Enter') this.addNewTag();
    });
    this.addEvent('saveTagsBtn', 'click', () => this.saveTags());

    this.addEvent('clearAllBtn', 'click', () => this.clearAllData());
    this.addEvent('cleanupBtn', 'click', () => this.runCleanup());

    this.addEvent('reviewNext', 'click', () => this.showReviewCard(true));
    this.addEvent('reviewDismiss', 'click', () => this.dismissReview());

    this.addEvent('maxItems', 'change', (e) => this.updateSetting('maxItems', parseInt(e.target.value)));
    this.addEvent('autoCleanupDays', 'change', (e) => this.updateSetting('autoCleanupDays', parseInt(e.target.value)));
  }

  addEvent(id, event, handler) {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener(event, handler);
    }
  }

  async handleSearch() {
    const input = document.getElementById('searchInput');
    const query = input ? input.value.trim() : '';
    
    if (query) {
      this.items = await this.sendMessage({ type: 'SEARCH', data: { query } }) || [];
    } else {
      this.items = await this.sendMessage({ type: 'GET_ITEMS' }) || [];
    }
    this.renderItems();
  }

  handleFilterClick(e) {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;

    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const filter = btn.dataset.filter;
    this.currentFilter = { type: filter };
    this.applyFilter();
  }

  async applyFilter() {
    let filterParam = {};
    
    if (this.currentFilter.type === 'today') {
      filterParam.dateRange = 'today';
    } else if (this.currentFilter.type === 'week') {
      filterParam.dateRange = 'week';
    } else if (this.currentFilter.type === 'tag') {
      filterParam.tag = this.currentFilter.tag;
    }

    if (Object.keys(filterParam).length > 0) {
      this.items = await this.sendMessage({ type: 'FILTER', data: { filter: filterParam } }) || [];
    } else {
      this.items = await this.sendMessage({ type: 'GET_ITEMS' }) || [];
    }
    
    this.renderItems();
  }

  render() {
    this.renderItems();
    this.renderTags();
    this.updateItemCount();
  }

  renderItems() {
    const container = document.getElementById('contentList');
    const emptyState = document.getElementById('emptyState');
    
    if (!container) return;

    container.innerHTML = '';

    if (this.items.length === 0) {
      if (emptyState) {
        emptyState.classList.remove('hidden');
        container.appendChild(emptyState);
      }
      return;
    }

    if (emptyState) {
      emptyState.classList.add('hidden');
    }
    
    container.innerHTML = this.items.map(item => this.renderItemCard(item)).join('');
    
    container.querySelectorAll('.item-card').forEach(card => {
      card.addEventListener('click', () => this.showDetailModal(card.dataset.id));
    });

    this.updateItemCount();
  }

  renderItemCard(item) {
    const date = new Date(item.createdAt);
    const dateStr = this.formatDate(date);
    const preview = this.getPreview(item.content, 120);
    const sourceHost = this.extractHost(item.source);
    const tags = (item.tags || []).slice(0, 3);

    return `
      <div class="item-card" data-id="${item.id}">
        <div class="item-header">
          <span class="item-source">${sourceHost}</span>
          <span class="item-date">${dateStr}</span>
        </div>
        <div class="item-preview">${this.escapeHtml(preview)}</div>
        <div class="item-tags">
          ${tags.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}
          ${item.tags?.length > 3 ? `<span class="tag tag-more">+${item.tags.length - 3}</span>` : ''}
        </div>
      </div>
    `;
  }

  renderTags() {
    const container = document.getElementById('tagFilter');
    if (!container) return;
    
    container.innerHTML = this.tags.map(tag => `
      <button class="tag-btn ${this.currentFilter.type === 'tag' && this.currentFilter.tag === tag ? 'active' : ''}" 
              data-tag="${this.escapeHtml(tag)}">
        ${this.escapeHtml(tag)}
      </button>
    `).join('');

    container.querySelectorAll('.tag-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tag = btn.dataset.tag;
        document.querySelectorAll('.filter-btn, .tag-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentFilter = { type: 'tag', tag };
        this.applyFilter();
      });
    });
  }

  updateItemCount() {
    const el = document.getElementById('itemCount');
    if (el) {
      el.textContent = `${this.items.length} 条`;
    }
  }

  async showDetailModal(id) {
    const item = this.items.find(i => i.id === id);
    if (!item) return;

    this.currentItemId = id;

    const date = new Date(item.createdAt);
    const detailMeta = document.getElementById('detailMeta');
    if (detailMeta) {
      detailMeta.innerHTML = `
        <div class="meta-row">
          <span class="meta-label">来源</span>
          <a href="${item.source}" target="_blank" class="meta-value link">${this.escapeHtml(item.sourceTitle || item.source)}</a>
        </div>
        <div class="meta-row">
          <span class="meta-label">保存时间</span>
          <span class="meta-value">${this.formatDateTime(date)}</span>
        </div>
      `;
    }

    const detailTags = document.getElementById('detailTags');
    if (detailTags) {
      detailTags.innerHTML = (item.tags || [])
        .map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`)
        .join('');
    }

    const detailContent = document.getElementById('detailContent');
    if (detailContent) {
      detailContent.innerHTML = `<pre>${this.escapeHtml(item.content)}</pre>`;
    }

    this.showModal('detailModal');
  }

  showModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }
  }

  hideModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.add('hidden');
      document.body.style.overflow = '';
    }
  }

  async showSettingsModal() {
    const settings = await this.sendMessage({ type: 'GET_SETTINGS' });
    if (!settings) return;

    const maxItemsEl = document.getElementById('maxItems');
    const autoCleanupEl = document.getElementById('autoCleanupDays');
    
    if (maxItemsEl) maxItemsEl.value = settings.maxItems;
    if (autoCleanupEl) autoCleanupEl.value = settings.autoCleanupDays;

    const storageInfo = await this.sendMessage({ type: 'GET_STORAGE_INFO' });
    if (storageInfo) {
      const percent = Math.round(storageInfo.percentUsed * 100);
      const storageUsed = document.getElementById('storageUsed');
      const storageText = document.getElementById('storageText');
      
      if (storageUsed) storageUsed.style.width = `${percent}%`;
      if (storageText) {
        storageText.textContent = `${this.formatBytes(storageInfo.bytesUsed)} / ${this.formatBytes(storageInfo.quota)} (${percent}%)`;
      }
    }

    this.showModal('settingsModal');
  }

  showTagEditModal() {
    const item = this.items.find(i => i.id === this.currentItemId);
    if (!item) return;

    this.editingTags = [...(item.tags || [])];
    this.renderTagEditor();
    this.hideModal('detailModal');
    this.showModal('tagEditModal');
  }

  renderTagEditor() {
    const currentTagsEl = document.getElementById('currentTags');
    if (currentTagsEl) {
      currentTagsEl.innerHTML = this.editingTags
        .map(tag => `
          <span class="tag tag-removable" data-tag="${this.escapeHtml(tag)}">
            ${this.escapeHtml(tag)}
            <button class="tag-remove">&times;</button>
          </span>
        `).join('');

      currentTagsEl.querySelectorAll('.tag-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const tagEl = btn.closest('.tag');
          if (tagEl) {
            const tag = tagEl.dataset.tag;
            this.editingTags = this.editingTags.filter(t => t !== tag);
            this.renderTagEditor();
          }
        });
      });
    }

    const availableTagsEl = document.getElementById('availableTags');
    if (availableTagsEl) {
      const availableTags = this.tags.filter(t => !this.editingTags.includes(t));
      availableTagsEl.innerHTML = availableTags
        .map(tag => `<button class="tag-option" data-tag="${this.escapeHtml(tag)}">${this.escapeHtml(tag)}</button>`)
        .join('');

      availableTagsEl.querySelectorAll('.tag-option').forEach(btn => {
        btn.addEventListener('click', () => {
          const tag = btn.dataset.tag;
          if (!this.editingTags.includes(tag)) {
            this.editingTags.push(tag);
            this.renderTagEditor();
          }
        });
      });
    }
  }

  addNewTag() {
    const input = document.getElementById('newTagInput');
    if (!input) return;
    
    const tag = input.value.trim();
    if (tag && !this.editingTags.includes(tag)) {
      this.editingTags.push(tag);
      this.renderTagEditor();
    }
    input.value = '';
  }

  async saveTags() {
    if (!this.currentItemId) return;

    await this.sendMessage({
      type: 'UPDATE_ITEM',
      data: { id: this.currentItemId, updates: { tags: this.editingTags } }
    });

    await this.loadData();
    this.render();
    this.hideModal('tagEditModal');
  }

  async copyCurrentContent() {
    const item = this.items.find(i => i.id === this.currentItemId);
    if (!item) return;

    try {
      await navigator.clipboard.writeText(item.content);
      this.showToast('已复制到剪贴板');
    } catch (err) {
      this.showToast('复制失败', 'error');
    }
  }

  async deleteCurrentItem() {
    if (!this.currentItemId) return;
    
    if (!confirm('确定要删除这条内容吗？')) return;

    await this.sendMessage({ type: 'DELETE_ITEM', data: { id: this.currentItemId } });
    this.hideModal('detailModal');
    this.currentItemId = null;
    await this.loadData();
    this.render();
    this.showReviewCard();
    this.showToast('已删除');
  }

  async handleExport() {
    const markdown = await this.sendMessage({ type: 'EXPORT' });
    if (!markdown) {
      this.showToast('导出失败', 'error');
      return;
    }
    
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `tips-export-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    
    URL.revokeObjectURL(url);
    this.showToast('导出成功');
  }

  async updateSetting(key, value) {
    await this.sendMessage({
      type: 'UPDATE_SETTINGS',
      data: { settings: { [key]: value } }
    });
  }

  async clearAllData() {
    if (!confirm('确定要清空所有数据吗？此操作不可恢复！')) return;
    if (!confirm('再次确认：这将删除所有保存的内容！')) return;

    await chrome.storage.local.clear();
    await this.loadData();
    this.render();
    this.showReviewCard();
    this.hideModal('settingsModal');
    this.showToast('已清空所有数据');
  }

  async runCleanup() {
    const count = await this.sendMessage({ type: 'AUTO_CLEANUP' });
    await this.loadData();
    this.render();
    this.showToast(`已清理 ${count || 0} 条过期内容`);
    
    const warningEl = document.getElementById('storageWarning');
    if (warningEl) {
      warningEl.classList.add('hidden');
    }
  }

  async checkStorageWarning() {
    const info = await this.sendMessage({ type: 'GET_STORAGE_INFO' });
    const settings = await this.sendMessage({ type: 'GET_SETTINGS' });
    
    if (!info || !settings) return;
    
    const warningEl = document.getElementById('storageWarning');
    if (warningEl && info.percentUsed >= settings.storageWarningThreshold) {
      warningEl.classList.remove('hidden');
    }
  }

  showToast(message, type = 'success') {
    const existing = document.querySelector('.popup-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `popup-toast popup-toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      if (toast) toast.classList.add('show');
    });

    setTimeout(() => {
      if (toast && toast.parentNode) {
        toast.classList.remove('show');
        setTimeout(() => {
          if (toast && toast.parentNode) toast.remove();
        }, 300);
      }
    }, 2000);
  }

  formatDate(date) {
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }

  formatDateTime(date) {
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  getPreview(content, maxLength) {
    if (!content) return '';
    const cleaned = content.replace(/```[\s\S]*?```/g, '[代码块]')
                          .replace(/\n+/g, ' ')
                          .trim();
    return cleaned.length > maxLength ? cleaned.slice(0, maxLength) + '...' : cleaned;
  }

  extractHost(url) {
    if (!url) return '未知来源';
    try {
      const host = new URL(url).hostname.replace('www.', '');
      const map = {
        'x.com': 'X',
        'twitter.com': 'X',
        'gemini.google.com': 'Gemini',
        'chat.openai.com': 'ChatGPT',
        'github.com': 'GitHub'
      };
      return map[host] || host;
    } catch {
      return '未知来源';
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  showReviewCard(forceNew = false) {
    const card = document.getElementById('reviewCard');
    if (!card) return;
    
    if (this.items.length === 0) {
      card.classList.add('hidden');
      return;
    }

    const today = new Date().toDateString();
    const reviewKey = 'tips_last_review';
    const lastReview = localStorage.getItem(reviewKey);

    if (!forceNew && lastReview === today) {
      card.classList.add('hidden');
      return;
    }

    const randomIndex = Math.floor(Math.random() * this.items.length);
    this.reviewItem = this.items[randomIndex];

    card.classList.remove('hidden');

    const contentEl = document.getElementById('reviewContent');
    if (contentEl) {
      contentEl.textContent = this.getPreview(this.reviewItem.content, 150);
    }
    
    const metaEl = document.getElementById('reviewMeta');
    if (metaEl) {
      const date = new Date(this.reviewItem.createdAt);
      const source = this.extractHost(this.reviewItem.source);
      metaEl.textContent = `${this.formatDate(date)} · 来自 ${source}`;
    }

    const sourceLink = document.getElementById('reviewSource');
    if (sourceLink) {
      sourceLink.href = this.reviewItem.source || '#';
      sourceLink.style.display = this.reviewItem.source ? 'inline' : 'none';
    }
  }

  dismissReview() {
    const today = new Date().toDateString();
    localStorage.setItem('tips_last_review', today);
    
    const card = document.getElementById('reviewCard');
    if (card) {
      card.classList.add('hidden');
    }
    
    this.sendMessage({ type: 'UPDATE_BADGE' });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new TipsPopup();
});
