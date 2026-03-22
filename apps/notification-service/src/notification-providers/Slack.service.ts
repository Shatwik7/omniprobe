import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LogLevel, WebClient } from '@slack/web-api';

@Injectable()
export class SlackService {
    private readonly logger = new Logger(SlackService.name);
    private readonly slackClient: WebClient

    constructor(private readonly configService: ConfigService) {
        const token = this.configService.get<string>('SLACK_BOT_TOKEN') || '';
        this.slackClient = new WebClient(token, {
            // Override the default logger to use NestJS's Logger
            logger: {
                debug: (msg) => this.logger.debug(msg),
                info: (msg) => this.logger.log(msg),
                warn: (msg) => this.logger.warn(msg),
                error: (msg) => this.logger.error(msg),
                setLevel: function (level: LogLevel): void {
                    throw new Error('Function not implemented.');
                },
                getLevel: function (): LogLevel {
                    throw new Error('Function not implemented.');
                },
                setName: function (name: string): void {
                    throw new Error('Function not implemented.');
                }
            },
        });
    }

    /**
     * Send a message to a Channel ID or User ID
     * @param destinationId The Channel ID (e.g., 'C12345') or User ID (e.g., 'U12345')
     * @param text The message content
     */
    async sendMessageToId(destinationId: string, text: string) {
        try {
            const result = await this.slackClient.chat.postMessage({
                channel: destinationId,
                text: text,
            });
            this.logger.log(`Message sent successfully to ${destinationId}`);
            return result;
        } catch (error) {
            this.logger.error(`Error sending message to ${destinationId}:`, error);
            throw error;
        }
    }

    /**
     * Look up a user by their email address and send them a Direct Message
     * @param email The user's email address
     * @param text The message content
     */
    async sendMessageToEmail(email: string, text: string) {
        try {
            //Look up the user by email to get their Slack User ID
            const userLookup = await this.slackClient.users.lookupByEmail({ email });

            if (!userLookup.ok || !userLookup.user?.id) {
                throw new Error('User not found in Slack');
            }

            const userId = userLookup.user.id;

            // Send the message using the retrieved User ID
            return await this.sendMessageToId(userId, text);
        } catch (error) {
            this.logger.error(`Error sending message to email ${email}:`, error);
            throw error;
        }
    }
}