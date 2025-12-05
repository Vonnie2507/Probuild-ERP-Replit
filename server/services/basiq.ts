import { db } from "../db";
import { bankConnections, bankAccounts, bankTransactions } from "@shared/schema";
import { eq } from "drizzle-orm";

const BASIQ_BASE_URL = "https://au-api.basiq.io";

// Probuild PVC business details for CDR consent
const BUSINESS_DETAILS = {
  businessName: "Probuild PVC",
  businessIdNo: "29688327479",
  organisationType: "COMPANY"
};

interface BasiqToken {
  accessToken: string;
  expiresAt: number;
}

let cachedToken: BasiqToken | null = null;

export class BasiqService {
  private apiKey: string;

  constructor() {
    const apiKey = process.env.BASIQ_API_KEY;
    if (!apiKey) {
      throw new Error("BASIQ_API_KEY environment variable is not set");
    }
    this.apiKey = apiKey;
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    
    if (cachedToken && cachedToken.expiresAt > now + 60000) {
      return cachedToken.accessToken;
    }

    const response = await fetch(`${BASIQ_BASE_URL}/token`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${this.apiKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "basiq-version": "3.0"
      },
      body: "scope=SERVER_ACCESS"
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get Basiq access token: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    console.log("Token response data:", JSON.stringify(data, null, 2));
    console.log("Access token type:", typeof data.access_token);
    console.log("Access token length:", data.access_token?.length);
    console.log("Access token first 50 chars:", data.access_token?.substring(0, 50));
    
    cachedToken = {
      accessToken: data.access_token,
      expiresAt: now + (data.expires_in * 1000) - 60000
    };

    return cachedToken.accessToken;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    // Get SERVER_ACCESS token for API calls
    const token = await this.getAccessToken();
    
    console.log("Making request with Bearer token to:", endpoint);
    
    const response = await fetch(`${BASIQ_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json",
        "Content-Type": "application/json",
        "basiq-version": "3.0",
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Basiq API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Get CLIENT_ACCESS token bound to a specific userId
   * This is required for accessing the Consent UI
   */
  private async getClientAccessToken(userId: string): Promise<string> {
    console.log("Getting CLIENT_ACCESS token for userId:", userId);
    
    const response = await fetch(`${BASIQ_BASE_URL}/token`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${this.apiKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "basiq-version": "3.0"
      },
      body: `scope=CLIENT_ACCESS&userId=${userId}`
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get client access token: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("Client token obtained successfully");
    return data.access_token;
  }

  /**
   * Create a Basiq user (required before consent)
   * Requires email or mobile + businessName
   */
  async createUser(businessName?: string, email?: string, mobile?: string): Promise<string> {
    console.log("Creating Basiq user for business:", businessName || BUSINESS_DETAILS.businessName);
    
    // Use provided values or fall back to environment variables
    const contactEmail = email || process.env.BASIQ_CONTACT_EMAIL;
    const contactMobile = mobile || process.env.BASIQ_CONTACT_MOBILE;
    const contactBusinessName = businessName || BUSINESS_DETAILS.businessName;
    
    if (!contactEmail && !contactMobile) {
      throw new Error("Basiq user creation requires either email or mobile. Set BASIQ_CONTACT_EMAIL or BASIQ_CONTACT_MOBILE environment variables.");
    }
    
    const userData: any = {
      businessName: contactBusinessName
    };
    if (contactEmail) userData.email = contactEmail;
    if (contactMobile) userData.mobile = contactMobile;
    
    console.log("User data payload:", userData);
    
    const user = await this.makeRequest("/users", {
      method: "POST",
      body: JSON.stringify(userData)
    });
    
    console.log("User created with ID:", user.id);
    return user.id;
  }

  /**
   * Create a CDR consent for Open Banking access
   * This uses the Basiq Consent UI flow:
   * 1. Create a Basiq user
   * 2. Get a CLIENT_ACCESS token bound to that user
   * 3. Return the Consent UI URL for the user to complete consent
   */
  async createCDRConsent(
    businessName?: string,
    businessIdNo?: string,
    organisationType?: string,
    sharingDuration?: number,
    email?: string
  ): Promise<{ userId: string; connectUrl: string }> {
    console.log("Starting CDR consent flow with params:", {
      businessName,
      businessIdNo,
      organisationType,
      sharingDuration,
      email
    });
    
    const finalBusinessName = businessName || BUSINESS_DETAILS.businessName;
    const finalEmail = email || process.env.BASIQ_CONTACT_EMAIL;
    
    // Step 1: Create a Basiq user with business name and contact email
    const userId = await this.createUser(finalBusinessName, finalEmail);
    console.log("Created Basiq user:", userId);
    
    // Step 2: Get a CLIENT_ACCESS token bound to this user
    const clientToken = await this.getClientAccessToken(userId);
    console.log("Got client token for user");
    
    // Step 3: Generate the Basiq Consent UI URL
    // The Consent UI handles all the CDR complexity including bank selection
    const connectUrl = `https://consent.basiq.io/home?token=${clientToken}`;
    
    console.log("Consent UI URL generated");

    return { userId, connectUrl };
  }

  /**
   * Get the status of a consent
   */
  async getConsent(consentId: string): Promise<any> {
    return this.makeRequest(`/consents/${consentId}`);
  }

  /**
   * Get accounts associated with a consent
   */
  async getAccountsByConsent(consentId: string): Promise<any[]> {
    const data = await this.makeRequest(`/consents/${consentId}/accounts`);
    return data.data || [];
  }

  /**
   * Get institutions list (for display purposes only)
   */
  async getInstitutions(): Promise<any[]> {
    const data = await this.makeRequest("/institutions");
    return data.data || [];
  }

  /**
   * Get transactions for a consent
   */
  async getTransactionsByConsent(consentId: string, filters?: {
    accountId?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
  }): Promise<any[]> {
    let endpoint = `/consents/${consentId}/transactions`;
    const queryParams: string[] = [];

    if (filters?.accountId) {
      queryParams.push(`filter=account.id.eq('${filters.accountId}')`);
    }
    if (filters?.fromDate) {
      queryParams.push(`filter=transaction.postDate.gteq('${filters.fromDate}')`);
    }
    if (filters?.toDate) {
      queryParams.push(`filter=transaction.postDate.lteq('${filters.toDate}')`);
    }
    if (filters?.limit) {
      queryParams.push(`limit=${filters.limit}`);
    }

    if (queryParams.length > 0) {
      endpoint += `?${queryParams.join("&")}`;
    }

    const allTransactions: any[] = [];
    let nextUrl: string | null = endpoint;

    while (nextUrl) {
      const data = await this.makeRequest(nextUrl);
      allTransactions.push(...(data.data || []));
      
      nextUrl = data.links?.next ? new URL(data.links.next).pathname + new URL(data.links.next).search : null;
      
      if (filters?.limit && allTransactions.length >= filters.limit) {
        break;
      }
    }

    return allTransactions;
  }

  /**
   * Sync accounts from Basiq to local database using consent ID
   */
  async syncAccountsToDatabase(connectionId: string): Promise<void> {
    const connection = await db.select().from(bankConnections)
      .where(eq(bankConnections.id, connectionId))
      .limit(1);

    if (!connection[0]) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    const { basiqConsentId } = connection[0];
    if (!basiqConsentId) {
      throw new Error(`Connection ${connectionId} has no consent ID`);
    }

    const accounts = await this.getAccountsByConsent(basiqConsentId);

    for (const account of accounts) {
      const existingAccount = await db.select().from(bankAccounts)
        .where(eq(bankAccounts.basiqAccountId, account.id))
        .limit(1);

      const accountData = {
        connectionId,
        basiqAccountId: account.id,
        name: account.name || "Unknown Account",
        accountHolder: account.accountHolder,
        accountNumberMasked: account.accountNo?.replace(/\d(?=\d{4})/g, "*"),
        bsbMasked: account.bsb?.replace(/\d(?=\d{2})/g, "*"),
        accountType: this.mapAccountType(account.class?.type),
        currency: account.currency || "AUD",
        balance: account.balance,
        availableFunds: account.availableFunds,
        lastUpdatedAt: account.lastUpdated ? new Date(account.lastUpdated) : new Date(),
        isActive: account.status === "available"
      };

      if (existingAccount[0]) {
        await db.update(bankAccounts)
          .set(accountData)
          .where(eq(bankAccounts.id, existingAccount[0].id));
      } else {
        await db.insert(bankAccounts).values(accountData);
      }
    }
  }

  /**
   * Sync transactions from Basiq to local database
   */
  async syncTransactionsToDatabase(accountId: string, fromDate?: string): Promise<number> {
    const account = await db.select().from(bankAccounts)
      .where(eq(bankAccounts.id, accountId))
      .limit(1);

    if (!account[0]) {
      throw new Error(`Account ${accountId} not found`);
    }

    const connection = await db.select().from(bankConnections)
      .where(eq(bankConnections.id, account[0].connectionId))
      .limit(1);

    if (!connection[0]?.basiqConsentId) {
      throw new Error("Connection has no consent ID");
    }

    const transactions = await this.getTransactionsByConsent(connection[0].basiqConsentId, {
      accountId: account[0].basiqAccountId,
      fromDate,
      limit: 500
    });

    let importedCount = 0;

    for (const tx of transactions) {
      const existingTx = await db.select().from(bankTransactions)
        .where(eq(bankTransactions.basiqTransactionId, tx.id))
        .limit(1);

      if (existingTx[0]) {
        continue;
      }

      const amount = parseFloat(tx.amount) || 0;
      
      await db.insert(bankTransactions).values({
        accountId,
        basiqTransactionId: tx.id,
        description: tx.description || "No description",
        amount: Math.abs(amount).toString(),
        direction: amount < 0 ? "debit" : "credit",
        status: tx.status || "posted",
        transactionDate: tx.transactionDate ? new Date(tx.transactionDate) : null,
        postDate: tx.postDate ? new Date(tx.postDate) : null,
        category: tx.class?.category,
        subCategory: tx.subClass?.title,
        merchantName: tx.enrich?.merchant?.businessName,
        merchantLocation: tx.enrich?.location?.formattedAddress,
        runningBalance: tx.balance,
        rawData: tx
      });

      importedCount++;
    }

    return importedCount;
  }

  private mapAccountType(basiqType?: string): "transaction" | "savings" | "credit_card" | "loan" | "mortgage" | "investment" | "term_deposit" | "other" {
    const typeMap: Record<string, any> = {
      "transaction": "transaction",
      "savings": "savings",
      "credit-card": "credit_card",
      "credit": "credit_card",
      "loan": "loan",
      "mortgage": "mortgage",
      "investment": "investment",
      "term-deposit": "term_deposit",
      "term_deposit": "term_deposit"
    };

    return typeMap[basiqType?.toLowerCase() || ""] || "other";
  }
}

export const basiqService = new BasiqService();
