import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { UserProfile, UserRole } from '../types';

interface FirebaseContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  userRole: UserRole | null;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType>({
  currentUser: null,
  userProfile: null,
  userRole: null,
  isLoading: true,
  logout: async () => {},
});

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let unsubscribeDoc: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        setIsLoading(true);
        const docRef = doc(db, 'users', user.uid);
        unsubscribeDoc = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            let fetchedRole = data.role as UserRole;
            
            // Normalize role if it's missing or case mismatched
            if (!fetchedRole) {
               fetchedRole = 'Landlord';
            } else if (fetchedRole.toLowerCase() === 'admin') {
               fetchedRole = 'Admin';
            } else if (fetchedRole.toLowerCase() === 'landlord') {
               fetchedRole = 'Landlord';
            } else if (fetchedRole.toLowerCase() === 'property manager') {
               fetchedRole = 'Property Manager';
            } else if (fetchedRole.toLowerCase() === 'security staff') {
               fetchedRole = 'Security Staff';
            } else if (fetchedRole.toLowerCase() === 'tenant') {
               fetchedRole = 'Tenant';
            } else if (fetchedRole.toLowerCase() === 'service provider') {
               fetchedRole = 'Service Provider';
            } else {
               fetchedRole = 'Landlord';
            }
            
            setUserProfile({ ...data, role: fetchedRole });
            setUserRole(fetchedRole);
            setIsLoading(false);
          } else {
            // Document doesn't exist
            const creationTime = new Date(user.metadata.creationTime || '').getTime();
            const now = Date.now();
            if (now - creationTime > 15000) {
              // User profile deleted -> force logout
              signOut(auth);
              setUserProfile(null);
              setUserRole(null);
              setIsLoading(false);
            }
          }
        }, (error) => {
          console.error("Error fetching user profile:", error);
          setIsLoading(false);
        });
      } else {
        if (unsubscribeDoc) {
          unsubscribeDoc();
          unsubscribeDoc = undefined;
        }
        setUserProfile(null);
        setUserRole(null);
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <FirebaseContext.Provider value={{ currentUser, userProfile, userRole, isLoading, logout }}>
      {children}
    </FirebaseContext.Provider>
  );
}

export const useFirebase = () => useContext(FirebaseContext);
