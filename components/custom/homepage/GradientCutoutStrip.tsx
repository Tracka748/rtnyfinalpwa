interface GradientCutoutStripProps {
  label: string
}

export default function GradientCutoutStrip({ label }: GradientCutoutStripProps) {
  return (
    <h2 className="text-xl font-bold text-text-primary">
      {label.toUpperCase()}
    </h2>
  )
}
