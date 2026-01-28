export default function SailsLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      className={className}
      fill="currentColor"
    >
      {/* Main sail */}
      <path d="M50 8 L50 75 L15 75 Z" />
      {/* Small sail */}
      <path d="M50 20 L50 60 L70 60 Z" />
      {/* Hull */}
      <path d="M10 78 Q15 90 50 90 Q85 90 90 78 L10 78 Z" />
    </svg>
  );
}
