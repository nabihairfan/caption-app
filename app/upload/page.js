"use client"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function Upload() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState("")
  const [captions, setCaptions] = useState([])
  const [error, setError] = useState("")

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/"); return }
      setUser(session.user)
    })
  }, [])

  function handleFileChange(e) {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setCaptions([])
    setError("")
  }

  async function handleUpload() {
    if (!file) { setError("Please select an image first"); return }
    setLoading(true)
    setCaptions([])
    setError("")

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error("Not logged in")

      // Step 1: Get presigned URL
      setStep("📡 Getting upload URL...")
      const presignRes = await fetch("https://api.almostcrackd.ai/pipeline/generate-presigned-url", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ contentType: file.type })
      })

      if (!presignRes.ok) throw new Error("Failed to get upload URL")
      const { presignedUrl, cdnUrl } = await presignRes.json()

      // Step 2: Upload image
      setStep("⬆️ Uploading image...")
      await fetch(presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file
      })

      // Step 3: Register image
      setStep("📝 Registering image...")
      const registerRes = await fetch("https://api.almostcrackd.ai/pipeline/upload-image-from-url", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ imageUrl: cdnUrl, isCommonUse: false })
      })

      if (!registerRes.ok) throw new Error("Failed to register image")
      const { imageId } = await registerRes.json()

      // Step 4: Generate captions
      setStep("🤖 Generating captions (this may take a minute)...")
      const captionRes = await fetch("https://api.almostcrackd.ai/pipeline/generate-captions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ imageId })
      })

      if (!captionRes.ok) throw new Error("Failed to generate captions")
      const captionData = await captionRes.json()
      setCaptions(Array.isArray(captionData) ? captionData : [captionData])
      setStep("")
    } catch (err) {
      setError(err.message || "Something went wrong")
      setStep("")
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <Link href="/captions" className="text-gray-400 hover:text-white transition">← Back to Captions</Link>
          <h1 className="text-2xl font-black bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
            📸 Upload Image
          </h1>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 mb-6">
          <label className="block w-full border-2 border-dashed border-gray-600 rounded-2xl p-10 text-center cursor-pointer hover:border-indigo-500 transition">
            <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic" className="hidden" onChange={handleFileChange} />
            {preview ? (
              <img src={preview} alt="preview" className="max-h-64 mx-auto rounded-xl object-contain" />
            ) : (
              <div>
                <p className="text-5xl mb-3">📸</p>
                <p className="text-white font-semibold text-lg">Click to upload an image</p>
                <p className="text-gray-500 text-sm mt-2">JPEG, PNG, WebP, GIF, HEIC supported</p>
              </div>
            )}
          </label>

          {preview && (
            <button
              onClick={handleUpload}
              disabled={loading}
              className="w-full mt-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-4 rounded-2xl font-bold text-lg transition disabled:opacity-50"
            >
              {loading ? "Generating..." : "🤖 Generate Captions"}
            </button>
          )}

          {step && (
            <div className="mt-4 bg-indigo-900/30 border border-indigo-700 rounded-xl p-4">
              <p className="text-indigo-300 animate-pulse">{step}</p>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-900/30 border border-red-700 rounded-xl p-4">
              <p className="text-red-300">{error}</p>
            </div>
          )}
        </div>

        {captions.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">🎉 Generated Captions!</h2>
            <div className="grid grid-cols-1 gap-4">
              {captions.map((c, i) => (
                <div key={i} className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
                  <p className="text-white text-lg">{c.content || c.caption || JSON.stringify(c)}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => router.push("/captions")}
              className="w-full mt-6 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-2xl font-semibold transition"
            >
              View All Captions →
            </button>
          </div>
        )}
      </div>
    </main>
  )
}