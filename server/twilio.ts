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

  console.log('Twilio getCredentials - hostname:', hostname ? 'present' : 'missing');
  console.log('Twilio getCredentials - token type:', xReplitToken ? (process.env.REPL_IDENTITY ? 'repl' : 'depl') : 'none');

  if (xReplitToken && hostname) {
    try {
      const response = await fetch(
        'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=twilio',
        {
          headers: {
            'Accept': 'application/json',
            'X_REPLIT_TOKEN': xReplitToken
          }
        }
      );
      
      const data = await response.json();
      console.log('Twilio connector response status:', response.status);
      console.log('Twilio connector data items:', data.items?.length || 0);
      
      connectionSettings = data.items?.[0];

      if (connectionSettings?.settings?.account_sid && 
          connectionSettings?.settings?.api_key && 
          connectionSettings?.settings?.api_key_secret) {
        const accountSid = connectionSettings.settings.account_sid;
        const apiKey = connectionSettings.settings.api_key;
        const apiKeySecret = connectionSettings.settings.api_key_secret;
        const phoneNumber = connectionSettings.settings.phone_number || null;
        
        console.log('Twilio credentials format check:');
        console.log('  - account_sid format valid:', accountSid?.startsWith('AC') && accountSid?.length === 34);
        console.log('  - api_key format valid:', apiKey?.startsWith('SK') && apiKey?.length === 34);
        console.log('  - api_key_secret present:', !!apiKeySecret && apiKeySecret.length > 0);
        console.log('  - phone_number present:', !!phoneNumber);
        
        return {
          accountSid,
          apiKey,
          apiKeySecret,
          phoneNumber
        };
      } else {
        console.log('Twilio connector settings incomplete:', {
          hasAccountSid: !!connectionSettings?.settings?.account_sid,
          hasApiKey: !!connectionSettings?.settings?.api_key,
          hasApiKeySecret: !!connectionSettings?.settings?.api_key_secret
        });
      }
    } catch (error) {
      console.log('Twilio connector error:', error);
    }
  }

  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    console.log('Twilio using env var credentials');
    return {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER || null,
      useAuthToken: true
    };
  }

  console.log('No Twilio credentials found');
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
