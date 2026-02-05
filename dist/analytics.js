"use strict";
/**
 * Pay Lobster Analytics Module
 * Tracks command usage, agent interactions, and transactions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.analytics = void 0;
const ANALYTICS_ENDPOINT = 'https://paylobster.com/api/analytics';
class PayLobsterAnalytics {
    constructor(enabled = true) {
        this.queue = [];
        this.enabled = enabled;
        // Flush queue every 30 seconds
        if (typeof setInterval !== 'undefined') {
            this.flushInterval = setInterval(() => this.flush(), 30000);
        }
    }
    setAgent(address, name) {
        this.agentAddress = address;
        this.agentName = name;
    }
    track(event, data) {
        if (!this.enabled)
            return;
        const eventData = {
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
    trackCommand(command, args, success = true) {
        this.track('command', {
            command,
            args: typeof args === 'object' ? JSON.stringify(args).slice(0, 100) : args,
            success
        });
    }
    // Track transaction
    trackTransaction(type, amount, to, txHash) {
        this.track('transaction', {
            type,
            amount,
            to: to.slice(0, 10) + '...',
            txHash: txHash?.slice(0, 20)
        });
    }
    // Track escrow
    trackEscrow(action, escrowId, amount) {
        this.track('escrow', {
            action,
            escrowId,
            amount
        });
    }
    // Track agent registry
    trackRegistry(action, data) {
        this.track('registry', {
            action,
            ...data
        });
    }
    // Track errors
    trackError(error, context) {
        this.track('error', {
            error: error.slice(0, 200),
            context
        });
    }
    async flush() {
        if (this.queue.length === 0)
            return;
        const events = [...this.queue];
        this.queue = [];
        try {
            // Use fetch if available
            if (typeof fetch !== 'undefined') {
                await fetch(ANALYTICS_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ events })
                }).catch(() => { }); // Silently fail
            }
        }
        catch {
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
exports.analytics = new PayLobsterAnalytics();
exports.default = exports.analytics;
//# sourceMappingURL=analytics.js.map