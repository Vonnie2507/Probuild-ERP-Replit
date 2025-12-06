import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Upload, Download, FileSpreadsheet, Users, ClipboardList, Briefcase,
  CheckCircle2, AlertCircle, Loader2, X, FileText, Package
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
  };
  const lower = header.toLowerCase().replace(/\s+/g, "");
  return mapping[lower] || lower;
}

function downloadTemplate(type: "clients" | "leads" | "jobs" | "products") {
  const templates = { clients: clientTemplate, leads: leadTemplate, jobs: jobTemplate, products: productsTemplate };
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
  icon: Icon 
}: { 
  type: "clients" | "leads" | "jobs" | "products"; 
  template: typeof clientTemplate;
  icon: typeof Users;
}) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const importMutation = useMutation({
    mutationFn: async (data: Record<string, string>[]) => {
      const response = await apiRequest("POST", `/api/import/${type}`, { data });
      return response.json();
    },
    onSuccess: (result: ImportResult) => {
      toast({
        title: "Import Complete",
        description: `Successfully imported ${result.success} ${type}. ${result.failed > 0 ? `${result.failed} failed.` : ""}`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/${type}`] });
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

      const rawHeaders = rows[0].map(h => h.toLowerCase().replace(/\s+/g, ""));
      const normalizedHeaders = rawHeaders.map(normalizeHeader);
      setHeaders(normalizedHeaders);

      const dataRows = rows.slice(1);
      const parsed: ParsedRow[] = dataRows.map((row, index) => {
        const data: Record<string, string> = {};
        const errors: string[] = [];

        normalizedHeaders.forEach((header, i) => {
          data[header] = row[i] || "";
        });

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
  }, [template, toast]);

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

    importMutation.mutate(validRows.map(row => row.data));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            Import {type.charAt(0).toUpperCase() + type.slice(1)}
          </CardTitle>
          <CardDescription>{template.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Template Download */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">Download Template</p>
                <p className="text-sm text-muted-foreground">
                  Start with our CSV template to ensure correct formatting
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

export default function Import() {
  return (
    <div className="p-6 space-y-6" data-testid="page-import">
      <div>
        <h1 className="text-2xl font-semibold">Import Data</h1>
        <p className="text-muted-foreground">
          Bulk import your existing clients, leads, jobs, and products from CSV files
        </p>
      </div>

      <Tabs defaultValue="clients" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
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
          <TabsTrigger value="products" data-testid="tab-import-products">
            <Package className="h-4 w-4 mr-2" />
            Products
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="mt-6">
          <ImportTab type="clients" template={clientTemplate} icon={Users} />
        </TabsContent>

        <TabsContent value="leads" className="mt-6">
          <ImportTab type="leads" template={leadTemplate} icon={ClipboardList} />
        </TabsContent>

        <TabsContent value="jobs" className="mt-6">
          <ImportTab type="jobs" template={jobTemplate} icon={Briefcase} />
        </TabsContent>

        <TabsContent value="products" className="mt-6">
          <ImportTab type="products" template={productsTemplate} icon={Package} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
