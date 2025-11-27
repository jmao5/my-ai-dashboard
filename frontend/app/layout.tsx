import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import MainLayout from "@/components/MainLayout";

const inter = Inter({ subsets: ["latin"] });

// 뷰포트 설정 (모바일 확대 방지 등)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#111827",
};

// 메타데이터 및 파비콘 설정
export const metadata: Metadata = {
  title: {
    template: "%s | ServerBot", // "페이지명 | ServerBot" 형태로 자동 변환
    default: "My AI Dashboard", // 기본 타이틀
  },
  description: "Personal Server Control Center with AI",
  icons: {
    icon: "/icon.png", // public 폴더에 있는 아이콘 사용
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        {/* Providers로 감싸고 -> MainLayout으로 감싸고 -> 페이지 렌더링 */}
        <Providers>
          <MainLayout>{children}</MainLayout>
        </Providers>
      </body>
    </html>
  );
}
