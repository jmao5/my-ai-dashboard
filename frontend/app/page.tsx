"use client";

import { useState, useEffect } from "react";
import { systemApi, aiApi } from "@/services/api"; // 👈 분리한 API 불러오기

export default function Home() {
  const [stats, setStats] = useState({ cpu: 0, ram: 0 });
  const [aiData, setAiData] = useState({
    status: "Offline",
    message: "연결 중...",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Go 서버 데이터 (Axios 사용)
        // Promise.all을 쓰면 두 요청을 동시에 보내서 더 빠릅니다!
        const [sysRes, aiRes] = await Promise.allSettled([
          systemApi.getStatus(),
          aiApi.getStatus(),
        ]);

        // Go 결과 처리
        if (sysRes.status === "fulfilled") {
          setStats(sysRes.value);
        }

        // Python 결과 처리
        if (aiRes.status === "fulfilled") {
          setAiData(aiRes.value);
        } else {
          setAiData({ status: "Error", message: "AI 서버 응답 없음" });
        }
      } catch (error) {
        console.error("API 호출 중 치명적 오류:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* 카드 1: 시스템 상태 */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg hover:border-blue-500 transition duration-300">
        <h3 className="text-gray-400 text-sm font-medium mb-2">
          System Health
        </h3>
        {loading ? (
          <div className="text-gray-500 animate-pulse">Checking...</div>
        ) : (
          <>
            <div className="flex items-end space-x-2">
              <span className="text-4xl font-bold text-white">
                {stats.cpu}%
              </span>
              <span className="text-gray-500 mb-1">CPU</span>
            </div>
            <div className="w-full bg-gray-700 h-2 rounded-full mt-4 overflow-hidden">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${stats.cpu}%` }}
              ></div>
            </div>
            <div className="mt-3 flex justify-between text-sm text-gray-400">
              <span>RAM</span>
              <span className="text-white">{stats.ram}%</span>
            </div>
          </>
        )}
      </div>

      {/* 카드 2: AI 엔진 상태 */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg hover:border-purple-500 transition duration-300">
        <h3 className="text-gray-400 text-sm font-medium mb-2">
          AI Engine Status
        </h3>
        <div className="flex items-center justify-between">
          <span
            className={`text-2xl font-bold ${aiData.status === "Online" ? "text-green-400" : "text-red-400"}`}
          >
            {aiData.status}
          </span>
          <span className="text-4xl animate-bounce">🤖</span>
        </div>
        <div className="mt-4 p-3 bg-gray-700 rounded-lg">
          <p className="text-sm text-gray-300 leading-relaxed">
            {aiData.message}
          </p>
        </div>
      </div>

      {/* 카드 3: 퀵 링크 */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
        <h3 className="text-gray-400 text-sm font-medium mb-4">Quick Links</h3>
        <ul className="space-y-3">
          <li>
            <a
              href="https://github.com"
              target="_blank"
              className="flex items-center text-blue-400 hover:underline"
            >
              🔗 GitHub
            </a>
          </li>
          <li>
            <a
              href="http://sso.tplinkdns.com"
              target="_blank"
              className="flex items-center text-blue-400 hover:underline"
            >
              ⚙️ Router
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
