"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"

const QUOTES = [
  { quote: "The secret to humor is surprise.", author: "Aristotle 🏛️" },
  { quote: "I am so clever that sometimes I don't understand a single word of what I am saying.", author: "Oscar Wilde 🎭" },
  { quote: "Behind every great man is a woman rolling her eyes.", author: "Jim Carrey 🎬" },
  { quote: "I didn't fail the test. I just found 100 ways to do it wrong.", author: "Benjamin Franklin 💡" },
  { quote: "People say nothing is impossible, but I do nothing every day.", author: "A.A. Milne 🐻" },
  { quote: "Age is something that doesn't matter, unless you are a cheese.", author: "Luis Buñuel 🧀" },
  { quote: "I am not lazy. I am on energy saving mode.", author: "Anonymous 🔋" },
  { quote: "Life is short. Smile while you still have teeth.", author: "Anonymous 😁" },
]

export default function Account() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [uploads, setUploads] = useState([])
  const [voteCount, setVoteCount] = useState(0)
  const [votedCaptions, setVotedCaptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState("uploads")
  const [quote] = useState(QUOTES[new Date().getDay() % QUOTES.length])

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push("/"); return }
    setUser(session.user)

    // Fetch vote count
    const { data: voteData } = await supabase
      .from("caption_votes")
      .select("id, vote_value, caption_id")
      .eq("profile_id", session.user.id)
    setVoteCount(voteData?.length || 0)

    // Fetch voted captions with content and image
    if (voteData && voteData.length > 0) {
      const captionIds = voteData.map(v => v.caption_id)
      const { data: captionDetails } = await supabase
        .from("captions")
        .select("id, content, like_count, caption_requests(image_id, images(url))")
        .in("id", captionIds)
        .limit(50)

      // Merge vote_value into caption details
      const withVotes = (captionDetails || []).map(c => ({
        ...c,
        vote_value: voteData.find(v => v.caption_id === c.id)?.vote_value
      }))
      setVotedCaptions(withVotes)
    }

    // Fetch uploads
    const { data: uploadData } = await supabase
      .from("caption_requests")
      .select("id, images(url), created_datetime_utc")
      .eq("profile_id", session.user.id)
      .order("created_datetime_utc", { ascending: false })
      .limit(10)
    setUploads(uploadData || [])

    setLoading(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push("/")
  }

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-yellow-50 flex items-center justify-center">
      <p className="text-pink-400 animate-pulse text-xl">Loading your profile... 🌸</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-yellow-50 p-6">
      <div className="fixed top-0 left-0 text-6xl opacity-20 pointer-events-none">🌸</div>
      <div className="fixed bottom-0 right-0 text-6xl opacity-20 pointer-events-none">🌷</div>

      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <Link href="/captions" className="text-gray-400 hover:text-gray-600 transition">← Back</Link>
          <h1 className="text-2xl font-black bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">My Account</h1>
          <div className="w-10" />
        </div>

        {/* Quote of the day */}
        <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-3xl p-6 border-2 border-purple-200 shadow-sm mb-6">
          <p className="text-xs text-purple-400 uppercase tracking-widest mb-2">✨ Funny Quote of the Day</p>
          <p className="text-gray-700 font-medium text-lg italic">"{quote.quote}"</p>
          <p className="text-gray-400 text-sm mt-2">— {quote.author}</p>
        </div>

        {/* Profile card */}
        <div className="bg-white rounded-3xl shadow-sm border border-pink-100 p-8 mb-6 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-pink-400 to-purple-400 rounded-full flex items-center justify-center text-white text-3xl font-black mx-auto mb-4">
            {user?.user_metadata?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || "?"}
          </div>
          <h2 className="text-2xl font-black text-gray-800">{user?.user_metadata?.full_name || "User"}</h2>
          <p className="text-gray-400 mt-1">{user?.email}</p>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <button
              onClick={() => setActiveSection("votes")}
              className={`rounded-2xl p-4 transition ${activeSection === "votes" ? "bg-pink-200 ring-2 ring-pink-400" : "bg-pink-50 hover:bg-pink-100"}`}
            >
              <p className="text-3xl font-black text-pink-500">{voteCount}</p>
              <p className="text-gray-500 text-sm mt-1">Total Votes Cast</p>
              <p className="text-pink-400 text-xs mt-1">tap to see →</p>
            </button>
            <button
              onClick={() => setActiveSection("uploads")}
              className={`rounded-2xl p-4 transition ${activeSection === "uploads" ? "bg-purple-200 ring-2 ring-purple-400" : "bg-purple-50 hover:bg-purple-100"}`}
            >
              <p className="text-3xl font-black text-purple-500">{uploads.length}</p>
              <p className="text-gray-500 text-sm mt-1">Images Uploaded</p>
              <p className="text-purple-400 text-xs mt-1">tap to see →</p>
            </button>
          </div>
          <button
            onClick={signOut}
            className="mt-6 w-full bg-gradient-to-r from-pink-400 to-purple-400 text-white py-3 rounded-2xl font-bold hover:opacity-90 transition"
          >
            Sign Out 👋
          </button>
        </div>

        {/* My Uploads section */}
        {activeSection === "uploads" && (
          <div className="bg-white rounded-3xl shadow-sm border border-pink-100 p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-gray-800">My Uploads</h3>
              <Link href="/upload" className="bg-pink-400 hover:bg-pink-500 text-white px-3 py-1 rounded-xl text-sm font-semibold transition">
                + Upload
              </Link>
            </div>
            {uploads.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {uploads.map((upload) => (
                  <div key={upload.id} className="rounded-2xl overflow-hidden border border-pink-100 aspect-square">
                    {upload.images?.url ? (
                      <img src={upload.images.url} alt="" className="w-full h-full object-cover" onError={(e) => e.target.style.display='none'} />
                    ) : (
                      <div className="w-full h-full bg-pink-50 flex items-center justify-center text-2xl">📸</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-4xl mb-2">📸</p>
                <p className="text-gray-400">No uploads yet!</p>
                <Link href="/upload" className="inline-block mt-3 bg-gradient-to-r from-pink-400 to-purple-400 text-white px-4 py-2 rounded-xl text-sm font-bold">
                  Upload your first image
                </Link>
              </div>
            )}
          </div>
        )}

        {/* My Votes section */}
        {activeSection === "votes" && (
          <div className="bg-white rounded-3xl shadow-sm border border-pink-100 p-6 mb-6">
            <h3 className="text-lg font-black text-gray-800 mb-4">My Votes</h3>
            {votedCaptions.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {votedCaptions.map((caption) => (
                  <div key={caption.id} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3 border border-pink-100">
                    {caption.caption_requests?.images?.url && (
                      <img
                        src={caption.caption_requests.images.url}
                        alt=""
                        className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                        onError={(e) => e.target.style.display='none'}
                      />
                    )}
                    <p className="text-gray-700 text-sm flex-1 leading-relaxed">{caption.content}</p>
                    <span className={`text-xl flex-shrink-0 ${caption.vote_value === 1 ? "" : "grayscale"}`}>
                      {caption.vote_value === 1 ? "👍" : "👎"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-4xl mb-2">🗳️</p>
                <p className="text-gray-400">No votes yet!</p>
                <button onClick={() => router.push("/captions")} className="inline-block mt-3 bg-gradient-to-r from-pink-400 to-purple-400 text-white px-4 py-2 rounded-xl text-sm font-bold">
                  Start voting
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  )
}