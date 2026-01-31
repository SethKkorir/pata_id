const nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');

class EmailService {
  constructor() {
    const isProd = process.env.NODE_ENV === 'production';
    const hasGmail = process.env.SMTP_USER && process.env.SMTP_PASS;

    if (isProd || hasGmail) {
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, '') : '';

      console.log('📧 Configuring Gmail SMTP Service...');
      console.log(`👤 SMTP User: ${user ? `${user.substring(0, 3)}***${user.split('@')[1]}` : 'not set'}`);
      console.log(`🔑 SMTP Pass: ${pass ? `${pass.substring(0, 2)}***${pass.substring(pass.length - 2)}` : 'not set'}`);

      this.transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // use TLS
        auth: {
          user: user,
          pass: pass,
        },
      });
    } else {
      console.log('📧 Using Ethereal SMTP Service (Development)');
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
          user: 'test@ethereal.email',
          pass: 'test123',
        },
      });
    }
  }

  async sendEmail(options) {
    const {
      to,
      subject,
      template,
      context = {},
      attachments = [],
    } = options;

    try {
      // Render HTML template
      const html = await ejs.renderFile(
        path.join(__dirname, '../views/emails', `${template}.ejs`),
        context
      );

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'PataID <noreply@pataid.com>',
        to,
        subject,
        html,
        attachments,
      };

      const info = await this.transporter.sendMail(mailOptions);

      console.log('Email sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('Email send error:', error);
      throw error;
    }
  }

  // Specific email templates
  async sendVerificationEmail(user, verificationToken) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    return this.sendEmail({
      to: user.email,
      subject: 'Verify Your PataID Account',
      template: 'verify-email',
      context: {
        name: user.firstName,
        verificationUrl,
        year: new Date().getFullYear(),
      },
    });
  }

  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    return this.sendEmail({
      to: user.email,
      subject: 'Reset Your PataID Password',
      template: 'reset-password',
      context: {
        name: user.firstName,
        resetUrl,
        year: new Date().getFullYear(),
      },
    });
  }

  async sendIDFoundNotification(report, finder, owner) {
    const reportUrl = `${process.env.FRONTEND_URL}/claim/${report._id}`;

    return this.sendEmail({
      to: owner.email,
      subject: 'Your Lost ID Has Been Found!',
      template: 'id-found',
      context: {
        ownerName: owner.firstName,
        idType: report.idType === 'student' ? 'Student ID' : 'Staff ID',
        idNumber: report.maskedIdNumber,
        campus: report.campus,
        foundDate: new Date(report.foundAt).toLocaleDateString(),
        finderType: finder.finderType,
        reportUrl,
        year: new Date().getFullYear(),
      },
    });
  }

  async sendReportConfirmation(report, finder) {
    return this.sendEmail({
      to: finder.finderContact,
      subject: 'ID Report Confirmation - PataID',
      template: 'report-confirmation',
      context: {
        name: finder.finderType === 'public' ? 'Finder' : finder.firstName,
        reportNumber: report.reportNumber,
        idType: report.idType === 'student' ? 'Student ID' : 'Staff ID',
        fullName: report.fullName,
        campus: report.campus,
        reportUrl: `${process.env.FRONTEND_URL}/reports/${report._id}`,
        year: new Date().getFullYear(),
      },
    });
  }

  async sendClaimVerificationEmail(verification, user) {
    const claimUrl = `${process.env.FRONTEND_URL}/verify-claim?token=${verification.verificationToken}`;

    return this.sendEmail({
      to: user.email,
      subject: 'Complete Your ID Claim Verification',
      template: 'claim-verification',
      context: {
        name: user.firstName,
        claimUrl,
        expiresIn: '24 hours',
        year: new Date().getFullYear(),
      },
    });
  }
}

module.exports = new EmailService();