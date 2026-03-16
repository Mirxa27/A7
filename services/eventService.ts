export type EventHandler = (data: any) => void;

class EventService {
  private eventSource: EventSource | null = null;
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private reconnectTimer: NodeJS.Timeout | null = null;

  connect() {
    if (this.eventSource) return; // Already connected
    
    this.eventSource = new EventSource('/api/events');
    
    this.eventSource.addEventListener('log', (e: MessageEvent) => {
      this.trigger('log', JSON.parse(e.data));
    });
    
    this.eventSource.addEventListener('job:update', (e: MessageEvent) => {
      this.trigger('job', JSON.parse(e.data));
    });
    
    this.eventSource.addEventListener('intel:update', (e: MessageEvent) => {
      this.trigger('intel', JSON.parse(e.data));
    });
    
    this.eventSource.addEventListener('asset:update', (e: MessageEvent) => {
      this.trigger('asset', JSON.parse(e.data));
    });

    this.eventSource.onerror = () => {
      console.warn('[SSE] Connection lost, reconnecting...');
      this.disconnect();
      this.reconnectTimer = setTimeout(() => this.connect(), 3000);
    };
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  on(event: string, handler: EventHandler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
  }

  off(event: string, handler: EventHandler) {
    this.handlers.get(event)?.delete(handler);
  }

  private trigger(event: string, data: any) {
    this.handlers.get(event)?.forEach(handler => handler(data));
  }
}

export const eventService = new EventService();
