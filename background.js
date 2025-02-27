// 存储标签页的历史记录
const tabHistory = new Map();

// URL规范化函数（去除hash）
function normalizeUrl(url) {
  try {
    const u = new URL(url);
    u.hash = '';
    return u.href;
  } catch {
    return url;
  }
}

// 更新节点和边
async function updateGraph(tabId, url, title) {
  const normalizedUrl = normalizeUrl(url);
  
  // 添加/更新节点
  const { nodes = [] } = await chrome.storage.local.get('nodes');
  const existingNode = nodes.find(n => n.id === normalizedUrl);
  if (!existingNode) {
    nodes.push({ id: normalizedUrl, title });
    await chrome.storage.local.set({ nodes });
  }

  // 添加边
  const history = tabHistory.get(tabId) || [];
  if (history.length > 0) {
    const prevUrl = history[history.length - 1];
    const { edges = [] } = await chrome.storage.local.get('edges');
    
    if (!edges.some(e => 
      e.source === prevUrl && 
      e.target === normalizedUrl
    )) {
      edges.push({ 
        source: prevUrl, 
        target: normalizedUrl 
      });
      await chrome.storage.local.set({ edges });
    }
  }

  // 更新标签页历史（保留最近5条记录）
  tabHistory.set(tabId, [...history.slice(-4), normalizedUrl]);
}

// 监听标签页更新事件
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    try {
      await updateGraph(tabId, tab.url, tab.title);
    } catch (error) {
      console.error('Error updating graph:', error);
    }
  }
});

// 清理关闭的标签页历史
chrome.tabs.onRemoved.addListener((tabId) => {
  tabHistory.delete(tabId);
});