"use client";

import { useState, useEffect } from "react";
import { signIn, getCsrfToken } from "next-auth/react"; // 👈 getCsrfToken 추가
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // ✅ [핵심] 페이지 로드 시 CSRF 토큰을 강제로 갱신 (Zombie Token 제거)
  useEffect(() => {
    async function wakeUp() {
      await getCsrfToken(); // 서버를 찔러서 새 토큰을 받아옵니다.
      console.log("CSRF Token Refreshed");
    }
    wakeUp();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      console.log("Attempting login..."); // 디버깅용

      const res = await signIn("credentials", {
        password: password,
        redirect: false,
      });

      console.log("Login Response:", res); // 결과 확인용

      // 응답이 아예 없거나 status가 200(ok)이 아닐 때 처리
      if (!res || res.error) {
        console.error("Login Failed:", res?.error);
        setError("비밀번호가 틀렸거나 서버 연결에 실패했습니다. 🚨");
        setLoading(false);

        // 실패했다면 토큰이 꼬였을 수 있으니 다시 한 번 갱신
        await getCsrfToken();
      } else {
        // 성공
        console.log("Login Success! Redirecting...");
        // SPA 방식 이동 (router.push) 전에 router.refresh()로 상태 동기화
        router.refresh();
        router.replace("/");
      }
    } catch (err) {
      // 네트워크 에러 등 예외 처리
      console.error("Unexpected Error:", err);
      setError("알 수 없는 오류가 발생했습니다.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            🔐 Access Control
          </h1>
          <p className="text-gray-400">관리자 권한이 필요합니다.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition"
              placeholder="Enter admin password"
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm text-center bg-red-900/20 py-2 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 rounded-lg transition transform active:scale-95 disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
