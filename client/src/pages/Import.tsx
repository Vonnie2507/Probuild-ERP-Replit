import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Upload, Download, FileSpreadsheet, Users, ClipboardList, Briefcase,
  CheckCircle2, AlertCircle, Loader2, X, FileText, Package,
  History, Settings2, FileJson, DollarSign, Receipt, RefreshCw,
  Wifi, WifiOff, CloudDownload, Database
} from "lucide-react";

interface ParsedRow {
  data: Record<string, string>;
  errors: string[];
  rowNumber: number;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

interface ImportSession {
  id: string;
  source: string;
  entityType: string;
  status: string;
  fileName: string | null;
  totalRows: number;
  successCount: number;
  errorCount: number;
  createdAt: string;
  completedAt: string | null;
}

// ServiceM8 field mapping - maps ServiceM8 export fields to Probuild fields
const servicem8FieldMappings: Record<string, Record<string, string>> = {
  clients: {
    "Company Name": "name",
    "company_name": "name",
    "First Name": "name",
    "first_name": "name",
    "Last Name": "name", // Will be combined with first name
    "last_name": "name",
    "Email": "email",
    "email": "email",
    "Mobile": "phone",
    "mobile": "phone",
    "Phone": "phone",
    "phone": "phone",
    "Address": "address",
    "address": "address",
    "Billing Address": "address",
    "billing_address": "address",
    "ABN": "abn",
    "abn": "abn",
    "Type": "clientType",
    "type": "clientType",
  },
  jobs: {
    "Job No": "externalId",
    "job_no": "externalId",
    "Company Name": "clientName",
    "company_name": "clientName",
    "Site Address": "siteAddress",
    "site_address": "siteAddress",
    "Job Address": "siteAddress",
    "job_address": "siteAddress",
    "Status": "status",
    "status": "status",
    "Description": "notes",
    "description": "notes",
    "Job Type": "jobType",
    "job_type": "jobType",
    "Category": "fenceStyle",
    "category": "fenceStyle",
    "Total": "totalPrice",
    "total": "totalPrice",
  },
  quotes: {
    "Quote No": "externalId",
    "quote_no": "externalId",
    "Company Name": "clientName",
    "company_name": "clientName",
    "Contact Name": "clientName",
    "Site Address": "siteAddress",
    "site_address": "siteAddress",
    "Description": "description",
    "description": "description",
    "Total": "totalPrice",
    "total": "totalPrice",
    "Status": "status",
    "status": "status",
    "Valid Until": "validUntil",
    "valid_until": "validUntil",
  },
  payments: {
    "Date": "paymentDate",
    "date": "paymentDate",
    "Amount": "amount",
    "amount": "amount",
    "Job No": "jobId",
    "job_no": "jobId",
    "Invoice No": "invoiceNumber",
    "invoice_no": "invoiceNumber",
    "Method": "paymentMethod",
    "method": "paymentMethod",
    "Reference": "reference",
    "reference": "reference",
    "Notes": "notes",
    "notes": "notes",
  }
};

// CSV Template definitions
const clientTemplate = {
  headers: ["name", "email", "phone", "address", "clientType", "companyName", "abn"],
  example: ["John Smith", "john@example.com", "0412345678", "123 Main St, Perth WA 6000", "public", "", ""],
  required: ["name"],
  description: "Import your existing clients and contacts",
};

const leadTemplate = {
  headers: ["clientName", "clientEmail", "clientPhone", "siteAddress", "source", "leadType", "jobFulfillmentType", "description", "fenceStyle", "fenceLength"],
  example: ["Jane Doe", "jane@example.com", "0423456789", "45 Beach Rd, Cottesloe WA 6011", "website", "public", "supply_install", "Front fence enquiry", "Hampton", "25"],
  required: ["clientName", "siteAddress"],
  description: "Import leads with client information",
};

const jobTemplate = {
  headers: ["clientName", "clientEmail", "clientPhone", "siteAddress", "jobType", "fenceStyle", "fenceLength", "status", "notes"],
  example: ["Bob Wilson", "bob@example.com", "0434567890", "88 Ocean Dr, Scarborough WA 6019", "supply_install", "Colonial", "30", "pending", "Ready for scheduling"],
  required: ["clientName", "siteAddress"],
  description: "Import existing jobs",
};

const productsTemplate = {
  headers: ["sku", "name", "category", "costPrice", "sellPrice", "tradePrice", "stockOnHand", "reorderPoint", "description", "dimensions", "color"],
  example: ["PVC-POST-100", "PVC Post 100mm x 2.4m", "fencing", "25.00", "45.00", "38.00", "50", "10", "Standard PVC fence post", "100x100x2400mm", "White"],
  required: ["sku", "name", "category", "costPrice", "sellPrice"],
  description: "Import products and inventory items. Categories: fencing, gates, hardware, accessories, other",
};

const quoteTemplate = {
  headers: ["clientName", "clientEmail", "siteAddress", "description", "totalPrice", "validUntil", "status"],
  example: ["Jane Smith", "jane@example.com", "45 Beach Rd, Perth WA", "Front fence quote", "5500.00", "2024-02-15", "sent"],
  required: ["clientName", "siteAddress", "totalPrice"],
  description: "Import quotes from ServiceM8 or other systems",
};

const paymentTemplate = {
  headers: ["jobId", "clientName", "amount", "paymentDate", "paymentMethod", "paymentType", "reference", "notes"],
  example: ["JOB-001", "John Smith", "2500.00", "2024-01-15", "bank_transfer", "deposit", "REF123", "50% deposit"],
  required: ["clientName", "amount", "paymentDate"],
  description: "Import payment history from ServiceM8",
};

function parseCSV(csvText: string): string[][] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim());
  return lines.map(line => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  });
}

function normalizeHeader(header: string): string {
  const mapping: Record<string, string> = {
    "clientname": "clientName",
    "clientemail": "clientEmail",
    "clientphone": "clientPhone",
    "siteaddress": "siteAddress",
    "leadtype": "leadType",
    "jobfulfillmenttype": "jobFulfillmentType",
    "fencestyle": "fenceStyle",
    "fencelength": "fenceLength",
    "clienttype": "clientType",
    "companyname": "companyName",
    "jobtype": "jobType",
    "costprice": "costPrice",
    "sellprice": "sellPrice",
    "tradeprice": "tradePrice",
    "stockonhand": "stockOnHand",
    "reorderpoint": "reorderPoint",
    "totalprice": "totalPrice",
    "validuntil": "validUntil",
    "paymentdate": "paymentDate",
    "paymentmethod": "paymentMethod",
    "paymenttype": "paymentType",
    "invoicenumber": "invoiceNumber",
  };
  const lower = header.toLowerCase().replace(/\s+/g, "");
  return mapping[lower] || lower;
}

function applyServiceM8Mapping(header: string, entityType: string): string {
  const mappings = servicem8FieldMappings[entityType];
  if (mappings && mappings[header]) {
    return mappings[header];
  }
  return normalizeHeader(header);
}

function downloadTemplate(type: "clients" | "leads" | "jobs" | "products" | "quotes" | "payments") {
  const templates = {
    clients: clientTemplate,
    leads: leadTemplate,
    jobs: jobTemplate,
    products: productsTemplate,
    quotes: quoteTemplate,
    payments: paymentTemplate
  };
  const template = templates[type];

  const csvContent = [
    template.headers.join(","),
    template.example.join(","),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${type}_import_template.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function ImportTab({
  type,
  template,
  icon: Icon,
  isServiceM8 = false
}: {
  type: "clients" | "leads" | "jobs" | "products" | "quotes" | "payments";
  template: typeof clientTemplate;
  icon: typeof Users;
  isServiceM8?: boolean;
}) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [importSource, setImportSource] = useState<string>(isServiceM8 ? "servicem8" : "csv_upload");

  const importMutation = useMutation({
    mutationFn: async (data: { records: Record<string, string>[]; source: string }) => {
      const response = await apiRequest("POST", `/api/import/${type}`, {
        data: data.records,
        source: data.source
      });
      return response.json();
    },
    onSuccess: (result: ImportResult) => {
      toast({
        title: "Import Complete",
        description: `Successfully imported ${result.success} ${type}. ${result.failed > 0 ? `${result.failed} failed.` : ""}`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/${type}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/import/sessions"] });
      if (type === "leads") {
        queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      }
      resetState();
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import data",
        variant: "destructive",
      });
    },
  });

  const resetState = () => {
    setFile(null);
    setParsedData([]);
    setHeaders([]);
    setIsPreviewMode(false);
  };

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      toast({
        title: "Invalid File",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = parseCSV(text);

      if (rows.length < 2) {
        toast({
          title: "Invalid File",
          description: "CSV file must have a header row and at least one data row",
          variant: "destructive",
        });
        return;
      }

      const rawHeaders = rows[0];
      // Apply ServiceM8 mapping if enabled
      const normalizedHeaders = rawHeaders.map(h =>
        importSource === "servicem8"
          ? applyServiceM8Mapping(h, type)
          : normalizeHeader(h)
      );
      setHeaders(normalizedHeaders);

      const dataRows = rows.slice(1);
      const parsed: ParsedRow[] = dataRows.map((row, index) => {
        const data: Record<string, string> = {};
        const errors: string[] = [];

        normalizedHeaders.forEach((header, i) => {
          data[header] = row[i] || "";
        });

        // Handle ServiceM8 first name + last name combination
        if (importSource === "servicem8" && type === "clients") {
          const firstNameIdx = rawHeaders.findIndex(h => h.toLowerCase().includes("first"));
          const lastNameIdx = rawHeaders.findIndex(h => h.toLowerCase().includes("last"));
          if (firstNameIdx >= 0 && lastNameIdx >= 0) {
            data.name = `${row[firstNameIdx] || ""} ${row[lastNameIdx] || ""}`.trim();
          }
        }

        // Validate required fields
        template.required.forEach(field => {
          if (!data[field] || data[field].trim() === "") {
            errors.push(`Missing required field: ${field}`);
          }
        });

        return { data, errors, rowNumber: index + 2 };
      });

      setParsedData(parsed);
      setIsPreviewMode(true);
    };

    reader.readAsText(selectedFile);
  }, [template, toast, importSource, type]);

  const validRows = parsedData.filter(row => row.errors.length === 0);
  const invalidRows = parsedData.filter(row => row.errors.length > 0);

  const handleImport = () => {
    if (validRows.length === 0) {
      toast({
        title: "No Valid Data",
        description: "There are no valid rows to import",
        variant: "destructive",
      });
      return;
    }

    importMutation.mutate({
      records: validRows.map(row => row.data),
      source: importSource
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            Import {type.charAt(0).toUpperCase() + type.slice(1)}
            {isServiceM8 && (
              <Badge variant="secondary" className="ml-2">
                <FileJson className="h-3 w-3 mr-1" />
                ServiceM8 Compatible
              </Badge>
            )}
          </CardTitle>
          <CardDescription>{template.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Import Source Selection */}
          <div className="flex items-center gap-4">
            <Label>Import Source:</Label>
            <Select value={importSource} onValueChange={setImportSource}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="servicem8">ServiceM8 Export</SelectItem>
                <SelectItem value="csv_upload">Standard CSV</SelectItem>
                <SelectItem value="excel_upload">Excel Export</SelectItem>
                <SelectItem value="quickbooks">QuickBooks</SelectItem>
                <SelectItem value="xero">Xero</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Template Download */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">Download Template</p>
                <p className="text-sm text-muted-foreground">
                  {importSource === "servicem8"
                    ? "Or use your ServiceM8 export directly - we'll map the fields automatically"
                    : "Start with our CSV template to ensure correct formatting"
                  }
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => downloadTemplate(type)}
              data-testid={`button-download-${type}-template`}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>

          {/* ServiceM8 Field Mapping Info */}
          {importSource === "servicem8" && (
            <Alert>
              <FileJson className="h-4 w-4" />
              <AlertTitle>ServiceM8 Auto-Mapping</AlertTitle>
              <AlertDescription>
                We automatically map ServiceM8 fields to Probuild fields. Supported mappings:
                <ul className="mt-2 text-sm list-disc list-inside">
                  {Object.entries(servicem8FieldMappings[type] || {}).slice(0, 5).map(([sm8, pb]) => (
                    <li key={sm8}>{sm8} → {pb}</li>
                  ))}
                  {Object.keys(servicem8FieldMappings[type] || {}).length > 5 && (
                    <li>...and more</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Required Fields Info */}
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertTitle>Required Fields</AlertTitle>
            <AlertDescription>
              <span className="font-medium">{template.required.join(", ")}</span>
              <br />
              <span className="text-muted-foreground text-sm">
                Optional fields: {template.headers.filter(h => !template.required.includes(h)).join(", ")}
              </span>
            </AlertDescription>
          </Alert>

          {/* File Upload */}
          {!isPreviewMode ? (
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id={`file-upload-${type}`}
                data-testid={`input-file-${type}`}
              />
              <label
                htmlFor={`file-upload-${type}`}
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="h-10 w-10 text-muted-foreground" />
                <p className="font-medium">Click to upload CSV file</p>
                <p className="text-sm text-muted-foreground">or drag and drop</p>
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File Info */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  <span className="font-medium">{file?.name}</span>
                  <Badge variant="secondary">{parsedData.length} rows</Badge>
                  <Badge variant="outline">{importSource}</Badge>
                </div>
                <Button variant="ghost" size="icon" onClick={resetState}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Validation Summary */}
              <div className="flex gap-4">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{validRows.length} valid</span>
                </div>
                {invalidRows.length > 0 && (
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span>{invalidRows.length} with errors</span>
                  </div>
                )}
              </div>

              {/* Preview Table */}
              <div className="border rounded-lg overflow-hidden">
                <ScrollArea className="h-[300px]">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="p-2 text-left font-medium">Row</th>
                        <th className="p-2 text-left font-medium">Status</th>
                        {headers.slice(0, 4).map((header, i) => (
                          <th key={i} className="p-2 text-left font-medium capitalize">
                            {header}
                          </th>
                        ))}
                        {headers.length > 4 && (
                          <th className="p-2 text-left font-medium">...</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.slice(0, 50).map((row, index) => (
                        <tr
                          key={index}
                          className={`border-t ${row.errors.length > 0 ? "bg-destructive/5" : ""}`}
                        >
                          <td className="p-2">{row.rowNumber}</td>
                          <td className="p-2">
                            {row.errors.length > 0 ? (
                              <Badge variant="destructive" className="text-xs">
                                {row.errors[0]}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                                Valid
                              </Badge>
                            )}
                          </td>
                          {headers.slice(0, 4).map((header, i) => (
                            <td key={i} className="p-2 truncate max-w-[150px]">
                              {row.data[header] || "-"}
                            </td>
                          ))}
                          {headers.length > 4 && (
                            <td className="p-2 text-muted-foreground">
                              +{headers.length - 4} more
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedData.length > 50 && (
                    <p className="p-2 text-center text-sm text-muted-foreground border-t">
                      Showing first 50 of {parsedData.length} rows
                    </p>
                  )}
                </ScrollArea>
              </div>

              {/* Import Actions */}
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={resetState}>
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={validRows.length === 0 || importMutation.isPending}
                  data-testid={`button-import-${type}`}
                >
                  {importMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Import {validRows.length} {type}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ImportHistoryTab() {
  const { data: sessions, isLoading } = useQuery<ImportSession[]>({
    queryKey: ["/api/import/sessions"],
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case "completed_with_errors":
        return <Badge className="bg-yellow-100 text-yellow-800">Completed with Errors</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "processing":
        return <Badge className="bg-blue-100 text-blue-800">Processing</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Import History
        </CardTitle>
        <CardDescription>View all past import sessions and their results</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !sessions || sessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No import history yet</p>
            <p className="text-sm">Your import sessions will appear here</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <table className="w-full">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="p-3 text-left font-medium">Date</th>
                  <th className="p-3 text-left font-medium">Source</th>
                  <th className="p-3 text-left font-medium">Type</th>
                  <th className="p-3 text-left font-medium">File</th>
                  <th className="p-3 text-left font-medium">Status</th>
                  <th className="p-3 text-left font-medium">Results</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id} className="border-b hover:bg-muted/50">
                    <td className="p-3 text-sm">
                      {new Date(session.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="capitalize">
                        {session.source.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="p-3 capitalize">{session.entityType}</td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {session.fileName || "-"}
                    </td>
                    <td className="p-3">{getStatusBadge(session.status)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-green-600">{session.successCount} success</span>
                        {session.errorCount > 0 && (
                          <span className="text-destructive">{session.errorCount} errors</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// ServiceM8 Live Sync Tab - Direct API connection
function ServiceM8SyncTab() {
  const { toast } = useToast();
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, entity: "" });

  // Test connection query
  const { data: connectionStatus, isLoading: isTestingConnection, refetch: testConnection } = useQuery({
    queryKey: ["/api/servicem8/test"],
    enabled: false,
    retry: false,
  });

  // Preview queries - only run when requested
  const { data: previewJobs, isLoading: isLoadingJobs, refetch: fetchJobs } = useQuery<{
    total: number;
    leads: number;
    jobs: number;
    preview: Array<{
      uuid: string;
      probuildId: string;
      entityType: string;
      status: string;
      address: string;
      description: string;
      total: string;
    }>;
  }>({
    queryKey: ["/api/servicem8/preview/jobs"],
    enabled: false,
  });

  const { data: previewClients, isLoading: isLoadingClients, refetch: fetchClients } = useQuery<{
    total: number;
    preview: Array<{
      uuid: string;
      name: string;
      email: string;
      phone: string;
      company: string;
    }>;
  }>({
    queryKey: ["/api/servicem8/preview/clients"],
    enabled: false,
  });

  const { data: previewNotes, isLoading: isLoadingNotes, refetch: fetchNotes } = useQuery<{
    total: number;
    preview: Array<{
      uuid: string;
      jobUuid: string;
      note: string;
      createdDate: string;
    }>;
  }>({
    queryKey: ["/api/servicem8/preview/notes"],
    enabled: false,
  });

  // Import mutations
  const importClientsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/servicem8/import/clients");
      return response.json();
    },
    onSuccess: (result: { imported: number; skipped: number; errors: string[] }) => {
      toast({
        title: "Clients Imported",
        description: `Imported ${result.imported} clients. ${result.skipped} already existed.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/import/sessions"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const importJobsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/servicem8/import/jobs");
      return response.json();
    },
    onSuccess: (result: { leadsImported: number; jobsImported: number; skipped: number; errors: string[] }) => {
      toast({
        title: "Jobs Imported",
        description: `Imported ${result.leadsImported} leads and ${result.jobsImported} jobs. ${result.skipped} already existed.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/import/sessions"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const importNotesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/servicem8/import/notes");
      return response.json();
    },
    onSuccess: (result: { imported: number; skipped: number }) => {
      toast({
        title: "Notes Imported",
        description: `Imported ${result.imported} historical notes. ${result.skipped} already existed.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/import/sessions"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTestConnection = async () => {
    await testConnection();
  };

  const handlePreviewAll = async () => {
    await Promise.all([fetchJobs(), fetchClients(), fetchNotes()]);
  };

  const handleImportAll = async () => {
    setImportProgress({ current: 0, total: 3, entity: "clients" });
    await importClientsMutation.mutateAsync();
    setImportProgress({ current: 1, total: 3, entity: "jobs" });
    await importJobsMutation.mutateAsync();
    setImportProgress({ current: 2, total: 3, entity: "notes" });
    await importNotesMutation.mutateAsync();
    setImportProgress({ current: 3, total: 3, entity: "complete" });
    toast({
      title: "Full Sync Complete",
      description: "All ServiceM8 data has been imported to Probuild.",
    });
  };

  const isConnected = connectionStatus && (connectionStatus as any).success;
  const isImporting = importClientsMutation.isPending || importJobsMutation.isPending || importNotesMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="h-5 w-5 text-green-600" />
            ) : (
              <WifiOff className="h-5 w-5 text-muted-foreground" />
            )}
            ServiceM8 Connection
          </CardTitle>
          <CardDescription>
            Connect to ServiceM8 to import clients, jobs, and historical notes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Database className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">API Status</p>
                {connectionStatus ? (
                  <p className="text-sm text-muted-foreground">
                    {isConnected
                      ? `Connected - ${(connectionStatus as any).jobCount} jobs found`
                      : (connectionStatus as any).message
                    }
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Click to test connection</p>
                )}
              </div>
            </div>
            <Button
              onClick={handleTestConnection}
              disabled={isTestingConnection}
              variant={isConnected ? "outline" : "default"}
            >
              {isTestingConnection ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>
          </div>

          {isConnected && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Connected to ServiceM8</AlertTitle>
              <AlertDescription className="text-green-700">
                Ready to import data. Use the preview buttons below to see what will be imported.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CloudDownload className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-auto py-4"
                onClick={handlePreviewAll}
                disabled={isLoadingJobs || isLoadingClients || isLoadingNotes}
              >
                <div className="flex flex-col items-center">
                  {isLoadingJobs || isLoadingClients || isLoadingNotes ? (
                    <Loader2 className="h-6 w-6 animate-spin mb-2" />
                  ) : (
                    <FileText className="h-6 w-6 mb-2" />
                  )}
                  <span className="font-medium">Preview All Data</span>
                  <span className="text-xs text-muted-foreground">See what will be imported</span>
                </div>
              </Button>
              <Button
                className="h-auto py-4"
                onClick={handleImportAll}
                disabled={isImporting}
              >
                <div className="flex flex-col items-center">
                  {isImporting ? (
                    <Loader2 className="h-6 w-6 animate-spin mb-2" />
                  ) : (
                    <CloudDownload className="h-6 w-6 mb-2" />
                  )}
                  <span className="font-medium">Full Sync</span>
                  <span className="text-xs text-muted-foreground">Import everything from ServiceM8</span>
                </div>
              </Button>
            </div>

            {isImporting && (
              <div className="space-y-2">
                <Progress value={(importProgress.current / importProgress.total) * 100} />
                <p className="text-sm text-center text-muted-foreground">
                  Importing {importProgress.entity}... ({importProgress.current}/{importProgress.total})
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Import Sections */}
      {isConnected && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Clients */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Clients
              </CardTitle>
              <CardDescription>
                {previewClients
                  ? `${previewClients.total} clients found`
                  : "Click preview to see available clients"
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {previewClients && previewClients.preview.length > 0 && (
                <ScrollArea className="h-[200px] border rounded-lg p-2">
                  {previewClients.preview.map((client, i) => (
                    <div key={i} className="py-2 border-b last:border-0">
                      <p className="font-medium text-sm">{client.name}</p>
                      <p className="text-xs text-muted-foreground">{client.email || client.phone}</p>
                      {client.company && (
                        <p className="text-xs text-muted-foreground">{client.company}</p>
                      )}
                    </div>
                  ))}
                  {previewClients.total > 10 && (
                    <p className="text-xs text-center text-muted-foreground pt-2">
                      ...and {previewClients.total - 10} more
                    </p>
                  )}
                </ScrollArea>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => fetchClients()}
                  disabled={isLoadingClients}
                >
                  {isLoadingClients ? <Loader2 className="h-4 w-4 animate-spin" /> : "Preview"}
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => importClientsMutation.mutate()}
                  disabled={importClientsMutation.isPending}
                >
                  {importClientsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Import"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Jobs/Leads */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Jobs & Leads
              </CardTitle>
              <CardDescription>
                {previewJobs
                  ? `${previewJobs.leads} leads, ${previewJobs.jobs} jobs found`
                  : "Click preview to see available jobs"
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {previewJobs && previewJobs.preview.length > 0 && (
                <ScrollArea className="h-[200px] border rounded-lg p-2">
                  {previewJobs.preview.map((job, i) => (
                    <div key={i} className="py-2 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">{job.probuildId}</span>
                        <Badge variant="outline" className="text-xs">
                          {job.entityType}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{job.address}</p>
                      <p className="text-xs text-muted-foreground">{job.status} - ${job.total}</p>
                    </div>
                  ))}
                  {previewJobs.total > 10 && (
                    <p className="text-xs text-center text-muted-foreground pt-2">
                      ...and {previewJobs.total - 10} more
                    </p>
                  )}
                </ScrollArea>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => fetchJobs()}
                  disabled={isLoadingJobs}
                >
                  {isLoadingJobs ? <Loader2 className="h-4 w-4 animate-spin" /> : "Preview"}
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => importJobsMutation.mutate()}
                  disabled={importJobsMutation.isPending}
                >
                  {importJobsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Import"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Historical Notes
              </CardTitle>
              <CardDescription>
                {previewNotes
                  ? `${previewNotes.total} notes found`
                  : "Click preview to see available notes"
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {previewNotes && previewNotes.preview.length > 0 && (
                <ScrollArea className="h-[200px] border rounded-lg p-2">
                  {previewNotes.preview.map((note, i) => (
                    <div key={i} className="py-2 border-b last:border-0">
                      <p className="text-sm line-clamp-2">{note.note}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(note.createdDate).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                  {previewNotes.total > 10 && (
                    <p className="text-xs text-center text-muted-foreground pt-2">
                      ...and {previewNotes.total - 10} more
                    </p>
                  )}
                </ScrollArea>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => fetchNotes()}
                  disabled={isLoadingNotes}
                >
                  {isLoadingNotes ? <Loader2 className="h-4 w-4 animate-spin" /> : "Preview"}
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => importNotesMutation.mutate()}
                  disabled={importNotesMutation.isPending}
                >
                  {importNotesMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Import"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Job Numbering Info */}
      <Card>
        <CardHeader>
          <CardTitle>PVC Job Numbering</CardTitle>
          <CardDescription>How ServiceM8 jobs are numbered in Probuild</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Leads (Quotes)</h4>
              <p className="text-sm text-muted-foreground mb-2">
                ServiceM8 "Quote" and "Unsuccessful" status
              </p>
              <code className="block bg-muted p-2 rounded text-sm">PVC-XXX</code>
              <p className="text-xs text-muted-foreground mt-1">
                Example: PVC-045, PVC-612
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Jobs (Active/Completed)</h4>
              <p className="text-sm text-muted-foreground mb-2">
                ServiceM8 "Work Order" and "Completed" status
              </p>
              <code className="block bg-muted p-2 rounded text-sm">PVC-XXX-JOB</code>
              <p className="text-xs text-muted-foreground mt-1">
                Example: PVC-045-JOB, PVC-612-JOB
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ServiceM8MappingTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          ServiceM8 Field Mapping
        </CardTitle>
        <CardDescription>
          Configure how ServiceM8 fields map to Probuild fields
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="clients" className="w-full">
          <TabsList>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="jobs">Jobs</TabsTrigger>
            <TabsTrigger value="quotes">Quotes</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
          </TabsList>

          {Object.entries(servicem8FieldMappings).map(([entity, mappings]) => (
            <TabsContent key={entity} value={entity} className="mt-4">
              <div className="border rounded-lg">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted">
                      <th className="p-3 text-left font-medium">ServiceM8 Field</th>
                      <th className="p-3 text-left font-medium">Probuild Field</th>
                      <th className="p-3 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(mappings).map(([sm8Field, pbField]) => (
                      <tr key={sm8Field} className="border-b">
                        <td className="p-3 font-mono text-sm">{sm8Field}</td>
                        <td className="p-3 font-mono text-sm">{pbField}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            Active
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <Alert className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Custom Mappings Coming Soon</AlertTitle>
          <AlertDescription>
            Soon you'll be able to add custom field mappings for your specific ServiceM8 setup.
            For now, the default mappings cover the most common ServiceM8 export formats.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

export default function Import() {
  return (
    <div className="p-6 space-y-6" data-testid="page-import">
      <div>
        <h1 className="text-2xl font-semibold">Import Center</h1>
        <p className="text-muted-foreground">
          Migrate data from ServiceM8, CSV files, or other systems into Probuild
        </p>
      </div>

      <Tabs defaultValue="servicem8-sync" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="servicem8-sync" data-testid="tab-servicem8-sync" className="bg-primary/10">
            <Wifi className="h-4 w-4 mr-2" />
            ServiceM8 Sync
          </TabsTrigger>
          <TabsTrigger value="clients" data-testid="tab-import-clients">
            <Users className="h-4 w-4 mr-2" />
            Clients
          </TabsTrigger>
          <TabsTrigger value="leads" data-testid="tab-import-leads">
            <ClipboardList className="h-4 w-4 mr-2" />
            Leads
          </TabsTrigger>
          <TabsTrigger value="jobs" data-testid="tab-import-jobs">
            <Briefcase className="h-4 w-4 mr-2" />
            Jobs
          </TabsTrigger>
          <TabsTrigger value="quotes" data-testid="tab-import-quotes">
            <Receipt className="h-4 w-4 mr-2" />
            Quotes
          </TabsTrigger>
          <TabsTrigger value="payments" data-testid="tab-import-payments">
            <DollarSign className="h-4 w-4 mr-2" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="products" data-testid="tab-import-products">
            <Package className="h-4 w-4 mr-2" />
            Products
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-import-history">
            <History className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
          <TabsTrigger value="mapping" data-testid="tab-import-mapping">
            <Settings2 className="h-4 w-4 mr-2" />
            Field Mapping
          </TabsTrigger>
        </TabsList>

        <TabsContent value="servicem8-sync" className="mt-6">
          <ServiceM8SyncTab />
        </TabsContent>

        <TabsContent value="clients" className="mt-6">
          <ImportTab type="clients" template={clientTemplate} icon={Users} isServiceM8 />
        </TabsContent>

        <TabsContent value="leads" className="mt-6">
          <ImportTab type="leads" template={leadTemplate} icon={ClipboardList} isServiceM8 />
        </TabsContent>

        <TabsContent value="jobs" className="mt-6">
          <ImportTab type="jobs" template={jobTemplate} icon={Briefcase} isServiceM8 />
        </TabsContent>

        <TabsContent value="quotes" className="mt-6">
          <ImportTab type="quotes" template={quoteTemplate} icon={Receipt} isServiceM8 />
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <ImportTab type="payments" template={paymentTemplate} icon={DollarSign} isServiceM8 />
        </TabsContent>

        <TabsContent value="products" className="mt-6">
          <ImportTab type="products" template={productsTemplate} icon={Package} />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <ImportHistoryTab />
        </TabsContent>

        <TabsContent value="mapping" className="mt-6">
          <ServiceM8MappingTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
