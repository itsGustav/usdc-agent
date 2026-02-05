/**
 * Pay Lobster Analytics Module
 * Tracks command usage, agent interactions, and transactions
 */
declare class PayLobsterAnalytics {
    private enabled;
    private agentAddress?;
    private agentName?;
    private queue;
    private flushInterval?;
    constructor(enabled?: boolean);
    setAgent(address: string, name?: string): void;
    track(event: string, data?: Record<string, any>): void;
    trackCommand(command: string, args?: any, success?: boolean): void;
    trackTransaction(type: string, amount: string, to: string, txHash?: string): void;
    trackEscrow(action: string, escrowId: string, amount?: string): void;
    trackRegistry(action: string, data?: any): void;
    trackError(error: string, context?: string): void;
    flush(): Promise<void>;
    disable(): void;
    enable(): void;
}
export declare const analytics: PayLobsterAnalytics;
export default analytics;
//# sourceMappingURL=analytics.d.ts.map