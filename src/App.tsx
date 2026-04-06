/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { 
  AlertCircle,
  X,
  CheckCircle2
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  Timestamp
} from 'firebase/firestore';
import { 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { db, auth } from './firebase';
import { AnimatePresence, motion } from 'motion/react';

// Components & Pages
import Layout from './components/Layout';
import Home from './pages/Home';
import Admin from './pages/Admin';

// --- Types ---
interface CarRecord {
  aptNo: string;
  mainNo: string;
  subNo: string;
  isSuv1?: boolean;
  isSuv2?: boolean;
  updatedAt: Timestamp | null;
}

// --- Constants ---
const ADMIN_EMAIL = "mrsohnokpos@gmail.com";

export default function App() {
  const [records, setRecords] = useState<CarRecord[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // --- Auth ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const isAdmin = user?.email === ADMIN_EMAIL && user?.emailVerified;

  // --- Data Fetching ---
  useEffect(() => {
    const fetchRTDBData = async () => {
      const RTDB_URL = "https://nsapt-22383-default-rtdb.asia-southeast1.firebasedatabase.app/NSCarNo/.json";
      try {
        const response = await fetch(RTDB_URL);
        if (!response.ok) throw new Error("RTDB fetch failed");
        const data = await response.json();
        
        const formattedData: CarRecord[] = Object.entries(data || {}).map(([key, value]: [string, any]) => ({
          aptNo: value.aptNo || key,
          mainNo: value.mainNo || "",
          subNo: value.subNo || "",
          isSuv1: !!value.isSuv1,
          isSuv2: !!value.isSuv2,
          updatedAt: null
        }));
        
        setRecords(formattedData);
      } catch (err) {
        console.error("RTDB Fetch Error:", err);
      }
    };

    fetchRTDBData();

    if (!isAuthReady) return;
    const path = 'cars';
    const unsubscribe = onSnapshot(collection(db, path), (snapshot) => {
      const firestoreData = snapshot.docs.map(doc => doc.data() as CarRecord);
      setRecords(prev => {
        const combined = [...prev];
        firestoreData.forEach(fDoc => {
          const index = combined.findIndex(r => r.aptNo === fDoc.aptNo);
          if (index > -1) {
            combined[index] = fDoc;
          } else {
            combined.push(fDoc);
          }
        });
        return combined;
      });
    }, (error) => {
      console.error("Firestore Error:", error);
      setError("데이터를 불러오는 중 오류가 발생했습니다.");
    });

    return () => unsubscribe();
  }, [isAuthReady]);

  return (
    <BrowserRouter>
      <Layout user={user} isAdmin={!!isAdmin}>
        <Routes>
          <Route path="/" element={<Home records={records} />} />
          <Route 
            path="/admin" 
            element={
              isAdmin ? (
                <Admin 
                  records={records} 
                  isAdmin={isAdmin} 
                  onSuccess={(msg) => {
                    setSuccess(msg);
                    setTimeout(() => setSuccess(null), 3000);
                  }}
                  onError={(msg) => {
                    setError(msg);
                    setTimeout(() => setError(null), 5000);
                  }}
                />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />
        </Routes>

        {/* Notifications */}
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3"
              >
                <AlertCircle size={20} />
                <span className="font-medium">{error}</span>
                <button onClick={() => setError(null)} className="ml-2 hover:bg-white/20 p-1 rounded-full">
                  <X size={16} />
                </button>
              </motion.div>
            )}
            {success && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3"
              >
                <CheckCircle2 size={20} />
                <span className="font-medium">{success}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Layout>
    </BrowserRouter>
  );
}
