export default function Home() {
  // 임시 데이터 (나중에 Go 서버와 연결할 때 교체됨)
  const cpuUsage = 42;
  const ramUsage = 65;
  const aiStatus = "대기 중";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* 카드 1: 시스템 상태 */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg hover:border-blue-500 transition duration-300">
        <h3 className="text-gray-400 text-sm font-medium mb-2">
          System Health
        </h3>
        <div className="flex items-end space-x-2">
          <span className="text-4xl font-bold text-white">{cpuUsage}%</span>
          <span className="text-gray-500 mb-1">CPU Usage</span>
        </div>

        {/* 게이지 바 */}
        <div className="w-full bg-gray-700 h-2 rounded-full mt-4 overflow-hidden">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${cpuUsage}%` }}
          ></div>
        </div>
        <div className="mt-3 flex justify-between text-sm text-gray-400">
          <span>RAM Usage</span>
          <span className="text-white">{ramUsage}%</span>
        </div>
      </div>

      {/* 카드 2: AI 엔진 상태 */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg hover:border-purple-500 transition duration-300">
        <h3 className="text-gray-400 text-sm font-medium mb-2">AI Engine</h3>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-green-400">{aiStatus}</span>
          <span className="text-4xl">🧠</span>
        </div>
        <p className="mt-4 text-sm text-gray-400 leading-relaxed">
          Python AI 서버가 정상 작동 중입니다.
          <br />
          뉴스 요약 및 분석 준비 완료.
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
              🔗 GitHub 바로가기
            </a>
          </li>
          <li>
            <a
              href="http://sso.tplinkdns.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center p-2 rounded hover:bg-gray-700 text-blue-400 transition"
            >
              ⚙️ 공유기 설정 페이지
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
