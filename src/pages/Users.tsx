import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Profile, AppRole, getRolePermissions, getRoleLabel, getRoleColor } from '@/types/pos';
import { Users as UsersIcon, Loader2, Shield, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface UserWithRole extends Profile {
  role?: AppRole | null;
}

export default function Users() {
  const { role, user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [newRole, setNewRole] = useState<AppRole | ''>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const permissions = role ? getRolePermissions(role) : null;

  useEffect(() => {
    if (!permissions?.canManageUsers) {
      navigate('/dashboard');
      return;
    }
    fetchUsers();
  }, [role]);

  const fetchUsers = async () => {
    // Fetch profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) {
      toast.error('Failed to load users');
      return;
    }

    // Fetch roles
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id, role');

    const rolesMap = new Map(roles?.map(r => [r.user_id, r.role as AppRole]));

    const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => ({
      ...profile,
      role: rolesMap.get(profile.user_id) || null,
    }));

    setUsers(usersWithRoles);
    setLoading(false);
  };

  const openRoleDialog = (userItem: UserWithRole) => {
    setSelectedUser(userItem);
    setNewRole(userItem.role || '');
    setDialogOpen(true);
  };

  const handleSaveRole = async () => {
    if (!selectedUser || !newRole) {
      toast.error('Please select a role');
      return;
    }

    setSaving(true);

    try {
      // Check if user already has a role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', selectedUser.user_id)
        .maybeSingle();

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', selectedUser.user_id);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({
            user_id: selectedUser.user_id,
            role: newRole,
          });

        if (error) throw error;
      }

      toast.success('Role updated successfully');
      setDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userItem: UserWithRole) => {
    if (userItem.user_id === user?.id) {
      toast.error('You cannot delete your own account');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${userItem.full_name}"?`)) return;

    try {
      // Delete role first
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userItem.user_id);

      // Delete profile (user will be deleted by cascade)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userItem.user_id);

      if (error) throw error;

      toast.success('User deleted');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage team members and their roles</p>
        </div>

        {/* Users Table */}
        <Card className="shadow-card">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <UsersIcon className="w-12 h-12 mb-4" />
                <p>No users found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((userItem) => (
                    <TableRow key={userItem.id}>
                      <TableCell className="font-medium">
                        {userItem.full_name}
                        {userItem.user_id === user?.id && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            You
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {userItem.email}
                      </TableCell>
                      <TableCell>
                        {userItem.role ? (
                          <Badge
                            variant="outline"
                            className={getRoleColor(userItem.role)}
                          >
                            {getRoleLabel(userItem.role)}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="status-warning">
                            No Role
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(userItem.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openRoleDialog(userItem)}
                          >
                            <Shield className="w-4 h-4" />
                          </Button>
                          {userItem.user_id !== user?.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteUser(userItem)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Role Assignment Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Assign Role</DialogTitle>
              <DialogDescription>
                Set the role for {selectedUser?.full_name}
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                      Super Admin - Full system access
                    </div>
                  </SelectItem>
                  <SelectItem value="manager">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      Manager - Inventory & reports access
                    </div>
                  </SelectItem>
                  <SelectItem value="cashier">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      Cashier - Sales only access
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveRole} disabled={saving || !newRole}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Role'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
