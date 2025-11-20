/**
 * Exponential Backoff Retry Logic
 * Handles rate limits and transient failures with smart retry
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 2000, // 2 seconds
  maxDelay: 16000, // 16 seconds
  backoffMultiplier: 2,
  retryableErrors: ['rate_limit', '429', 'network', 'timeout', 'ECONNRESET']
};

/**
 * Execute a function with exponential backoff retry
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;
  let attempts = 0;
  const startTime = Date.now();

  for (let i = 0; i <= opts.maxRetries; i++) {
    attempts++;

    try {
      const result = await fn();
      return {
        success: true,
        data: result,
        attempts,
        totalTime: Date.now() - startTime
      };
    } catch (error) {
      lastError = error as Error;
      const isRetryable = shouldRetry(error, opts.retryableErrors);

      console.log(`[Retry] Attempt ${attempts}/${opts.maxRetries + 1} failed:`, {
        error: lastError.message,
        retryable: isRetryable
      });

      // If not retryable or last attempt, throw
      if (!isRetryable || i === opts.maxRetries) {
        return {
          success: false,
          error: lastError,
          attempts,
          totalTime: Date.now() - startTime
        };
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffMultiplier, i),
        opts.maxDelay
      );

      console.log(`[Retry] Waiting ${delay}ms before retry ${i + 1}`);
      await sleep(delay);
    }
  }

  return {
    success: false,
    error: lastError,
    attempts,
    totalTime: Date.now() - startTime
  };
}

/**
 * Check if an error should trigger a retry
 */
function shouldRetry(error: any, retryableErrors: string[]): boolean {
  const errorMessage = error?.message?.toLowerCase() || '';
  const errorType = error?.type?.toLowerCase() || '';
  const errorCode = error?.code?.toString() || '';

  return retryableErrors.some(retryable => 
    errorMessage.includes(retryable.toLowerCase()) ||
    errorType.includes(retryable.toLowerCase()) ||
    errorCode.includes(retryable)
  );
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Specialized retry for API calls with rate limiting
 */
export async function retryAPICall<T>(
  apiCall: () => Promise<T>,
  errorContext: string = 'API call'
): Promise<RetryResult<T>> {
  console.log(`[Retry] Starting ${errorContext} with retry logic`);

  return retryWithBackoff(apiCall, {
    maxRetries: 3,
    initialDelay: 2000,
    maxDelay: 8000,
    backoffMultiplier: 2,
    retryableErrors: ['rate_limit', '429', '502', '503', '504', 'network', 'timeout']
  });
}

/**
 * Get user-friendly retry status message
 */
export function getRetryStatusMessage(attempt: number, maxRetries: number, delay: number): string {
  if (attempt === 1) {
    return 'Processing your request...';
  } else if (attempt <= maxRetries) {
    return `Request busy, retrying in ${Math.round(delay / 1000)}s... (attempt ${attempt}/${maxRetries + 1})`;
  } else {
    return 'Unable to process after multiple attempts. Please try again in a moment.';
  }
}
