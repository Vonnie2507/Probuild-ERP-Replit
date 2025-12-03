import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InventoryTable } from "@/components/inventory/InventoryTable";
import { StatCard } from "@/components/shared/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, AlertTriangle, TrendingDown, DollarSign, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Product } from "@shared/schema";

interface DisplayProduct {
  id: string;
  sku: string;
  name: string;
  category: string;
  stockOnHand: number;
  reorderPoint: number;
  costPrice: number;
  sellPrice: number;
  status: "in_stock" | "low_stock" | "out_of_stock";
}

export default function Inventory() {
  const { toast } = useToast();
  const [selectedProduct, setSelectedProduct] = useState<DisplayProduct | null>(null);
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<"add" | "remove">("add");
  const [adjustmentQty, setAdjustmentQty] = useState("");

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const adjustStockMutation = useMutation({
    mutationFn: async ({ productId, adjustment }: { productId: string; adjustment: number }) => {
      return apiRequest("PATCH", `/api/products/${productId}/stock`, { adjustment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Stock Updated",
        description: "Inventory has been adjusted successfully.",
      });
      setIsAdjustDialogOpen(false);
      setAdjustmentQty("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to adjust stock.",
        variant: "destructive",
      });
      console.error("Stock adjustment error:", error);
    },
  });

  const displayProducts: DisplayProduct[] = products.map((product) => {
    const stockOnHand = product.stockOnHand ?? 0;
    const reorderPoint = product.reorderPoint ?? 10;
    
    let status: "in_stock" | "low_stock" | "out_of_stock" = "in_stock";
    if (stockOnHand === 0) {
      status = "out_of_stock";
    } else if (stockOnHand <= reorderPoint) {
      status = "low_stock";
    }

    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      category: product.category,
      stockOnHand,
      reorderPoint,
      costPrice: parseFloat(product.costPrice) || 0,
      sellPrice: parseFloat(product.sellPrice) || 0,
      status,
    };
  });

  const totalProducts = displayProducts.length;
  const lowStockCount = displayProducts.filter(p => p.status === "low_stock").length;
  const outOfStockCount = displayProducts.filter(p => p.status === "out_of_stock").length;
  const totalValue = displayProducts.reduce((acc, p) => acc + (p.stockOnHand * p.costPrice), 0);

  const handleProductClick = (product: DisplayProduct) => {
    setSelectedProduct(product);
    toast({
      title: "Product Selected",
      description: `Viewing ${product.name}`,
    });
  };

  const handleAdjustStock = (product: DisplayProduct) => {
    setSelectedProduct(product);
    setIsAdjustDialogOpen(true);
  };

  const handleSubmitAdjustment = () => {
    if (!selectedProduct || !adjustmentQty) return;

    const qty = parseInt(adjustmentQty);
    if (isNaN(qty) || qty <= 0) {
      toast({
        title: "Invalid Quantity",
        description: "Please enter a valid positive number.",
        variant: "destructive",
      });
      return;
    }

    const adjustment = adjustmentType === "add" ? qty : -qty;
    adjustStockMutation.mutate({ productId: selectedProduct.id, adjustment });
  };

  if (productsLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-inventory-title">Products & Inventory</h1>
          <p className="text-sm text-muted-foreground">
            Manage stock levels, pricing, and reorder points
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => window.open("/api/export/products", "_blank")}
          data-testid="button-export-inventory"
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Products"
          value={totalProducts}
          description="Active SKUs"
          icon={Package}
        />
        <StatCard
          title="Low Stock"
          value={lowStockCount}
          description="Below reorder point"
          icon={AlertTriangle}
        />
        <StatCard
          title="Out of Stock"
          value={outOfStockCount}
          description="Needs attention"
          icon={TrendingDown}
        />
        <StatCard
          title="Inventory Value"
          value={`$${totalValue.toLocaleString()}`}
          description="At cost price"
          icon={DollarSign}
        />
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all-products">All Products</TabsTrigger>
          <TabsTrigger value="low_stock" data-testid="tab-low-stock">Low Stock</TabsTrigger>
          <TabsTrigger value="out_of_stock" data-testid="tab-out-of-stock">Out of Stock</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <InventoryTable
            products={displayProducts}
            onProductClick={handleProductClick}
            onAdjustStock={handleAdjustStock}
            onAddProduct={() => toast({ title: "Add product" })}
          />
        </TabsContent>

        <TabsContent value="low_stock" className="mt-6">
          <InventoryTable
            products={displayProducts.filter(p => p.status === "low_stock")}
            onProductClick={handleProductClick}
            onAdjustStock={handleAdjustStock}
          />
        </TabsContent>

        <TabsContent value="out_of_stock" className="mt-6">
          <InventoryTable
            products={displayProducts.filter(p => p.status === "out_of_stock")}
            onProductClick={handleProductClick}
            onAdjustStock={handleAdjustStock}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-md">
                <p className="font-mono text-sm text-muted-foreground">{selectedProduct.sku}</p>
                <p className="font-medium">{selectedProduct.name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Current stock: <span className="font-semibold">{selectedProduct.stockOnHand}</span>
                </p>
              </div>
              <div className="space-y-2">
                <Label>Adjustment Type</Label>
                <Select value={adjustmentType} onValueChange={(v) => setAdjustmentType(v as "add" | "remove")}>
                  <SelectTrigger data-testid="select-adjustment-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">Add Stock</SelectItem>
                    <SelectItem value="remove">Remove Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={adjustmentQty}
                  onChange={(e) => setAdjustmentQty(e.target.value)}
                  placeholder="Enter quantity"
                  data-testid="input-adjustment-qty"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setIsAdjustDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={handleSubmitAdjustment} 
                  disabled={adjustStockMutation.isPending}
                  data-testid="button-submit-adjustment"
                >
                  {adjustStockMutation.isPending ? "Adjusting..." : "Confirm"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
