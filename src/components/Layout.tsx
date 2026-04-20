import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Car, LogOut, ShieldCheck } from 'lucide-react';
import { User, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';

interface LayoutProps {
  children: ReactNode;
  user: User | null;
  isAdmin: boolean;
}

const ADMIN_EMAIL = "mrsohnokpos@gmail.com";

export default function Layout({ children, user, isAdmin }: LayoutProps) {
  const location = useLocation();

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login Error:", err);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout Error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <Car size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">
              NS파크 <span className="text-blue-600">자동차번호</span>
            </h1>
          </Link>
          
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-4 text-sm font-medium">
              <Link 
                to="/" 
                className="text-transparent"
              >
                검색
              </Link>
              {isAdmin && (
                <Link 
                  to="/admin" 
                  className={`transition-colors ${location.pathname === '/admin' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  관리자
                </Link>
              )}
            </nav>

            <div className="h-6 w-px bg-slate-200 hidden md:block"></div>

            <div className="flex items-center gap-2">
              {user && (
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
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer 
        onDoubleClick={user ? undefined : login} 
        className="max-w-4xl mx-auto px-4 py-12 text-center text-slate-400 text-xs select-none cursor-default"
      >
        <p>© 2026 NS Park APT 주차장 관리</p>
      </footer>
    </div>
  );
}
