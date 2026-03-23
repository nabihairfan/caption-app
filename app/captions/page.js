"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function Captions() {
  const router = useRouter()
  const [captions, setCaptions] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [votes, setVotes] = useState({})
  const [voting, setVoting] = useState({})

  useEffect(() => { checkAndFetch() }, [])

  async function checkAndFetch() {
    const { data: { session } } = await supabase.auth.getSession()
    setUser(session?.user || null)

    const { data } = await supabase
      .from("captions")
      .select(`
        id,
        content,
        like_count,
        is_featured,
        caption_requests (
          image_id,
          images (url)
        )
      `)
      .order("like_count", { ascending: false })
      .limit(20)

    setCaptions(data || [])

    if (session?.user) {
      const { data: userVotes } = await supabase
        .from("caption_votes")
        .select("caption_id, vote_value")
        .eq("profile_id", session.user.id)

      const voteMap = {}
      userVotes?.forEach(v => { voteMap[v.caption_id] = v.vote_value })
      setVotes(voteMap)
    }

    setLoading(false)
  }

  async function handleVote(captionId, value) {
    if (!user) { router.push("/"); return }
    if (voting[captionId]) return

    setVoting(prev => ({ ...prev, [captionId]: true }))

    const existingVote = votes[captionId]

    if (existingVote === value) {
      // Remove vote
      await supabase
        .from("caption_votes")
        .delete()
        .eq("caption_id", captionId)
        .eq("profile_id", user.id)
      setVotes(prev => ({ ...prev, [captionId]: null }))
    } else {
      // Insert or update vote
      await supabase
        .from("caption_votes")
        .upsert({
          caption_id: captionId,
          profile_id: user.id,
          user_id: user.id,
          vote_value: value,
          value: value
        }, { onConflict: "caption_id,profile_id" })
      setVotes(prev => ({ ...prev, [captionId]: value }))
    }

    setVoting(prev => ({ ...prev, [captionId]: false }))
    checkAndFetch()
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push("/")
  }

    if (loading) return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-white animate-pulse text-xl">Loading captions...</p>
        </div>
    )

  return (
    <main className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              😂 Crackd
            </h1>
            <p className="text-gray-500 text-sm mt-1">Rate AI-generated captions</p>
          </div>
          <div className="flex gap-3 items-center">
            {user ? (
              <>
                <div className="text-right">
                  <p className="text-white text-sm font-medium">{user.user_metadata?.full_name || "User"}</p>
                  <p className="text-gray-500 text-xs">{user.email}</p>
                </div>
                <button onClick={signOut} className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-xl text-sm transition">
                  Sign Out
                </button>
              </>
            ) : (
              <button onClick={() => router.push("/")} className="bg-gradient-to-r from-yellow-400 to-pink-400 text-gray-900 px-4 py-2 rounded-xl text-sm font-bold transition hover:opacity-90">
                Sign In to Vote
              </button>
            )}
          </div>
        </div>

        {/* Upload button */}
        {user && (
          <button
            onClick={() => router.push("/upload")}
            className="w-full mb-8 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-4 rounded-2xl font-bold text-lg transition flex items-center justify-center gap-2"
          >
            📸 Upload Image & Generate Captions
          </button>
        )}

        {/* Captions */}
        <div className="grid grid-cols-1 gap-6">
          {captions.map((caption) => {
            const userVote = votes[caption.id]
            return (
              <div key={caption.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-600 transition">
                {caption.caption_requests?.images?.url && (
                  <img
                    src={caption.caption_requests.images.url}
                    alt="caption image"
                    className="w-full h-56 object-cover"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                )}
                <div className="p-6">
                  {caption.is_featured && (
                    <span className="bg-yellow-400/20 text-yellow-400 text-xs px-2 py-1 rounded-full mb-3 inline-block">⭐ Featured</span>
                  )}
                  <p className="text-white text-lg font-medium mb-4 leading-relaxed">{caption.content}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleVote(caption.id, 1)}
                        disabled={!user || voting[caption.id]}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition ${
                          userVote === 1
                            ? "bg-green-500 text-white"
                            : "bg-gray-800 text-gray-300 hover:bg-green-500/20 hover:text-green-400"
                        } disabled:opacity-50`}
                      >
                        👍 Upvote
                      </button>
                      <button
                        onClick={() => handleVote(caption.id, -1)}
                        disabled={!user || voting[caption.id]}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition ${
                          userVote === -1
                            ? "bg-red-500 text-white"
                            : "bg-gray-800 text-gray-300 hover:bg-red-500/20 hover:text-red-400"
                        } disabled:opacity-50`}
                      >
                        👎 Downvote
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-sm">❤️ {caption.like_count ?? 0}</span>
                    </div>
                  </div>
                  {!user && (
                    <p className="text-gray-600 text-xs mt-3">Sign in to vote on captions</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}