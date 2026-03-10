import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function FraudAlerts() {
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => { loadAlerts(); }, []);

  const loadAlerts = async () => {
    const { data } = await supabase.from('fraud_alerts').select('*').order('created_at', { ascending: false });
    setAlerts(data || []);
  };

  const severityColor: Record<string, string> = {
    low: 'bg-chart-2/20 text-chart-2',
    medium: 'bg-warning/20 text-warning',
    high: 'bg-chart-3/20 text-chart-3',
    critical: 'bg-destructive/20 text-destructive',
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Fraud Alerts</h1>
        <p className="text-muted-foreground">Monitor suspicious activities</p>
      </div>

      {alerts.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-12 text-center">
            <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">All Clear</h3>
            <p className="text-muted-foreground">No fraud alerts detected. Your accounts are secure.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <Card key={alert.id} className={`glass-card ${!alert.is_resolved ? 'border-l-2 border-l-destructive' : 'border-l-2 border-l-primary'}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {alert.is_resolved ? (
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground">{alert.description}</p>
                      <p className="text-xs text-muted-foreground mt-1 capitalize">{alert.alert_type.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${severityColor[alert.severity] || ''}`}>
                      {alert.severity}
                    </span>
                    <span className="text-xs text-muted-foreground">{format(new Date(alert.created_at), 'MMM dd, HH:mm')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
