"use client"

import { useState, useEffect, useRef, type ChangeEvent, type KeyboardEvent } from "react"
import { Pencil, Trash2, Plus, Loader2, ImageOff, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
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

type CardType = "vs" | "list3"
type Mode = "survey" | "promo"

const CARD_TYPES: CardType[] = ["vs", "list3"]
const MODES: Mode[] = ["survey", "promo"]

const TYPE_LABEL: Record<CardType, string> = {
  vs: "VS",
  list3: "Top 3",
}

const TYPE_COLOR: Record<CardType, string> = {
  vs: "#59FFA0",
  list3: "#1AC8ED",
}

const MODE_LABEL: Record<Mode, string> = {
  survey: "Survey",
  promo: "Promo",
}

const MODE_COLOR: Record<Mode, string> = {
  survey: "#59FFA0",
  promo: "#EF9F27",
}

const OPTION_COUNTS: Record<CardType, number> = { vs: 2, list3: 3 }

interface PicksCardOption {
  id: string
  card_id: string
  option_order: number
  label: string
  link_url: string | null
  vote_count: number
  created_at: string
}

interface PicksCard {
  id: string
  card_type: CardType
  mode: Mode
  title: string
  background_image_url: string | null
  background_color: string | null
  categories: string[]
  display_order: number
  is_active: boolean
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string
  picks_card_options: PicksCardOption[]
}

interface OptionFormRow {
  id?: string
  label: string
  link_url: string
}

interface PicksCardFormState {
  card_type: CardType
  mode: Mode
  title: string
  background_color: string
  background_image_url: string
  categories: string[]
  display_order: string
  is_active: boolean
  start_date: string
  end_date: string
  options: OptionFormRow[]
}

function emptyOptions(type: CardType): OptionFormRow[] {
  return Array.from({ length: OPTION_COUNTS[type] }, () => ({ label: "", link_url: "" }))
}

function emptyForm(nextOrder: number): PicksCardFormState {
  return {
    card_type: "vs",
    mode: "survey",
    title: "",
    background_color: "",
    background_image_url: "",
    categories: [],
    display_order: String(nextOrder),
    is_active: true,
    start_date: "",
    end_date: "",
    options: emptyOptions("vs"),
  }
}

function toDateTimeInputValue(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromDateTimeInputValue(value: string): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

export function PicksCardsManager() {
  const [cards, setCards] = useState<PicksCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<PicksCard | null>(null)
  const [form, setForm] = useState<PicksCardFormState>(emptyForm(0))
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [categoryDraft, setCategoryDraft] = useState("")
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const previewUrlRef = useRef<string | null>(null)

  useEffect(() => {
    fetchCards()
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }
  }, [])

  async function fetchCards() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch("/api/v1/admin/picks-cards")
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load picks cards")
      setCards(json.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load picks cards")
    } finally {
      setLoading(false)
    }
  }

  function openCreateDialog() {
    const nextOrder = cards.length
      ? Math.max(...cards.map((c) => c.display_order)) + 1
      : 0
    setEditingCard(null)
    setForm(emptyForm(nextOrder))
    setFormErrors({})
    setCategoryDraft("")
    setPendingImageFile(null)
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
    setDialogOpen(true)
  }

  function openEditDialog(card: PicksCard) {
    setEditingCard(card)
    setForm({
      card_type: card.card_type,
      mode: card.mode,
      title: card.title,
      background_color: card.background_color ?? "",
      background_image_url: card.background_image_url ?? "",
      categories: card.categories ?? [],
      display_order: String(card.display_order),
      is_active: card.is_active,
      start_date: toDateTimeInputValue(card.start_date),
      end_date: toDateTimeInputValue(card.end_date),
      options: [...card.picks_card_options]
        .sort((a, b) => a.option_order - b.option_order)
        .map((opt) => ({ id: opt.id, label: opt.label, link_url: opt.link_url ?? "" })),
    })
    setFormErrors({})
    setCategoryDraft("")
    setPendingImageFile(null)
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
    setDialogOpen(true)
  }

  function handleCardTypeChange(nextType: CardType) {
    setForm((p) => {
      const count = OPTION_COUNTS[nextType]
      const nextOptions = Array.from({ length: count }, (_, i) => p.options[i] ?? { label: "", link_url: "" })
      return { ...p, card_type: nextType, options: nextOptions }
    })
  }

  function addCategory() {
    const value = categoryDraft.trim()
    if (!value) return
    setForm((p) => (p.categories.includes(value) ? p : { ...p, categories: [...p.categories, value] }))
    setCategoryDraft("")
  }

  function removeCategory(cat: string) {
    setForm((p) => ({ ...p, categories: p.categories.filter((c) => c !== cat) }))
  }

  function handleCategoryKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addCategory()
    }
  }

  function updateOption(index: number, field: "label" | "link_url", value: string) {
    setForm((p) => {
      const next = [...p.options]
      next[index] = { ...next[index], [field]: value }
      return { ...p, options: next }
    })
  }

  async function uploadImageForCard(cardId: string, file: File): Promise<string> {
    const body = new FormData()
    body.append("file", file)
    const res = await fetch(`/api/v1/admin/picks-cards/${cardId}/image`, { method: "POST", body })
    const json = await res.json()
    if (!res.ok || !json.success) throw new Error(json.error || "Image upload failed")
    return json.data.background_image_url as string
  }

  async function handleImageFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (editingCard) {
      try {
        setUploading(true)
        const url = await uploadImageForCard(editingCard.id, file)
        setForm((p) => ({ ...p, background_image_url: url }))
        setFormErrors((prev) => ({ ...prev, image: "" }))
        await fetchCards()
      } catch (err) {
        setFormErrors((prev) => ({
          ...prev,
          image: err instanceof Error ? err.message : "Upload failed",
        }))
      } finally {
        setUploading(false)
        e.target.value = ""
      }
      return
    }

    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    const preview = URL.createObjectURL(file)
    previewUrlRef.current = preview
    setPendingImageFile(file)
    setForm((p) => ({ ...p, background_image_url: preview }))
    e.target.value = ""
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {}
    if (!form.title.trim()) errors.title = "Title is required"
    const orderNum = Number(form.display_order)
    if (form.display_order.trim() === "" || !Number.isInteger(orderNum)) {
      errors.display_order = "Display order must be an integer"
    }
    const expectedCount = OPTION_COUNTS[form.card_type]
    if (form.options.length !== expectedCount) {
      errors.options = `Expected ${expectedCount} options for this card type`
    } else if (form.options.some((o) => !o.label.trim())) {
      errors.options = "Every option needs a label"
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit() {
    if (!validateForm()) return

    const basePayload = {
      mode: form.mode,
      title: form.title.trim(),
      background_color: form.background_color.trim() || null,
      categories: form.categories,
      display_order: Number(form.display_order),
      is_active: form.is_active,
      start_date: fromDateTimeInputValue(form.start_date),
      end_date: fromDateTimeInputValue(form.end_date),
    }

    try {
      setSubmitting(true)

      if (editingCard) {
        const payload = {
          ...basePayload,
          options: form.options.map((o) => ({
            id: o.id,
            label: o.label.trim(),
            link_url: o.link_url.trim() || null,
          })),
        }
        const res = await fetch(`/api/v1/admin/picks-cards/${editingCard.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const json = await res.json()
        if (!res.ok || !json.success) throw new Error(json.error || "Failed to save picks card")
      } else {
        const payload = {
          ...basePayload,
          card_type: form.card_type,
          options: form.options.map((o) => ({
            label: o.label.trim(),
            link_url: o.link_url.trim() || null,
          })),
        }
        const res = await fetch("/api/v1/admin/picks-cards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const json = await res.json()
        if (!res.ok || !json.success) throw new Error(json.error || "Failed to create picks card")

        if (pendingImageFile) {
          await uploadImageForCard(json.data.id, pendingImageFile)
        }
      }

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
        previewUrlRef.current = null
      }
      setPendingImageFile(null)
      setDialogOpen(false)
      await fetchCards()
    } catch (err) {
      setFormErrors((prev) => ({
        ...prev,
        submit: err instanceof Error ? err.message : "Failed to save picks card",
      }))
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleActive(card: PicksCard) {
    try {
      setTogglingId(card.id)
      const res = await fetch(`/api/v1/admin/picks-cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !card.is_active }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to toggle picks card")
      await fetchCards()
    } catch (err) {
      console.error("Toggle picks card active error:", err)
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete(card: PicksCard) {
    try {
      setDeletingId(card.id)
      const res = await fetch(`/api/v1/admin/picks-cards/${card.id}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to delete picks card")
      await fetchCards()
    } catch (err) {
      console.error("Delete picks card error:", err)
    } finally {
      setDeletingId(null)
    }
  }

  const expectedOptionCount = OPTION_COUNTS[form.card_type]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-header font-bold text-white mb-1">Picks Cards</h2>
          <p className="text-sm text-[#7DD8E8]">Manage homepage VS / Top 3 picks cards</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="size-4" />
          New Card
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
          <Button variant="outline" onClick={fetchCards}>Retry</Button>
        </div>
      )}

      {!loading && !error && cards.length === 0 && (
        <p className="text-[#7A7978] text-sm py-8 text-center">No picks cards yet.</p>
      )}

      {!loading && !error && cards.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/5 text-left text-xs text-[#7DD8E8] uppercase tracking-wide">
                <th className="p-3 font-medium">Card</th>
                <th className="p-3 font-medium">Type</th>
                <th className="p-3 font-medium">Mode</th>
                <th className="p-3 font-medium">Categories</th>
                <th className="p-3 font-medium">Active</th>
                <th className="p-3 font-medium">Order</th>
                <th className="p-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cards.map((card) => (
                <tr key={card.id} className="border-t border-white/5">
                  <td className="p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {card.background_image_url ? (
                        <img
                          src={card.background_image_url}
                          alt={card.title}
                          className="w-12 h-12 rounded-lg object-cover shrink-0 bg-white/5"
                        />
                      ) : card.background_color ? (
                        <div
                          className="w-12 h-12 rounded-lg shrink-0 border border-white/10"
                          style={{ backgroundColor: card.background_color }}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                          <ImageOff className="size-4 text-[#7A7978]" />
                        </div>
                      )}
                      <span className="text-white font-medium truncate block max-w-[220px]">
                        {card.title}
                      </span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full border font-medium"
                      style={{
                        color: TYPE_COLOR[card.card_type],
                        borderColor: `${TYPE_COLOR[card.card_type]}4D`,
                        backgroundColor: `${TYPE_COLOR[card.card_type]}1A`,
                      }}
                    >
                      {TYPE_LABEL[card.card_type]}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full border font-medium"
                      style={{
                        color: MODE_COLOR[card.mode],
                        borderColor: `${MODE_COLOR[card.mode]}4D`,
                        backgroundColor: `${MODE_COLOR[card.mode]}1A`,
                      }}
                    >
                      {MODE_LABEL[card.mode]}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {card.categories.length === 0 && <span className="text-[#7A7978]">—</span>}
                      {card.categories.slice(0, 3).map((cat) => (
                        <Badge key={cat} variant="outline" className="text-[10px] border-white/10 text-[#7DD8E8]">
                          {cat}
                        </Badge>
                      ))}
                      {card.categories.length > 3 && (
                        <span className="text-[10px] text-[#7A7978]">+{card.categories.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <Switch
                      checked={card.is_active}
                      disabled={togglingId === card.id}
                      onCheckedChange={() => toggleActive(card)}
                    />
                  </td>
                  <td className="p-3 text-foreground/80">{card.display_order}</td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(card)}>
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
                            <AlertDialogTitle>Delete &quot;{card.title}&quot;?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This permanently deletes the picks card, its options, and all votes
                              cast on it. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              disabled={deletingId === card.id}
                              onClick={() => handleDelete(card)}
                            >
                              {deletingId === card.id ? "Deleting…" : "Delete"}
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
            <DialogTitle>{editingCard ? "Edit Picks Card" : "New Picks Card"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="picks-card-type">Card Type</Label>
              <Select
                value={form.card_type}
                onValueChange={(value) => handleCardTypeChange(value as CardType)}
                disabled={!!editingCard}
              >
                <SelectTrigger id="picks-card-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CARD_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {TYPE_LABEL[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editingCard && (
                <p className="text-xs text-[#7A7978]">Card type can&apos;t be changed after creation.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="picks-card-mode">Mode</Label>
              <Select
                value={form.mode}
                onValueChange={(value) => setForm((p) => ({ ...p, mode: value as Mode }))}
              >
                <SelectTrigger id="picks-card-mode" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODES.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {MODE_LABEL[mode]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="picks-card-title">Title</Label>
              <Input
                id="picks-card-title"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
              {formErrors.title && <p className="text-xs text-red-400">{formErrors.title}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="picks-card-color">Background Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label="Background color picker"
                  value={form.background_color || "#121113"}
                  onChange={(e) => setForm((p) => ({ ...p, background_color: e.target.value }))}
                  className="h-9 w-12 rounded-md border border-white/10 bg-transparent cursor-pointer p-1 shrink-0"
                />
                <Input
                  id="picks-card-color"
                  placeholder="#121113"
                  value={form.background_color}
                  onChange={(e) => setForm((p) => ({ ...p, background_color: e.target.value }))}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="picks-card-image">Background Image</Label>
              <Input
                id="picks-card-image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageFileSelect}
              />
              {uploading && (
                <p className="text-xs text-[#7DD8E8] flex items-center gap-1.5">
                  <Loader2 className="size-3 animate-spin" /> Uploading…
                </p>
              )}
              {!uploading && form.background_image_url && (
                <img
                  src={form.background_image_url}
                  alt="Preview"
                  className="w-full h-32 object-cover rounded-lg border border-white/10 mt-2"
                />
              )}
              {!editingCard && pendingImageFile && (
                <p className="text-xs text-[#7A7978]">Image uploads once the card is created.</p>
              )}
              {formErrors.image && <p className="text-xs text-red-400">{formErrors.image}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="picks-card-category-input">Categories</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="picks-card-category-input"
                  placeholder="Add a tag and press Enter"
                  value={categoryDraft}
                  onChange={(e) => setCategoryDraft(e.target.value)}
                  onKeyDown={handleCategoryKeyDown}
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="sm" onClick={addCategory}>
                  Add
                </Button>
              </div>
              {form.categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {form.categories.map((cat) => (
                    <span
                      key={cat}
                      className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border border-[#59FFA0]/30 bg-[#59FFA0]/10 text-[#59FFA0] font-medium"
                    >
                      {cat}
                      <button
                        type="button"
                        onClick={() => removeCategory(cat)}
                        className="hover:text-white"
                        aria-label={`Remove ${cat}`}
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="picks-card-order">Display Order</Label>
              <Input
                id="picks-card-order"
                type="number"
                step={1}
                value={form.display_order}
                onChange={(e) => setForm((p) => ({ ...p, display_order: e.target.value }))}
              />
              {formErrors.display_order && (
                <p className="text-xs text-red-400">{formErrors.display_order}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="picks-card-starts">Starts At (optional)</Label>
                <Input
                  id="picks-card-starts"
                  type="datetime-local"
                  value={form.start_date}
                  onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="picks-card-ends">Ends At (optional)</Label>
                <Input
                  id="picks-card-ends"
                  type="datetime-local"
                  value={form.end_date}
                  onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="picks-card-active">Active</Label>
              <Switch
                id="picks-card-active"
                checked={form.is_active}
                onCheckedChange={(checked) => setForm((p) => ({ ...p, is_active: checked }))}
              />
            </div>

            <div className="space-y-2 border-t border-white/10 pt-4">
              <Label>Options ({expectedOptionCount})</Label>
              {form.options.map((option, index) => (
                <div key={option.id ?? index} className="space-y-1.5 bg-white/5 border border-white/10 rounded-lg p-3">
                  <p className="text-xs text-[#7DD8E8] font-medium">Option {index + 1}</p>
                  <Input
                    placeholder="Label"
                    value={option.label}
                    onChange={(e) => updateOption(index, "label", e.target.value)}
                  />
                  <Input
                    placeholder="Link URL (optional)"
                    value={option.link_url}
                    onChange={(e) => updateOption(index, "link_url", e.target.value)}
                  />
                </div>
              ))}
              {formErrors.options && <p className="text-xs text-red-400">{formErrors.options}</p>}
            </div>

            {formErrors.submit && <p className="text-xs text-red-400">{formErrors.submit}</p>}

            <Button
              className="w-full"
              disabled={uploading || submitting}
              onClick={handleSubmit}
            >
              {submitting ? "Saving…" : editingCard ? "Save Changes" : "Create Card"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
