// Data service managing in-memory dataset, dynamic telemetry stats, and messages
class DataService {
  constructor() {
    this.messages = [];
    this.requestCounter = 1240;
    this.items = [
      {
        id: 'item-1',
        title: 'Quantum Neural Pipeline',
        category: 'AI Systems',
        status: 'Active',
        latency: '14ms',
        throughput: '98.4%',
        description: 'Distributed inference engine supporting real-time transformer models.'
      },
      {
        id: 'item-2',
        title: 'Glassmorphic UI Engine',
        category: 'Frontend',
        status: 'Optimal',
        latency: '4ms',
        throughput: '99.9%',
        description: 'Hardware-accelerated CSS blur & backdrop filter rendering pipeline.'
      },
      {
        id: 'item-3',
        title: 'Aetheria Node Server',
        category: 'Backend',
        status: 'Online',
        latency: '8ms',
        throughput: '100%',
        description: 'High-concurrency Express API gateway with automated route dispatch.'
      },
      {
        id: 'item-4',
        title: 'Edge Cache Replicator',
        category: 'Infrastructure',
        status: 'Syncing',
        latency: '22ms',
        throughput: '94.2%',
        description: 'Low-latency distributed state cache synchronization layer.'
      },
      {
        id: 'item-5',
        title: 'Telemetry Analytics Bus',
        category: 'Analytics',
        status: 'Active',
        latency: '11ms',
        throughput: '99.1%',
        description: 'Stream processing event bus monitoring system health metrics.'
      },
      {
        id: 'item-6',
        title: 'Secure Auth Protocol',
        category: 'Security',
        status: 'Verified',
        latency: '6ms',
        throughput: '100%',
        description: 'Zero-trust JWT authentication and role-based access control engine.'
      }
    ];
  }

  getSystemStats() {
    this.requestCounter += Math.floor(Math.random() * 5) + 1;
    const cpuUsage = (18 + Math.random() * 12).toFixed(1);
    const memoryUsage = (142 + Math.random() * 15).toFixed(1);
    const activeConnections = Math.floor(42 + Math.random() * 18);
    const apiResponseTime = Math.floor(6 + Math.random() * 8);

    return {
      success: true,
      timestamp: new Date().toISOString(),
      metrics: {
        cpuUsagePercent: parseFloat(cpuUsage),
        memoryMb: parseFloat(memoryUsage),
        activeConnections,
        totalRequests: this.requestCounter,
        avgResponseTimeMs: apiResponseTime,
        status: 'HEALTHY'
      }
    };
  }

  getItems(category = 'all', query = '') {
    let result = [...this.items];
    if (category && category.toLowerCase() !== 'all') {
      result = result.filter(item => item.category.toLowerCase() === category.toLowerCase());
    }
    if (query && query.trim() !== '') {
      const q = query.toLowerCase().trim();
      result = result.filter(item => 
        item.title.toLowerCase().includes(q) || 
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    }
    return {
      success: true,
      count: result.length,
      total: this.items.length,
      data: result
    };
  }

  addItem(itemData) {
    const newItem = {
      id: `item-${Date.now()}`,
      title: itemData.title || 'New Component',
      category: itemData.category || 'General',
      status: itemData.status || 'Active',
      latency: itemData.latency || '10ms',
      throughput: '100%',
      description: itemData.description || 'Custom added system component.'
    };
    this.items.unshift(newItem);
    return {
      success: true,
      message: 'Item added successfully',
      data: newItem
    };
  }

  saveMessage(contactData) {
    const messageRecord = {
      id: `msg-${Date.now()}`,
      name: contactData.name || 'Anonymous',
      email: contactData.email || 'user@example.com',
      message: contactData.message || '',
      submittedAt: new Date().toISOString()
    };
    this.messages.push(messageRecord);
    return {
      success: true,
      message: 'Message received successfully!',
      data: messageRecord
    };
  }
}

module.exports = new DataService();
