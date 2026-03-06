import { Test, TestingModule } from '@nestjs/testing';
import { CheckExecutorService } from './checkExecutor.service';
import { expect, describe, it, beforeEach, jest } from '@jest/globals';

jest.setTimeout(60000);

describe('WorkerServiceController', () => {
  let checkExecutorService: CheckExecutorService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      providers: [CheckExecutorService],
    }).compile();

    checkExecutorService = app.get<CheckExecutorService>(CheckExecutorService);
  });

  it('should be defined', () => {
    expect(checkExecutorService).toBeDefined();
  });

  it('TCP ERROR', async () => {
    const a = await checkExecutorService.collectHttpTimingMetrics("https://portquiz.net");
    expect(a.success).toBe(false);
    if (!a.success) {
      expect(a.error.error_type).toBeDefined();
      expect(a.error.error_message).toBeDefined();
      expect(a.error.timestamp).toBeDefined();
      expect(a.error.url).toBeDefined();
      expect(a.error.partial_timings).toBeDefined();
    }
    expect(a).toBeDefined();
  });

  it('DNS EROROR', async () => {
    const a = await checkExecutorService.collectHttpTimingMetrics("https://poASFASquiz.net");
    expect(a.success).toBe(false);
    if (!a.success) {
      expect(a.error.error_type).toBe("DNS_LOOKUP_ERROR");
      expect(a.error.error_message).toBeDefined();
      expect(a.error.timestamp).toBeDefined();
      expect(a.error.url).toBeDefined();
      expect(a.error.partial_timings).toBeDefined();
    }
    expect(a).toBeDefined();
  });

  it('TLS ERROR', async () => {
    const a = await checkExecutorService.collectHttpTimingMetrics("https://wrong.host.badssl.com/");
    expect(a.success).toBe(false);
    if (!a.success) {
      expect(a.error.error_type).toBe("TLS_HANDSHAKE_ERROR");
      expect(a.error.error_message).toBeDefined();
      expect(a.error.timestamp).toBeDefined();
      expect(a.error.url).toBeDefined();
      expect(a.error.partial_timings).toBeDefined();
    }
    expect(a).toBeDefined();
  });

  it('CERT ERROR', async () => {
    const a = await checkExecutorService.collectHttpTimingMetrics("https://expired.badssl.com");
    expect(a.success).toBe(false);
    if (!a.success) {
      expect(a.error.error_type).toBe("CERT_ERROR");
      expect(a.error.error_message).toBeDefined();
      expect(a.error.timestamp).toBeDefined();
      expect(a.error.url).toBeDefined();
      expect(a.error.partial_timings).toBeDefined();
    }
    expect(a).toBeDefined();
  });

  it('CERT ERROR', async () => {
    const a = await checkExecutorService.collectHttpTimingMetrics("https://self-signed.badssl.com");
    expect(a.success).toBe(false);
    if (!a.success) {
      expect(a.error.error_type).toBe("CERT_ERROR");
      expect(a.error.error_message).toBeDefined();
      expect(a.error.timestamp).toBeDefined();
      expect(a.error.url).toBeDefined();
      expect(a.error.partial_timings).toBeDefined();
    }
    expect(a).toBeDefined();
  });

  it('TIMEOUT ERROR', async () => {
    const a = await checkExecutorService.collectHttpTimingMetrics("https://httpbin.org/delay/5", 4000);
    expect(a.success).toBe(false);
    if (!a.success) {
      expect(a.error.error_type).toBeDefined();
      expect(a.error.error_message).toBeDefined();
      expect(a.error.timestamp).toBeDefined();
      expect(a.error.url).toBeDefined();
      expect(a.error.partial_timings).toBeDefined();
    }
    expect(a).toBeDefined();
  });

  it('STATUS CODE 500', async () => {
    const a = await checkExecutorService.collectHttpTimingMetrics("https://httpbin.org/status/500");
    expect(a.success).toBe(true);
    if (!a.success) {
      expect(a.error.error_type).toBeDefined();
      expect(a.error.error_message).toBeDefined();
      expect(a.error.timestamp).toBeDefined();
      expect(a.error.url).toBeDefined();
      expect(a.error.partial_timings).toBeDefined();
    } else {
      expect(a.metrics.status_code).toBe(500);
    }
    expect(a).toBeDefined();
  });

  it('STATUS CODE 501', async () => {
    const a = await checkExecutorService.collectHttpTimingMetrics("https://httpbin.org/status/501");
    expect(a.success).toBe(true);
    if (!a.success) {
      expect(a.error.error_type).toBeDefined();
      expect(a.error.error_message).toBeDefined();
      expect(a.error.timestamp).toBeDefined();
      expect(a.error.url).toBeDefined();
      expect(a.error.partial_timings).toBeDefined();
    } else {
      expect(a.metrics.status_code).toBe(501);
    }
    expect(a).toBeDefined();
  });

  it('STATUS CODE 404', async () => {
    const a = await checkExecutorService.collectHttpTimingMetrics("https://httpbin.org/status/404");
    expect(a.success).toBe(true);
    if (!a.success) {
      expect(a.error.error_type).toBeDefined();
      expect(a.error.error_message).toBeDefined();
      expect(a.error.timestamp).toBeDefined();
      expect(a.error.url).toBeDefined();
      expect(a.error.partial_timings).toBeDefined();
    } else {
      expect(a.metrics.status_code).toBe(404);
    }
    expect(a).toBeDefined();
  });

  it('STATUS CODE 200', async () => {
    const a = await checkExecutorService.collectHttpTimingMetrics("https://httpbin.org/status/200");
    expect(a.success).toBe(true);
    if (a.success) {
      expect(a.metrics.status_code).toBe(200);
    }
  })
});
