const STORAGE_KEY = 'tips_items';
const TAGS_KEY = 'tips_tags';
const SETTINGS_KEY = 'tips_settings';

const DEFAULT_SETTINGS = {
  maxItems: 500,
  autoCleanupDays: 90,
  storageWarningThreshold: 0.8
};

const StorageManager = {
  async getItems() {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || [];
  },

  async saveItem(item) {
    const items = await this.getItems();
    const newItem = {
      id: crypto.randomUUID(),
      ...item,
      createdAt: new Date().toISOString()
    };
    items.unshift(newItem);
    
    const settings = await this.getSettings();
    const trimmedItems = items.slice(0, settings.maxItems);
    
    await chrome.storage.local.set({ [STORAGE_KEY]: trimmedItems });
    await this.updateTags(newItem.tags || []);
    await this.checkStorageUsage();
    
    updateBadge();
    
    return newItem;
  },

  async updateItem(id, updates) {
    const items = await this.getItems();
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return null;
    
    items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
    await chrome.storage.local.set({ [STORAGE_KEY]: items });
    
    if (updates.tags) {
      await this.updateTags(updates.tags);
    }
    
    return items[index];
  },

  async deleteItem(id) {
    const items = await this.getItems();
    const filtered = items.filter(item => item.id !== id);
    await chrome.storage.local.set({ [STORAGE_KEY]: filtered });
    updateBadge();
    return true;
  },

  async deleteItems(ids) {
    const items = await this.getItems();
    const idSet = new Set(ids);
    const filtered = items.filter(item => !idSet.has(item.id));
    await chrome.storage.local.set({ [STORAGE_KEY]: filtered });
    return true;
  },

  async getTags() {
    const result = await chrome.storage.local.get(TAGS_KEY);
    return result[TAGS_KEY] || ['快速收集'];
  },

  async updateTags(newTags) {
    const existingTags = await this.getTags();
    const allTags = [...new Set([...existingTags, ...newTags])];
    await chrome.storage.local.set({ [TAGS_KEY]: allTags });
    return allTags;
  },

  async deleteTag(tagName) {
    const tags = await this.getTags();
    const filtered = tags.filter(t => t !== tagName);
    await chrome.storage.local.set({ [TAGS_KEY]: filtered });
    return filtered;
  },

  async getSettings() {
    const result = await chrome.storage.local.get(SETTINGS_KEY);
    return { ...DEFAULT_SETTINGS, ...result[SETTINGS_KEY] };
  },

  async updateSettings(updates) {
    const settings = await this.getSettings();
    const newSettings = { ...settings, ...updates };
    await chrome.storage.local.set({ [SETTINGS_KEY]: newSettings });
    return newSettings;
  },

  async getStorageInfo() {
    const bytesInUse = await chrome.storage.local.getBytesInUse();
    const quota = chrome.storage.local.QUOTA_BYTES || 5242880;
    const items = await this.getItems();
    
    return {
      bytesUsed: bytesInUse,
      quota: quota,
      percentUsed: bytesInUse / quota,
      itemCount: items.length
    };
  },

  async checkStorageUsage() {
    const info = await this.getStorageInfo();
    const settings = await this.getSettings();
    
    if (info.percentUsed >= settings.storageWarningThreshold) {
      chrome.runtime.sendMessage({
        type: 'STORAGE_WARNING',
        data: info
      }).catch(() => {});
    }
    
    return info;
  },

  async autoCleanup() {
    const settings = await this.getSettings();
    const items = await this.getItems();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - settings.autoCleanupDays);
    
    const filtered = items.filter(item => {
      const itemDate = new Date(item.createdAt);
      return itemDate >= cutoffDate;
    });
    
    if (filtered.length < items.length) {
      await chrome.storage.local.set({ [STORAGE_KEY]: filtered });
      return items.length - filtered.length;
    }
    
    return 0;
  },

  async searchItems(query) {
    const items = await this.getItems();
    const lowerQuery = query.toLowerCase();
    
    return items.filter(item => {
      const content = (item.content || '').toLowerCase();
      const tags = (item.tags || []).join(' ').toLowerCase();
      const source = (item.source || '').toLowerCase();
      
      return content.includes(lowerQuery) || 
             tags.includes(lowerQuery) || 
             source.includes(lowerQuery);
    });
  },

  async getItemsByFilter(filter) {
    const items = await this.getItems();
    
    return items.filter(item => {
      if (filter.tag && !(item.tags || []).includes(filter.tag)) {
        return false;
      }
      
      if (filter.source) {
        const itemHost = this.extractHost(item.source);
        if (itemHost !== filter.source) return false;
      }
      
      if (filter.dateRange) {
        const itemDate = new Date(item.createdAt);
        const now = new Date();
        
        if (filter.dateRange === 'today') {
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          if (itemDate < today) return false;
        } else if (filter.dateRange === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (itemDate < weekAgo) return false;
        } else if (filter.dateRange === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (itemDate < monthAgo) return false;
        }
      }
      
      return true;
    });
  },

  extractHost(url) {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return '';
    }
  },

  async exportItems(itemIds = null) {
    let items;
    if (itemIds && itemIds.length > 0) {
      const allItems = await this.getItems();
      const idSet = new Set(itemIds);
      items = allItems.filter(item => idSet.has(item.id));
    } else {
      items = await this.getItems();
    }
    
    const markdown = items.map(item => {
      const frontmatter = [
        '---',
        `source: ${item.source || ''}`,
        `saved_at: ${item.createdAt}`,
        `tags: [${(item.tags || []).join(', ')}]`,
        '---',
        ''
      ].join('\n');
      
      return frontmatter + item.content;
    }).join('\n\n---\n\n');
    
    return markdown;
  },

  async getSourceStats() {
    const items = await this.getItems();
    const stats = {};
    
    items.forEach(item => {
      const host = this.extractHost(item.source);
      if (host) {
        stats[host] = (stats[host] || 0) + 1;
      }
    });
    
    return Object.entries(stats)
      .sort((a, b) => b[1] - a[1])
      .map(([host, count]) => ({ host, count }));
  }
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse);
  return true;
});

async function handleMessage(message, sender) {
  const { type, data } = message;
  
  switch (type) {
    case 'SAVE_ITEM':
      return await StorageManager.saveItem(data);
    
    case 'GET_ITEMS':
      return await StorageManager.getItems();
    
    case 'UPDATE_ITEM':
      return await StorageManager.updateItem(data.id, data.updates);
    
    case 'DELETE_ITEM':
      return await StorageManager.deleteItem(data.id);
    
    case 'DELETE_ITEMS':
      return await StorageManager.deleteItems(data.ids);
    
    case 'GET_TAGS':
      return await StorageManager.getTags();
    
    case 'UPDATE_TAGS':
      return await StorageManager.updateTags(data.tags);
    
    case 'DELETE_TAG':
      return await StorageManager.deleteTag(data.tag);
    
    case 'SEARCH':
      return await StorageManager.searchItems(data.query);
    
    case 'FILTER':
      return await StorageManager.getItemsByFilter(data.filter);
    
    case 'EXPORT':
      return await StorageManager.exportItems(data?.ids);
    
    case 'GET_STORAGE_INFO':
      return await StorageManager.getStorageInfo();
    
    case 'GET_SETTINGS':
      return await StorageManager.getSettings();
    
    case 'UPDATE_SETTINGS':
      return await StorageManager.updateSettings(data.settings);
    
    case 'AUTO_CLEANUP':
      return await StorageManager.autoCleanup();
    
    case 'GET_SOURCE_STATS':
      return await StorageManager.getSourceStats();
    
    case 'UPDATE_BADGE':
      return await updateBadge();
    
    default:
      return { error: 'Unknown message type' };
  }
}

async function updateBadge() {
  const items = await StorageManager.getItems();
  const count = items.length;
  
  if (count > 0) {
    chrome.action.setBadgeText({ text: count > 99 ? '99+' : String(count) });
    chrome.action.setBadgeBackgroundColor({ color: '#6366f1' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
  
  return { success: true };
}

chrome.alarms.create('autoCleanup', { periodInMinutes: 60 * 24 });
chrome.alarms.create('updateBadge', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'autoCleanup') {
    StorageManager.autoCleanup();
  }
  if (alarm.name === 'updateBadge') {
    updateBadge();
  }
});

chrome.runtime.onInstalled.addListener(() => {
  StorageManager.getSettings();
  StorageManager.getTags();
  updateBadge();
});
