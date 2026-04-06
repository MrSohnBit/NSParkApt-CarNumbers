/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, FormEvent } from 'react';
import { 
  Search, 
  Plus, 
  Trash2, 
  Edit2, 
  LogOut, 
  LogIn, 
  ShieldCheck, 
  Car, 
  Home, 
  AlertCircle,
  X,
  CheckCircle2,
  Info
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  getDocFromServer,
  Timestamp
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { db, auth } from './firebase';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
interface CarRecord {
  aptNo: string;
  mainNo: string;
  subNo: string;
  isSuv1?: boolean;
  isSuv2?: boolean;
  updatedAt: Timestamp | null;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

// --- Constants ---
const ADMIN_EMAIL = "mrsohnokpos@gmail.com";

export default function App() {
  const [records, setRecords] = useState<CarRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isEditing, setIsEditing] = useState<CarRecord | null>(null);
  const [formData, setFormData] = useState({ aptNo: "", mainNo: "", subNo: "", isSuv1: false, isSuv2: false });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isConnectionTested, setIsConnectionTested] = useState(false);

  // --- Error Handling ---
  function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
        tenantId: auth.currentUser?.tenantId,
        providerInfo: auth.currentUser?.providerData.map(provider => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL
        })) || []
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    setError(error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.");
    setTimeout(() => setError(null), 5000);
    throw new Error(JSON.stringify(errInfo));
  }

  // --- Auth ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      setSuccess("로그인되었습니다.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Login Error:", err);
      setError("로그인에 실패했습니다.");
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setSuccess("로그아웃되었습니다.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Logout Error:", err);
    }
  };

  const isAdmin = user?.email === ADMIN_EMAIL && user?.emailVerified;

  // --- Connection Test ---
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
        setIsConnectionTested(true);
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
          setError("Firebase 연결에 실패했습니다. 설정을 확인해주세요.");
        }
      }
    }
    testConnection();
  }, []);

  // --- Data Fetching ---
  useEffect(() => {
    const fetchRTDBData = async () => {
      const RTDB_URL = "https://nsapt-22383-default-rtdb.asia-southeast1.firebasedatabase.app/NSCarNo/.json";
      try {
        const response = await fetch(RTDB_URL);
        if (!response.ok) throw new Error("RTDB fetch failed");
        const data = await response.json();
        
        // RTDB data can be an array or an object with keys
        const formattedData: CarRecord[] = Object.entries(data || {}).map(([key, value]: [string, any]) => ({
          aptNo: value.aptNo || key,
          mainNo: value.mainNo || "",
          subNo: value.subNo || "",
          isSuv1: !!value.isSuv1,
          isSuv2: !!value.isSuv2,
          updatedAt: null // RTDB doesn't have Firestore Timestamps in this format
        }));
        
        setRecords(formattedData);
      } catch (err) {
        console.error("RTDB Fetch Error:", err);
        // Fallback to Firestore if RTDB fails or if you want to combine them
      }
    };

    fetchRTDBData();

    // Keep Firestore listener for real-time updates on the new database if needed
    if (!isAuthReady) return;
    const path = 'cars';
    const unsubscribe = onSnapshot(collection(db, path), (snapshot) => {
      const firestoreData = snapshot.docs.map(doc => doc.data() as CarRecord);
      // Merge or prefer one. Here we'll just append Firestore data to RTDB data
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
      handleFirestoreError(error, OperationType.GET, path);
    });

    return () => unsubscribe();
  }, [isAuthReady]);

  // --- CRUD Operations ---
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!formData.aptNo || !formData.mainNo) {
      setError("호수와 차량번호는 필수입니다.");
      return;
    }

    const path = `cars/${formData.aptNo}`;
    try {
      await setDoc(doc(db, 'cars', formData.aptNo), {
        aptNo: formData.aptNo,
        mainNo: formData.mainNo,
        subNo: formData.subNo,
        isSuv1: formData.isSuv1,
        isSuv2: formData.isSuv2,
        updatedAt: serverTimestamp()
      });
      setSuccess(isEditing ? "수정되었습니다." : "등록되었습니다.");
      setFormData({ aptNo: "", mainNo: "", subNo: "", isSuv1: false, isSuv2: false });
      setIsEditing(null);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const handleDelete = async (aptNo: string) => {
    if (!isAdmin) return;
    if (!window.confirm(`${aptNo}호 정보를 삭제하시겠습니까?`)) return;

    const path = `cars/${aptNo}`;
    try {
      await deleteDoc(doc(db, 'cars', aptNo));
      setSuccess("삭제되었습니다.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const handleEdit = (record: CarRecord) => {
    setIsEditing(record);
    setFormData({
      aptNo: record.aptNo,
      mainNo: record.mainNo,
      subNo: record.subNo,
      isSuv1: !!record.isSuv1,
      isSuv2: !!record.isSuv2
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- Search Logic ---
  const filteredRecords = useMemo(() => {
    if (!searchQuery) return records;
    const query = searchQuery.toUpperCase();
    return records.filter(r => 
      r.aptNo.toUpperCase().includes(query) ||
      r.mainNo.toUpperCase().includes(query) ||
      r.subNo.toUpperCase().includes(query)
    );
  }, [records, searchQuery]);

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === highlight.toLowerCase() ? (
            <b key={i} className="bg-yellow-200 text-slate-900 px-0.5 rounded">{part}</b>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  // --- Render ---
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <Car size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">
              NS파크 <span className="text-blue-600">자동차번호</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-3">
                {isAdmin && (
                  <span className="hidden md:flex items-center gap-1 text-xs font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    <ShieldCheck size={14} /> 관리자
                  </span>
                )}
                <button 
                  onClick={logout}
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                  title="로그아웃"
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <button 
                onClick={login}
                className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
              >
                <LogIn size={18} />
                <span>관리자 로그인</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Admin Panel */}
        <AnimatePresence>
          {isAdmin && (
            <motion.section 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-6">
                <Plus className="text-blue-600" size={20} />
                <h2 className="text-lg font-bold">{isEditing ? "정보 수정" : "새 차량 등록"}</h2>
              </div>
              
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">아파트 호수</label>
                  <div className="relative">
                    <Home className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text"
                      placeholder="예: 101"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                      value={formData.aptNo}
                      onChange={e => setFormData({...formData, aptNo: e.target.value})}
                      disabled={!!isEditing}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">차량번호 1</label>
                  <div className="relative">
                    <Car className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text"
                      placeholder="예: 12가3456"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                      value={formData.mainNo}
                      onChange={e => setFormData({...formData, mainNo: e.target.value})}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none mt-1">
                    <input 
                      type="checkbox" 
                      checked={formData.isSuv1}
                      onChange={e => setFormData({...formData, isSuv1: e.target.checked})}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    SUV 차량
                  </label>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">차량번호 2 / 메모</label>
                  <input 
                    type="text"
                    placeholder="예: 78나9012"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                    value={formData.subNo}
                    onChange={e => setFormData({...formData, subNo: e.target.value})}
                  />
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none mt-1">
                    <input 
                      type="checkbox" 
                      checked={formData.isSuv2}
                      onChange={e => setFormData({...formData, isSuv2: e.target.checked})}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    SUV 차량
                  </label>
                </div>
                <div className="md:col-span-3 flex gap-2 pt-2">
                  <button 
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    {isEditing ? <Edit2 size={18} /> : <Plus size={18} />}
                    {isEditing ? "수정하기" : "등록하기"}
                  </button>
                  {isEditing && (
                    <button 
                      type="button"
                      onClick={() => {
                        setIsEditing(null);
                        setFormData({ aptNo: "", mainNo: "", subNo: "" });
                      }}
                      className="px-6 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all"
                    >
                      취소
                    </button>
                  )}
                </div>
              </form>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Search Section */}
        <section className="space-y-6">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={24} />
            <input 
              type="text"
              placeholder="호수 또는 차량번호를 입력하세요..."
              className="w-full pl-14 pr-4 py-5 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-lg font-medium"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Results Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">호수</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">차량번호 1</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">차량번호 2 / 메모</th>
                    {isAdmin && <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">관리</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((record) => (
                      <motion.tr 
                        layout
                        key={record.aptNo}
                        className={`transition-colors group ${
                          record.subNo === "TABLE" ? "bg-orange-50/50" : 
                          record.subNo === "PROCEDURE" ? "bg-blue-50/50" : 
                          "hover:bg-slate-50/50"
                        }`}
                      >
                        <td className="px-6 py-4 font-bold text-slate-700">
                          {highlightText(record.aptNo, searchQuery)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {highlightText(record.mainNo, searchQuery)}
                            {record.isSuv1 && (
                              <span className="bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded font-bold tracking-tighter">SUV</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {highlightText(record.subNo, searchQuery)}
                            {record.isSuv2 && (
                              <span className="bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded font-bold tracking-tighter">SUV</span>
                            )}
                          </div>
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => handleEdit(record)}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                onClick={() => handleDelete(record.aptNo)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        )}
                      </motion.tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={isAdmin ? 4 : 3} className="px-6 py-12 text-center text-slate-400 italic">
                        검색 결과가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Info Section */}
        <section className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="space-y-2">
            <p className="text-lg font-bold text-slate-800">- 주차는 세대당 1대만 가능</p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Info className="text-blue-600" size={24} />
              기계식 주차장 외부 1층 주차장 이용 안내
            </h3>
            
            <div className="grid grid-cols-1 gap-6">
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                <p className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  벽쪽 : 지하상가 전용주차장
                </p>
                <p className="text-slate-600 pl-4 underline decoration-blue-200 underline-offset-4">
                  지하 상가 운영 안함. 입주민 임시로 이용 가능
                </p>
              </div>

              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                <p className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  가운데 (당근슈퍼 전용 주차장)
                </p>
                <ul className="space-y-3 pl-4">
                  <li className="flex items-center gap-2">
                    <span className="font-bold w-20">월요일</span>
                    <span className="text-slate-500">상가 휴무</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="font-bold w-20">화-금</span>
                    <span className="text-slate-500">(5시오픈) : 오후4시30분 - 11시</span>
                    <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded text-xs">이용불가</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="font-bold w-20">토요일</span>
                    <span className="text-slate-500">(1시오픈) : 00시30분 - 오전11시</span>
                    <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded text-xs">이용가능</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="font-bold w-20">일요일</span>
                    <span className="text-slate-500">(2시오픈) : 오후 1시30분 - 오후8시</span>
                    <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded text-xs">이용불가</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-2 text-sm text-slate-500 italic">
            <p>* 주차 엘리베이터 외부 주차장은 모두 상가주차장입니다.</p>
            <p>* 당근슈퍼 주차장은 사장님의 배려로 이용 가능한 것이니 이용 가능 시간 외 주차 하지 말아주시기 바랍니다.</p>
          </div>
        </section>
      </main>

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

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-4 py-12 text-center text-slate-400 text-xs">
        <p>© 2026 NS Park Apartment Management System</p>
        <p className="mt-1">Powered by Google AI Studio & Firebase</p>
      </footer>
    </div>
  );
}
