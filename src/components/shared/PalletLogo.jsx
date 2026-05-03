export default function PalletLogo({ size = 48, color = '#F5A623' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <rect x="4"  y="10" width="56" height="8"  rx="2" fill={color} opacity="0.9"/>
      <rect x="4"  y="24" width="56" height="8"  rx="2" fill={color} opacity="0.9"/>
      <rect x="4"  y="38" width="56" height="8"  rx="2" fill={color} opacity="0.9"/>
      <rect x="6"  y="46" width="10" height="10" rx="2" fill={color} opacity="0.55"/>
      <rect x="27" y="46" width="10" height="10" rx="2" fill={color} opacity="0.55"/>
      <rect x="48" y="46" width="10" height="10" rx="2" fill={color} opacity="0.55"/>
      <rect x="10" y="10" width="6"  height="36" rx="1" fill={color} opacity="0.2"/>
      <rect x="29" y="10" width="6"  height="36" rx="1" fill={color} opacity="0.2"/>
      <rect x="48" y="10" width="6"  height="36" rx="1" fill={color} opacity="0.2"/>
    </svg>
  )
}
