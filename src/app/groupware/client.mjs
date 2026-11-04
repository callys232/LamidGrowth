import { createHmac } from 'node:crypto';
import { getGroupwareConfig, sanitizeLogData } from './config.mjs';

/**
 * Creates HMAC-SHA256 signature for outbound requests to Groupware.
 * Payload signing ensures mutual authenticity and tamper-proofing (Rule 04 & 06).
 */
export function signRequestPayload(secret, timestamp, bodyString) {
  return createHmac('sha256', secret)
    .update(`${timestamp}.${bodyString}`)
    .digest('hex');
}

/**
 * Groupware API client with HMAC signing, timeouts, retries, and sanitized logging.
 */
export class GroupwareClient {
  constructor(configOverrides = {}) {
    this.config = getGroupwareConfig(configOverrides);
  }

  /**
   * Executes a secure signed request to Groupware backend.
   */
  async request(path, options = {}) {
    const { method = 'POST', body = null, headers = {} } = options;
    const url = `${this.config.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const timestamp = Date.now().toString();
    const bodyString = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : '';

    const reqHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Groupware-Key': this.config.apiKey,
      'X-Groupware-Timestamp': timestamp,
      ...headers,
    };

    if (this.config.apiSecret) {
      reqHeaders['X-Groupware-Signature'] = signRequestPayload(
        this.config.apiSecret,
        timestamp,
        bodyString
      );
    }

    let attempt = 0;
    let lastError = null;

    while (attempt < this.config.maxRetries) {
      attempt++;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

        const response = await fetch(url, {
          method,
          headers: reqHeaders,
          body: method !== 'GET' && method !== 'HEAD' ? bodyString : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            return await response.json();
          }
          return { ok: true, status: response.status };
        }

        const status = response.status;
        const errText = await response.text().catch(() => '');

        // 4xx errors (except 429) are client errors - do not retry blindly
        if (status >= 400 && status < 500 && status !== 429) {
          const err = new Error(`Groupware API Client Error (${status}): ${errText.slice(0, 300)}`);
          err.status = status;
          err.details = sanitizeLogData({ status, errText, path });
          throw err;
        }

        // 5xx or 429 are transient - eligible for retry
        lastError = new Error(`Groupware API Server Error (${status}): ${errText.slice(0, 300)}`);
        lastError.status = status;
      } catch (err) {
        lastError = err;
        if (err.name === 'AbortError') {
          lastError = new Error(`Groupware API Timeout after ${this.config.timeoutMs}ms on ${path}`);
        }
      }

      // Exponential backoff with jitter
      if (attempt < this.config.maxRetries) {
        const backoffMs = Math.min(10000, 500 * 2 ** (attempt - 1)) + Math.floor(Math.random() * 200);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    throw lastError;
  }

  async syncUser(userData) {
    return this.request('/api/v1/integration/sync/user', {
      method: 'POST',
      body: userData,
    });
  }

  async syncClientConversion(conversionData) {
    return this.request('/api/v1/integration/sync/client-conversion', {
      method: 'POST',
      body: conversionData,
    });
  }

  async syncProject(projectData) {
    return this.request('/api/v1/integration/sync/project', {
      method: 'POST',
      body: projectData,
    });
  }

  async syncMilestone(milestoneData) {
    return this.request('/api/v1/integration/sync/milestone', {
      method: 'POST',
      body: milestoneData,
    });
  }

  async syncTransaction(transactionData) {
    return this.request('/api/v1/integration/sync/transaction', {
      method: 'POST',
      body: transactionData,
    });
  }

  async syncReview(reviewData) {
    return this.request('/api/v1/integration/sync/review', {
      method: 'POST',
      body: reviewData,
    });
  }

  async checkStatus() {
    return this.request('/api/check-status', {
      method: 'GET',
    });
  }
}

