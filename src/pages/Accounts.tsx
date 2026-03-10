import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Wallet, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function Accounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [accountType, setAccountType] = useState('checking');

  useEffect(() => {
    if (user) loadAccounts();
  }, [user]);

  const loadAccounts = async () => {
    const { data } = await supabase.from('accounts').select('*').order('created_at', { ascending: false });
    setAccounts(data || []);
  };

  const createAccount = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: accNum } = await supabase.rpc('generate_account_number');
      const { error } = await supabase.from('accounts').insert({
        user_id: user.id,
        account_number: accNum || `SB${Date.now()}`,
        account_type: accountType,
      });
      if (error) throw error;
      toast.success('Account created successfully!');
      setOpen(false);
      loadAccounts();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const statusColor: Record<string, string> = {
    active: 'bg-primary/20 text-primary',
    frozen: 'bg-chart-3/20 text-chart-3',
    closed: 'bg-destructive/20 text-destructive',
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Accounts</h1>
          <p className="text-muted-foreground">Manage your bank accounts</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />New Account</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Create New Account</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Account Type</Label>
                <Select value={accountType} onValueChange={setAccountType}>
                  <SelectTrigger className="mt-1.5 bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Checking</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={createAccount} disabled={loading} className="w-full">
                {loading ? 'Creating...' : 'Create Account'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {accounts.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-12 text-center">
            <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No accounts yet</h3>
            <p className="text-muted-foreground mb-4">Create your first bank account to get started</p>
            <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" />Create Account</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => (
            <Card key={acc.id} className="glass-card hover:border-primary/30 transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-primary" />
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${statusColor[acc.status] || ''}`}>
                    {acc.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground capitalize mb-1">{acc.account_type} Account</p>
                <p className="text-2xl font-bold font-mono text-foreground mb-3">
                  ${Number(acc.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-mono">{acc.account_number}</span>
                  <span>{format(new Date(acc.created_at), 'MMM dd, yyyy')}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
