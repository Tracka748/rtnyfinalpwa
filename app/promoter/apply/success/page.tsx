// app/promoter/apply/success/page.tsx
import Link from 'next/link';

export default function ApplicationSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="container mx-auto px-4 max-w-2xl text-center">
        <div className="text-8xl mb-6">🎉</div>
        <h1 className="text-4xl font-bold mb-4">
          Application Submitted!
        </h1>
        <p className="text-xl text-secondary mb-8">
          We've received your promoter application. Our team will review it within 24-48 hours and send you an email with next steps.
        </p>
        
        <div className="bg-card border border-border rounded-2xl p-8 mb-8">
          <h2 className="text-xl font-bold mb-4">What happens next?</h2>
          <div className="space-y-4 text-left">
            <div className="flex gap-4">
              <span className="text-2xl">1️⃣</span>
              <div>
                <div className="font-semibold mb-1">Review</div>
                <div className="text-sm text-secondary">Our team reviews your application</div>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="text-2xl">2️⃣</span>
              <div>
                <div className="font-semibold mb-1">Approval</div>
                <div className="text-sm text-secondary">You'll receive an approval email</div>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="text-2xl">3️⃣</span>
              <div>
                <div className="font-semibold mb-1">Create Events</div>
                <div className="text-sm text-secondary">Access your promoter dashboard</div>
              </div>
            </div>
          </div>
        </div>

        <Link
          href="/events"
          className="inline-block px-8 py-4 bg-accent text-background rounded-full font-bold hover:bg-accent/90 transition-colors"
        >
          Browse Events
        </Link>
      </div>
    </div>
  );
}