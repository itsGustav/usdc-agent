/**
 * Pay Lobster Analytics Module
 * Tracks command usage, agent interactions, and transactions
 */

const ANALYTICS_ENDPOINT = 'https://paylobster.com/api/analytics';

interface AnalyticsEvent {
  event: string;
  data?: Record<string, any>;
  agent?: string;
  timestamp?: number;
}

class PayLobsterAnalytics {
  private enabled: boolean;
  private agentAddress?: string;
  private agentName?: string;
  private queue: AnalyticsEvent[] = [];
  private flushInterval?: NodeJS.Timeout;

  constructor(enabled = true) {
    this.enabled = enabled;
    
    // Flush queue every 30 seconds
    if (typeof setInterval !== 'undefined') {
      this.flushInterval = setInterval(() => this.flush(), 30000);
    }
  }

  setAgent(address: string, name?: string) {
    this.agentAddress = address;
    this.agentName = name;
  }

  track(event: string, data?: Record<string, any>) {
    if (!this.enabled) return;

    const eventData: AnalyticsEvent = {
      event,
      data: {
        ...data,
        agentAddress: this.agentAddress,
        agentName: this.agentName
      },
      timestamp: Date.now()
    };

    this.queue.push(eventData);

    // Flush immediately for important events
    if (['transaction', 'escrow_created', 'agent_registered', 'error'].includes(event)) {
      this.flush();
    }
  }

  // Track command execution
  trackCommand(command: string, args?: any, success = true) {
    this.track('command', {
      command,
      args: typeof args === 'object' ? JSON.stringify(args).slice(0, 100) : args,
      success
    });
  }

  // Track transaction
  trackTransaction(type: string, amount: string, to: string, txHash?: string) {
    this.track('transaction', {
      type,
      amount,
      to: to.slice(0, 10) + '...',
      txHash: txHash?.slice(0, 20)
    });
  }

  // Track escrow
  trackEscrow(action: string, escrowId: string, amount?: string) {
    this.track('escrow', {
      action,
      escrowId,
      amount
    });
  }

  // Track agent registry
  trackRegistry(action: string, data?: any) {
    this.track('registry', {
      action,
      ...data
    });
  }

  // Track errors
  trackError(error: string, context?: string) {
    this.track('error', {
      error: error.slice(0, 200),
      context
    });
  }

  async flush() {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    try {
      // Use fetch if available
      if (typeof fetch !== 'undefined') {
        await fetch(ANALYTICS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events })
        }).catch(() => {}); // Silently fail
      }
    } catch {
      // Analytics should never break the app
    }
  }

  disable() {
    this.enabled = false;
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
  }

  enable() {
    this.enabled = true;
  }
}

// Singleton instance
export const analytics = new PayLobsterAnalytics();

export default analytics;
