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
import { ArrowUpRight, ArrowDownRight, Send, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [txType, setTxType] = useState('deposit');
  const [amount, setAmount] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [targetAccount, setTargetAccount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    const [txns, accs] = await Promise.all([
      supabase.from('transactions').select('*').order('created_at', { ascending: false }),
      supabase.from('accounts').select('*').eq('status', 'active'),
    ]);
    setTransactions(txns.data || []);
    setAccounts(accs.data || []);
  };

  const handleTransaction = async () => {
    if (!selectedAccount || !amount) return;
    setLoading(true);
    try {
      const amt = parseFloat(amount);
      if (isNaN(amt) || amt <= 0) throw new Error('Invalid amount');

      const account = accounts.find(a => a.id === selectedAccount);
      if (!account) throw new Error('Account not found');

      // Fraud detection: flag large transactions
      const isFlagged = amt > 10000;

      if (txType === 'deposit') {
        const { error } = await supabase.from('transactions').insert({
          to_account_id: selectedAccount,
          type: 'deposit',
          amount: amt,
          description,
          is_flagged: isFlagged,
          status: isFlagged ? 'flagged' : 'completed',
        });
        if (error) throw error;

        await supabase.from('accounts').update({ balance: Number(account.balance) + amt }).eq('id', selectedAccount);

        if (isFlagged) {
          await supabase.from('fraud_alerts').insert({
            transaction_id: (await supabase.from('transactions').select('id').order('created_at', { ascending: false }).limit(1)).data?.[0]?.id || '',
            alert_type: 'high_amount',
            severity: amt > 50000 ? 'critical' : 'high',
            description: `Large deposit of $${amt.toLocaleString()} detected`,
          });
        }
      } else if (txType === 'withdrawal') {
        if (amt > Number(account.balance)) throw new Error('Insufficient balance');
        const { error } = await supabase.from('transactions').insert({
          from_account_id: selectedAccount,
          type: 'withdrawal',
          amount: amt,
          description,
          is_flagged: isFlagged,
          status: isFlagged ? 'flagged' : 'completed',
        });
        if (error) throw error;
        await supabase.from('accounts').update({ balance: Number(account.balance) - amt }).eq('id', selectedAccount);
      } else if (txType === 'transfer') {
        if (amt > Number(account.balance)) throw new Error('Insufficient balance');
        if (!targetAccount) throw new Error('Select target account');
        const { error } = await supabase.from('transactions').insert({
          from_account_id: selectedAccount,
          to_account_id: targetAccount,
          type: 'transfer',
          amount: amt,
          description,
          is_flagged: isFlagged,
          status: isFlagged ? 'flagged' : 'completed',
        });
        if (error) throw error;
        const target = accounts.find(a => a.id === targetAccount);
        await Promise.all([
          supabase.from('accounts').update({ balance: Number(account.balance) - amt }).eq('id', selectedAccount),
          supabase.from('accounts').update({ balance: Number(target?.balance || 0) + amt }).eq('id', targetAccount),
        ]);
      }

      toast.success(`${txType} completed!${isFlagged ? ' ⚠️ Flagged for review' : ''}`);
      setOpen(false);
      setAmount('');
      setDescription('');
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
          <p className="text-muted-foreground">View and manage your transactions</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Send className="w-4 h-4 mr-2" />New Transaction</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>New Transaction</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Type</Label>
                <Select value={txType} onValueChange={setTxType}>
                  <SelectTrigger className="mt-1.5 bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deposit">Deposit</SelectItem>
                    <SelectItem value="withdrawal">Withdrawal</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{txType === 'deposit' ? 'To Account' : 'From Account'}</Label>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger className="mt-1.5 bg-secondary border-border"><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.account_number} (${Number(a.balance).toFixed(2)})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {txType === 'transfer' && (
                <div>
                  <Label>To Account</Label>
                  <Select value={targetAccount} onValueChange={setTargetAccount}>
                    <SelectTrigger className="mt-1.5 bg-secondary border-border"><SelectValue placeholder="Select target" /></SelectTrigger>
                    <SelectContent>
                      {accounts.filter(a => a.id !== selectedAccount).map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.account_number} (${Number(a.balance).toFixed(2)})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Amount ($)</Label>
                <Input type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1.5 bg-secondary border-border font-mono" placeholder="0.00" />
              </div>
              <div>
                <Label>Description</Label>
                <Input value={description} onChange={e => setDescription(e.target.value)} className="mt-1.5 bg-secondary border-border" placeholder="Optional description" />
              </div>
              <Button onClick={handleTransaction} disabled={loading} className="w-full">
                {loading ? 'Processing...' : `Submit ${txType}`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="glass-card">
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">No transactions yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {transactions.map((t) => (
                <div
                  key={t.id}
                  className={`flex items-center justify-between p-4 hover:bg-accent/50 transition-colors ${
                    t.is_flagged ? 'bg-destructive/5 border-l-2 border-l-destructive' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                      t.type === 'deposit' ? 'bg-primary/20 text-primary' :
                      t.type === 'withdrawal' ? 'bg-chart-3/20 text-chart-3' :
                      'bg-chart-2/20 text-chart-2'
                    }`}>
                      {t.type === 'deposit' ? <ArrowDownRight className="w-4 h-4" /> :
                       t.type === 'transfer' ? <Send className="w-4 h-4" /> :
                       <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground capitalize">{t.type}</p>
                        {t.is_flagged && <AlertTriangle className="w-3.5 h-3.5 text-destructive" />}
                      </div>
                      <p className="text-xs text-muted-foreground">{t.description || 'No description'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-mono font-bold ${
                      t.type === 'deposit' ? 'text-primary' : 'text-chart-3'
                    }`}>
                      {t.type === 'deposit' ? '+' : '-'}${Number(t.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground">{format(new Date(t.created_at), 'MMM dd, HH:mm')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
