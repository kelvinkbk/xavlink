export default function LoadingSpinner({ size = "md" }) {
  const sizeClass = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  }[size];

  return (
    <div
      className={`${sizeClass} border-4 border-gray-300 border-t-primary rounded-full animate-spin`}
    />
  );
}
