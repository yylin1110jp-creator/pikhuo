import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '拾火創意 PIKHUO｜整合行銷策略與創意執行',
  description: '拾火創意整合行銷策略、創意設計、廣告投放與成效分析，協助企業從釐清方向到執行優化。',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant-TW">
      <body>{children}</body>
    </html>
  );
}
