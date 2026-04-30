import { useState, useMemo } from 'react';
import { Search, Car, Info } from 'lucide-react';
import { motion } from 'motion/react';

interface CarRecord {
  aptNo: string;
  mainNo: string;
  subNo: string;
  isSuv1?: boolean;
  isSuv2?: boolean;
}

interface HomeProps {
  records: CarRecord[];
}

export default function Home({ records }: HomeProps) {
  const [searchQuery, setSearchQuery] = useState("");

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

  return (
    <div className="space-y-8">
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
          <div className="bg-white rounded-t-2xl border-x border-t border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-[20%]">호수</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-[40%]">차량번호 1</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-[40%]">차량번호 2</th>
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
                      className={`transition-colors group ${
                        record.subNo === "TABLE" ? "bg-orange-50/50" : 
                        record.subNo === "PROCEDURE" ? "bg-blue-50/50" : 
                        "hover:bg-slate-50/50"
                      }`}
                    >
                      <td className="px-6 py-4 font-bold text-slate-700 w-[20%]">
                        {highlightText(record.aptNo, searchQuery)}
                      </td>
                      <td className="px-6 py-4 w-[40%]">
                        <div className="flex items-center gap-2">
                          {highlightText(record.mainNo, searchQuery)}
                          {record.isSuv1 && (
                            <span className="bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded font-bold tracking-tighter">SUV</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 w-[40%]">
                        <div className="flex items-center gap-2">
                          {highlightText(record.subNo, searchQuery)}
                          {record.isSuv2 && (
                            <span className="bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded font-bold tracking-tighter">SUV</span>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-slate-400 italic">
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
                지하 상가 운영 안함. 입주민 임시로만 이용 가능. 6시간 이상 주차 불가 
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
          <p>* 주차 엘리베이터 외부 주차장은 상가주차장입니다.</p>
          <p>* 당근슈퍼 주차장은 사장님의 배려로 이용 가능한 것이니 이용 가능 시간 외 주차 하지 말아주시기 바랍니다.</p>
          
        </div>
      </section>
    </div>
  );
}
