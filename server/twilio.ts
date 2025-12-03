import twilio from 'twilio';
import type { Twilio } from 'twilio';

let connectionSettings: any;
let twilioClientInstance: Twilio | null = null;
let twilioPhoneNumber: string | null = null;

// Clear cached client to force re-initialization with new credentials
export function clearTwilioCache() {
  twilioClientInstance = null;
  twilioPhoneNumber = null;
  connectionSettings = null;
  console.log('Twilio cache cleared');
}

async function getCredentials() {
  // PRIORITY 1: Check for Auth Token in environment variables (works with global US1 endpoint for SMS)
  // This is needed because AU regional API Keys don't support SMS
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    console.log('Twilio using env var Auth Token credentials (global endpoint for SMS)');
    return {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER || null,
      useAuthToken: true
    };
  }

  // PRIORITY 2: Try the Replit connector (may not work for SMS if regional)
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

      const settings = connectionSettings?.settings;
      console.log('Twilio connector all settings keys:', Object.keys(settings || {}));
      
      const accountSid = settings?.account_sid;
      const authToken = settings?.auth_token;
      const apiKey = settings?.api_key;
      const apiKeySecret = settings?.api_key_secret;
      const phoneNumber = settings?.phone_number || null;
      
      console.log('Twilio connector settings available:');
      console.log('  - account_sid:', !!accountSid);
      console.log('  - auth_token:', !!authToken);
      console.log('  - api_key:', !!apiKey);
      console.log('  - api_key_secret:', !!apiKeySecret);
      console.log('  - phone_number:', phoneNumber);
      
      // Prefer Auth Token if available
      if (accountSid && authToken) {
        console.log('Using Auth Token authentication');
        return {
          accountSid,
          authToken,
          phoneNumber,
          useAuthToken: true
        };
      }
      
      // Fall back to API Key authentication
      if (accountSid && apiKey && apiKeySecret) {
        console.log('Using API Key authentication');
        return {
          accountSid,
          apiKey,
          apiKeySecret,
          phoneNumber,
          useApiKey: true
        };
      }
      
      console.log('Twilio connector settings incomplete - for SMS, add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER as secrets');
    } catch (error) {
      console.log('Twilio connector error:', error);
    }
  }

  console.log('No Twilio credentials found - add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER as secrets');
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
    // Use global endpoint (US1) for Auth Token - SMS only works on global endpoint
    twilioClientInstance = twilio(credentials.accountSid, credentials.authToken);
    console.log('Twilio client initialized with Auth Token (global endpoint for SMS)');
  } else if ('useApiKey' in credentials && credentials.useApiKey) {
    // Use API Key authentication - use global endpoint (AU region doesn't support SMS)
    twilioClientInstance = twilio(credentials.apiKey, credentials.apiKeySecret, {
      accountSid: credentials.accountSid
    });
    console.log('Twilio client initialized with API Key (global endpoint)');
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
