import { useEffect } from "react";
import { Link } from "react-router-dom";
import PageTransition from "../components/PageTransition";

function NotFound() {
  useEffect(() => {
    // Set proper 404 status code via meta tag (for static hosting)
    const metaTag = document.createElement("meta");
    metaTag.httpEquiv = "status";
    metaTag.content = "404 Not Found";
    document.head.appendChild(metaTag);

    // Update page metadata
    document.title = "404 - Page Not Found | XavLink";

    return () => {
      document.head.removeChild(metaTag);
    };
  }, []);

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-primary to-secondary flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          {/* 404 Animation */}
          <div className="mb-8 relative">
            <h1 className="text-9xl font-bold text-white opacity-20 absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 top-1/2">
              404
            </h1>
            <div className="relative z-10">
              <svg
                className="w-32 h-32 mx-auto text-white mb-4 animate-bounce"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>

          {/* Content */}
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Page Not Found
          </h2>
          <p className="text-white/80 text-lg mb-8">
            Oops! The page you're looking for doesn't exist or has been moved.
          </p>

          {/* Quick Links */}
          <div className="space-y-3 mb-8">
            <p className="text-white/70 font-semibold text-sm">
              Where would you like to go?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/home"
                className="px-4 py-3 bg-white text-primary font-semibold rounded-lg hover:bg-gray-100 transition text-sm"
              >
                🏠 Home
              </Link>
              <Link
                to="/discover"
                className="px-4 py-3 bg-white text-primary font-semibold rounded-lg hover:bg-gray-100 transition text-sm"
              >
                🔍 Discover
              </Link>
              <Link
                to="/skills"
                className="px-4 py-3 bg-white text-primary font-semibold rounded-lg hover:bg-gray-100 transition text-sm"
              >
                ⭐ Skills
              </Link>
              <Link
                to="/profile"
                className="px-4 py-3 bg-white text-primary font-semibold rounded-lg hover:bg-gray-100 transition text-sm"
              >
                👤 Profile
              </Link>
            </div>
          </div>

          {/* Support */}
          <p className="text-white/70 text-sm">
            Need help?{" "}
            <a
              href="mailto:support@xavlink.app"
              className="text-white font-semibold hover:underline"
            >
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </PageTransition>
  );
}

export default NotFound;
