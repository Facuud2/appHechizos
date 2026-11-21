export function BrandMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect
        width="40"
        height="40"
        rx="11"
        className="fill-accent-soft stroke-accent/30"
        strokeWidth="1.25"
      />
      <path
        d="M22.4 9.5C16.7 9.5 12 14.2 12 20C12 25.8 16.7 30.5 22.4 30.5C25.1 30.5 27.5 29.5 29.3 27.9C25.3 28.2 21.7 25.4 20.8 21.4C19.9 17.5 22.1 13.5 25.8 11.8C24.8 10.4 23.6 9.5 22.4 9.5Z"
        className="fill-accent"
      />
      <path
        d="M27.5 9L28.4 11.5L30.8 12.4L28.4 13.3L27.5 15.8L26.6 13.3L24.2 12.4L26.6 11.5L27.5 9Z"
        className="fill-ready"
      />
      <circle cx="27.5" cy="20" r="1.35" className="fill-ink/70" />
    </svg>
  );
}
