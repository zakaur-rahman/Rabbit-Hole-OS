'use client';

import { useState } from 'react';
import { Calendar, Download, RefreshCcw, DollarSign, Filter, Search } from 'lucide-react';
import { DashboardCard } from './DashboardCard';
import { cn } from '@/lib/utils';

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
            paid: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
            failed: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
            refunded: 'bg-ink/10 text-neutral-400 border-ink/5'
        };
        return (
            <span className={cn(
                "px-2 py-0.5 text-[10px] font-mono font-bold rounded-full border uppercase tracking-tighter",
                styles[status]
            )}>
                {status}
            </span>
        );
    };

    return (
        <DashboardCard delay={0.3} className="mt-8 p-0 overflow-hidden">
            <div className="p-8 border-b border-ink/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="w-4 h-4 text-amber" />
                        <h3 className="text-xl font-serif font-black text-ink">Payment Protocol</h3>
                    </div>
                    <p className="text-[12px] font-mono text-neutral-500">Historical synchronization of financial transactions.</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:flex-none">
                        <Filter className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'paid' | 'failed' | 'refunded')}
                            className="bg-ink/5 border border-ink/5 text-[11px] font-mono text-ink/80 rounded-lg pl-10 pr-8 py-2.5 appearance-none focus:outline-none focus:border-amber/30 transition-all cursor-pointer w-full"
                        >
                            <option value="all">ALL PROTOCOLS</option>
                            <option value="paid">PAID</option>
                            <option value="failed">FAILED</option>
                            <option value="refunded">REFUNDED</option>
                        </select>
                    </div>
                    <button
                        onClick={handleRefresh}
                        className="p-2.5 bg-ink/5 border border-ink/5 rounded-lg text-neutral-400 hover:text-ink hover:bg-ink/10 transition-all"
                    >
                        <RefreshCcw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                        <tr className="bg-ink/2">
                            <th className="p-5 text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-widest">Initialization</th>
                            <th className="p-5 text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-widest">Amount</th>
                            <th className="p-5 text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-widest">Plan</th>
                            <th className="p-5 text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-widest">Status</th>
                            <th className="p-5 text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-widest">Method</th>
                            <th className="p-5 text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-widest text-right">Invoices</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-ink/5">
                        {filteredTransactions.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-20 text-center">
                                    <Search className="w-8 h-8 text-neutral-800 mx-auto mb-4" />
                                    <p className="text-[13px] font-mono text-neutral-600">No matching protocols found.</p>
                                </td>
                            </tr>
                        ) : (
                            filteredTransactions.map((tx) => (
                                <tr key={tx.id} className="group hover:bg-ink/2 transition-colors">
                                    <td className="p-5">
                                        <div className="flex items-center gap-2 text-[13px] font-mono text-neutral-400">
                                            <Calendar className="w-3.5 h-3.5 text-neutral-600" />
                                            {formatDate(tx.date)}
                                        </div>
                                    </td>
                                    <td className="p-5 text-[13px] font-mono font-bold text-ink">${tx.amount.toFixed(2)}</td>
                                    <td className="p-5 text-[13px] font-mono text-neutral-400 capitalize">{tx.plan}</td>
                                    <td className="p-5"><StatusBadge status={tx.status} /></td>
                                    <td className="p-5 text-[13px] font-mono text-neutral-500">{tx.method}</td>
                                    <td className="p-5 text-right">
                                        <div className="flex items-center justify-end gap-2 px-4">
                                            {tx.status === 'failed' && (
                                                <button className="text-[10px] font-mono font-bold px-3 py-1 bg-amber text-black rounded hover:bg-neutral-200 transition-colors uppercase tracking-tight">
                                                    Retry
                                                </button>
                                            )}
                                            <a 
                                                href={tx.invoiceUrl} 
                                                className="p-2 text-neutral-500 hover:text-ink hover:bg-ink/5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Download className="w-4 h-4" />
                                            </a>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="p-5 border-t border-ink/5 bg-ink/2 flex justify-between items-center">
                <p className="font-mono text-[10px] text-neutral-600 uppercase tracking-widest">
                    Execution Log: {filteredTransactions.length} items
                </p>
                <div className="flex gap-2">
                    <button className="px-3 py-1.5 font-mono text-[10px] text-neutral-600 border border-ink/5 rounded-md opacity-50 cursor-not-allowed uppercase tracking-widest">Previous</button>
                    <button className="px-3 py-1.5 font-mono text-[10px] text-neutral-400 border border-ink/10 rounded-md hover:bg-ink/5 transition-all uppercase tracking-widest">Next</button>
                </div>
            </div>
        </DashboardCard>
    );
}
