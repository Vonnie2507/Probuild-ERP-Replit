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
        "X-Api-Key": this.apiKey,
        "Content-Type": "application/json",
        "basiq-version": "3.0"
      },
      body: JSON.stringify({ scope: "SERVER_ACCESS" })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get Basiq access token: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    cachedToken = {
      accessToken: data.access_token,
      expiresAt: now + (data.expires_in * 1000) - 60000
    };

    return cachedToken.accessToken;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const token = await this.getAccessToken();
    
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
   * Create a CDR consent for Open Banking access
   * This is the ONLY way to connect to banks like Westpac Business
   * NO login credentials should ever be collected or sent
   */
  async createCDRConsent(businessName?: string, businessIdNo?: string): Promise<{ consentId: string; connectUrl: string }> {
    const redirectUri = process.env.BASIQ_REDIRECT_URI || 
      `${process.env.REPLIT_DOMAINS?.split(",")[0] ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}` : "http://localhost:5000"}/api/financial/callback`;

    console.log("Creating CDR consent with redirect URI:", redirectUri);

    const consentPayload = {
      type: "cdr",
      permissions: [
        "ACCOUNT_BASIC_ACCESS",
        "ACCOUNT_DETAIL",
        "TRANSACTION_DETAIL"
      ],
      businessName: businessName || BUSINESS_DETAILS.businessName,
      businessIdNo: businessIdNo || BUSINESS_DETAILS.businessIdNo,
      organisationType: BUSINESS_DETAILS.organisationType,
      sharingDuration: 365
    };

    console.log("CDR consent payload:", JSON.stringify(consentPayload, null, 2));

    const consent = await this.makeRequest("/consents", {
      method: "POST",
      body: JSON.stringify(consentPayload)
    });

    console.log("CDR consent created:", consent);

    const consentId = consent.id;
    
    // Generate the Basiq Connect URL for the user to authenticate
    const connectUrl = `https://connect.basiq.io/consent?consentId=${consentId}&redirect_uri=${encodeURIComponent(redirectUri)}`;

    return { consentId, connectUrl };
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
