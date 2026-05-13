import { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
}

export default function AuthFormCard({ title, subtitle, children }: Props) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-blue-800 mb-1">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mb-6">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
