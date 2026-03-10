import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, ArrowUpRight, ArrowDownRight, AlertTriangle, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';

export default function Dashboard() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [fraudCount, setFraudCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    const [accs, txns, alerts] = await Promise.all([
      supabase.from('accounts').select('*'),
      supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('fraud_alerts').select('*').eq('is_resolved', false),
    ]);
    setAccounts(accs.data || []);
    setTransactions(txns.data || []);
    setFraudCount(alerts.data?.length || 0);
  };

  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0);
  const deposits = transactions.filter(t => t.type === 'deposit').reduce((s, t) => s + Number(t.amount), 0);
  const withdrawals = transactions.filter(t => t.type === 'withdrawal').reduce((s, t) => s + Number(t.amount), 0);

  // Chart data from last 7 days
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayStr = format(date, 'yyyy-MM-dd');
    const dayTxns = transactions.filter(t => t.created_at?.startsWith(dayStr));
    return {
      date: format(date, 'MMM dd'),
      deposits: dayTxns.filter(t => t.type === 'deposit').reduce((s, t) => s + Number(t.amount), 0),
      withdrawals: dayTxns.filter(t => t.type === 'withdrawal').reduce((s, t) => s + Number(t.amount), 0),
    };
  });

  const stats = [
    { label: 'Total Balance', value: `$${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: Wallet, color: 'text-primary' },
    { label: 'Total Deposits', value: `$${deposits.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: ArrowDownRight, color: 'text-chart-2' },
    { label: 'Total Withdrawals', value: `$${withdrawals.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: ArrowUpRight, color: 'text-chart-3' },
    { label: 'Fraud Alerts', value: fraudCount.toString(), icon: AlertTriangle, color: 'text-destructive' },
  ];

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user?.email}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <Card key={s.label} className="glass-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">{s.label}</span>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <p className="text-2xl font-bold font-mono text-foreground">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass-card mb-8">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Transaction Overview (7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="deposits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="withdrawals" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                />
                <Area type="monotone" dataKey="deposits" stroke="hsl(var(--primary))" fill="url(#deposits)" strokeWidth={2} />
                <Area type="monotone" dataKey="withdrawals" stroke="hsl(var(--chart-3))" fill="url(#withdrawals)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">No transactions yet. Create an account to get started!</p>
          ) : (
            <div className="space-y-3">
              {transactions.slice(0, 5).map((t) => (
                <div
                  key={t.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    t.is_flagged ? 'bg-destructive/10 border border-destructive/30' : 'bg-secondary/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      t.type === 'deposit' ? 'bg-primary/20 text-primary' :
                      t.type === 'withdrawal' ? 'bg-chart-3/20 text-chart-3' :
                      'bg-chart-2/20 text-chart-2'
                    }`}>
                      {t.type === 'deposit' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground capitalize">{t.type}</p>
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
