/**
 * Rate Limit Utility
 * @description Handles rate limiting for API requests
 */

export class RateLimiter {
  private lastCallTime: number = 0;
  private readonly minDelay: number;

  constructor(minDelay: number = 100) {
    this.minDelay = minDelay;
  }

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastCallTime;
    const waitTime = Math.max(0, this.minDelay - elapsed);

    if (waitTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastCallTime = Date.now();
  }

  reset(): void {
    this.lastCallTime = 0;
  }
}
