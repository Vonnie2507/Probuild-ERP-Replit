/**
 * ServiceM8 API Integration
 * Handles live sync with ServiceM8 for jobs, clients, and notes
 */

const SERVICEM8_API_KEY = process.env.SERVICEM8_API_KEY || "smk-4f7339-8db3216db0dd5bcc-b8572343e77df9ee";
const SERVICEM8_BASE_URL = "https://api.servicem8.com/api_1.0";

interface ServiceM8Job {
  uuid: string;
  generated_job_id: string; // e.g., "045", "612"
  status: "Quote" | "Work Order" | "Completed" | "Unsuccessful";
  company_uuid: string;
  job_category: string;
  job_address: string;
  job_description: string;
  total_ex_tax: string;
  total_inc_tax: string;
  date: string;
  active: number;
}

interface ServiceM8Client {
  uuid: string;
  company_uuid: string;
  first: string;
  last: string;
  phone: string;
  mobile: string;
  email: string;
  type: string;
  active: number;
}

interface ServiceM8Company {
  uuid: string;
  name: string;
  abn: string;
  email: string;
  phone: string;
  mobile: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_postcode: string;
  active: number;
}

interface ServiceM8Note {
  uuid: string;
  related_object_uuid: string;
  note: string;
  create_date: string;
  staff_uuid: string;
  active: number;
}

// Make API request to ServiceM8
async function servicem8Request<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${SERVICEM8_BASE_URL}${endpoint}`, {
    headers: {
      "X-Api-Key": SERVICEM8_API_KEY,
      "Accept": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ServiceM8 API error: ${response.status} - ${error}`);
  }

  return response.json();
}

// Generate Probuild ID from ServiceM8 job
export function generateProbuildId(job: ServiceM8Job): string {
  const jobNum = job.generated_job_id.padStart(3, "0");

  switch (job.status) {
    case "Quote":
    case "Unsuccessful":
      return `PVC-${jobNum}`;
    case "Work Order":
    case "Completed":
      return `PVC-${jobNum}-JOB`;
    default:
      return `PVC-${jobNum}`;
  }
}

// Map ServiceM8 status to Probuild entity type and status
export function mapServiceM8Status(status: string): { entityType: "lead" | "job"; probuildStatus: string } {
  switch (status) {
    case "Quote":
      return { entityType: "lead", probuildStatus: "needs_quote" };
    case "Work Order":
      return { entityType: "job", probuildStatus: "accepted" };
    case "Completed":
      return { entityType: "job", probuildStatus: "paid_in_full" };
    case "Unsuccessful":
      return { entityType: "lead", probuildStatus: "lost" };
    default:
      return { entityType: "lead", probuildStatus: "new" };
  }
}

// Map ServiceM8 job category to Probuild job type
export function mapJobCategory(category: string): { jobType: "supply_only" | "supply_install"; leadType: "public" | "trade" } {
  const cat = category.toLowerCase();

  if (cat.includes("contractor")) {
    return { jobType: "supply_only", leadType: "trade" };
  } else if (cat.includes("supply & install")) {
    return { jobType: "supply_install", leadType: "public" };
  } else if (cat.includes("supply") && (cat.includes("delivery") || cat.includes("pick-up") || cat.includes("pickup"))) {
    return { jobType: "supply_only", leadType: "public" };
  } else if (cat.includes("variation")) {
    return { jobType: "supply_install", leadType: "public" };
  }

  return { jobType: "supply_install", leadType: "public" };
}

// Get all jobs from ServiceM8
export async function getServiceM8Jobs(): Promise<ServiceM8Job[]> {
  try {
    const jobs = await servicem8Request<ServiceM8Job[]>("/job.json");
    return jobs.filter(job => job.active === 1);
  } catch (error) {
    console.error("Error fetching ServiceM8 jobs:", error);
    throw error;
  }
}

// Get all company contacts (clients) from ServiceM8
export async function getServiceM8Clients(): Promise<ServiceM8Client[]> {
  try {
    const clients = await servicem8Request<ServiceM8Client[]>("/companycontact.json");
    return clients.filter(client => client.active === 1);
  } catch (error) {
    console.error("Error fetching ServiceM8 clients:", error);
    throw error;
  }
}

// Get all companies from ServiceM8
export async function getServiceM8Companies(): Promise<ServiceM8Company[]> {
  try {
    const companies = await servicem8Request<ServiceM8Company[]>("/company.json");
    return companies.filter(company => company.active === 1);
  } catch (error) {
    console.error("Error fetching ServiceM8 companies:", error);
    throw error;
  }
}

// Get notes for a specific job
export async function getServiceM8Notes(jobUuid?: string): Promise<ServiceM8Note[]> {
  try {
    const notes = await servicem8Request<ServiceM8Note[]>("/note.json");
    const activeNotes = notes.filter(note => note.active === 1);

    if (jobUuid) {
      return activeNotes.filter(note => note.related_object_uuid === jobUuid);
    }

    return activeNotes;
  } catch (error) {
    console.error("Error fetching ServiceM8 notes:", error);
    throw error;
  }
}

// Get a single job by UUID
export async function getServiceM8Job(uuid: string): Promise<ServiceM8Job | null> {
  try {
    const job = await servicem8Request<ServiceM8Job>(`/job/${uuid}.json`);
    return job;
  } catch (error) {
    console.error(`Error fetching ServiceM8 job ${uuid}:`, error);
    return null;
  }
}

// Test API connection
export async function testServiceM8Connection(): Promise<{ success: boolean; message: string; jobCount?: number }> {
  try {
    const jobs = await servicem8Request<ServiceM8Job[]>("/job.json?$top=1");
    const allJobs = await getServiceM8Jobs();
    return {
      success: true,
      message: "ServiceM8 connection successful",
      jobCount: allJobs.length,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to connect to ServiceM8",
    };
  }
}

// Export types
export type { ServiceM8Job, ServiceM8Client, ServiceM8Company, ServiceM8Note };
