/**
 * External notification channels (SMS / email).
 *
 * STATUS: NOT CONFIGURED. No provider is integrated or tested. The functions below
 * report their status and never pretend to send. To enable a channel, implement
 * the provider call and supply the credentials listed in .env.example.
 */
export function externalChannelsStatus() {
  return {
    sms: { configured: false, reason: "نیاز به کلید سرویس پیامک (SMS_PROVIDER_API_KEY) و پیاده‌سازی آداپتر" },
    email: { configured: false, reason: "نیاز به تنظیمات SMTP و پیاده‌سازی آداپتر" },
  };
}

export async function sendSms(_to: string, _text: string): Promise<{ sent: false; reason: string }> {
  return { sent: false, reason: "SMS not configured" };
}

export async function sendEmail(_to: string, _subject: string, _body: string): Promise<{ sent: false; reason: string }> {
  return { sent: false, reason: "Email not configured" };
}
