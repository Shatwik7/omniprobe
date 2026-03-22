import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';

@Injectable()
export class SmsService {
    private readonly logger = new Logger(SmsService.name);
    private readonly twilioClient: twilio.Twilio;
    private readonly twilioPhoneNumber: string;

    constructor(private readonly configService: ConfigService) {
        // Note: In a production app, use @nestjs/config to inject these securely
        const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID') || '';
        const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN') || '';

        this.twilioPhoneNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER') || '';
        this.twilioClient = twilio(accountSid, authToken);
    }

    /**
     * Send an SMS message to a specific phone number
     * @param to The recipient's phone number (must include country code, e.g., '+1234567890')
     * @param body The text content of the SMS
     */
    async sendSms(to: string, body: string) {
        try {
            const message = await this.twilioClient.messages.create({
                body: body,
                from: this.twilioPhoneNumber,
                to: to,
            });

            this.logger.log(`SMS sent successfully to ${to}. SID: ${message.sid}`);
            return { success: true, messageId: message.sid };
        } catch (error: any) {
            this.logger.error(`Failed to send SMS to ${to}:`, error.message || error);
            throw error;
        }
    }
}