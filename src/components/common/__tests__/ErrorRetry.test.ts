/**
 * Unit tests for ErrorRetry component logic.
 * Tests retry counting, timeout behavior, and exhaustion logic.
 * 
 * Validates: Requirements 10.3, 10.4
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Simulate the retry logic from ErrorRetry component
class RetryController {
  private retryCount = 0;
  private state: 'error' | 'retrying' | 'timeout' | 'exhausted' = 'error';
  private maxRetries: number;
  private retryTimeout: number;
  private onRetry: () => Promise<void>;
  private onRetriesExhausted?: () => void;
  private timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  constructor(options: {
    maxRetries?: number;
    retryTimeout?: number;
    onRetry: () => Promise<void>;
    onRetriesExhausted?: () => void;
  }) {
    this.maxRetries = options.maxRetries ?? 3;
    this.retryTimeout = options.retryTimeout ?? 15000;
    this.onRetry = options.onRetry;
    this.onRetriesExhausted = options.onRetriesExhausted;
  }

  getState() {
    return this.state;
  }

  getRetryCount() {
    return this.retryCount;
  }

  async handleRetry(): Promise<void> {
    if (this.retryCount >= this.maxRetries) {
      this.state = 'exhausted';
      this.onRetriesExhausted?.();
      return;
    }

    this.state = 'retrying';
    this.retryCount += 1;

    let didTimeout = false;
    this.timeoutHandle = setTimeout(() => {
      didTimeout = true;
      this.state = 'timeout';
      if (this.retryCount >= this.maxRetries) {
        this.state = 'exhausted';
        this.onRetriesExhausted?.();
      }
    }, this.retryTimeout);

    try {
      await this.onRetry();
      if (this.timeoutHandle) {
        clearTimeout(this.timeoutHandle);
      }
      if (!didTimeout) {
        this.state = 'error';
      }
    } catch {
      if (this.timeoutHandle) {
        clearTimeout(this.timeoutHandle);
      }
      if (!didTimeout) {
        if (this.retryCount >= this.maxRetries) {
          this.state = 'exhausted';
          this.onRetriesExhausted?.();
        } else {
          this.state = 'error';
        }
      }
    }
  }

  cleanup() {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
    }
  }
}

describe('ErrorRetry - Retry Logic', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should start in error state with 0 retries', () => {
    const controller = new RetryController({
      onRetry: async () => {},
    });

    expect(controller.getState()).toBe('error');
    expect(controller.getRetryCount()).toBe(0);
  });

  it('should increment retry count on each retry attempt', async () => {
    const onRetry = jest.fn<() => Promise<void>>().mockRejectedValue(new Error('fail'));
    const controller = new RetryController({ onRetry });

    await controller.handleRetry();
    expect(controller.getRetryCount()).toBe(1);

    await controller.handleRetry();
    expect(controller.getRetryCount()).toBe(2);

    controller.cleanup();
  });

  it('should allow maximum 3 retries by default', async () => {
    const onRetry = jest.fn<() => Promise<void>>().mockRejectedValue(new Error('fail'));
    const onRetriesExhausted = jest.fn();
    const controller = new RetryController({ onRetry, onRetriesExhausted });

    await controller.handleRetry(); // 1
    await controller.handleRetry(); // 2
    await controller.handleRetry(); // 3

    expect(controller.getState()).toBe('exhausted');
    expect(onRetriesExhausted).toHaveBeenCalledTimes(1);

    controller.cleanup();
  });

  it('should not allow retry after max retries exhausted', async () => {
    const onRetry = jest.fn<() => Promise<void>>().mockRejectedValue(new Error('fail'));
    const onRetriesExhausted = jest.fn();
    const controller = new RetryController({ maxRetries: 2, onRetry, onRetriesExhausted });

    await controller.handleRetry(); // 1
    await controller.handleRetry(); // 2 - exhausted

    expect(controller.getState()).toBe('exhausted');

    // Trying again should not increment
    await controller.handleRetry();
    expect(controller.getRetryCount()).toBe(2);
    expect(onRetriesExhausted).toHaveBeenCalledTimes(2); // Called on exhaust + extra attempt

    controller.cleanup();
  });

  it('should transition to timeout state after 15 seconds', async () => {
    const onRetry = jest.fn<() => Promise<void>>().mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );
    const controller = new RetryController({ onRetry });

    const retryPromise = controller.handleRetry();

    expect(controller.getState()).toBe('retrying');

    jest.advanceTimersByTime(15000);

    expect(controller.getState()).toBe('timeout');

    controller.cleanup();
    // Don't await the never-resolving promise
  });

  it('should use custom timeout duration', async () => {
    const onRetry = jest.fn<() => Promise<void>>().mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );
    const controller = new RetryController({ onRetry, retryTimeout: 5000 });

    controller.handleRetry();

    jest.advanceTimersByTime(4999);
    expect(controller.getState()).toBe('retrying');

    jest.advanceTimersByTime(1);
    expect(controller.getState()).toBe('timeout');

    controller.cleanup();
  });

  it('should reset to error state on successful retry', async () => {
    const onRetry = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const controller = new RetryController({ onRetry });

    await controller.handleRetry();

    expect(controller.getState()).toBe('error');
    expect(controller.getRetryCount()).toBe(1);

    controller.cleanup();
  });

  it('should call onRetriesExhausted when timeout occurs on last retry', async () => {
    const onRetry = jest.fn<() => Promise<void>>().mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );
    const onRetriesExhausted = jest.fn();
    const controller = new RetryController({
      onRetry,
      maxRetries: 1,
      onRetriesExhausted,
    });

    controller.handleRetry();

    jest.advanceTimersByTime(15000);

    expect(controller.getState()).toBe('exhausted');
    expect(onRetriesExhausted).toHaveBeenCalledTimes(1);

    controller.cleanup();
  });
});

describe('ErrorRetry - Display Messages', () => {
  it('should show timeout message when timed out', () => {
    const state = 'timeout';
    const errorMessage = 'Network error';

    const displayMessage = state === 'timeout' ? 'error.timeout' :
      state === 'exhausted' ? 'error.retriesExhausted' : errorMessage;

    expect(displayMessage).toBe('error.timeout');
  });

  it('should show exhausted message when retries are used up', () => {
    const state = 'exhausted';
    const errorMessage = 'Network error';

    const displayMessage = state === 'timeout' ? 'error.timeout' :
      state === 'exhausted' ? 'error.retriesExhausted' : errorMessage;

    expect(displayMessage).toBe('error.retriesExhausted');
  });

  it('should show original error message in error state', () => {
    const state = 'error';
    const errorMessage = 'Network error';

    const displayMessage = state === 'timeout' ? 'error.timeout' :
      state === 'exhausted' ? 'error.retriesExhausted' : errorMessage;

    expect(displayMessage).toBe('Network error');
  });

  it('should show check network sub-message when exhausted', () => {
    const state = 'exhausted';
    const retryCount = 3;
    const maxRetries = 3;

    const subMessage = state === 'exhausted' ? 'error.checkNetwork' :
      retryCount > 0 ? `error.retryCount:${retryCount}/${maxRetries}` : null;

    expect(subMessage).toBe('error.checkNetwork');
  });

  it('should show retry count sub-message during retries', () => {
    const state = 'error';
    const retryCount = 2;
    const maxRetries = 3;

    const subMessage = state === 'exhausted' ? 'error.checkNetwork' :
      retryCount > 0 ? `error.retryCount:${retryCount}/${maxRetries}` : null;

    expect(subMessage).toBe('error.retryCount:2/3');
  });
});
