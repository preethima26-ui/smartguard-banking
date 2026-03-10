import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, ArrowLeftRight, Shield, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function Admin() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    loadAll();
  }, [isAdmin]);

  const loadAll = async () => {
    const [p, t, a, acc] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('fraud_alerts').select('*').order('created_at', { ascending: false }),
      supabase.from('accounts').select('*'),
    ]);
    setProfiles(p.data || []);
    setTransactions(t.data || []);
    setAlerts(a.data || []);
    setAccounts(acc.data || []);
  };

  const stats = [
    { label: 'Total Users', value: profiles.length, icon: Users, color: 'text-primary' },
    { label: 'Total Accounts', value: accounts.length, icon: Shield, color: 'text-chart-2' },
    { label: 'Transactions', value: transactions.length, icon: ArrowLeftRight, color: 'text-chart-3' },
    { label: 'Active Alerts', value: alerts.filter(a => !a.is_resolved).length, icon: AlertTriangle, color: 'text-destructive' },
  ];

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground">System overview and management</p>
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

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="bg-secondary">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="alerts">Fraud Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card className="glass-card">
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {profiles.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                        {p.full_name?.[0]?.toUpperCase() || p.email?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{p.full_name || 'No name'}</p>
                        <p className="text-xs text-muted-foreground">{p.email}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{format(new Date(p.created_at), 'MMM dd, yyyy')}</span>
                  </div>
                ))}
                {profiles.length === 0 && (
                  <p className="p-8 text-center text-muted-foreground">No users found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card className="glass-card">
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {transactions.slice(0, 20).map((t) => (
                  <div key={t.id} className={`flex items-center justify-between p-4 ${t.is_flagged ? 'bg-destructive/5' : ''}`}>
                    <div>
                      <p className="text-sm font-medium text-foreground capitalize">{t.type}</p>
                      <p className="text-xs text-muted-foreground">{t.description || 'No description'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono font-bold text-foreground">${Number(t.amount).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(t.created_at), 'MMM dd, HH:mm')}</p>
                    </div>
                  </div>
                ))}
                {transactions.length === 0 && (
                  <p className="p-8 text-center text-muted-foreground">No transactions found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card className="glass-card">
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {alerts.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className={`w-4 h-4 ${a.is_resolved ? 'text-primary' : 'text-destructive'}`} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{a.description}</p>
                        <p className="text-xs text-muted-foreground capitalize">{a.severity} · {a.alert_type.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{format(new Date(a.created_at), 'MMM dd, HH:mm')}</span>
                  </div>
                ))}
                {alerts.length === 0 && (
                  <p className="p-8 text-center text-muted-foreground">No alerts found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
