import twilio from 'twilio';
import type { Twilio } from 'twilio';

let connectionSettings: any;
let twilioClientInstance: Twilio | null = null;
let twilioPhoneNumber: string | null = null;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (xReplitToken && hostname) {
    try {
      connectionSettings = await fetch(
        'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=twilio',
        {
          headers: {
            'Accept': 'application/json',
            'X_REPLIT_TOKEN': xReplitToken
          }
        }
      ).then(res => res.json()).then(data => data.items?.[0]);

      if (connectionSettings?.settings?.account_sid && 
          connectionSettings?.settings?.api_key && 
          connectionSettings?.settings?.api_key_secret) {
        return {
          accountSid: connectionSettings.settings.account_sid,
          apiKey: connectionSettings.settings.api_key,
          apiKeySecret: connectionSettings.settings.api_key_secret,
          phoneNumber: connectionSettings.settings.phone_number || null
        };
      }
    } catch (error) {
      console.log('Twilio connector not available, falling back to env vars');
    }
  }

  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    return {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER || null,
      useAuthToken: true
    };
  }

  return null;
}

export async function getTwilioClient(): Promise<Twilio | null> {
  if (twilioClientInstance) {
    return twilioClientInstance;
  }

  const credentials = await getCredentials();
  if (!credentials) {
    console.log('No Twilio credentials available');
    return null;
  }

  if ('useAuthToken' in credentials && credentials.useAuthToken) {
    twilioClientInstance = twilio(credentials.accountSid, credentials.authToken);
  } else if ('apiKey' in credentials) {
    twilioClientInstance = twilio(credentials.apiKey, credentials.apiKeySecret, {
      accountSid: credentials.accountSid
    });
  }

  twilioPhoneNumber = credentials.phoneNumber;
  return twilioClientInstance;
}

export async function getTwilioFromPhoneNumber(): Promise<string | null> {
  if (twilioPhoneNumber) {
    return twilioPhoneNumber;
  }

  const credentials = await getCredentials();
  if (!credentials) {
    return null;
  }

  twilioPhoneNumber = credentials.phoneNumber;
  return twilioPhoneNumber;
}

export async function sendSMS(
  to: string, 
  message: string
): Promise<{ sid: string } | null> {
  const client = await getTwilioClient();
  const fromNumber = await getTwilioFromPhoneNumber();

  if (!client || !fromNumber) {
    throw new Error('Twilio not configured');
  }

  const result = await client.messages.create({
    body: message,
    from: fromNumber,
    to
  });

  return { sid: result.sid };
}
