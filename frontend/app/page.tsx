'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  // 1. 상태 관리 (초기값은 0)
  const [stats, setStats] = useState({ cpu: 0, ram: 0 });
  const [loading, setLoading] = useState(true);

  // 2. 데이터 가져오는 함수
  const fetchStats = async () => {
    try {
      // ⚠️ 주의: 브라우저 주소창에 치는 주소여야 합니다.
      // 로컬 테스트용: http://localhost:9015/api/status
      // 외부 접속용: http://sso.tplinkdns.com:9015/api/status
      const res = await fetch('http://sso.tplinkdns.com:9015/api/status');

      if (!res.ok) throw new Error('서버 응답 실패');

      const data = await res.json();
      setStats(data);
      setLoading(false);
    } catch (error) {
      console.error("데이터 가져오기 실패:", error);
    }
  };

  // 3. 화면이 켜지면 실행
  useEffect(() => {
    void fetchStats(); // 처음에 한 번 실행

    // 2초마다 계속 실행 (실시간 갱신)
    const interval = setInterval(fetchStats, 2000);

    // 화면 꺼질 때 타이머 정리
    return () => clearInterval(interval);
  }, []);

  return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* 카드 1: 시스템 상태 (Real Data) */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg hover:border-blue-500 transition duration-300">
          <h3 className="text-gray-400 text-sm font-medium mb-2">System Health</h3>

          {loading ? (
              <div className="text-gray-500 animate-pulse">데이터 로딩 중...</div>
          ) : (
              <>
                <div className="flex items-end space-x-2">
                  <span className="text-4xl font-bold text-white">{stats.cpu}%</span>
                  <span className="text-gray-500 mb-1">CPU Usage</span>
                </div>

                {/* 게이지 바 */}
                <div className="w-full bg-gray-700 h-2 rounded-full mt-4 overflow-hidden">
                  <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${stats.cpu}%` }}
                  ></div>
                </div>

                <div className="mt-3 flex justify-between text-sm text-gray-400">
                  <span>RAM Usage</span>
                  <span className="text-white">{stats.ram}%</span>
                </div>
              </>
          )}
        </div>

        {/* 카드 2: AI 엔진 상태 (아직은 고정) */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg hover:border-purple-500 transition duration-300">
          <h3 className="text-gray-400 text-sm font-medium mb-2">AI Engine</h3>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-green-400">Ready</span>
            <span className="text-4xl">🧠</span>
          </div>
          <p className="mt-4 text-sm text-gray-400 leading-relaxed">
            AI 서버 대기 중...<br/>
            (Python 연동 예정)
          </p>
        </div>

        {/* 카드 3: 퀵 링크 */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
          <h3 className="text-gray-400 text-sm font-medium mb-4">Quick Links</h3>
          <ul className="space-y-3">
            <li>
              <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center p-2 rounded hover:bg-gray-700 text-blue-400 transition"
              >
                🔗 GitHub
              </a>
            </li>
            <li>
              <a
                  href="http://sso.tplinkdns.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center p-2 rounded hover:bg-gray-700 text-blue-400 transition"
              >
                ⚙️ 공유기 설정
              </a>
            </li>
          </ul>
        </div>

      </div>
  );
}