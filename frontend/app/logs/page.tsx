export default function LogsPage() {
  return (
    <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
      <div className="text-6xl">🚧</div>
      <h1 className="text-2xl font-bold text-white">시스템 로그 페이지</h1>
      <p className="text-gray-400 max-w-md">
        현재 Go 백엔드와 연동하여 실시간 로그 스트리밍 기능을 개발 중입니다.
        <br />
        (추후 WebSocket 또는 SSE 연결 예정)
      </p>
      <div className="p-4 bg-gray-800 rounded-lg border border-gray-700 font-mono text-sm text-left w-full max-w-2xl text-green-400">
        <p>$ tail -f /var/log/syslog</p>
        <p className="text-gray-500">Waiting for data stream...</p>
      </div>
    </div>
  );
}
