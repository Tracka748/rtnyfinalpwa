interface SuccessBannerProps {
  message: string;
  onDismiss?: () => void;
}

export function SuccessBanner({ message, onDismiss }: SuccessBannerProps) {
  return (
    <div className="mb-6 p-4 bg-[#59FFA0]/10 border border-[#59FFA0]/30 rounded-xl flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🎉</span>
        <p className="font-semibold text-[#59FFA0]">{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-[#7DD8E8] hover:text-white transition-colors"
          aria-label="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
}
