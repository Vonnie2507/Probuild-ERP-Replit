import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Send 
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

interface QuoteAnalytics {
  totalQuotes: number;
  sentQuotes: number;
  approvedQuotes: number;
  declinedQuotes: number;
  pendingQuotes: number;
  conversionRate: number;
  totalValue: number;
  averageQuoteValue: number;
  quotesThisWeek: number;
  quotesLastWeek: number;
  quotesByStatus: { status: string; count: number }[];
  quotesByCreator: { userId: string; userName: string; total: number; approved: number; declined: number }[];
  recentQuotes: any[];
  pipelineValue: number;
  wonValue: number;
}

interface SalesAnalytics {
  pendingQuotes: number;
  quoteConversionRate: number;
  averageDealSize: number;
  quotePipelineValue: number;
  monthlyRevenue: number;
  yearToDateRevenue: number;
  wonValue: number;
  lostValue: number;
}

const COLORS = ['#213d42', '#db5c26', '#f5e5d6', '#6b7280', '#10b981'];

const statusColors: Record<string, string> = {
  draft: 'secondary',
  sent: 'default',
  approved: 'default',
  declined: 'destructive',
  expired: 'secondary',
};

const statusIcons: Record<string, typeof FileText> = {
  draft: FileText,
  sent: Send,
  approved: CheckCircle2,
  declined: XCircle,
  expired: Clock,
};

function formatCurrency(amount: number | string | null): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function StatCard({ 
  title, 
  value, 
  subValue, 
  icon: Icon, 
  trend 
}: { 
  title: string; 
  value: string | number; 
  subValue?: string; 
  icon: typeof FileText; 
  trend?: 'up' | 'down' | null;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2">
          <span className="text-2xl font-bold">{value}</span>
          {trend && (
            trend === 'up' ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )
          )}
        </div>
        {subValue && (
          <p className="text-xs text-muted-foreground mt-1">{subValue}</p>
        )}
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function QuoteAnalytics() {
  const { data: analytics, isLoading } = useQuery<QuoteAnalytics>({
    queryKey: ['/api/quotes/analytics'],
  });

  const { data: salesAnalytics, isLoading: salesLoading } = useQuery<SalesAnalytics>({
    queryKey: ['/api/analytics/sales'],
  });

  if (isLoading || salesLoading) {
    return <LoadingSkeleton />;
  }

  if (!analytics) {
    return (
      <div className="p-6 flex items-center justify-center">
        <p className="text-muted-foreground">Unable to load analytics data</p>
      </div>
    );
  }

  const weekTrend = analytics.quotesThisWeek >= analytics.quotesLastWeek ? 'up' : 'down';
  const weekChange = analytics.quotesLastWeek > 0 
    ? Math.round(((analytics.quotesThisWeek - analytics.quotesLastWeek) / analytics.quotesLastWeek) * 100)
    : 0;

  const pieData = analytics.quotesByStatus.filter(s => s.count > 0).map(s => ({
    name: s.status.charAt(0).toUpperCase() + s.status.slice(1),
    value: s.count,
  }));

  const creatorData = analytics.quotesByCreator.map(c => ({
    name: c.userName.split(' ')[0],
    total: c.total,
    approved: c.approved,
    declined: c.declined,
    winRate: c.total > 0 ? Math.round((c.approved / (c.approved + c.declined || 1)) * 100) : 0,
  }));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Quote Analytics</h1>
        <p className="text-muted-foreground">Track quote performance and conversion rates</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Quotes"
          value={analytics.totalQuotes}
          subValue={`${analytics.quotesThisWeek} this week (${weekChange >= 0 ? '+' : ''}${weekChange}%)`}
          icon={FileText}
          trend={weekTrend}
        />
        <StatCard
          title="Lead Conversion Rate"
          value={`${(salesAnalytics?.quoteConversionRate || 0).toFixed(1)}%`}
          subValue="Won leads with quotes sent"
          icon={TrendingUp}
        />
        <StatCard
          title="Average Deal Size"
          value={formatCurrency(salesAnalytics?.averageDealSize || 0)}
          subValue="Mean value of won opportunities"
          icon={DollarSign}
        />
        <StatCard
          title="Pending Quotes"
          value={salesAnalytics?.pendingQuotes || analytics.sentQuotes}
          subValue="Awaiting client response"
          icon={Send}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
        <StatCard
          title="Pipeline Forecast"
          value={formatCurrency(salesAnalytics?.quotePipelineValue || analytics.pipelineValue)}
          subValue="Active leads (opportunity value)"
          icon={TrendingUp}
        />
        <StatCard
          title="Won This Period"
          value={formatCurrency(salesAnalytics?.wonValue || analytics.wonValue)}
          subValue="Converted opportunities"
          icon={CheckCircle2}
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(salesAnalytics?.monthlyRevenue || 0)}
          subValue="Paid invoices this month"
          icon={DollarSign}
        />
        <StatCard
          title="YTD Revenue"
          value={formatCurrency(salesAnalytics?.yearToDateRevenue || 0)}
          subValue="Total paid this year"
          icon={DollarSign}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quote Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No quote data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance by Team Member</CardTitle>
          </CardHeader>
          <CardContent>
            {creatorData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={creatorData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={80} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="approved" name="Approved" fill="#10b981" stackId="a" />
                  <Bar dataKey="declined" name="Declined" fill="#ef4444" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No team data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quote Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analytics.quotesByStatus.map(({ status, count }) => {
              const StatusIcon = statusIcons[status] || FileText;
              const percentage = analytics.totalQuotes > 0 
                ? Math.round((count / analytics.totalQuotes) * 100) 
                : 0;
              return (
                <div key={status} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="capitalize">{status}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{count}</span>
                      <Badge variant={statusColors[status] as any || 'secondary'}>
                        {percentage}%
                      </Badge>
                    </div>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Win Rates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {creatorData.length > 0 ? (
              creatorData.map((creator, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{creator.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {creator.total} quotes
                      </span>
                      <Badge variant={creator.winRate >= 50 ? 'default' : 'secondary'}>
                        {creator.winRate}% win rate
                      </Badge>
                    </div>
                  </div>
                  <Progress 
                    value={creator.winRate} 
                    className="h-2"
                  />
                </div>
              ))
            ) : (
              <div className="text-muted-foreground text-center py-8">
                No team data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Quotes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.recentQuotes.length > 0 ? (
              analytics.recentQuotes.map((quote) => {
                const StatusIcon = statusIcons[quote.status] || FileText;
                return (
                  <div 
                    key={quote.id} 
                    className="flex items-center justify-between p-3 rounded-lg border"
                    data-testid={`quote-row-${quote.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <StatusIcon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{quote.quoteNumber}</p>
                        <p className="text-sm text-muted-foreground">{quote.siteAddress}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{formatCurrency(quote.totalAmount)}</span>
                      <Badge variant={statusColors[quote.status] as any || 'secondary'}>
                        {quote.status}
                      </Badge>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-muted-foreground text-center py-8">
                No quotes yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
