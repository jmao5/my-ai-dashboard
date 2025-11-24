"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

export default function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // useState를 써야 컴포넌트가 다시 그려져도 클라이언트가 초기화되지 않음
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 윈도우가 다시 포커스되었을 때 데이터 갱신 (선택사항)
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      {children}
      {/* 개발 모드에서 쿼리 상태를 볼 수 있는 도구 (오른쪽 아래 꽃 모양) */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
