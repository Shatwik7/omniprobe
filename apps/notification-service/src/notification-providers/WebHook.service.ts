import { Injectable, Logger } from '@nestjs/common';
import { request } from 'http';
import { request as httpsRequest } from 'https';

@Injectable()
export class WebHookService {
  private readonly logger = new Logger("Notification: "+WebHookService.name);

  /**
   * Sends a POST request to a specified webhook URL
   * @param url The destination URL
   * @param title The alert title
   * @param message The alert message
   * @param metadata Additional data including Alert ID
   */
  async send(url: string, title: string, message: string, metadata: any = {}) {
    try {
      const payload = {
        event: 'alert.triggered',
        timestamp: new Date().toISOString(),
        title,
        message,
        data: metadata,
      };
      const data = JSON.stringify(payload);
      const urlObj = new URL(url);
      const requestFn = urlObj.protocol === 'https:' ? httpsRequest : request;

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          'User-Agent': 'OmniProbe-Notification-Service',
        },
        timeout: 5000, // 5 seconds timeout
      };

      return new Promise((resolve, reject) => {
        const req = requestFn(url, options, (res) => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            this.logger.log(
              `Webhook sent to ${url}. Status: ${res.statusCode} ${res.statusMessage}`,
            );
            resolve(true);
          } else {
            this.logger.error(
              `Failed to send Webhook to ${url}: Status ${res.statusCode}`,
            );
            resolve(false);
          }
        });

        req.on('error', (error) => {
          this.logger.error(`Error sending Webhook to ${url}: ${error.message}`);
          resolve(false);
        });

        req.on('timeout', () => {
          req.destroy();
          this.logger.error(`Webhook request to ${url} timed out`);
          resolve(false);
        });

        req.write(data);
        req.end();
      });
    } catch (error) {
      this.logger.error(`Unexpected error sending Webhook: ${error}`);
      return false;
    }
  }
}
