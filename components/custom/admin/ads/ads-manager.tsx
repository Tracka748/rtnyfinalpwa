"use client"

import { useEffect, useState, type ChangeEvent } from "react"
import { Pencil, Trash2, Plus, Loader2, ImageOff, Film } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

type AdType = "image" | "reel"

const AD_TYPE_LABELS: Record<AdType, string> = { image: "Image", reel: "Reel" }

interface Ad {
  id: string
  placement_key: string
  title: string
  ad_type: AdType
  image_url: string | null
  video_url: string | null
  reel_duration_key: string | null
  link_url: string | null
  weight: number
  start_date: string | null
  end_date: string | null
  is_active: boolean
  created_at: string
  impressions: number
  clicks: number
}

interface PriceOption {
  key: string
  label: string
  price_cents: number
  billing_period: string
}

interface AdPlacementOption extends PriceOption {
  allowed_ad_types: AdType[]
}

type AdReelDurationOption = PriceOption

interface AdFormState {
  title: string
  placement_key: string
  ad_type: AdType
  image_url: string
  video_url: string
  reel_duration_key: string
  link_url: string
  weight: string
  start_date: string
  end_date: string
  is_active: boolean
}

const EMPTY_FORM: AdFormState = {
  title: "",
  placement_key: "",
  ad_type: "image",
  image_url: "",
  video_url: "",
  reel_duration_key: "",
  link_url: "",
  weight: "1",
  start_date: "",
  end_date: "",
  is_active: true,
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return ""
  return iso.slice(0, 10)
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
}

function formatPriceOption(option: PriceOption): string {
  const period = option.billing_period === "monthly" ? "mo" : option.billing_period
  return `${option.label} — $${(option.price_cents / 100).toFixed(2)}/${period}`
}

export function AdsManager() {
  const [ads, setAds] = useState<Ad[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [placementOptions, setPlacementOptions] = useState<AdPlacementOption[]>([])
  const [reelDurationOptions, setReelDurationOptions] = useState<AdReelDurationOption[]>([])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAd, setEditingAd] = useState<Ad | null>(null)
  const [form, setForm] = useState<AdFormState>(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchAds()
    fetchPlacementOptions()
    fetchReelDurationOptions()
  }, [])

  async function fetchAds() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch("/api/v1/admin/ads")
      if (!res.ok) throw new Error("Failed to load ads")
      const data = await res.json()
      setAds(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ads")
    } finally {
      setLoading(false)
    }
  }

  async function fetchPlacementOptions() {
    try {
      const res = await fetch("/api/v1/admin/ad-placements")
      if (!res.ok) throw new Error("Failed to load ad placements")
      const data = await res.json()
      setPlacementOptions(data)
    } catch (err) {
      console.error("Fetch ad placements error:", err)
    }
  }

  async function fetchReelDurationOptions() {
    try {
      const res = await fetch("/api/v1/admin/ad-reel-durations")
      if (!res.ok) throw new Error("Failed to load reel durations")
      const data = await res.json()
      setReelDurationOptions(data)
    } catch (err) {
      console.error("Fetch ad reel durations error:", err)
    }
  }

  const selectedPlacement = placementOptions.find((p) => p.key === form.placement_key)

  function openCreateDialog() {
    setEditingAd(null)
    setForm(EMPTY_FORM)
    setFormErrors({})
    setDialogOpen(true)
  }

  function openEditDialog(ad: Ad) {
    setEditingAd(ad)
    setForm({
      title: ad.title,
      placement_key: ad.placement_key,
      ad_type: ad.ad_type,
      image_url: ad.image_url ?? "",
      video_url: ad.video_url ?? "",
      reel_duration_key: ad.reel_duration_key ?? "",
      link_url: ad.link_url ?? "",
      weight: String(ad.weight),
      start_date: toDateInputValue(ad.start_date),
      end_date: toDateInputValue(ad.end_date),
      is_active: ad.is_active,
    })
    setFormErrors({})
    setDialogOpen(true)
  }

  async function handleImageFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)
      const body = new FormData()
      body.append("file", file)
      const res = await fetch("/api/v1/admin/ads/upload", { method: "POST", body })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Upload failed")
      setForm((prev) => ({ ...prev, image_url: data.image_url }))
      setFormErrors((prev) => ({ ...prev, image_url: "" }))
    } catch (err) {
      setFormErrors((prev) => ({
        ...prev,
        image_url: err instanceof Error ? err.message : "Upload failed",
      }))
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  async function handleVideoFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)
      const body = new FormData()
      body.append("file", file)
      const res = await fetch("/api/v1/admin/ads/upload-reel", { method: "POST", body })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Upload failed")
      setForm((prev) => ({ ...prev, video_url: data.video_url }))
      setFormErrors((prev) => ({ ...prev, video_url: "" }))
    } catch (err) {
      setFormErrors((prev) => ({
        ...prev,
        video_url: err instanceof Error ? err.message : "Upload failed",
      }))
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {}
    if (!form.title.trim()) errors.title = "Title is required"
    if (!form.placement_key.trim()) errors.placement_key = "Placement key is required"
    if (form.ad_type === "reel") {
      if (!form.video_url.trim()) errors.video_url = "A video is required"
      if (!form.reel_duration_key.trim()) errors.reel_duration_key = "Duration is required"
    } else {
      if (!form.image_url.trim()) errors.image_url = "An image is required"
    }
    const weightNum = Number(form.weight)
    if (form.weight.trim() === "" || !Number.isInteger(weightNum) || weightNum < 0) {
      errors.weight = "Weight must be a non-negative integer"
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit() {
    if (!validateForm()) return

    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      placement_key: form.placement_key.trim(),
      ad_type: form.ad_type,
      link_url: form.link_url.trim() || null,
      weight: Number(form.weight),
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      is_active: form.is_active,
    }

    if (form.ad_type === "reel") {
      payload.video_url = form.video_url
      payload.reel_duration_key = form.reel_duration_key
      payload.image_url = null
    } else {
      payload.image_url = form.image_url
      payload.video_url = null
      payload.reel_duration_key = null
    }

    try {
      setSubmitting(true)
      const res = await fetch(
        editingAd ? `/api/v1/admin/ads/${editingAd.id}` : "/api/v1/admin/ads",
        {
          method: editingAd ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save ad")

      setDialogOpen(false)
      await fetchAds()
    } catch (err) {
      setFormErrors((prev) => ({
        ...prev,
        submit: err instanceof Error ? err.message : "Failed to save ad",
      }))
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleActive(ad: Ad) {
    try {
      setTogglingId(ad.id)
      const res = await fetch(`/api/v1/admin/ads/${ad.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !ad.is_active }),
      })
      if (!res.ok) throw new Error("Failed to toggle ad")
      await fetchAds()
    } catch (err) {
      console.error("Toggle ad active error:", err)
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete(ad: Ad) {
    try {
      setDeletingId(ad.id)
      const res = await fetch(`/api/v1/admin/ads/${ad.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete ad")
      await fetchAds()
    } catch (err) {
      console.error("Delete ad error:", err)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-header font-bold text-white mb-1">Ads</h2>
          <p className="text-sm text-[#7DD8E8]">Manage ad placements and creative</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="size-4" />
          New Ad
        </Button>
      </div>

      {loading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-white/5 border border-white/10 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Button variant="outline" onClick={fetchAds}>Retry</Button>
        </div>
      )}

      {!loading && !error && ads.length === 0 && (
        <p className="text-[#7A7978] text-sm py-8 text-center">No ads yet.</p>
      )}

      {!loading && !error && ads.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/5 text-left text-xs text-[#7DD8E8] uppercase tracking-wide">
                <th className="p-3 font-medium">Ad</th>
                <th className="p-3 font-medium">Placement</th>
                <th className="p-3 font-medium">Active</th>
                <th className="p-3 font-medium">Weight</th>
                <th className="p-3 font-medium">Impressions</th>
                <th className="p-3 font-medium">Clicks</th>
                <th className="p-3 font-medium">Date Range</th>
                <th className="p-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {ads.map((ad) => (
                <tr key={ad.id} className="border-t border-white/5">
                  <td className="p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {ad.ad_type === "reel" ? (
                        <div className="w-12 h-12 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                          <Film className="size-4 text-purple-300" />
                        </div>
                      ) : ad.image_url ? (
                        <img
                          src={ad.image_url}
                          alt={ad.title}
                          className="w-12 h-12 rounded-lg object-cover shrink-0 bg-white/5"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                          <ImageOff className="size-4 text-[#7A7978]" />
                        </div>
                      )}
                      <div className="min-w-0 flex items-center gap-1.5">
                        <span className="text-white font-medium truncate max-w-[180px]">{ad.title}</span>
                        <span
                          className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${
                            ad.ad_type === "reel"
                              ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                              : "bg-white/10 text-[#7DD8E8] border-white/20"
                          }`}
                        >
                          {ad.ad_type === "reel" ? "Reel" : "Image"}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-[#7DD8E8]">{ad.placement_key}</td>
                  <td className="p-3">
                    <Switch
                      checked={ad.is_active}
                      disabled={togglingId === ad.id}
                      onCheckedChange={() => toggleActive(ad)}
                    />
                  </td>
                  <td className="p-3 text-foreground/80">{ad.weight}</td>
                  <td className="p-3 text-foreground/80">{ad.impressions.toLocaleString()}</td>
                  <td className="p-3 text-foreground/80">{ad.clicks.toLocaleString()}</td>
                  <td className="p-3 text-foreground/60 whitespace-nowrap">
                    {ad.start_date || ad.end_date
                      ? `${formatDate(ad.start_date)} – ${formatDate(ad.end_date)}`
                      : "—"}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(ad)}>
                        <Pencil className="size-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon-sm" className="text-red-400 hover:text-red-300">
                            <Trash2 className="size-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete "{ad.title}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This permanently deletes the ad and its tracked impression/click events. This
                              cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              disabled={deletingId === ad.id}
                              onClick={() => handleDelete(ad)}
                            >
                              {deletingId === ad.id ? "Deleting…" : "Delete"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAd ? "Edit Ad" : "New Ad"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ad-title">Title</Label>
              <Input
                id="ad-title"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
              {formErrors.title && <p className="text-xs text-red-400">{formErrors.title}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ad-placement">Ad Placement</Label>
              <Select
                value={form.placement_key || undefined}
                onValueChange={(value) => {
                  const newPlacement = placementOptions.find((p) => p.key === value)
                  const allowed = newPlacement?.allowed_ad_types ?? ["image"]
                  setForm((p) => ({
                    ...p,
                    placement_key: value,
                    ad_type: allowed.includes(p.ad_type) ? p.ad_type : "image",
                  }))
                }}
              >
                <SelectTrigger id="ad-placement" className="w-full">
                  <SelectValue placeholder="Select a placement…" />
                </SelectTrigger>
                <SelectContent>
                  {placementOptions.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                      {formatPriceOption(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.placement_key && (
                <p className="text-xs text-red-400">{formErrors.placement_key}</p>
              )}
            </div>

            {selectedPlacement && (
              <div className="space-y-1.5">
                <Label htmlFor="ad-type">Ad Type</Label>
                <Select
                  value={form.ad_type}
                  onValueChange={(value) => setForm((p) => ({ ...p, ad_type: value as AdType }))}
                >
                  <SelectTrigger id="ad-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(selectedPlacement.allowed_ad_types ?? ["image"]).map((type) => (
                      <SelectItem key={type} value={type}>
                        {AD_TYPE_LABELS[type] ?? type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.ad_type === "reel" && (
              <div className="space-y-1.5">
                <Label htmlFor="ad-reel-duration">Duration</Label>
                <Select
                  value={form.reel_duration_key || undefined}
                  onValueChange={(value) => setForm((p) => ({ ...p, reel_duration_key: value }))}
                >
                  <SelectTrigger id="ad-reel-duration" className="w-full">
                    <SelectValue placeholder="Select a duration…" />
                  </SelectTrigger>
                  <SelectContent>
                    {reelDurationOptions.map((option) => (
                      <SelectItem key={option.key} value={option.key}>
                        {formatPriceOption(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.reel_duration_key && (
                  <p className="text-xs text-red-400">{formErrors.reel_duration_key}</p>
                )}
              </div>
            )}

            {form.ad_type === "reel" ? (
              <div className="space-y-1.5">
                <Label htmlFor="ad-video">Video</Label>
                <Input
                  id="ad-video"
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm"
                  onChange={handleVideoFileSelect}
                />
                {uploading && (
                  <p className="text-xs text-[#7DD8E8] flex items-center gap-1.5">
                    <Loader2 className="size-3 animate-spin" /> Uploading…
                  </p>
                )}
                {!uploading && form.video_url && (
                  <video
                    src={form.video_url}
                    muted
                    controls
                    className="w-full h-32 rounded-lg border border-white/10 mt-2 object-cover"
                  />
                )}
                {formErrors.video_url && <p className="text-xs text-red-400">{formErrors.video_url}</p>}
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="ad-image">Image</Label>
                <Input id="ad-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageFileSelect} />
                {uploading && (
                  <p className="text-xs text-[#7DD8E8] flex items-center gap-1.5">
                    <Loader2 className="size-3 animate-spin" /> Uploading…
                  </p>
                )}
                {!uploading && form.image_url && (
                  <img
                    src={form.image_url}
                    alt="Preview"
                    className="w-full h-32 object-cover rounded-lg border border-white/10 mt-2"
                  />
                )}
                {formErrors.image_url && <p className="text-xs text-red-400">{formErrors.image_url}</p>}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="ad-link">Link URL (optional)</Label>
              <Input
                id="ad-link"
                placeholder="https://…"
                value={form.link_url}
                onChange={(e) => setForm((p) => ({ ...p, link_url: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ad-weight">Weight</Label>
              <Input
                id="ad-weight"
                type="number"
                min={0}
                step={1}
                value={form.weight}
                onChange={(e) => setForm((p) => ({ ...p, weight: e.target.value }))}
              />
              {formErrors.weight && <p className="text-xs text-red-400">{formErrors.weight}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ad-start">Start Date (optional)</Label>
                <Input
                  id="ad-start"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ad-end">End Date (optional)</Label>
                <Input
                  id="ad-end"
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="ad-active">Active</Label>
              <Switch
                id="ad-active"
                checked={form.is_active}
                onCheckedChange={(checked) => setForm((p) => ({ ...p, is_active: checked }))}
              />
            </div>

            {formErrors.submit && <p className="text-xs text-red-400">{formErrors.submit}</p>}

            <Button
              className="w-full"
              disabled={(form.ad_type === "reel" ? !form.video_url : !form.image_url) || uploading || submitting}
              onClick={handleSubmit}
            >
              {submitting ? "Saving…" : editingAd ? "Save Changes" : "Create Ad"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
