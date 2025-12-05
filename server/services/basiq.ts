import { db } from "../db";
import { bankConnections, bankAccounts, bankTransactions } from "@shared/schema";
import { eq } from "drizzle-orm";

const BASIQ_BASE_URL = "https://au-api.basiq.io";

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

  async getInstitutions(): Promise<any[]> {
    const data = await this.makeRequest("/institutions");
    return data.data || [];
  }

  async getInstitutionByName(name: string): Promise<any | null> {
    const institutions = await this.getInstitutions();
    const lowerName = name.toLowerCase();
    
    return institutions.find((inst: any) => 
      inst.name?.toLowerCase().includes(lowerName) ||
      inst.shortName?.toLowerCase().includes(lowerName)
    ) || null;
  }

  async createUser(email: string, mobile?: string, businessName?: string, abn?: string): Promise<any> {
    const body: any = { 
      email,
      businessName: businessName || "Probuild PVC",
      abn: abn || process.env.PROBUILD_ABN || "11111111111" // Placeholder ABN for testing
    };
    if (mobile) {
      body.mobile = mobile;
    }

    return this.makeRequest("/users", {
      method: "POST",
      body: JSON.stringify(body)
    });
  }

  async getUser(userId: string): Promise<any> {
    return this.makeRequest(`/users/${userId}`);
  }

  async getClientToken(userId: string): Promise<string> {
    // Get a CLIENT_ACCESS token bound to a specific user for the consent UI
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
      throw new Error(`Failed to get Basiq client token: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.access_token;
  }

  async createConnection(userId: string, institutionId: string, loginId: string, password: string): Promise<any> {
    return this.makeRequest(`/users/${userId}/connections`, {
      method: "POST",
      body: JSON.stringify({
        loginId,
        password,
        institution: { id: institutionId }
      })
    });
  }

  async getJobStatus(jobId: string): Promise<any> {
    return this.makeRequest(`/jobs/${jobId}`);
  }

  async pollJobUntilComplete(jobId: string, maxAttempts = 60, intervalMs = 2000): Promise<any> {
    for (let i = 0; i < maxAttempts; i++) {
      const job = await this.getJobStatus(jobId);
      
      const allComplete = job.steps?.every((step: any) => 
        step.status === "success" || step.status === "failed"
      );

      if (allComplete) {
        const hasFailed = job.steps?.some((step: any) => step.status === "failed");
        if (hasFailed) {
          throw new Error(`Job failed: ${JSON.stringify(job.steps)}`);
        }
        return job;
      }

      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw new Error("Job timed out");
  }

  async getAccounts(userId: string): Promise<any[]> {
    const data = await this.makeRequest(`/users/${userId}/accounts`);
    return data.data || [];
  }

  async getAccountById(userId: string, accountId: string): Promise<any> {
    return this.makeRequest(`/users/${userId}/accounts/${accountId}`);
  }

  async getTransactions(userId: string, filters?: {
    accountId?: string;
    connectionId?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
  }): Promise<any[]> {
    let endpoint = `/users/${userId}/transactions`;
    const filterParts: string[] = [];

    if (filters?.accountId) {
      filterParts.push(`account.id.eq('${filters.accountId}')`);
    }
    if (filters?.connectionId) {
      filterParts.push(`connection.id.eq('${filters.connectionId}')`);
    }
    if (filters?.fromDate) {
      filterParts.push(`transaction.postDate.gteq('${filters.fromDate}')`);
    }
    if (filters?.toDate) {
      filterParts.push(`transaction.postDate.lteq('${filters.toDate}')`);
    }

    const queryParams: string[] = [];
    if (filterParts.length > 0) {
      queryParams.push(`filter=${filterParts.join(",")}`);
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

  async refreshConnection(userId: string, connectionId: string): Promise<any> {
    return this.makeRequest(`/users/${userId}/connections/${connectionId}/refresh`, {
      method: "POST"
    });
  }

  async getConnection(userId: string, connectionId: string): Promise<any> {
    return this.makeRequest(`/users/${userId}/connections/${connectionId}`);
  }

  async getConnections(userId: string): Promise<any[]> {
    const data = await this.makeRequest(`/users/${userId}/connections`);
    return data.data || [];
  }

  async syncAccountsToDatabase(connectionId: string): Promise<void> {
    const connection = await db.select().from(bankConnections)
      .where(eq(bankConnections.id, connectionId))
      .limit(1);

    if (!connection[0]) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    const { basiqUserId } = connection[0];
    if (!basiqUserId) {
      throw new Error(`Connection ${connectionId} has no Basiq user ID`);
    }

    const accounts = await this.getAccounts(basiqUserId);

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

    if (!connection[0]?.basiqUserId) {
      throw new Error("Connection has no Basiq user ID");
    }

    const transactions = await this.getTransactions(connection[0].basiqUserId, {
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
