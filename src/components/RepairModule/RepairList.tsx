import React, { useState, useEffect } from 'react';
import { useFirebase } from '../FirebaseProvider';
import { db } from '../../firebase';
import { collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { Repair, Property } from '../../types';
import { Plus, Search, Filter, Wrench, AlertCircle, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { DownloadCloud } from 'lucide-react';

export function RepairList({ repairs, userRole, onViewDetail, onCreateNew }: { repairs: Repair[], userRole: string, onViewDetail: (r: Repair) => void, onCreateNew: () => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  const exportCSV = () => {
    const headers = ['Repair ID', 'Title', 'Status', 'Priority', 'Category', 'Date Created', 'Estimated Cost', 'Total Cost'];
    const rows = filtered.map(r => [
      r.RepairID, r.IssueTitle, r.Status, r.Priority, r.Category, r.DateCreated, r.EstimatedCost || 0, r.TotalCost || 0
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `repairs_export_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPrint = () => {
    window.print();
  };

  const filtered = repairs.filter(r => {
    if (filterStatus !== 'All' && r.Status !== filterStatus) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return r.RepairID?.toLowerCase().includes(term) || r.IssueTitle.toLowerCase().includes(term) || r.PropertyID.toLowerCase().includes(term);
    }
    return true;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Emergency': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'High': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Low': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Submitted': return 'bg-blue-100 text-blue-700';
      case 'Under Review': return 'bg-purple-100 text-purple-700';
      case 'Assigned': return 'bg-indigo-100 text-indigo-700';
      case 'In Progress': return 'bg-yellow-100 text-yellow-700';
      case 'Completed': return 'bg-emerald-100 text-emerald-700';
      case 'Closed': return 'bg-slate-100 text-slate-700';
      case 'Cancelled': case 'Rejected': return 'bg-rose-100 text-rose-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="w-6 h-6 text-primary" />
            Repair & Maintenance
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Manage all property maintenance requests</p>
        </div>
        
        {['Tenant', 'Property Manager', 'Security Staff'].includes(userRole) && (
          <Button onClick={onCreateNew} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" /> {userRole === 'Security Staff' ? 'Report Incident' : 'New Request'}
          </Button>
        )}
        {['Admin', 'Landlord', 'Property Manager'].includes(userRole) && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV} className="gap-2 shrink-0 border-primary/20 text-primary hover:bg-primary/5">
              <DownloadCloud className="w-4 h-4" /> Export CSV
            </Button>
            <Button variant="outline" onClick={exportPrint} className="gap-2 shrink-0 border-primary/20 text-primary hover:bg-primary/5">
              Print Report
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border rounded-2xl p-4 shadow-sm flex flex-col">
           <span className="text-sm font-medium text-muted-foreground">Open Repairs</span>
           <span className="text-2xl font-bold mt-1">{repairs.filter(r => !['Completed', 'Closed'].includes(r.Status)).length}</span>
        </div>
        <div className="bg-card border rounded-2xl p-4 shadow-sm flex flex-col">
           <span className="text-sm font-medium text-muted-foreground">Completed</span>
           <span className="text-2xl font-bold mt-1 text-emerald-600">{repairs.filter(r => ['Completed', 'Closed'].includes(r.Status)).length}</span>
        </div>
        <div className="bg-card border rounded-2xl p-4 shadow-sm flex flex-col">
           <span className="text-sm font-medium text-muted-foreground">Emergency</span>
           <span className="text-2xl font-bold mt-1 text-rose-600">{repairs.filter(r => r.Priority === 'Emergency' && !['Completed', 'Closed'].includes(r.Status)).length}</span>
        </div>
        <div className="bg-card border rounded-2xl p-4 shadow-sm flex flex-col">
           <span className="text-sm font-medium text-muted-foreground">Avg Cost</span>
           <span className="text-2xl font-bold mt-1">
             ₦{Math.round(repairs.reduce((acc, sum) => acc + (sum.TotalCost || 0), 0) / (repairs.filter(r => r.TotalCost! > 0).length || 1)).toLocaleString()}
           </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by ID, Title..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="border bg-card rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="All">All Statuses</option>
          <option value="Submitted">Submitted</option>
          <option value="Under Review">Under Review</option>
          <option value="Assigned">Assigned</option>
          <option value="In Progress">In Progress</option>
          <option value="Waiting For Parts">Waiting For Parts</option>
          <option value="Completed">Completed</option>
          <option value="Closed">Closed</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(repair => (
          <div 
            key={repair.id} 
            onClick={() => onViewDetail(repair)}
            className="bg-card border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col gap-3 group"
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-mono font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-md">{repair.RepairID}</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${getStatusColor(repair.Status)}`}>
                {repair.Status}
              </span>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">{repair.IssueTitle}</h3>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{repair.Description}</p>
            </div>

            <div className="mt-auto pt-4 flex items-center justify-between border-t border-border/50">
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${getPriorityColor(repair.Priority)}`}>
                  {repair.Priority}
                </span>
                <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{repair.Category}</span>
              </div>
              <span className="text-[11px] text-muted-foreground">{new Date(repair.DateCreated).toLocaleDateString()}</span>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-16 flex flex-col items-center justify-center border-2 border-dashed rounded-3xl text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No repairs found</h3>
            <p className="text-muted-foreground text-sm">We couldn't find any maintenance records matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
