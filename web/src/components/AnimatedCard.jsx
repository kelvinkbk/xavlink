export default function AnimatedCard({ children, delay = 0 }) {
  return (
    <div
      className="transition-all duration-400 hover:shadow-lg hover:-translate-y-1"
      style={{ animationDelay: `${delay * 100}ms` }}
    >
      {children}
    </div>
  );
}
