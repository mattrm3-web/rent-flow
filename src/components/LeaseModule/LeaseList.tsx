import React, { useState } from 'react';
import { Lease } from '../../types';
import { Button } from '../ui/button';
import { Plus, Search, FileText, Download, Calendar, ArrowRight, Clock } from 'lucide-react';

export function LeaseList({ leases, userRole, onSelect, onCreateNew }: { leases: Lease[], userRole: string, onSelect: (l: Lease) => void, onCreateNew: () => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filtered = leases.filter(l => 
    l.LeaseNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.Status.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.LeaseType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (s: string) => {
    switch(s) {
      case 'Active': return 'bg-emerald-100 text-emerald-700';
      case 'Draft': return 'bg-gray-100 text-gray-700';
      case 'Pending Signature': return 'bg-amber-100 text-amber-700';
      case 'Expiring Soon': return 'bg-orange-100 text-orange-700';
      case 'Renewed': return 'bg-blue-100 text-blue-700';
      case 'Expired': return 'bg-rose-100 text-rose-700';
      case 'Terminated': return 'bg-red-100 text-red-700';
      case 'Eviction In Progress': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const exportCSV = () => {
    const headers = ['Lease Number', 'Status', 'Property ID', 'Unit', 'Start Date', 'End Date', 'Rent Amount', 'Type'];
    const rows = leases.map(l => [
       l.LeaseNumber, l.Status, l.PropertyID, l.Unit, l.StartDate, l.EndDate, l.RentAmount, l.LeaseType
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "leases.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leases</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage tenancy agreements digitally</p>
        </div>
        
        <div className="flex gap-2">
          {['Admin', 'Landlord', 'Property Manager'].includes(userRole) && (
            <Button onClick={onCreateNew} className="gap-2 shrink-0">
              <Plus className="w-4 h-4" /> New Lease
            </Button>
          )}
          <Button onClick={exportCSV} variant="outline" className="gap-2 bg-background">
              <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <div className="bg-card border rounded-3xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-muted-foreground mb-1">Active Leases</h3>
            <p className="text-2xl font-bold">{leases.filter(l => l.Status === 'Active').length}</p>
         </div>
         <div className="bg-card border rounded-3xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-muted-foreground mb-1">Pending Signature</h3>
            <p className="text-2xl font-bold">{leases.filter(l => l.Status === 'Pending Signature').length}</p>
         </div>
         <div className="bg-card border rounded-3xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-muted-foreground mb-1">Expiring Soon</h3>
            <p className="text-2xl font-bold">{leases.filter(l => l.Status === 'Expiring Soon').length}</p>
         </div>
         <div className="bg-card border rounded-3xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-muted-foreground mb-1">Total Leases</h3>
            <p className="text-2xl font-bold">{leases.length}</p>
         </div>
      </div>

      <div className="bg-card border rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 border-b flex flex-col md:flex-row gap-4 justify-between bg-muted/20">
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text"
              placeholder="Search leases..."
              className="w-full pl-9 pr-4 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground">
                <th className="text-left font-medium p-4">Lease ID</th>
                <th className="text-left font-medium p-4">Dates</th>
                <th className="text-left font-medium p-4">Type</th>
                <th className="text-right font-medium p-4">Rent</th>
                <th className="text-left font-medium p-4">Status</th>
                <th className="text-right font-medium p-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    No leases found.
                  </td>
                </tr>
              ) : (
                filtered.map(lease => (
                  <tr key={lease.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors group">
                    <td className="p-4">
                      <div className="font-semibold">{lease.LeaseNumber}</div>
                      <div className="text-xs text-muted-foreground">Unit: {lease.Unit}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground mb-1">
                         <Calendar className="w-3 h-3" /> {new Date(lease.StartDate).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
                         <Clock className="w-3 h-3" /> {new Date(lease.EndDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4">
                       <span className="text-xs font-medium bg-muted px-2 py-1 rounded-md">{lease.LeaseType}</span>
                    </td>
                    <td className="p-4 text-right">
                       <span className="font-medium">{lease.RentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                       <div className="text-xs text-muted-foreground">{lease.PaymentFrequency}</div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(lease.Status)}`}>
                        {lease.Status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Button onClick={() => onSelect(lease)} variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity h-8 px-3">
                         View <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
