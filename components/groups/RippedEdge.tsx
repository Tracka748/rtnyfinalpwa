interface RippedEdgeProps {
  color?: string
  flip?: boolean
  height?: number
}

export default function RippedEdge({ color = '#59FFA0', flip = false, height = 40 }: RippedEdgeProps) {
  return (
    <div style={{ width: '100%', height: `${height}px`, overflow: 'hidden', lineHeight: 0, transform: flip ? 'scaleY(-1)' : undefined }}>
      <svg viewBox="0 0 390 40" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', display: 'block' }}>
        <path
          d="M0,40 L0,20 L13,6 L26,22 L39,4 L52,20 L65,8 L78,24 L91,4 L104,18 L117,6 L130,22 L143,4 L156,20 L169,8 L182,26 L195,4 L208,20 L221,6 L234,24 L247,4 L260,18 L273,8 L286,22 L299,4 L312,20 L325,6 L338,24 L351,4 L364,20 L377,8 L390,22 L390,40 Z"
          fill={color}
        />
      </svg>
    </div>
  )
}
