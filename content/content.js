(function() {
  let toast = null;

  function getSelection() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return null;

    const range = selection.getRangeAt(0);
    const container = document.createElement('div');
    container.appendChild(range.cloneContents());
    
    return {
      html: container.innerHTML,
      text: selection.toString(),
      rect: range.getBoundingClientRect()
    };
  }

  function showToast(message, type = 'success') {
    if (toast) {
      toast.remove();
    }

    toast = document.createElement('div');
    toast.className = `tips-toast tips-toast-${type}`;
    toast.innerHTML = `
      <div class="tips-toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</div>
      <div class="tips-toast-message">${message}</div>
    `;
    
    document.body.appendChild(toast);
    
    requestAnimationFrame(() => {
      if (toast) {
        toast.classList.add('tips-toast-show');
      }
    });

    setTimeout(() => {
      if (toast) {
        toast.classList.remove('tips-toast-show');
        setTimeout(() => {
          if (toast) {
            toast.remove();
            toast = null;
          }
        }, 300);
      }
    }, 2000);
  }

  async function saveSelection() {
    const selectionData = getSelection();
    
    if (!selectionData || !selectionData.text.trim()) {
      showToast('请先选中要保存的内容', 'error');
      return;
    }

    try {
      const markdown = window.HtmlToMd 
        ? window.HtmlToMd.convert(selectionData.html, selectionData.text)
        : selectionData.text;

      const item = {
        content: markdown,
        source: window.location.href,
        sourceTitle: document.title,
        tags: ['快速收集']
      };

      const result = await chrome.runtime.sendMessage({
        type: 'SAVE_ITEM',
        data: item
      });

      if (result && result.id) {
        showToast('已保存到快速收集', 'success');
      } else {
        throw new Error('保存失败');
      }
    } catch (error) {
      console.error('Tips: Save error', error);
      showToast('保存失败，请重试', 'error');
    }
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'TRIGGER_SAVE') {
      saveSelection();
      sendResponse({ success: true });
    }
    return true;
  });

  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.code === 'KeyS') {
      e.preventDefault();
      e.stopPropagation();
      saveSelection();
    }
  }, true);
})();
