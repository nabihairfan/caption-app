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
  const [picked, setPicked] = useState(null)

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
    setPicked(null)
  }

  async function handleConfirmFavorite() {
    if (picked === null) return
    const favoriteCaption = captions[picked]
    if (!favoriteCaption?.id) return

    try {
      // Mark the picked caption as public
      const { error } = await supabase
        .from("captions")
        .update({
          is_public: true,
          modified_by_user_id: user.id
        })
        .eq("id", favoriteCaption.id)

      if (error) throw error

      alert("🎉 Your caption is now live in the app!")
      router.push("/captions")
    } catch (err) {
      console.error("Error confirming favorite:", err)
      setError("Couldn't save your favorite. Try again!")
    }
  }
  async function handleUpload() {
    if (!file) { setError("Please select an image first"); return }
    setLoading(true)
    setCaptions([])
    setError("")
    setPicked(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error("Not logged in")

      // Step 1: Get presigned URL
      setStep("📡 Getting upload URL...")
      console.log("Step 1: Getting presigned URL...")
      const presignRes = await fetch("https://api.almostcrackd.ai/pipeline/generate-presigned-url", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ contentType: file.type })
      })

      console.log("Presign response status:", presignRes.status)
      if (!presignRes.ok) {
        const errText = await presignRes.text()
        console.error("Presign error body:", errText)
        throw new Error(`Failed to get upload URL (${presignRes.status}): ${errText}`)
      }
      const presignData = await presignRes.json()
      console.log("Presign data:", presignData)
      const { presignedUrl, cdnUrl } = presignData

      // Step 2: Upload image to S3
      setStep("⬆️ Uploading image...")
      console.log("Step 2: Uploading to S3...", presignedUrl)
      const uploadRes = await fetch(presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file
      })
      console.log("S3 upload status:", uploadRes.status)
      if (!uploadRes.ok) {
        const errText = await uploadRes.text()
        console.error("S3 upload error:", errText)
        throw new Error(`Failed to upload image to S3 (${uploadRes.status})`)
      }

      // Step 3: Register image
      setStep("📝 Registering image...")
      console.log("Step 3: Registering image with cdnUrl:", cdnUrl)
      const registerRes = await fetch("https://api.almostcrackd.ai/pipeline/upload-image-from-url", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ imageUrl: cdnUrl, isCommonUse: false })
      })

      console.log("Register response status:", registerRes.status)
      if (!registerRes.ok) {
        const errText = await registerRes.text()
        console.error("Register error body:", errText)
        throw new Error(`Failed to register image (${registerRes.status}): ${errText}`)
      }
      const registerData = await registerRes.json()
      console.log("Register data:", registerData)
      const { imageId } = registerData

      // Step 4: Generate captions
      setStep("🤖 Generating captions (this may take a minute)...")
      console.log("Step 4: Generating captions for imageId:", imageId)
      const captionRes = await fetch("https://api.almostcrackd.ai/pipeline/generate-captions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ imageId })
      })

      console.log("Caption response status:", captionRes.status)
      if (!captionRes.ok) {
        const errText = await captionRes.text()
        console.error("Caption error body:", errText)
        throw new Error(`Failed to generate captions (${captionRes.status}): ${errText}`)
      }
      const captionData = await captionRes.json()
      console.log("Caption data:", captionData)
      setCaptions(Array.isArray(captionData) ? captionData : [captionData])
      setStep("")
    } catch (err) {
      console.error("Upload error:", err)
      setError(err.message || "Something went wrong")
      setStep("")
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-yellow-50 p-6">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <Link href="/captions" className="text-gray-400 hover:text-gray-600 transition text-sm">← Back</Link>
          <h1 className="text-2xl font-black bg-gradient-to-r from-pink-400 via-purple-400 to-yellow-400 bg-clip-text text-transparent">
            📸 Upload Image
          </h1>
          <div className="w-10" />
        </div>

        {/* Upload box */}
        <div className="bg-white rounded-3xl shadow-lg p-6 mb-6 border border-pink-100">
          <label className="block w-full border-2 border-dashed border-pink-200 rounded-2xl p-8 text-center cursor-pointer hover:border-purple-400 transition">
            <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic" className="hidden" onChange={handleFileChange} />
            {preview ? (
              <img src={preview} alt="preview" className="max-h-64 mx-auto rounded-xl object-contain" />
            ) : (
              <div>
                <p className="text-5xl mb-3">📸</p>
                <p className="text-gray-700 font-semibold text-lg">Click to upload an image</p>
                <p className="text-gray-400 text-sm mt-2">JPEG, PNG, WebP, GIF, HEIC supported</p>
              </div>
            )}
          </label>

          {preview && !loading && captions.length === 0 && (
            <button
              onClick={handleUpload}
              disabled={loading}
              className="w-full mt-6 bg-gradient-to-r from-pink-400 to-purple-400 hover:opacity-90 text-white py-4 rounded-2xl font-bold text-lg transition disabled:opacity-50"
            >
              🤖 Generate Captions
            </button>
          )}

          {step && (
            <div className="mt-4 bg-purple-50 border border-purple-200 rounded-xl p-4">
              <p className="text-purple-500 animate-pulse text-sm font-medium">{step}</p>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-500 text-sm font-medium">❌ {error}</p>
              <p className="text-red-400 text-xs mt-1">Check the browser console (F12) for details</p>
            </div>
          )}
        </div>

        {/* Caption picker */}
        {captions.length > 0 && (
          <div>
            <div className="mb-4 text-center">
              <p className="text-2xl mb-1">🎉</p>
              <h2 className="text-xl font-black text-gray-800">Pick your favorite!</h2>
              <p className="text-gray-400 text-sm mt-1">Tap the caption you like best</p>
            </div>
            <div className="grid grid-cols-1 gap-3 mb-6">
              {captions.map((c, i) => {
                const text = c.content || c.caption || JSON.stringify(c)
                const isSelected = picked === i
                return (
                  <button
                    key={i}
                    onClick={() => setPicked(i)}
                    className={`w-full text-left p-5 rounded-2xl border-2 transition font-medium text-gray-800 ${
                      isSelected
                        ? "border-purple-400 bg-purple-50 shadow-md"
                        : "border-pink-100 bg-white hover:border-purple-300 hover:bg-purple-50/40"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`text-lg flex-shrink-0 mt-0.5 ${isSelected ? "opacity-100" : "opacity-30"}`}>
                        {isSelected ? "💜" : "○"}
                      </span>
                      <p className="leading-relaxed">{text}</p>
                    </div>
                  </button>
                )
              })}
            </div>

            {picked !== null && (
              <div className="bg-gradient-to-br from-pink-50 to-purple-50 border-2 border-purple-200 rounded-2xl p-4 mb-4 text-center">
                <p className="text-purple-600 font-semibold text-sm mb-1">✨ Your favorite:</p>
                <p className="text-gray-800 font-medium">{captions[picked]?.content || captions[picked]?.caption}</p>
                <button
                  onClick={handleConfirmFavorite}
                  className="mt-3 bg-gradient-to-r from-pink-400 to-purple-400 text-white px-6 py-2 rounded-xl font-bold text-sm hover:opacity-90 transition"
                >
                  ✅ Confirm this one!
                </button>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setFile(null); setPreview(null); setCaptions([]); setPicked(null); setError("") }}
                className="flex-1 bg-white border border-pink-200 text-gray-600 py-3 rounded-2xl font-semibold hover:bg-pink-50 transition"
              >
                Upload Another 📸
              </button>
              <button
                onClick={() => router.push("/captions")}
                className="flex-1 bg-gradient-to-r from-pink-400 to-purple-400 text-white py-3 rounded-2xl font-semibold hover:opacity-90 transition"
              >
                View All Captions 💘
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}