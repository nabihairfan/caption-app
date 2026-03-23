"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function Captions() {
  const router = useRouter()
  const [captions, setCaptions] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState("swipe")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState("likes")
  const [swipeDir, setSwipeDir] = useState(null)
  const [votes, setVotes] = useState({})
  const [leaderboard, setLeaderboard] = useState([])
  const [spotlight, setSpotlight] = useState(null)

  useEffect(() => { checkAndFetch() }, [])

  async function checkAndFetch() {
    const { data: { session } } = await supabase.auth.getSession()
    setUser(session?.user || null)

    const { data } = await supabase
      .from("captions")
      .select(`id, content, like_count, is_featured, caption_requests(image_id, images(url))`)
      .order("like_count", { ascending: false })
      .limit(50)

    const captions = data || []
    setCaptions(captions)
    setSpotlight(captions.find(c => c.is_featured) || captions[0])
    setLeaderboard(captions.slice(0, 10))

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
        const existingVote = votes[captionId]
        if (existingVote === value) {
        await supabase.from("caption_votes").delete().eq("caption_id", captionId).eq("profile_id", user.id)
        setVotes(prev => ({ ...prev, [captionId]: null }))
        setCaptions(prev => prev.map(c => c.id === captionId ? { ...c, like_count: (c.like_count ?? 0) - 1 } : c))
        } else {
        await supabase.from("caption_votes").upsert({
            caption_id: captionId, profile_id: user.id,
            user_id: user.id, vote_value: value, value: value
        }, { onConflict: "caption_id,profile_id" })
        setVotes(prev => ({ ...prev, [captionId]: value }))
        setCaptions(prev => prev.map(c => c.id === captionId ? { ...c, like_count: (c.like_count ?? 0) + (value === 1 ? 1 : -1) } : c))
        }
    }

  async function swipe(value) {
    const caption = captions[currentIndex]
    if (!caption) return
    setSwipeDir(value === 1 ? "right" : "left")
    await handleVote(caption.id, value)
    setTimeout(() => {
      setSwipeDir(null)
      setCurrentIndex(prev => prev + 1)
    }, 400)
  }

  const filtered = captions
    .filter(c => c.content?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sort === "likes" ? (b.like_count ?? 0) - (a.like_count ?? 0) : 0)

  if (loading) return (
    <div className="min-h-screen bg-pink-50 flex items-center justify-center">
      <p className="text-pink-400 animate-pulse text-xl font-semibold">Loading captions... 🌸</p>
    </div>
  )

  const currentCaption = captions[currentIndex]

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-yellow-50">
      {/* Flower decorations */}
      <div className="fixed top-0 left-0 text-6xl opacity-20 pointer-events-none select-none">🌸</div>
      <div className="fixed top-10 right-0 text-5xl opacity-20 pointer-events-none select-none">🌺</div>
      <div className="fixed bottom-10 left-0 text-5xl opacity-20 pointer-events-none select-none">🌼</div>
      <div className="fixed bottom-0 right-10 text-6xl opacity-20 pointer-events-none select-none">🌷</div>

      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-black bg-gradient-to-r from-pink-400 via-purple-400 to-yellow-400 bg-clip-text text-transparent">
            😂 Crackd
          </h1>
          <div className="flex gap-2 items-center">
            {user ? (
              <>
                <Link href="/upload" className="bg-purple-400 hover:bg-purple-500 text-white px-3 py-2 rounded-xl text-sm font-semibold transition">
                  📸 Upload
                </Link>
                <Link href="/account" className="bg-pink-400 hover:bg-pink-500 text-white px-3 py-2 rounded-xl text-sm font-semibold transition">
                  👤 Account
                </Link>
              </>
            ) : (
              <button onClick={() => router.push("/")} className="bg-gradient-to-r from-pink-400 to-purple-400 text-white px-4 py-2 rounded-xl text-sm font-bold transition">
                Sign In 🌸
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white/60 backdrop-blur rounded-2xl p-1 shadow-sm">
          {[
            { id: "swipe", label: "💘 Swipe" },
            { id: "browse", label: "🔍 Browse" },
            { id: "spotlight", label: "⭐ Spotlight" },
            { id: "leaderboard", label: "🏆 Leaderboard" },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${
                tab === t.id
                  ? "bg-gradient-to-r from-pink-400 to-purple-400 text-white shadow"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* SWIPE TAB */}
        {tab === "swipe" && (
          <div className="text-center">
            {currentCaption ? (
              <div>
                <p className="text-gray-400 text-sm mb-4">{currentIndex + 1} of {captions.length} captions</p>
                <div className={`bg-white rounded-3xl shadow-xl overflow-hidden transition-all duration-300 ${
                  swipeDir === "right" ? "translate-x-32 rotate-6 opacity-0" :
                  swipeDir === "left" ? "-translate-x-32 -rotate-6 opacity-0" : ""
                }`}>
                  {currentCaption.caption_requests?.images?.url && (
                    <img
                      src={currentCaption.caption_requests.images.url}
                      alt="caption"
                      className="w-full h-72 object-cover"
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  )}
                  <div className="p-6">
                    <p className="text-gray-800 text-xl font-medium leading-relaxed">{currentCaption.content}</p>
                    <p className="text-gray-400 text-sm mt-3">❤️ {currentCaption.like_count ?? 0} likes</p>
                  </div>
                </div>

                {user ? (
                  <div className="flex justify-center gap-8 mt-8">
                    <button
                      onClick={() => swipe(-1)}
                      className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:scale-110 transition hover:bg-red-50 border-2 border-red-200"
                    >
                      👎
                    </button>
                    <button
                      onClick={() => setCurrentIndex(prev => prev + 1)}
                      className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-xl hover:scale-110 transition border-2 border-gray-200 self-center"
                    >
                      ⏭️
                    </button>
                    <button
                      onClick={() => swipe(1)}
                      className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:scale-110 transition hover:bg-green-50 border-2 border-green-200"
                    >
                      👍
                    </button>
                  </div>
                ) : (
                  <div className="mt-6">
                    <p className="text-gray-500 mb-3">Sign in to swipe and vote!</p>
                    <button onClick={() => router.push("/")} className="bg-gradient-to-r from-pink-400 to-purple-400 text-white px-6 py-3 rounded-xl font-bold">
                      Sign In 🌸
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-12 shadow-xl">
                <p className="text-5xl mb-4">🎉</p>
                <p className="text-gray-600 text-xl font-semibold">You've seen all captions!</p>
                <button onClick={() => setCurrentIndex(0)} className="mt-4 bg-gradient-to-r from-pink-400 to-purple-400 text-white px-6 py-3 rounded-xl font-bold">
                  Start Over
                </button>
              </div>
            )}
          </div>
        )}

        {/* BROWSE TAB */}
        {tab === "browse" && (
          <div>
            <div className="flex gap-3 mb-6">
              <input
                className="flex-1 bg-white/80 border border-pink-200 rounded-xl px-4 py-2 text-gray-700 focus:outline-none focus:border-purple-400 placeholder-gray-400"
                placeholder="🔍 Search captions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="bg-white/80 border border-pink-200 rounded-xl px-3 py-2 text-gray-700 focus:outline-none focus:border-purple-400"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="likes">❤️ Most Liked</option>
                <option value="newest">🆕 Newest</option>
              </select>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {filtered.map(caption => (
                <div key={caption.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-pink-100">
                  {caption.caption_requests?.images?.url && (
                    <img src={caption.caption_requests.images.url} alt="" className="w-full h-48 object-cover" onError={(e) => e.target.style.display='none'} />
                  )}
                  <div className="p-4">
                    {caption.is_featured && <span className="bg-yellow-100 text-yellow-600 text-xs px-2 py-1 rounded-full mb-2 inline-block">⭐ Featured</span>}
                    <p className="text-gray-800 font-medium mb-3">{caption.content}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">❤️ {caption.like_count ?? 0}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleVote(caption.id, 1)}
                          disabled={!user}
                          className={`px-3 py-1 rounded-lg text-sm font-semibold transition ${votes[caption.id] === 1 ? "bg-green-400 text-white" : "bg-green-50 text-green-600 hover:bg-green-100"} disabled:opacity-40`}
                        >
                          👍
                        </button>
                        <button
                          onClick={() => handleVote(caption.id, -1)}
                          disabled={!user}
                          className={`px-3 py-1 rounded-lg text-sm font-semibold transition ${votes[caption.id] === -1 ? "bg-red-400 text-white" : "bg-red-50 text-red-600 hover:bg-red-100"} disabled:opacity-40`}
                        >
                          👎
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SPOTLIGHT TAB */}
        {tab === "spotlight" && spotlight && (
          <div>
            <div className="bg-gradient-to-br from-yellow-100 to-pink-100 rounded-3xl p-6 border-2 border-yellow-300 shadow-xl mb-6">
              <div className="text-center mb-4">
                <span className="text-4xl">⭐</span>
                <h2 className="text-2xl font-black text-gray-800 mt-2">Caption of the Day</h2>
              </div>
              {spotlight.caption_requests?.images?.url && (
                <img src={spotlight.caption_requests.images.url} alt="" className="w-full h-64 object-cover rounded-2xl mb-4" onError={(e) => e.target.style.display='none'} />
              )}
              <p className="text-gray-800 text-xl font-medium text-center leading-relaxed mb-4">{spotlight.content}</p>
              <div className="flex justify-center gap-4">
                <button onClick={() => handleVote(spotlight.id, 1)} disabled={!user}
                  className={`px-6 py-3 rounded-xl font-bold transition ${votes[spotlight.id] === 1 ? "bg-green-400 text-white" : "bg-white text-green-600 hover:bg-green-50"} disabled:opacity-40`}>
                  👍 Upvote
                </button>
                <button onClick={() => handleVote(spotlight.id, -1)} disabled={!user}
                  className={`px-6 py-3 rounded-xl font-bold transition ${votes[spotlight.id] === -1 ? "bg-red-400 text-white" : "bg-white text-red-600 hover:bg-red-50"} disabled:opacity-40`}>
                  👎 Downvote
                </button>
              </div>
              <p className="text-center text-gray-500 text-sm mt-3">❤️ {spotlight.like_count ?? 0} likes</p>
            </div>
          </div>
        )}

        {/* LEADERBOARD TAB */}
        {tab === "leaderboard" && (
          <div>
            <h2 className="text-xl font-black text-gray-700 mb-4">🏆 Top Captions</h2>
            <div className="grid grid-cols-1 gap-3">
              {leaderboard.map((caption, i) => (
                <div key={caption.id} className="bg-white rounded-2xl p-4 shadow-sm border border-pink-100 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg flex-shrink-0 ${
                    i === 0 ? "bg-yellow-400 text-white" :
                    i === 1 ? "bg-gray-300 text-white" :
                    i === 2 ? "bg-orange-400 text-white" :
                    "bg-pink-100 text-pink-600"
                  }`}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800 font-medium text-sm truncate">{caption.content}</p>
                    <p className="text-gray-400 text-xs mt-1">❤️ {caption.like_count ?? 0} likes</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => handleVote(caption.id, 1)} disabled={!user}
                      className={`px-2 py-1 rounded-lg text-sm transition ${votes[caption.id] === 1 ? "bg-green-400 text-white" : "bg-green-50 text-green-600"} disabled:opacity-40`}>
                      👍
                    </button>
                    <button onClick={() => handleVote(caption.id, -1)} disabled={!user}
                      className={`px-2 py-1 rounded-lg text-sm transition ${votes[caption.id] === -1 ? "bg-red-400 text-white" : "bg-red-50 text-red-600"} disabled:opacity-40`}>
                      👎
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}