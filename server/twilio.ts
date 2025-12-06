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

// ============================================
// VOICE CALL FUNCTIONS
// ============================================

// Format phone number to E.164 format for Twilio
function formatPhoneNumberE164(phoneNumber: string): string {
  // Remove all non-digit characters except leading +
  let cleaned = phoneNumber.replace(/[^\d+]/g, '');
  
  // If it starts with +, assume it's already in E.164
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // Australian number handling (default)
  if (cleaned.startsWith('0')) {
    // Remove leading 0 and add +61 for Australia
    cleaned = '+61' + cleaned.substring(1);
  } else if (cleaned.startsWith('61')) {
    // Already has country code, just add +
    cleaned = '+' + cleaned;
  } else if (cleaned.length === 9) {
    // 9 digits - likely Australian mobile without leading 0
    cleaned = '+61' + cleaned;
  } else {
    // Default to adding + if it looks international
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
}

export interface MakeCallOptions {
  to: string;
  webhookBaseUrl: string;
  staffUserId?: string;
  leadId?: string;
  clientId?: string;
}

export async function makeOutboundCall(options: MakeCallOptions): Promise<{ sid: string } | null> {
  const client = await getTwilioClient();
  const fromNumber = await getTwilioFromPhoneNumber();

  if (!client || !fromNumber) {
    throw new Error('Twilio not configured');
  }

  const formattedNumber = formatPhoneNumberE164(options.to);
  console.log(`Making outbound call to ${options.to} -> formatted: ${formattedNumber}`);

  const statusCallbackUrl = `${options.webhookBaseUrl}/api/twilio/voice/status`;
  const voiceUrl = `${options.webhookBaseUrl}/api/twilio/voice/outbound`;

  const callParams: any = {
    to: formattedNumber,
    from: fromNumber,
    url: voiceUrl,
    statusCallback: statusCallbackUrl,
    statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
    statusCallbackMethod: 'POST',
    record: true,
    recordingStatusCallback: `${options.webhookBaseUrl}/api/twilio/voice/recording`,
    recordingStatusCallbackMethod: 'POST',
  };

  const call = await client.calls.create(callParams);

  return { sid: call.sid };
}

export function generateTwimlForInbound(options: {
  greeting?: string;
  webhookBaseUrl: string;
  callId?: string;
  callSid?: string;
}): string {
  const { VoiceResponse } = twilio.twiml;
  const response = new VoiceResponse();
  
  if (options.greeting) {
    response.say({ voice: 'Polly.Matthew' }, options.greeting);
  }

  // Add Media Stream for real-time transcription if we have call info
  if (options.callId && options.callSid) {
    const wsUrl = options.webhookBaseUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    const start = response.start() as any;
    start.stream({
      url: `${wsUrl}/api/twilio/media-stream?callSid=${options.callSid}&callId=${options.callId}`,
      track: 'both_tracks'
    });
  }
  
  response.dial({
    record: 'record-from-answer-dual',
    recordingStatusCallback: `${options.webhookBaseUrl}/api/twilio/voice/recording`,
    recordingStatusCallbackMethod: 'POST'
  });

  return response.toString();
}

export function generateTwimlForOutbound(options: {
  greeting?: string;
  webhookBaseUrl?: string;
  callId?: string;
  callSid?: string;
}): string {
  const { VoiceResponse } = twilio.twiml;
  const response = new VoiceResponse();
  
  if (options.greeting) {
    response.say({ voice: 'Polly.Matthew' }, options.greeting);
  }

  // Add Media Stream for real-time transcription if we have call info
  if (options.callId && options.callSid && options.webhookBaseUrl) {
    const wsUrl = options.webhookBaseUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    const start = response.start() as any;
    start.stream({
      url: `${wsUrl}/api/twilio/media-stream?callSid=${options.callSid}&callId=${options.callId}`,
      track: 'both_tracks'
    });
  }

  return response.toString();
}

export async function getCallRecording(callSid: string): Promise<{
  recordingUrl: string;
  recordingSid: string;
  duration: number;
} | null> {
  const client = await getTwilioClient();
  if (!client) {
    return null;
  }

  try {
    const recordings = await client.recordings.list({ callSid, limit: 1 });
    if (recordings.length === 0) {
      return null;
    }

    const recording = recordings[0];
    return {
      recordingUrl: `https://api.twilio.com${recording.uri.replace('.json', '.mp3')}`,
      recordingSid: recording.sid,
      duration: recording.duration ? parseInt(recording.duration) : 0,
    };
  } catch (error) {
    console.error('Failed to get call recording:', error);
    return null;
  }
}
