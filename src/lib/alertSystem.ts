import { getDatabase, ref, get, set, update } from 'firebase/database';

interface AlertSubscription {
  reference: string;
  userId: string;
  productId: string;
  email: string;
  phone: string | null;
  status: 'active' | 'triggered' | 'failed';
  createdAt: string;
  triggeredAt: string | null;
}

interface AlertResult {
  success: boolean;
  channel?: 'sms' | 'whatsapp';
  error?: string;
}

/**
 * Alert System for Early Placement Notifications
 * Handles SMS and WhatsApp alerts for BECE results
 * NOTE: This file is legacy Twilio-based code. Current implementation uses Arkesel API.
 * This file is kept for reference but not actively used.
 */
export class AlertSystem {
  private twilioClient: any = null;
  private whatsappClient: any = null;

  constructor() {
    // Initialize Twilio client if credentials are available
    // DISABLED: Using Arkesel instead
    // if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    //   this.initializeTwilio();
    // }
  }

  private async initializeTwilio() {
    // DISABLED: Using Arkesel instead
    // try {
    //   const twilio = await import('twilio');
    //   this.twilioClient = twilio(
    //     process.env.TWILIO_ACCOUNT_SID,
    //     process.env.TWILIO_AUTH_TOKEN
    //   );
    // } catch (error) {
    //   console.error('Failed to initialize Twilio client:', error);
    // }
  }

  /**
   * Subscribe user to placement alerts
   */
  async subscribeToAlerts(subscription: AlertSubscription): Promise<boolean> {
    try {
      const db = getDatabase();
      const alertRef = ref(db, `alerts/${subscription.reference}`);

      // Check if subscription already exists
      const snapshot = await get(alertRef);
      if (snapshot.exists()) {
        console.log(`Alert subscription ${subscription.reference} already exists`);
        return true;
      }

      // Validate phone number if provided
      if (subscription.phone) {
        const isValidPhone = this.validatePhoneNumber(subscription.phone);
        if (!isValidPhone) {
          throw new Error('Invalid phone number format');
        }
      }

      // Create subscription
      await set(alertRef, {
        ...subscription,
        status: 'active',
        createdAt: new Date().toISOString()
      });

      // Send confirmation message
      if (subscription.phone) {
        await this.sendConfirmationMessage(subscription);
      }

      return true;
    } catch (error) {
      console.error('Alert subscription error:', error);
      return false;
    }
  }

  /**
   * Trigger placement alerts for all active subscriptions
   * Called when GES releases BECE results
   */
  async triggerPlacementAlerts(resultsData: any): Promise<AlertResult[]> {
    try {
      const db = getDatabase();
      const alertsRef = ref(db, 'alerts');
      const snapshot = await get(alertsRef);

      if (!snapshot.exists()) {
        return [];
      }

      const alerts = snapshot.val();
      const results: AlertResult[] = [];

      // Process each active alert subscription
      for (const [reference, alert] of Object.entries(alerts)) {
        const alertData = alert as AlertSubscription;

        if (alertData.status !== 'active') {
          continue;
        }

        try {
          // Generate personalized message
          const message = this.generatePlacementMessage(alertData.userId, resultsData);

          // Send via preferred channel (SMS or WhatsApp)
          let result: AlertResult;
          if (alertData.phone && this.shouldUseWhatsApp(alertData.phone)) {
            result = await this.sendWhatsAppMessage(alertData.phone, message);
          } else if (alertData.phone) {
            result = await this.sendSMS(alertData.phone, message);
          } else {
            result = { success: false, error: 'No phone number provided' };
          }

          if (result.success) {
            // Update alert status
            await update(ref(db, `alerts/${reference}`), {
              status: 'triggered',
              triggeredAt: new Date().toISOString()
            });
          }

          results.push(result);

          // Rate limiting to prevent overwhelming the API
          await this.delay(100);
        } catch (error) {
          console.error(`Failed to process alert ${reference}:`, error);
          results.push({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Alert triggering error:', error);
      return [];
    }
  }

  /**
   * Send SMS via Twilio
   */
  private async sendSMS(phone: string, message: string): Promise<AlertResult> {
    if (!this.twilioClient) {
      return {
        success: false,
        error: 'Twilio client not initialized'
      };
    }

    try {
      const result = await this.twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
      });

      return {
        success: true,
        channel: 'sms'
      };
    } catch (error) {
      console.error('SMS sending error:', error);
      return {
        success: false,
        channel: 'sms',
        error: error instanceof Error ? error.message : 'SMS sending failed'
      };
    }
  }

  /**
   * Send WhatsApp message
   */
  private async sendWhatsAppMessage(phone: string, message: string): Promise<AlertResult> {
    if (!this.twilioClient) {
      return {
        success: false,
        error: 'Twilio client not initialized'
      };
    }

    try {
      const result = await this.twilioClient.messages.create({
        body: message,
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        to: `whatsapp:${phone}`
      });

      return {
        success: true,
        channel: 'whatsapp'
      };
    } catch (error) {
      console.error('WhatsApp sending error:', error);
      // Fallback to SMS if WhatsApp fails
      return await this.sendSMS(phone, message);
    }
  }

  /**
   * Send confirmation message after subscription
   */
  private async sendConfirmationMessage(subscription: AlertSubscription): Promise<void> {
    if (!subscription.phone) return;

    const message = `✅ You're now subscribed to ChanceSHS placement alerts!\n\nWe'll notify you instantly when BECE results are released.\n\nReply STOP to opt out.`;

    if (this.shouldUseWhatsApp(subscription.phone)) {
      await this.sendWhatsAppMessage(subscription.phone, message);
    } else {
      await this.sendSMS(subscription.phone, message);
    }
  }

  /**
   * Generate personalized placement message
   */
  private generatePlacementMessage(userId: string, resultsData: any): string {
    // In a real implementation, fetch user's prediction data
    // and personalize the message with their school choices
    
    return `🎉 BECE RESULTS RELEASED!\n\nYour placement results are now available.\n\nCheck your ChanceSHS report for detailed analysis.\n\nChanceSHS - Your Placement Intelligence Partner`;
  }

  /**
   * Validate Ghana phone number format
   */
  private validatePhoneNumber(phone: string): boolean {
    // Ghana phone numbers: +233 or 0 followed by 9 digits
    const ghanaPhoneRegex = /^(\+233|0)?[2-9]\d{8}$/;
    return ghanaPhoneRegex.test(phone.replace(/\s/g, ''));
  }

  /**
   * Determine if WhatsApp should be used
   * Prefer WhatsApp for better delivery and lower cost
   */
  private shouldUseWhatsApp(phone: string): boolean {
    // Use WhatsApp if number is registered and WhatsApp is available
    return process.env.TWILIO_WHATSAPP_NUMBER !== undefined;
  }

  /**
   * Rate limiting delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Queue system for bulk messaging
   * Processes alerts in batches to handle high volume
   */
  async queueBulkAlerts(alerts: AlertSubscription[], batchSize: number = 50): Promise<void> {
    for (let i = 0; i < alerts.length; i += batchSize) {
      const batch = alerts.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(alert => this.subscribeToAlerts(alert))
      );
      
      // Delay between batches to respect rate limits
      if (i + batchSize < alerts.length) {
        await this.delay(1000);
      }
    }
  }

  /**
   * Retry failed alerts with exponential backoff
   */
  async retryFailedAlerts(reference: string, maxRetries: number = 3): Promise<boolean> {
    const db = getDatabase();
    const alertRef = ref(db, `alerts/${reference}`);
    const snapshot = await get(alertRef);

    if (!snapshot.exists()) {
      return false;
    }

    const alertData = snapshot.val() as AlertSubscription;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!alertData.phone) {
          console.error(`Alert ${reference} has no phone number`);
          return false;
        }
        const message = this.generatePlacementMessage(alertData.userId, {});
        const result = await this.sendSMS(alertData.phone, message);

        if (result.success) {
          await update(alertRef, {
            status: 'triggered',
            triggeredAt: new Date().toISOString()
          });
          return true;
        }

        // Exponential backoff
        await this.delay(Math.pow(2, attempt) * 1000);
      } catch (error) {
        console.error(`Retry attempt ${attempt} failed for alert ${reference}:`, error);
      }
    }

    return false;
  }

  /**
   * Get alert subscription status
   */
  async getAlertStatus(reference: string): Promise<AlertSubscription | null> {
    try {
      const db = getDatabase();
      const alertRef = ref(db, `alerts/${reference}`);
      const snapshot = await get(alertRef);

      if (!snapshot.exists()) {
        return null;
      }

      return snapshot.val() as AlertSubscription;
    } catch (error) {
      console.error('Alert status check error:', error);
      return null;
    }
  }

  /**
   * Unsubscribe from alerts
   */
  async unsubscribeFromAlerts(reference: string): Promise<boolean> {
    try {
      const db = getDatabase();
      const alertRef = ref(db, `alerts/${reference}`);
      
      await update(alertRef, {
        status: 'unsubscribed',
        unsubscribedAt: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error('Alert unsubscribe error:', error);
      return false;
    }
  }
}

// Export singleton instance
export const alertSystem = new AlertSystem();
