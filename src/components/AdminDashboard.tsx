import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { CheckCircle2, XCircle } from 'lucide-react';
import UserApprovals from './AdminModule/UserApprovals';

export default function AdminDashboard() {
  return (
    <div className="flex-1 p-[24px] lg:p-[48px] animate-in fade-in zoom-in-95 duration-300">
      <div className="mb-[32px]">
        <h1 className="text-h1 mb-[4px]">System Administration</h1>
        <p className="text-body text-muted-foreground">Manage platform users, verify providers, and monitor system health.</p>
      </div>

      <UserApprovals />
    </div>
  );
}
