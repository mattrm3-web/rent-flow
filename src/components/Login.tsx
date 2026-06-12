import { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  sendEmailVerification, 
  confirmPasswordReset
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Building2, ArrowRight, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useFirebase } from './FirebaseProvider';
import { filteredCountryCodes } from '../lib/countryCodes';
import { UserRole } from '../types';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

export default function Login() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useFirebase();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [nationality, setNationality] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [role, setRole] = useState<UserRole>('Landlord');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if the user arrived via a password reset link
    const oobCode = searchParams.get('oobCode');
    const urlMode = searchParams.get('mode');
    if (oobCode && urlMode === 'resetPassword') {
      setMode('reset');
    }
  }, [searchParams]);

  useEffect(() => {
    // If user is already logged in, push them to the dashboard immediately.
    // We bypass this check if they are explicitly trying to reset their password.
    if (currentUser && mode !== 'reset') {
      const from = location.state?.from?.pathname || '/';
      navigate(from);
    }
  }, [currentUser, navigate, mode, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (mode === 'register') {
        let userCredential;
        try {
           userCredential = await createUserWithEmailAndPassword(auth, email, password);
        } catch (registerErr: any) {
           if (registerErr.code === 'auth/email-already-in-use') {
              // Try to sign in. Maybe it's an orphaned account without a DB profile.
              try {
                 const cred = await signInWithEmailAndPassword(auth, email, password);
                 const { getDoc } = await import('firebase/firestore');
                 const p = await getDoc(doc(db, 'users', cred.user.uid));
                 if (!p.exists()) {
                    userCredential = cred; // Treat as successful registration!
                 } else {
                    throw registerErr; // Normal email in use
                 }
              } catch (signInErr) {
                 throw registerErr; // They typed a different password or something else failed, throw original
              }
           } else {
              throw registerErr;
           }
        }
        
        let userData: any = {
          uid: userCredential.user.uid,
          email,
          name,
          displayName: name,
          phoneNumber,
          nationality,
          currency,
          role,
          accountStatus: 'Active',
          verificationStatus: 'Pending',
          profileCompleted: false,
          createdAt: new Date().toISOString()
        };

        if (role === 'Landlord' || role === 'Property Seeker') {
           userData.verificationStatus = 'Approved';
        }

        if (role === 'Service Provider') {
          // Also init in serviceProviders collection
          await setDoc(doc(db, 'serviceProviders', userCredential.user.uid), {
             ...userData,
             businessName: '',
             businessAddress: '',
             country: nationality,
             state: '',
             city: '',
             yearsOfExperience: 0,
             serviceCategory: '',
             description: '',
             pricingInfo: '',
             workingHours: '',
             emergencyAvailability: false,
             completedJobs: 0,
             averageRating: 0
          });
        }
        
        // Let Developer and Agency default to Pending status

        // Create the user profile in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), userData);
        
        // Send email verification
        await sendEmailVerification(userCredential.user);
        setMessage('Registration successful! Please check your email inbox to verify your account.');
        setMode('login');
        setPassword('');
      } else if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        // Redirect is handled by the useEffect watching currentUser
      } else if (mode === 'forgot') {
        await sendPasswordResetEmail(auth, email);
        setMessage('A password reset link has been sent to your email.');
        setMode('login');
      } else if (mode === 'reset') {
        const oobCode = searchParams.get('oobCode');
        if (!oobCode) throw new Error('Invalid or missing password reset token.');
        await confirmPasswordReset(auth, oobCode, password);
        setMessage('Your password has been successfully reset. You can now log in.');
        setMode('login');
        setPassword('');
        navigate('/login'); // Clear out the query parameters safely
      }
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
         setError('Email is already registered. If you previously deleted an account and are stuck, reset your password, log in, and try again.');
      }
      else if (err.code === 'auth/wrong-password') setError('Incorrect password provided.');
      else if (err.code === 'auth/user-not-found') setError('No user found with this email.');
      else if (err.code === 'auth/weak-password') setError('Password should be at least 6 characters.');
      else if (err.code === 'auth/network-request-failed') setError('Network request failed. Please check your connection, disable ad-blockers, or open the app in a new tab instead of the preview window.');
      else setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getContainerState = () => {
    switch (mode) {
      case 'register': return { height: 'auto', opacity: 1 };
      case 'forgot': return { height: 'auto', opacity: 1 };
      case 'reset': return { height: 'auto', opacity: 1 };
      default: return { height: 'auto', opacity: 1 };
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-[24px]">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-[32px]">
          <div className="flex items-center gap-[8px] bg-primary/10 px-[16px] py-[8px] rounded-[16px]">
            <img src="/logo.png" alt="RentFlow Pro" className="h-[32px] w-[32px] object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
            <Building2 className="h-[24px] w-[24px] text-primary hidden" />
            <span className="text-h2 font-[800] text-foreground tracking-tight">
              RentFlow Pro
            </span>
          </div>
        </div>

        <motion.div
          animate={getContainerState()}
          transition={{ duration: 0.3 }}
          className="bg-card border shadow-float rounded-[32px] p-[32px] overflow-hidden relative"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-[24px]">
                <h1 className="text-h1 tracking-tight">
                  {mode === 'login' && 'Welcome back'}
                  {mode === 'register' && 'Create your account'}
                  {mode === 'forgot' && 'Reset your password'}
                  {mode === 'reset' && 'Create new password'}
                </h1>
                <p className="text-body text-muted-foreground mt-[8px]">
                  {mode === 'login' && 'Enter your credentials to access your dashboard.'}
                  {mode === 'register' && 'Get started with RentFlow Pro today.'}
                  {mode === 'forgot' && "Enter your email and we'll send you a reset link."}
                  {mode === 'reset' && 'Please enter your strong new password below.'}
                </p>
              </div>

              {error && (
                <div className="mb-[24px] p-[16px] rounded-[16px] bg-destructive/10 border border-destructive/20 flex items-start gap-[12px]">
                  <AlertCircle className="w-[20px] h-[20px] text-destructive shrink-0 mt-[2px]" />
                  <p className="text-body font-[600] text-destructive">{error}</p>
                </div>
              )}

              {message && (
                <div className="mb-[24px] p-[16px] rounded-[16px] bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-[12px]">
                  <CheckCircle2 className="w-[20px] h-[20px] text-emerald-600 dark:text-emerald-400 shrink-0 mt-[2px]" />
                  <p className="text-body font-[600] text-emerald-600 dark:text-emerald-400">{message}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-[16px]">
                {mode === 'register' && (
                  <>
                    <div className="space-y-[6px]">
                      <label className="text-label text-muted-foreground">Account Type</label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as UserRole)}
                        className="w-full bg-background border rounded-[12px] px-[16px] py-[10px] text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-[400] appearance-none"
                      >
                        <option value="Landlord">Landlord</option>
                        <option value="Property Seeker">Property Seeker</option>
                        <option value="Service Provider">Service Provider</option>
                        <option value="Agency">Agency</option>
                        <option value="Developer">Developer</option>
                      </select>
                    </div>
                    <div className="space-y-[6px]">
                      <label className="text-label text-muted-foreground">Full Name</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-background border rounded-[12px] px-[16px] py-[10px] text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-[400]"
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-[6px]">
                      <label className="text-label text-muted-foreground">Phone Number</label>
                      <div className="flex bg-background border rounded-[12px] overflow-hidden focus-within:ring-2 focus-within:ring-primary/50 transition-all">
                        <select
                           className="bg-transparent px-[12px] py-[10px] text-[14px] font-[500] text-muted-foreground outline-none border-r appearance-none min-w-[80px]"
                           defaultValue="+1"
                           onChange={(e) => {
                             if (!phoneNumber.startsWith('+')) {
                               setPhoneNumber(e.target.value + phoneNumber);
                             } else {
                               // replace existing prefix
                               const currentNum = phoneNumber.replace(/^\+\d+\s*/, '');
                               setPhoneNumber(e.target.value + currentNum);
                             }
                           }}
                        >
                          {filteredCountryCodes.map((c) => (
                              <option key={c.code} value={c.code}>{c.code} ({c.name})</option>
                          ))}
                        </select>
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="w-full bg-transparent px-[16px] py-[10px] text-[14px] outline-none font-[400]"
                          placeholder="20 7123 1234"
                        />
                      </div>
                    </div>
                    <div className="space-y-[6px]">
                      <label className="text-label text-muted-foreground">National/Country Code</label>
                      <input
                        type="text"
                        value={nationality}
                        onChange={(e) => setNationality(e.target.value)}
                        className="w-full bg-background border rounded-[12px] px-[16px] py-[10px] text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-[400]"
                        placeholder="e.g. US, UK, FR"
                      />
                    </div>
                    <div className="space-y-[6px]">
                      <label className="text-label text-muted-foreground">Preferred Currency</label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full bg-background border rounded-[12px] px-[16px] py-[10px] text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-[400] appearance-none"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="NGN">NGN (₦)</option>
                        <option value="CAD">CAD ($)</option>
                      </select>
                    </div>
                  </>
                )}

                {['login', 'register', 'forgot'].includes(mode) && (
                  <div className="space-y-[6px]">
                    <label className="text-label text-muted-foreground">Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-background border rounded-[12px] px-[16px] py-[10px] text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-[400]"
                      placeholder="you@example.com"
                    />
                  </div>
                )}

                {['login', 'register', 'reset'].includes(mode) && (
                  <div className="space-y-[6px]">
                    <div className="flex items-center justify-between">
                      <label className="text-label text-muted-foreground">
                        {mode === 'reset' ? 'New Password' : 'Password'}
                      </label>
                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={() => {
                            setMode('forgot');
                            setError('');
                            setMessage('');
                          }}
                          className="text-[12px] font-[600] text-primary hover:text-primary/80 transition-colors"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-background border rounded-[12px] px-[16px] py-[10px] text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-[400]"
                      placeholder="••••••••"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-[600] rounded-[12px] px-[16px] py-[12px] text-btn flex items-center justify-center gap-[8px] transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-[24px] shadow-sm hover:shadow-md"
                >
                  {loading ? (
                    <Loader2 className="w-[20px] h-[20px] animate-spin" />
                  ) : (
                    <>
                      {mode === 'login' && 'Sign into account'}
                      {mode === 'register' && 'Create account'}
                      {mode === 'forgot' && 'Send reset link'}
                      {mode === 'reset' && 'Reset password'}
                      <ArrowRight className="w-[16px] h-[16px]" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </AnimatePresence>

          <div className="mt-[32px] pt-[24px] border-t font-[400]">
            {mode === 'login' ? (
              <p className="text-center text-[14px] text-muted-foreground">
                Don't have an account?{' '}
                <button
                  onClick={() => {
                    setMode('register');
                    setError('');
                    setMessage('');
                  }}
                  className="text-foreground font-[600] hover:text-primary transition-colors inline-flex items-center gap-[4px]"
                >
                  Register now
                </button>
              </p>
            ) : (
              <button
                onClick={() => {
                  setMode('login');
                  setError('');
                  setMessage('');
                }}
                className="w-full text-center text-[14px] text-muted-foreground hover:text-foreground font-[600] transition-colors flex items-center justify-center gap-[8px]"
              >
                <ArrowLeft className="w-[16px] h-[16px]" />
                Back to sign in
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
