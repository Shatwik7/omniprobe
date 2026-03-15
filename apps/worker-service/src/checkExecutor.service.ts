import {
  HttpCheckError,
  HttpCheckResult,
  HttpErrorType,
  HttpTimingMetrics,
} from '@app/kafka-topics';
import { Injectable } from '@nestjs/common';
import * as dns from 'dns';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';

@Injectable()
export class CheckExecutorService {
  private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds

  async collectHttpTimingMetrics(
    urlString: string,
    timeout: number = this.DEFAULT_TIMEOUT,
  ): Promise<HttpCheckResult> {
    return new Promise((resolve) => {
      const parsedUrl = new URL(urlString);
      const isHttps = parsedUrl.protocol === 'https:';
      const client = isHttps ? https : http;

      const timings: any = {
        start: Date.now(),
        dns_lookup_end: 0,
        tcp_beginning_start: 0,
        tcp_end: 0,
        tls_start: 0,
        tls_end: 0,
        ttfb: 0,
        tdt: 0,
      };

      let timeoutHandle: NodeJS.Timeout;
      let settled = false;
      let req: http.ClientRequest;
      const totalTimeout = Math.min(timeout, this.DEFAULT_TIMEOUT);
      const deadline = Date.now() + totalTimeout;

      const remainingTime = () => Math.max(deadline - Date.now(), 0);

      const settle = (result: HttpCheckResult) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        resolve(result);
      };

      const createError = (
        errorType: HttpErrorType,
        error: Error | any,
        code?: string,
      ): HttpCheckError => {
        return {
          error_type: errorType,
          error_code: code || error.code,
          error_message: error.message || String(error),
          timestamp: Date.now(),
          url: urlString,
          partial_timings: {
            dns_lookup_end: timings.dns_lookup_end || undefined,
            tcp_beginning_start: timings.tcp_beginning_start || undefined,
            tcp_end: timings.tcp_end || undefined,
            tls_start: timings.tls_start || undefined,
            tls_end: timings.tls_end || undefined,
            ttfb: timings.ttfb || undefined,
            tdt: timings.tdt || undefined,
          },
        };
      };

      const cleanup = () => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
      };

      req = client.request(
        {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port,
          path: parsedUrl.pathname + parsedUrl.search,
          method: 'GET',
          timeout: totalTimeout,
          agent: false,
          lookup: (
            hostname: string,
            options: any,
            callback: (err: NodeJS.ErrnoException | null, address: string, family: number) => void,
          ) => {
            let done = false;
            const dnsTimeout = remainingTime();

            if (dnsTimeout <= 0) {
              const err = new Error('DNS lookup timeout') as NodeJS.ErrnoException;
              err.code = 'ETIMEDOUT';
              callback(err, '' as unknown as string, 0);
              return;
            }

            const dnsTimer = setTimeout(() => {
              if (done) return;
              done = true;
              const err = new Error('DNS lookup timeout') as NodeJS.ErrnoException;
              err.code = 'ETIMEDOUT';
              callback(err, '' as unknown as string, 0);
            }, dnsTimeout);

            dns.lookup(hostname, options, (err, address, family) => {
              if (done) return;
              done = true;
              clearTimeout(dnsTimer);
              callback(err, address, family);
            });
          },
          headers: {
            'User-Agent': 'Node.js HTTP Timing Client',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
            Connection: 'close',
          },
        },
        (res) => {
          const statusCode = res.statusCode || 0;
          let dataLength = 0;

          res.once('readable', () => {
            timings.ttfb = Date.now() - timings.start;
          });

          res.on('data', (chunk) => {
            dataLength += chunk.length;
          });

          res.on('end', () => {
            cleanup();
            timings.tdt = Date.now() - timings.start;

            const connectionTime =
              timings.tcp_end || timings.tcp_beginning_start;
            timings.server_processing_time = timings.ttfb - connectionTime;

            settle({
              success: true,
              metrics: {
                dns_lookup_end: timings.dns_lookup_end,
                tcp_beginning_start: timings.tcp_beginning_start,
                tcp_end: timings.tcp_end,
                tls_start: timings.tls_start,
                tls_end: timings.tls_end,
                ttfb: timings.ttfb,
                tdt: timings.tdt,
                server_processing_time: timings.server_processing_time,
                status_code: statusCode,
              },
            });
          });

          res.on('error', (error) => {
            settle({
              success: false,
              error: createError(HttpErrorType.RESPONSE_ERROR, error),
            });
          });
        },
      );

      // Socket timing events with error handling
      req.on('socket', (socket) => {
        socket.on('lookup', (err, address, family, host) => {
          if (err) {
            settle({
              success: false,
              error: createError(HttpErrorType.DNS_LOOKUP_ERROR, err),
            });
            req.destroy();
            return;
          }
          timings.dns_lookup_end = Date.now() - timings.start;
          timings.tcp_beginning_start = Date.now() - timings.start;
        });

        socket.on('connect', () => {
          timings.tcp_end = Date.now() - timings.start;
        });

        socket.on('timeout', () => {
          settle({
            success: false,
            error: createError(
              HttpErrorType.TIMEOUT_ERROR,
              new Error('Socket timeout'),
              'ETIMEDOUT',
            ),
          });
          req.destroy();
        });

        socket.on('error', (error: any) => {
          cleanup();
          let errorType = HttpErrorType.SOCKET_ERROR;

          // Classify socket errors
          if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
            errorType = HttpErrorType.DNS_LOOKUP_ERROR;
          } else if (
            error.code === 'ECONNREFUSED' ||
            error.code === 'ECONNRESET'
          ) {
            errorType = HttpErrorType.TCP_CONNECTION_ERROR;
          } else if (error.code === 'ETIMEDOUT') {
            errorType = HttpErrorType.TIMEOUT_ERROR;
          } else if (error.code === 'ECONNABORTED') {
            errorType = HttpErrorType.REQUEST_ABORTED;
          } else if (error.code === 'ESOCKETTIMEDOUT') {
            errorType = HttpErrorType.TIMEOUT_ERROR;
          } else if (
            (error.code as string).includes('SSL') ||
            (error.code as string).includes('TLS')
          ) {
            errorType = HttpErrorType.TLS_HANDSHAKE_ERROR;
          } else if ((error.code as string).includes('CERT')) {
            errorType = HttpErrorType.CERT_ERROR;
          }

          settle({
            success: false,
            error: createError(errorType, error),
          });
        });

        // TLS/SSL events
        if (isHttps) {
          socket.on('secureConnect', () => {
            timings.tls_end = Date.now() - timings.start;
            timings.tls_start = timings.tcp_end;
          });

          // TLS-specific errors
          (socket as any).on('tlsClientError', (error: Error) => {
            settle({
              success: false,
              error: createError(HttpErrorType.TLS_HANDSHAKE_ERROR, error),
            });
          });
        }
      });

      // Request-level error handling
      req.on('error', (error: any) => {
        let errorType = HttpErrorType.UNKNOWN_ERROR;

        if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
          errorType = HttpErrorType.DNS_LOOKUP_ERROR;
        } else if (
          error.code === 'ECONNREFUSED' ||
          error.code === 'ECONNRESET'
        ) {
          errorType = HttpErrorType.TCP_CONNECTION_ERROR;
        } else if (error.code === 'ETIMEDOUT') {
          errorType = HttpErrorType.TIMEOUT_ERROR;
        } else if (error.code === 'ECONNABORTED') {
          errorType = HttpErrorType.REQUEST_ABORTED;
        } else if (error.code === 'ESOCKETTIMEDOUT') {
          errorType = HttpErrorType.TIMEOUT_ERROR;
        } else if (
          (error.code as string).includes('SSL') ||
          (error.code as string).includes('TLS')
        ) {
          errorType = HttpErrorType.TLS_HANDSHAKE_ERROR;
        } else if ((error.code as string).includes('CERT')) {
          errorType = HttpErrorType.CERT_ERROR;
        }

        settle({
          success: false,
          error: createError(errorType, error),
        });
      });

      req.on('abort', () => {
        settle({
          success: false,
          error: createError(
            HttpErrorType.REQUEST_ABORTED,
            new Error('Request was aborted'),
            'ECONNABORTED',
          ),
        });
      });

      // Overall timeout
      timeoutHandle = setTimeout(() => {
        settle({
          success: false,
          error: createError(
            HttpErrorType.TIMEOUT_ERROR,
            new Error(`Request timeout after ${totalTimeout}ms`),
            'ETIMEDOUT',
          ),
        });
        req.destroy();
      }, totalTimeout);

      req.end();
    });
  }
}
