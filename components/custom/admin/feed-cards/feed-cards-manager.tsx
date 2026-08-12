"use client"

import { useEffect, useMemo, useState, type ChangeEvent } from "react"
import { Pencil, Trash2, Plus, Loader2, ImageOff, ChevronsUpDown, X, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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

type CardType = "announcement" | "curated" | "deal" | "featured"

const CARD_TYPES: CardType[] = ["announcement", "curated", "deal", "featured"]

const TYPE_LABEL: Record<CardType, string> = {
  announcement: "Announcement",
  curated: "Curated",
  deal: "Deal",
  featured: "Featured",
}

const TYPE_COLOR: Record<CardType, string> = {
  announcement: "#59FFA0",
  curated: "#1AC8ED",
  deal: "#EF9F27",
  featured: "#7F77DD",
}

const MAX_HOMEPAGE_CARDS = 8

interface FeedCard {
  id: string
  type: CardType
  headline: string
  sub: string | null
  action_label: string | null
  cta_url: string | null
  event_id: string | null
  promo_code: string | null
  image_url: string | null
  active: boolean
  starts_at: string | null
  ends_at: string | null
  display_order: number
  created_at: string
  updated_at: string
}

interface EventOption {
  id: string
  name: string
  event_date?: string | null
}

interface FeedCardFormState {
  type: CardType
  headline: string
  sub: string
  action_label: string
  cta_url: string
  event_id: string
  promo_code: string
  image_url: string
  active: boolean
  starts_at: string
  ends_at: string
  display_order: string
}

function emptyForm(nextOrder: number): FeedCardFormState {
  return {
    type: "announcement",
    headline: "",
    sub: "",
    action_label: "",
    cta_url: "",
    event_id: "",
    promo_code: "",
    image_url: "",
    active: true,
    starts_at: "",
    ends_at: "",
    display_order: String(nextOrder),
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

function formatDateTime(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function showsEventPicker(type: CardType): boolean {
  return type === "curated" || type === "featured" || type === "deal"
}

export function FeedCardsManager() {
  const [cards, setCards] = useState<FeedCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [events, setEvents] = useState<EventOption[]>([])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<FeedCard | null>(null)
  const [form, setForm] = useState<FeedCardFormState>(emptyForm(0))
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [eventPickerOpen, setEventPickerOpen] = useState(false)
  const [eventSearch, setEventSearch] = useState("")

  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchCards()
    fetchEvents()
  }, [])

  async function fetchCards() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch("/api/v1/admin/feed-cards")
      if (!res.ok) throw new Error("Failed to load feed cards")
      const data = await res.json()
      setCards(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load feed cards")
    } finally {
      setLoading(false)
    }
  }

  async function fetchEvents() {
    try {
      const res = await fetch("/api/v1/admin/events")
      if (!res.ok) throw new Error("Failed to load events")
      const data = await res.json()
      setEvents(data?.data?.events ?? [])
    } catch (err) {
      console.error("Fetch events error:", err)
    }
  }

  const activeCount = useMemo(() => cards.filter((c) => c.active).length, [cards])

  const eventsById = useMemo(() => {
    const map = new Map<string, EventOption>()
    for (const e of events) map.set(e.id, e)
    return map
  }, [events])

  const filteredEvents = useMemo(() => {
    const q = eventSearch.trim().toLowerCase()
    const list = q ? events.filter((e) => e.name.toLowerCase().includes(q)) : events
    return list.slice(0, 50)
  }, [events, eventSearch])

  function openCreateDialog() {
    const nextOrder = cards.length
      ? Math.max(...cards.map((c) => c.display_order)) + 1
      : 0
    setEditingCard(null)
    setForm(emptyForm(nextOrder))
    setFormErrors({})
    setEventSearch("")
    setDialogOpen(true)
  }

  function openEditDialog(card: FeedCard) {
    setEditingCard(card)
    setForm({
      type: card.type,
      headline: card.headline,
      sub: card.sub ?? "",
      action_label: card.action_label ?? "",
      cta_url: card.cta_url ?? "",
      event_id: card.event_id ?? "",
      promo_code: card.promo_code ?? "",
      image_url: card.image_url ?? "",
      active: card.active,
      starts_at: toDateTimeInputValue(card.starts_at),
      ends_at: toDateTimeInputValue(card.ends_at),
      display_order: String(card.display_order),
    })
    setFormErrors({})
    setEventSearch("")
    setDialogOpen(true)
  }

  async function handleImageFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)
      const body = new FormData()
      body.append("file", file)
      const res = await fetch("/api/v1/admin/feed-cards/upload", { method: "POST", body })
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

  function validateForm(): boolean {
    const errors: Record<string, string> = {}
    if (!form.headline.trim()) errors.headline = "Headline is required"
    const orderNum = Number(form.display_order)
    if (form.display_order.trim() === "" || !Number.isInteger(orderNum)) {
      errors.display_order = "Display order must be an integer"
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const prospectiveActiveCount = useMemo(() => {
    const others = cards.filter((c) => c.id !== editingCard?.id && c.active).length
    return others + (form.active ? 1 : 0)
  }, [cards, editingCard, form.active])

  async function handleSubmit() {
    if (!validateForm()) return

    const payload: Record<string, unknown> = {
      type: form.type,
      headline: form.headline.trim(),
      sub: form.sub.trim() || null,
      action_label: form.action_label.trim() || null,
      image_url: form.image_url || null,
      active: form.active,
      starts_at: fromDateTimeInputValue(form.starts_at),
      ends_at: fromDateTimeInputValue(form.ends_at),
      display_order: Number(form.display_order),
      cta_url: form.type === "announcement" ? form.cta_url.trim() || null : null,
      event_id: showsEventPicker(form.type) ? form.event_id || null : null,
      promo_code: form.type === "deal" ? form.promo_code.trim() || null : null,
    }

    try {
      setSubmitting(true)
      const res = await fetch(
        editingCard ? `/api/v1/admin/feed-cards/${editingCard.id}` : "/api/v1/admin/feed-cards",
        {
          method: editingCard ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save feed card")

      setDialogOpen(false)
      await fetchCards()
    } catch (err) {
      setFormErrors((prev) => ({
        ...prev,
        submit: err instanceof Error ? err.message : "Failed to save feed card",
      }))
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleActive(card: FeedCard) {
    try {
      setTogglingId(card.id)
      const res = await fetch(`/api/v1/admin/feed-cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !card.active }),
      })
      if (!res.ok) throw new Error("Failed to toggle feed card")
      await fetchCards()
    } catch (err) {
      console.error("Toggle feed card active error:", err)
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete(card: FeedCard) {
    try {
      setDeletingId(card.id)
      const res = await fetch(`/api/v1/admin/feed-cards/${card.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete feed card")
      await fetchCards()
    } catch (err) {
      console.error("Delete feed card error:", err)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-header font-bold text-white mb-1">Feed Cards</h2>
          <p className="text-sm text-[#7DD8E8]">Manage the homepage announcement feed</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="size-4" />
          New Card
        </Button>
      </div>

      {!loading && !error && activeCount > MAX_HOMEPAGE_CARDS && (
        <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 text-sm text-amber-300">
          <TriangleAlert className="size-4 shrink-0 mt-0.5" />
          <p>
            {activeCount} cards are active, but only the top {MAX_HOMEPAGE_CARDS} by display order
            appear on the homepage. Consider deactivating some or adjusting order.
          </p>
        </div>
      )}

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
        <p className="text-[#7A7978] text-sm py-8 text-center">No feed cards yet.</p>
      )}

      {!loading && !error && cards.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/5 text-left text-xs text-[#7DD8E8] uppercase tracking-wide">
                <th className="p-3 font-medium">Card</th>
                <th className="p-3 font-medium">Type</th>
                <th className="p-3 font-medium">Active</th>
                <th className="p-3 font-medium">Order</th>
                <th className="p-3 font-medium">Window</th>
                <th className="p-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cards.map((card) => (
                <tr key={card.id} className="border-t border-white/5">
                  <td className="p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {card.image_url ? (
                        <img
                          src={card.image_url}
                          alt={card.headline}
                          className="w-12 h-12 rounded-lg object-cover shrink-0 bg-white/5"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                          <ImageOff className="size-4 text-[#7A7978]" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="text-white font-medium truncate block max-w-[220px]">
                          {card.headline}
                        </span>
                        {card.sub && (
                          <span className="text-xs text-[#7A7978] truncate block max-w-[220px]">
                            {card.sub}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full border font-medium"
                      style={{
                        color: TYPE_COLOR[card.type],
                        borderColor: `${TYPE_COLOR[card.type]}4D`,
                        backgroundColor: `${TYPE_COLOR[card.type]}1A`,
                      }}
                    >
                      {TYPE_LABEL[card.type]}
                    </span>
                  </td>
                  <td className="p-3">
                    <Switch
                      checked={card.active}
                      disabled={togglingId === card.id}
                      onCheckedChange={() => toggleActive(card)}
                    />
                  </td>
                  <td className="p-3 text-foreground/80">{card.display_order}</td>
                  <td className="p-3 text-foreground/60 whitespace-nowrap">
                    {card.starts_at || card.ends_at
                      ? `${formatDateTime(card.starts_at)} – ${formatDateTime(card.ends_at)}`
                      : "—"}
                  </td>
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
                            <AlertDialogTitle>Delete "{card.headline}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This permanently deletes the feed card. This cannot be undone.
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
            <DialogTitle>{editingCard ? "Edit Feed Card" : "New Feed Card"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="card-type">Type</Label>
              <Select
                value={form.type}
                onValueChange={(value) => setForm((p) => ({ ...p, type: value as CardType }))}
              >
                <SelectTrigger id="card-type" className="w-full">
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
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="card-headline">Headline</Label>
              <Input
                id="card-headline"
                value={form.headline}
                onChange={(e) => setForm((p) => ({ ...p, headline: e.target.value }))}
              />
              {formErrors.headline && <p className="text-xs text-red-400">{formErrors.headline}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="card-sub">Subtext</Label>
              <Textarea
                id="card-sub"
                rows={2}
                value={form.sub}
                onChange={(e) => setForm((p) => ({ ...p, sub: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="card-action-label">Action Label</Label>
              <Input
                id="card-action-label"
                placeholder="Explore →"
                value={form.action_label}
                onChange={(e) => setForm((p) => ({ ...p, action_label: e.target.value }))}
              />
            </div>

            {form.type === "announcement" && (
              <div className="space-y-1.5">
                <Label htmlFor="card-cta-url">CTA URL</Label>
                <Input
                  id="card-cta-url"
                  placeholder="/crews"
                  value={form.cta_url}
                  onChange={(e) => setForm((p) => ({ ...p, cta_url: e.target.value }))}
                />
              </div>
            )}

            {showsEventPicker(form.type) && (
              <div className="space-y-1.5">
                <Label htmlFor="card-event">Linked Event</Label>
                <Popover open={eventPickerOpen} onOpenChange={setEventPickerOpen}>
                  <PopoverTrigger asChild>
                    <button
                      id="card-event"
                      type="button"
                      className="border-input dark:bg-input/30 dark:hover:bg-input/50 flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none"
                    >
                      <span className={form.event_id ? "text-white truncate" : "text-[#7DD8E8]"}>
                        {form.event_id
                          ? eventsById.get(form.event_id)?.name ?? "Selected event"
                          : "Select an event…"}
                      </span>
                      <ChevronsUpDown className="size-4 text-[#7DD8E8] shrink-0" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <div className="p-2 border-b border-white/10">
                      <Input
                        autoFocus
                        placeholder="Search events…"
                        value={eventSearch}
                        onChange={(e) => setEventSearch(e.target.value)}
                      />
                    </div>
                    <div className="max-h-56 overflow-y-auto p-1">
                      {form.event_id && (
                        <button
                          type="button"
                          className="w-full flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-red-400 hover:bg-white/5 text-left"
                          onClick={() => {
                            setForm((p) => ({ ...p, event_id: "" }))
                            setEventPickerOpen(false)
                          }}
                        >
                          <X className="size-3.5" />
                          Clear selection
                        </button>
                      )}
                      {filteredEvents.length === 0 && (
                        <p className="text-xs text-[#7A7978] px-2 py-3 text-center">No events found</p>
                      )}
                      {filteredEvents.map((event) => (
                        <button
                          key={event.id}
                          type="button"
                          className={`w-full rounded-sm px-2 py-1.5 text-sm text-left truncate hover:bg-white/5 ${
                            event.id === form.event_id ? "bg-[#59FFA0]/10 text-[#59FFA0]" : "text-white"
                          }`}
                          onClick={() => {
                            setForm((p) => ({ ...p, event_id: event.id }))
                            setEventPickerOpen(false)
                          }}
                        >
                          {event.name}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {form.type === "deal" && (
              <div className="space-y-1.5">
                <Label htmlFor="card-promo-code">Promo Code</Label>
                <Input
                  id="card-promo-code"
                  placeholder="FREE10PM"
                  value={form.promo_code}
                  onChange={(e) => setForm((p) => ({ ...p, promo_code: e.target.value.toUpperCase() }))}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="card-image">Image</Label>
              <Input id="card-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageFileSelect} />
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

            <div className="space-y-1.5">
              <Label htmlFor="card-order">Display Order</Label>
              <Input
                id="card-order"
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
                <Label htmlFor="card-starts">Starts At (optional)</Label>
                <Input
                  id="card-starts"
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => setForm((p) => ({ ...p, starts_at: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="card-ends">Ends At (optional)</Label>
                <Input
                  id="card-ends"
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(e) => setForm((p) => ({ ...p, ends_at: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="card-active">Active</Label>
                <Switch
                  id="card-active"
                  checked={form.active}
                  onCheckedChange={(checked) => setForm((p) => ({ ...p, active: checked }))}
                />
              </div>
              {prospectiveActiveCount > MAX_HOMEPAGE_CARDS && (
                <p className="text-xs text-amber-400 flex items-start gap-1.5">
                  <TriangleAlert className="size-3.5 shrink-0 mt-0.5" />
                  This will bring the active count to {prospectiveActiveCount}. Only the top{" "}
                  {MAX_HOMEPAGE_CARDS} by display order show on the homepage.
                </p>
              )}
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
