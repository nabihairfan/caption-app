"use client"
import { supabase } from "@/lib/supabase"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push("/captions")
    })
  }, [])

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-yellow-50 flex items-center justify-center p-4">
      <div className="fixed top-0 left-0 text-6xl opacity-20 pointer-events-none">🌸</div>
      <div className="fixed top-10 right-0 text-5xl opacity-20 pointer-events-none">🌺</div>
      <div className="fixed bottom-10 left-0 text-5xl opacity-20 pointer-events-none">🌼</div>
      <div className="fixed bottom-0 right-10 text-6xl opacity-20 pointer-events-none">🌷</div>

      <div className="text-center max-w-md">
        <div className="text-8xl mb-6">😂</div>
        <h1 className="text-6xl font-black mb-4 bg-gradient-to-r from-pink-400 via-purple-400 to-yellow-400 bg-clip-text text-transparent">
          Crackd
        </h1>
        <p className="text-gray-500 text-lg mb-2">AI-generated captions, rated by you.</p>
        <p className="text-gray-400 text-sm mb-8">Swipe, vote, and discover the funniest captions 🌸</p>

        <button
          onClick={signInWithGoogle}
          className="bg-white text-gray-700 px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-lg transition shadow-md flex items-center gap-3 mx-auto border border-pink-100"
        >
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
        <p className="text-gray-400 text-xs mt-4">Free to use • No spam • Just vibes 🌺</p>
      </div>
    </main>
  )
}
