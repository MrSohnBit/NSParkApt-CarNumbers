import { useState, useMemo, FormEvent } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  ShieldCheck, 
  Car, 
  Home as HomeIcon, 
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, setDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

interface CarRecord {
  aptNo: string;
  mainNo: string;
  subNo: string;
  isSuv1?: boolean;
  isSuv2?: boolean;
  updatedAt: Timestamp | null;
}

interface AdminProps {
  records: CarRecord[];
  isAdmin: boolean;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export default function Admin({ records, isAdmin, onSuccess, onError }: AdminProps) {
  const [isEditing, setIsEditing] = useState<CarRecord | null>(null);
  const [formData, setFormData] = useState({ aptNo: "", mainNo: "", subNo: "", isSuv1: false, isSuv2: false });
  const [searchQuery, setSearchQuery] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!formData.aptNo || !formData.mainNo) {
      onError("호수와 차량번호는 필수입니다.");
      return;
    }

    try {
      await setDoc(doc(db, 'cars', formData.aptNo), {
        aptNo: formData.aptNo,
        mainNo: formData.mainNo,
        subNo: formData.subNo,
        isSuv1: formData.isSuv1,
        isSuv2: formData.isSuv2,
        updatedAt: serverTimestamp()
      });
      onSuccess(isEditing ? "수정되었습니다." : "등록되었습니다.");
      setFormData({ aptNo: "", mainNo: "", subNo: "", isSuv1: false, isSuv2: false });
      setIsEditing(null);
    } catch (err) {
      console.error(err);
      onError("저장에 실패했습니다.");
    }
  };

  const handleDelete = async (aptNo: string) => {
    if (!isAdmin) return;
    if (!window.confirm(`${aptNo}호 정보를 삭제하시겠습니까?`)) return;

    try {
      await deleteDoc(doc(db, 'cars', aptNo));
      onSuccess("삭제되었습니다.");
    } catch (err) {
      console.error(err);
      onError("삭제에 실패했습니다.");
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

  const filteredRecords = useMemo(() => {
    if (!searchQuery) return records;
    const query = searchQuery.toUpperCase();
    return records.filter(r => 
      r.aptNo.toUpperCase().includes(query) ||
      r.mainNo.toUpperCase().includes(query) ||
      r.subNo.toUpperCase().includes(query)
    );
  }, [records, searchQuery]);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
        <ShieldCheck size={64} className="opacity-20" />
        <p className="text-lg font-medium">관리자 권한이 필요합니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Admin Panel */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <Plus className="text-blue-600" size={20} />
          <h2 className="text-lg font-bold">{isEditing ? "정보 수정" : "새 차량 등록"}</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">아파트 호수</label>
            <div className="relative">
              <HomeIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
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
                  setFormData({ aptNo: "", mainNo: "", subNo: "", isSuv1: false, isSuv2: false });
                }}
                className="px-6 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all"
              >
                취소
              </button>
            )}
          </div>
        </form>
      </section>

      {/* Search Section */}
      <section className="space-y-6">
        <div className="sticky top-[73px] z-20 py-4 -mx-4 px-4 bg-slate-50 md:rounded-2xl md:mx-0 md:px-0">
          <div className="relative group mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={24} />
            <input 
              type="text"
              placeholder="호수 또는 차량번호를 입력하세요..."
              className="w-full pl-14 pr-4 py-5 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-lg font-medium"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Results Table Header (Sticky) */}
          <div className="bg-white rounded-t-2xl border-x border-t border-slate-200 overflow-hidden shadow-sm uppercase tracking-wider">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 w-[15%]">호수</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 w-[30%]">차량번호 1</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 w-[35%]">차량번호 2 / 메모</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 w-[20%] text-right">관리</th>
                </tr>
              </thead>
            </table>
          </div>
        </div>

        {/* Results Table Body (Scrollable) */}
        <div className="bg-white rounded-b-2xl border-x border-b border-slate-200 overflow-hidden shadow-sm -mt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((record) => (
                    <motion.tr 
                      layout
                      key={record.aptNo}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="px-6 py-4 font-bold text-slate-700 w-[15%]">
                        <button 
                          onClick={() => handleEdit(record)}
                          className="hover:text-blue-600 hover:underline transition-colors"
                        >
                          {record.aptNo}
                        </button>
                      </td>
                      <td className="px-6 py-4 w-[30%]">
                        <div className="flex items-center gap-2">
                          {record.mainNo}
                          {record.isSuv1 && (
                            <span className="bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded font-bold tracking-tighter">SUV</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 w-[35%]">
                        <div className="flex items-center gap-2">
                          {record.subNo}
                          {record.isSuv2 && (
                            <span className="bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded font-bold tracking-tighter">SUV</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right w-[20%]">
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
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
