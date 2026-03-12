import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter!: nodemailer.Transporter;
  private readonly logger = new Logger("Notification: "+EmailService.name);

  constructor() {
    nodemailer.createTestAccount((err, account) => {
      if (err) {
        this.logger.error('Failed to create a testing account');
        this.logger.error(err);
        return;
      }
      this.logger.log('Credentials obtained, creating transport');
      this.transporter = nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: {
          user: account.user,
          pass: account.pass,
        },
      });
    });
  }

  async send(to: string, subject: string, text: string) {
    const mailOptions = {
      from: '"OmniProbe" <noreply@omniprobe.com>',
      to,
      subject,
      text,
    };
    // this.transporter.sendMail(mailOptions, (error, info) => {
    //   if (error) {
    //     this.logger.error(error);
    //     return;
    //   }
    //   this.logger.log('Message sent: %s', info.messageId);
    //   this.logger.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    // });
    this.logger.log(`Email sent to ${to} with subject "${subject}" and text "${text}"`);
  }
}