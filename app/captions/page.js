"use client"
import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"
import confetti from "canvas-confetti"

const LOADING_MESSAGES = [
  "Teaching AI what's funny... 🤖",
  "Consulting the humor gods... 🌸",
  "Asking Shakespeare for jokes... 📜",
  "Brewing fresh captions... ☕",
  "Waking up the comedy writers... 😴",
  "Downloading funny... 💾",
  "Calibrating the giggle meter... 📊",
  "Importing good vibes... ✨",
]

export default function Captions() {
  const router = useRouter()
  const [captions, setCaptions] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0])

    useEffect(() => {
    setLoadingMsg(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)])
    }, [])
  const [tab, setTab] = useState("swipe")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState("likes")
  const [swipeDir, setSwipeDir] = useState(null)
  const [votes, setVotes] = useState({})
  const [leaderboard, setLeaderboard] = useState([])
  const [spotlight, setSpotlight] = useState(null)
  const [battlePair, setBattlePair] = useState([])
  const [battleWinner, setBattleWinner] = useState(null)
  const [battleHistory, setBattleHistory] = useState([])
  const [shareCaption, setShareCaption] = useState(null)

  useEffect(() => { checkAndFetch() }, [])

  async function checkAndFetch() {
    const { data: { session } } = await supabase.auth.getSession()
    setUser(session?.user || null)

    const { data } = await supabase
      .from("captions")
      .select(`id, content, like_count, is_featured, caption_requests(image_id, images(url))`)
      .order("like_count", { ascending: false })
      .limit(5000)

    const caps = (data || []).filter(c => c.caption_requests?.images?.url)
    setCaptions(caps)
    setSpotlight(caps.find(c => c.is_featured) || caps[0])
    setLeaderboard(caps.slice(0, 10))
    pickBattlePair(caps)

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

  function pickBattlePair(caps) {
    const pool = caps || captions
    if (pool.length < 2) return
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    setBattlePair([shuffled[0], shuffled[1]])
    setBattleWinner(null)
  }

  async function handleVote(captionId, value) {
    if (!user) { router.push("/"); return }
    const existingVote = votes[captionId]

    if (existingVote === value) {
      // Removing existing vote
      await supabase.from("caption_votes").delete().eq("caption_id", captionId).eq("profile_id", user.id)
      setVotes(prev => ({ ...prev, [captionId]: null }))
      // Undo the effect of the vote
      setCaptions(prev => prev.map(c => c.id === captionId ? {
        ...c, like_count: (c.like_count ?? 0) + (value === 1 ? -1 : 1)
      } : c))
    } else {
      await supabase.from("caption_votes").upsert({
        caption_id: captionId, profile_id: user.id,
        user_id: user.id, vote_value: value, value: value,
        created_by_user_id: user.id,
        modified_by_user_id: user.id,
      }, { onConflict: "caption_id,profile_id" })
      setVotes(prev => ({ ...prev, [captionId]: value }))
      // If switching from one vote to another, adjust by 2
      const adjustment = existingVote ? (value === 1 ? 2 : -2) : (value === 1 ? 1 : -1)
      setCaptions(prev => prev.map(c => c.id === captionId ? {
        ...c, like_count: (c.like_count ?? 0) + adjustment
      } : c))
      if (value === 1) {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 }, colors: ["#f9a8d4", "#c084fc", "#fbbf24"] })
      }
    }
  }

  async function handleBattleVote(winner, loser) {
    setBattleWinner(winner.id)
    setBattleHistory(prev => [...prev, winner])
    await handleVote(winner.id, 1)
    await handleVote(loser.id, -1)
    setTimeout(() => {
      const remaining = captions.filter(c =>
        c.id !== loser.id &&
        !battleHistory.find(h => h.id === c.id) &&
        c.id !== winner.id
      )
      if (remaining.length < 1) {
        setBattlePair([])
      } else {
        const opponent = remaining[Math.floor(Math.random() * remaining.length)]
        setBattlePair([winner, opponent])
        setBattleWinner(null)
      }
    }, 1500)
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
    .filter(c => c.caption_requests?.images?.url)
    .sort((a, b) => sort === "likes" ? (b.like_count ?? 0) - (a.like_count ?? 0) : 0)

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-yellow-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">💘</div>
        <p className="text-pink-400 animate-pulse text-xl font-semibold">{loadingMsg}</p>
      </div>
    </div>
  )

  const currentCaption = captions[currentIndex]

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-yellow-50">
      <div className="fixed top-0 left-0 text-6xl opacity-20 pointer-events-none select-none">🌸</div>
      <div className="fixed top-10 right-0 text-5xl opacity-20 pointer-events-none select-none">🌺</div>
      <div className="fixed bottom-10 left-0 text-5xl opacity-20 pointer-events-none select-none">🌼</div>
      <div className="fixed bottom-0 right-10 text-6xl opacity-20 pointer-events-none select-none">🌷</div>

      {/* Share Modal */}
      {shareCaption && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShareCaption(null)}>
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-black text-gray-800 mb-4 text-center">Share this Caption 🌸</h3>
            <div className="bg-gradient-to-br from-pink-100 to-purple-100 rounded-2xl p-6 border-2 border-pink-200 mb-4">
              {shareCaption.caption_requests?.images?.url && (
                <img src={shareCaption.caption_requests.images.url} alt="" className="w-full h-40 object-cover rounded-xl mb-3" onError={(e) => e.target.style.display='none'} />
              )}
              <p className="text-gray-800 font-bold text-center">{shareCaption.content}</p>
              <p className="text-pink-400 text-center text-sm mt-2">💘 CaptionCrush</p>
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(shareCaption.content); alert("Caption copied! 🌸") }}
              className="w-full bg-gradient-to-r from-pink-400 to-purple-400 text-white py-3 rounded-2xl font-bold hover:opacity-90 transition"
            >
              📋 Copy Caption
            </button>
            <button onClick={() => setShareCaption(null)} className="w-full mt-2 text-gray-400 text-sm py-2">Close</button>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-pink-400 via-purple-400 to-yellow-400 bg-clip-text text-transparent">
              💘 CaptionCrush
            </h1>
            <p className="text-gray-400 text-xs mt-0.5">Rate AI-generated captions 🌸</p>
          </div>
          <div className="flex gap-2 items-center">
            {user ? (
              <>
                <Link href="/upload" className="bg-purple-400 hover:bg-purple-500 text-white px-3 py-2 rounded-xl text-sm font-semibold transition">
                  📸 Upload
                </Link>
                <Link href="/account" className="bg-pink-400 hover:bg-pink-500 text-white px-3 py-2 rounded-xl text-sm font-semibold transition">
                  👤 {user.user_metadata?.full_name?.split(" ")[0] || "Account"}
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
        <div className="flex gap-1 mb-4 bg-white/60 backdrop-blur rounded-2xl p-1 shadow-sm">
          {[
            { id: "swipe", label: "💘 Swipe" },
            { id: "battle", label: "⚔️ Battle" },
            { id: "browse", label: "🔍 Browse" },
            { id: "spotlight", label: "⭐ Spotlight" },
            { id: "leaderboard", label: "🏆 Top" },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition ${
                tab === t.id
                  ? "bg-gradient-to-r from-pink-400 to-purple-400 text-white shadow"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab description strip */}
        <div className="bg-white/40 backdrop-blur rounded-2xl px-4 py-2 mb-4 text-center">
          {tab === "swipe" && <p className="text-gray-500 text-xs">👆 Swipe through captions and vote your favorites</p>}
          {tab === "battle" && <p className="text-gray-500 text-xs">⚔️ Pick the funnier caption — your champion fights on!</p>}
          {tab === "browse" && <p className="text-gray-500 text-xs">🔍 Search and filter all captions</p>}
          {tab === "spotlight" && <p className="text-gray-500 text-xs">⭐ Today's featured caption of the day</p>}
          {tab === "leaderboard" && <p className="text-gray-500 text-xs">🏆 The most loved captions of all time</p>}
        </div>

        {/* SWIPE TAB */}
        {tab === "swipe" && (
          <div className="text-center">
            {currentCaption ? (
              <div>
                <p className="text-gray-400 text-sm mb-3">{currentIndex + 1} of {captions.length} captions</p>
                <div className={`bg-white rounded-3xl shadow-xl overflow-hidden transition-all duration-300 ${
                  swipeDir === "right" ? "translate-x-32 rotate-6 opacity-0" :
                  swipeDir === "left" ? "-translate-x-32 -rotate-6 opacity-0" : ""
                }`}>
                  {currentCaption.caption_requests?.images?.url && (
                    <div className="w-full h-72 overflow-hidden">
                      <img
                        src={currentCaption.caption_requests.images.url}
                        alt="caption"className="w-full h-full object-contain bg-black"
                        
                        onError={(e) => e.target.style.display='none'}
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <p className="text-gray-800 text-xl font-medium leading-relaxed">{currentCaption.content}</p>
                    <div className="flex justify-between items-center mt-3">
                      <p className="text-gray-400 text-sm">❤️ {currentCaption.like_count ?? 0} likes</p>
                      <button onClick={() => setShareCaption(currentCaption)} className="text-purple-400 text-sm hover:text-purple-600">Share 🔗</button>
                    </div>
                  </div>
                </div>
                {user ? (
                  <div className="flex justify-center gap-8 mt-6">
                    <button onClick={() => swipe(-1)} className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:scale-110 transition hover:bg-red-50 border-2 border-red-200">👎</button>
                    <button onClick={() => setCurrentIndex(prev => prev + 1)} className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-xl hover:scale-110 transition border-2 border-gray-200 self-center">⏭️</button>
                    <button onClick={() => swipe(1)} className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:scale-110 transition hover:bg-green-50 border-2 border-green-200">👍</button>
                  </div>
                ) : (
                  <div className="mt-6">
                    <p className="text-gray-500 mb-3">Sign in to vote!</p>
                    <button onClick={() => router.push("/")} className="bg-gradient-to-r from-pink-400 to-purple-400 text-white px-6 py-3 rounded-xl font-bold">Sign In 🌸</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-12 shadow-xl">
                <p className="text-5xl mb-4">🎉</p>
                <p className="text-gray-600 text-xl font-semibold">You've seen all captions!</p>
                <button onClick={() => setCurrentIndex(0)} className="mt-4 bg-gradient-to-r from-pink-400 to-purple-400 text-white px-6 py-3 rounded-xl font-bold">Start Over</button>
              </div>
            )}
          </div>
        )}

        {/* BATTLE TAB */}
        {tab === "battle" && (
          <div>
            <div className="text-center mb-4">
              {battleHistory.length > 0 && (
                <div className="bg-white/60 rounded-2xl px-4 py-2 inline-block">
                  <p className="text-purple-500 text-sm font-semibold">🏆 Champion has won {battleHistory.length} battle{battleHistory.length > 1 ? "s" : ""}!</p>
                </div>
              )}
            </div>

            {battlePair.length === 2 ? (
              <div className="grid grid-cols-1 gap-4">
                {battlePair.map((caption, i) => (
                  <div key={caption.id}>
                    {i === 1 && (
                      <div className="text-center my-2">
                        <span className="text-2xl font-black text-pink-400 bg-white/60 px-4 py-1 rounded-full">VS</span>
                      </div>
                    )}
                    <div className={`bg-white rounded-3xl shadow-lg overflow-hidden border-2 transition-all duration-500 ${
                      battleWinner === caption.id ? "border-green-400 scale-105" :
                      battleWinner && battleWinner !== caption.id ? "border-red-200 opacity-50" :
                      "border-pink-100 hover:border-purple-300"
                    }`}>
                      {caption.caption_requests?.images?.url && (
                        <div className="w-full h-52 overflow-hidden">
                          <img
                            src={caption.caption_requests.images.url}
                            alt=""
                            className="w-full h-full object-contain bg-black"
                            onError={(e) => e.target.style.display='none'}
                          />
                        </div>
                      )}
                      <div className="p-5">
                        <p className="text-gray-800 font-medium text-lg mb-3 leading-relaxed">{caption.content}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 text-sm">❤️ {caption.like_count ?? 0}</span>
                          {battleWinner === caption.id && <span className="text-green-500 font-bold">🏆 Winner!</span>}
                        </div>
                        {!battleWinner && user && (
                          <button
                            onClick={() => handleBattleVote(caption, battlePair[i === 0 ? 1 : 0])}
                            className="w-full mt-3 bg-gradient-to-r from-pink-400 to-purple-400 text-white py-3 rounded-2xl font-bold hover:opacity-90 transition"
                          >
                            👑 This one's funnier!
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {!user && (
                  <div className="text-center mt-4">
                    <button onClick={() => router.push("/")} className="bg-gradient-to-r from-pink-400 to-purple-400 text-white px-6 py-3 rounded-xl font-bold">Sign In to Vote 🌸</button>
                  </div>
                )}
                {battleWinner && <p className="text-center text-purple-400 animate-pulse text-sm">Next battle loading... ⚔️</p>}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-12 shadow-xl text-center">
                <p className="text-5xl mb-4">🏆</p>
                <p className="text-gray-700 text-xl font-black">Battle Complete!</p>
                {battleHistory.length > 0 && (
                  <div className="mt-4 bg-gradient-to-br from-yellow-50 to-pink-50 rounded-2xl p-4 border border-yellow-200">
                    <p className="text-gray-600 text-sm mb-2">🥇 Ultimate Champion:</p>
                    <p className="text-gray-800 font-bold">{battleHistory[battleHistory.length - 1]?.content}</p>
                  </div>
                )}
                <button onClick={() => { setBattleHistory([]); pickBattlePair(captions) }} className="mt-4 bg-gradient-to-r from-pink-400 to-purple-400 text-white px-6 py-3 rounded-xl font-bold">
                  New Battle ⚔️
                </button>
              </div>
            )}
          </div>
        )}

        {/* BROWSE TAB */}
        {tab === "browse" && (
          <div>
            <div className="flex gap-3 mb-4">
              <input
                className="flex-1 bg-white/80 border border-pink-200 rounded-xl px-4 py-2 text-gray-700 focus:outline-none focus:border-purple-400 placeholder-gray-400"
                placeholder="🔍 Search captions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="bg-white/80 border border-pink-200 rounded-xl px-3 py-2 text-gray-700 focus:outline-none"
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
                    <div className="w-full h-52 overflow-hidden">
                      <img
                        src={caption.caption_requests.images.url}
                        alt=""className="w-full h-full object-contain bg-black"
                        
                        onError={(e) => e.target.style.display='none'}
                      />
                    </div>
                  )}
                  <div className="p-4">
                    {caption.is_featured && <span className="bg-yellow-100 text-yellow-600 text-xs px-2 py-1 rounded-full mb-2 inline-block">⭐ Featured</span>}
                    <p className="text-gray-800 font-medium mb-3">{caption.content}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">❤️ {caption.like_count ?? 0}</span>
                      <div className="flex gap-2">
                        <button onClick={() => setShareCaption(caption)} className="text-purple-400 text-xs px-2 py-1 rounded-lg hover:bg-purple-50">Share</button>
                        <button onClick={() => handleVote(caption.id, 1)} disabled={!user}
                          className={`px-3 py-1 rounded-lg text-sm font-semibold transition ${votes[caption.id] === 1 ? "bg-green-400 text-white" : "bg-green-50 text-green-600 hover:bg-green-100"} disabled:opacity-40`}>👍</button>
                        <button onClick={() => handleVote(caption.id, -1)} disabled={!user}
                          className={`px-3 py-1 rounded-lg text-sm font-semibold transition ${votes[caption.id] === -1 ? "bg-red-400 text-white" : "bg-red-50 text-red-600 hover:bg-red-100"} disabled:opacity-40`}>👎</button>
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
          <div className="bg-gradient-to-br from-yellow-100 to-pink-100 rounded-3xl p-6 border-2 border-yellow-300 shadow-xl">
            <div className="text-center mb-4">
              <span className="text-4xl">⭐</span>
              <h2 className="text-2xl font-black text-gray-800 mt-2">Caption of the Day</h2>
            </div>
            {spotlight.caption_requests?.images?.url && (
              <div className="w-full h-64 overflow-hidden rounded-2xl mb-4">
                <img
                  src={spotlight.caption_requests.images.url}
                  alt=""
                  className="w-full h-full object-contain bg-black"
                  onError={(e) => e.target.style.display='none'}
                />
              </div>
            )}
            <p className="text-gray-800 text-xl font-medium text-center leading-relaxed mb-4">{spotlight.content}</p>
            <div className="flex justify-center gap-4 mb-3">
              <button onClick={() => handleVote(spotlight.id, 1)} disabled={!user}
                className={`px-6 py-3 rounded-xl font-bold transition ${votes[spotlight.id] === 1 ? "bg-green-400 text-white" : "bg-white text-green-600 hover:bg-green-50"} disabled:opacity-40`}>👍 Upvote</button>
              <button onClick={() => handleVote(spotlight.id, -1)} disabled={!user}
                className={`px-6 py-3 rounded-xl font-bold transition ${votes[spotlight.id] === -1 ? "bg-red-400 text-white" : "bg-white text-red-600 hover:bg-red-50"} disabled:opacity-40`}>👎 Downvote</button>
            </div>
            <div className="flex justify-center gap-4">
              <p className="text-gray-500 text-sm">❤️ {spotlight.like_count ?? 0} likes</p>
              <button onClick={() => setShareCaption(spotlight)} className="text-purple-400 text-sm">Share 🔗</button>
            </div>
          </div>
        )}

        {/* LEADERBOARD TAB */}
        {tab === "leaderboard" && (
          <div>
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
                    <button onClick={() => setShareCaption(caption)} className="text-purple-400 text-xs px-2 py-1">Share</button>
                    <button onClick={() => handleVote(caption.id, 1)} disabled={!user}
                      className={`px-2 py-1 rounded-lg text-sm transition ${votes[caption.id] === 1 ? "bg-green-400 text-white" : "bg-green-50 text-green-600"} disabled:opacity-40`}>👍</button>
                    <button onClick={() => handleVote(caption.id, -1)} disabled={!user}
                      className={`px-2 py-1 rounded-lg text-sm transition ${votes[caption.id] === -1 ? "bg-red-400 text-white" : "bg-red-50 text-red-600"} disabled:opacity-40`}>👎</button>
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