'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    try {
      const user = localStorage.getItem('ph_user');
      const token = localStorage.getItem('ph_token');
      if (user && token) {
        router.replace('/dashboard');
        return;
      }
    } catch (e) {
      console.error(e);
    }
    router.replace('/login');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F7FE] font-sans">
      <div className="flex flex-col items-center gap-4 text-center p-8 bg-white rounded-3xl shadow-[0_10px_30px_rgba(112,144,176,0.08)] border border-slate-100 max-w-sm w-full mx-4">
        <div className="w-12 h-12 rounded-2xl bg-[#5D5FEF] flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-indigo-200">
          u
        </div>
        <div className="w-8 h-8 border-4 border-[#5D5FEF] border-t-transparent rounded-full animate-spin mt-2"></div>
        <p className="text-slate-800 font-extrabold text-sm">Redirecting to People Hub...</p>
        <a 
          href="/login" 
          className="text-xs text-[#5D5FEF] hover:underline font-bold"
        >
          Click here if not redirected automatically
        </a>
      </div>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            try {
              if (localStorage.getItem('ph_user') && localStorage.getItem('ph_token')) {
                window.location.replace('/dashboard');
              } else {
                window.location.replace('/login');
              }
            } catch(e) {
              window.location.replace('/login');
            }
          `,
        }}
      />
    </div>
  );
}
