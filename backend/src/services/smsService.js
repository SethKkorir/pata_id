const twilio = require('twilio');

class SMSService {
  constructor() {
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    } else {
      console.warn('Twilio credentials not found. SMS service disabled.');
      this.client = null;
    }
  }

  async sendSMS(to, body) {
    if (!this.client) {
      console.log('SMS (disabled):', { to, body });
      return { success: false, message: 'SMS service not configured' };
    }

    try {
      const message = await this.client.messages.create({
        body,
        from: process.env.TWILIO_PHONE_NUMBER,
        to,
      });

      console.log('SMS sent:', message.sid);
      return { success: true, messageId: message.sid };
    } catch (error) {
      console.error('SMS send error:', error);
      throw error;
    }
  }

  // Security guard specific SMS
  async sendSecurityGuardLoginOTP(phone, otp) {
    const body = `Your PataID security login OTP is: ${otp}. Valid for 10 minutes.`;
    return this.sendSMS(phone, body);
  }

  async sendSecurityGuardReportNotification(phone, reportNumber, location) {
    const body = `New ID found at ${location}. Report #${reportNumber}. Please verify at security desk.`;
    return this.sendSMS(phone, body);
  }

  // User notifications
  async sendIDFoundSMS(phone, reportNumber, campus) {
    const body = `Your lost ID has been found at ${campus} campus. Report #${reportNumber}. Visit PataID to claim.`;
    return this.sendSMS(phone, body);
  }

  async sendClaimVerificationSMS(phone, otp) {
    const body = `Your PataID verification code is: ${otp}. Valid for 10 minutes.`;
    return this.sendSMS(phone, body);
  }
}

module.exports = new SMSService();