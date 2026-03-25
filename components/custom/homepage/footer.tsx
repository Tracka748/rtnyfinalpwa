export function Footer() {
  return (
    <footer className="border-t border-border bg-surface py-12">
      <div className="mx-auto max-w-[1200px] px-4">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#7DD8E8]">About</h4>
            <ul className="space-y-2 text-sm text-[#7DD8E8]">
              <li>
                <a href="#" className="transition-colors hover:text-accent-primary">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-accent-primary">
                  Rewards Program
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-accent-primary">
                  Safety & Family Info
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-accent-primary">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#7DD8E8]">For Business</h4>
            <ul className="space-y-2 text-sm text-[#7DD8E8]">
              <li>
                <a href="#" className="transition-colors hover:text-accent-primary">
                  List Your Venue
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-accent-primary">
                  Promoter Tools
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-accent-primary">
                  Advertising
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-accent-primary">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-border pt-8 text-center text-sm text-[#7DD8E8]">
          © 2025 RTNY • Rochester, NY
        </div>
      </div>
    </footer>
  )
}
