export default function AdminEventsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Live Events</h1>
          <p className="text-[#7DD8E8]">Manage published events on the platform</p>
        </div>
        <a
          href="/admin/events/create"
          className="px-4 py-2.5 bg-[#59FFA0] text-[#121113] font-header font-bold rounded-xl hover:bg-[#59FFA0]/90 transition-colors text-sm"
        >
          + Create Event
        </a>
      </div>

      <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-12 text-center">
        <div className="text-4xl mb-4">🚧</div>
        <p className="text-yellow-300 text-lg font-medium mb-2">Coming Soon</p>
        <p className="text-sm text-[#7DD8E8]">
          Live events management page is under development
        </p>
      </div>
    </div>
  )
}
