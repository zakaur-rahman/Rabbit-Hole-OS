'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Download, RefreshCcw, DollarSign, Filter, Search } from 'lucide-react';

// Mock Data Type
interface Transaction {
    id: string;
    date: string;
    amount: number;
    plan: 'Pro' | 'Team' | 'Add-on';
    method: string;
    status: 'paid' | 'failed' | 'refunded';
    invoiceUrl: string;
}

const MOCK_TRANSACTIONS: Transaction[] = [
    { id: 'inv_101', date: '2026-02-15', amount: 12.00, plan: 'Pro', method: '•••• 4242', status: 'paid', invoiceUrl: '#' },
    { id: 'inv_102', date: '2026-01-15', amount: 12.00, plan: 'Pro', method: '•••• 4242', status: 'paid', invoiceUrl: '#' },
    { id: 'inv_103', date: '2025-12-15', amount: 12.00, plan: 'Pro', method: '•••• 4242', status: 'refunded', invoiceUrl: '#' },
    { id: 'inv_104', date: '2025-11-15', amount: 12.00, plan: 'Pro', method: '•••• 5555', status: 'failed', invoiceUrl: '#' },
    { id: 'inv_105', date: '2025-10-15', amount: 12.00, plan: 'Pro', method: '•••• 5555', status: 'paid', invoiceUrl: '#' },
];

export function PaymentHistory() {
    const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'failed' | 'refunded'>('all');
    const [isRefreshing, setIsRefreshing] = useState(false);

    const filteredTransactions = MOCK_TRANSACTIONS.filter(t =>
        statusFilter === 'all' ? true : t.status === statusFilter
    );

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await new Promise(r => setTimeout(r, 800));
        setIsRefreshing(false);
    };

    const formatDate = (dateStr: string) => {
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        }).format(new Date(dateStr));
    };

    const StatusBadge = ({ status }: { status: Transaction['status'] }) => {
        const styles = {
            paid: 'bg-primary/10 text-primary border-primary/20',
            failed: 'bg-destructive/10 text-destructive border-destructive/20',
            refunded: 'bg-muted text-muted-foreground border-border'
        };
        return (
            <span className={`px-2.5 py-1 text-xs font-medium rounded-full border capitalize ${styles[status]}`}>
                {status}
            </span>
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8 mt-8"
        >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-primary" />
                        Billing History
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">View past transactions and download invoices.</p>
                </div>

                <div className="flex gap-2">
                    <div className="relative">
                        <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'paid' | 'failed' | 'refunded')}
                            className="bg-secondary/50 border border-border/50 text-sm text-foreground rounded-xl pl-9 pr-8 py-2 appearance-none focus:outline-hidden focus:border-primary/50 transition-colors cursor-pointer"
                        >
                            <option value="all">All Statuses</option>
                            <option value="paid">Paid</option>
                            <option value="failed">Failed</option>
                            <option value="refunded">Refunded</option>
                        </select>
                    </div>
                    <button
                        onClick={handleRefresh}
                        className="p-2 border border-border/50 bg-secondary/50 hover:bg-white/10 rounded-xl text-muted-foreground transition-colors"
                        title="Refresh History"
                    >
                        <RefreshCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border/50 bg-secondary/20">
                <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                        <tr className="border-b border-border/50 text-xs uppercase tracking-wider text-muted-foreground bg-secondary/50">
                            <th className="p-4 font-medium">Date</th>
                            <th className="p-4 font-medium">Amount</th>
                            <th className="p-4 font-medium">Plan</th>
                            <th className="p-4 font-medium">Status</th>
                            <th className="p-4 font-medium">Method</th>
                            <th className="p-4 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-border/30">
                        {filteredTransactions.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                    <Search className="w-8 h-8 opacity-20 mx-auto mb-3" />
                                    No transactions found for the selected filter.
                                </td>
                            </tr>
                        ) : (
                            filteredTransactions.map((tx) => (
                                <tr key={tx.id} className="hover:bg-white/2 transition-colors group">
                                    <td className="p-4 text-foreground flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-muted-foreground opacity-50" />
                                        {formatDate(tx.date)}
                                    </td>
                                    <td className="p-4 font-medium text-foreground">${tx.amount.toFixed(2)}</td>
                                    <td className="p-4 text-muted-foreground">{tx.plan}</td>
                                    <td className="p-4"><StatusBadge status={tx.status} /></td>
                                    <td className="p-4 text-muted-foreground">{tx.method}</td>
                                    <td className="p-4 text-right space-x-2">
                                        {tx.status === 'failed' && (
                                            <button className="text-xs px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors">
                                                Retry
                                            </button>
                                        )}
                                        <a href={tx.invoiceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center p-1.5 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity rounded-lg hover:bg-white/5">
                                            <Download className="w-4 h-4" />
                                        </a>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Mock */}
            <div className="flex justify-between items-center mt-4 text-xs text-muted-foreground">
                <p>Showing {filteredTransactions.length} results</p>
                <div className="flex gap-2">
                    <button className="px-3 py-1.5 rounded-lg border border-border/50 opacity-50 cursor-not-allowed">Previous</button>
                    <button className="px-3 py-1.5 rounded-lg border border-border/50 hover:bg-white/5 transition-colors">Next</button>
                </div>
            </div>
        </motion.div>
    );
}
