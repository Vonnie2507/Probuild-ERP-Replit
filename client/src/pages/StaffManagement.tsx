import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Users, CreditCard, Phone, Edit, Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { User } from "@shared/schema";

export default function StaffManagement() {
  const { toast } = useToast();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [cardNumber, setCardNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [positionTitle, setPositionTitle] = useState("");
  const [isActive, setIsActive] = useState(true);

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<User> }) => {
      const res = await apiRequest("PATCH", `/api/users/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Staff Updated", description: "Staff member details have been updated." });
      setEditingUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update staff member.",
        variant: "destructive",
      });
    },
  });

  const openEditDialog = (staffMember: User) => {
    setEditingUser(staffMember);
    setCardNumber(staffMember.bankCardNumber || "");
    setPhone(staffMember.phone || "");
    setPositionTitle(staffMember.positionTitle || "");
    setIsActive(staffMember.isActive);
  };

  const handleSave = () => {
    if (!editingUser) return;
    updateUserMutation.mutate({
      id: editingUser.id,
      data: {
        bankCardNumber: cardNumber || null,
        phone: phone || null,
        positionTitle: positionTitle || null,
        isActive,
      },
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin": return "destructive";
      case "sales": return "default";
      case "scheduler": return "secondary";
      case "production_manager": return "outline";
      case "warehouse": return "secondary";
      case "installer": return "outline";
      default: return "secondary";
    }
  };

  const formatRole = (role: string) => {
    return role.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  const staffMembers = users.filter(u => u.role !== "trade_client");

  if (isLoading) {
    return (
      <div className="flex-1 p-6 space-y-6">
        <Skeleton className="h-8 w-64" data-testid="skeleton-heading" />
        <Skeleton className="h-[400px] w-full" data-testid="skeleton-table" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="heading-staff-management">
            <Users className="h-6 w-6" />
            Staff Management
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="text-description">
            Manage staff details and assign bank card numbers for expense tracking
          </p>
        </div>
      </div>

      <Card data-testid="card-staff-list">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Staff Members
          </CardTitle>
          <CardDescription>
            Assign card numbers to staff for automatic transaction allocation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table data-testid="table-staff">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Card Number (Last 6)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffMembers.map((staffMember) => (
                <TableRow key={staffMember.id} data-testid={`row-staff-${staffMember.id}`}>
                  <TableCell className="font-medium" data-testid={`text-name-${staffMember.id}`}>
                    {staffMember.firstName} {staffMember.lastName}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(staffMember.role)} data-testid={`badge-role-${staffMember.id}`}>
                      {formatRole(staffMember.role)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground" data-testid={`text-position-${staffMember.id}`}>
                    {staffMember.positionTitle || "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground" data-testid={`text-email-${staffMember.id}`}>
                    {staffMember.email}
                  </TableCell>
                  <TableCell className="text-muted-foreground" data-testid={`text-phone-${staffMember.id}`}>
                    {staffMember.phone || "-"}
                  </TableCell>
                  <TableCell data-testid={`text-card-number-${staffMember.id}`}>
                    {staffMember.bankCardNumber ? (
                      <div className="flex items-center gap-1">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono">****{staffMember.bankCardNumber}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Not assigned</span>
                    )}
                  </TableCell>
                  <TableCell data-testid={`status-active-${staffMember.id}`}>
                    {staffMember.isActive ? (
                      <Badge variant="outline" className="text-green-600 border-green-600">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-red-600 border-red-600">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEditDialog(staffMember)}
                      data-testid={`button-edit-${staffMember.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent data-testid="dialog-edit-staff">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" data-testid="dialog-title">
              <Edit className="h-5 w-5" />
              Edit Staff Member
            </DialogTitle>
            <DialogDescription data-testid="dialog-description">
              Update details for {editingUser?.firstName} {editingUser?.lastName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cardNumber" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Bank Card Number (Last 6 Digits)
              </Label>
              <Input
                id="cardNumber"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="e.g. 639861"
                maxLength={6}
                className="font-mono"
                data-testid="input-card-number"
              />
              <p className="text-xs text-muted-foreground">
                Enter the last 6 digits of the staff member's bank card for automatic expense allocation
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number
              </Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0412 345 678"
                data-testid="input-phone"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="positionTitle">Position Title</Label>
              <Input
                id="positionTitle"
                value={positionTitle}
                onChange={(e) => setPositionTitle(e.target.value)}
                placeholder="e.g. Production Manager"
                data-testid="input-position-title"
              />
            </div>

            <div className="flex items-center justify-between space-x-2 pt-2">
              <div>
                <Label htmlFor="isActive">Account Active</Label>
                <p className="text-xs text-muted-foreground">
                  Inactive accounts cannot log in
                </p>
              </div>
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={setIsActive}
                data-testid="switch-is-active"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingUser(null)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateUserMutation.isPending}
              data-testid="button-save"
            >
              {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
