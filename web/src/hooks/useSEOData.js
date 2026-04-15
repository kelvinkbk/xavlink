import { useEffect } from "react";

/**
 * SEO Data Hook
 * Injects JSON-LD structured data for better search engine understanding
 */
export const useSEOData = (pageData) => {
  useEffect(() => {
    // Remove old script if exists
    const oldScript = document.querySelector(
      'script[type="application/ld+json"]',
    );
    if (oldScript) {
      oldScript.remove();
    }

    // Create structured data
    const structuredData = {
      "@context": "https://schema.org",
      "@type": pageData.type || "WebSite",
      ...pageData,
    };

    // Add script to head
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.innerHTML = JSON.stringify(structuredData);
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [pageData]);
};

/**
 * XavLink Organization Schema
 */
export const XAVLINK_ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "XavLink",
  url: "https://xavlink.app",
  description:
    "Campus community platform connecting students through skills, networking, and campus activities",
  logo: "https://xavlink.app/icon.png",
  image: "https://xavlink.app/icon.png",
  sameAs: [
    "https://www.facebook.com/xavlink",
    "https://twitter.com/xavlink",
    "https://instagram.com/xavlink",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "Support",
    email: "support@xavlink.app",
    url: "https://xavlink.app/support",
  },
  foundingDate: "2024",
  areaServed: "Global",
  knowsAbout: [
    "Campus Networking",
    "Student Community",
    "Skills Sharing",
    "Social Platform",
  ],
};

/**
 * Page-specific Schema definitions
 */
export const XAVLINK_SCHEMAS = {
  home: {
    type: "WebPage",
    name: "XavLink Campus Feed",
    description: "Connect with your campus community and see what's happening",
    url: "https://xavlink.app/home",
  },

  skills: {
    type: "WebPage",
    name: "Share & Discover Skills",
    description:
      "Share your skills and discover what others can teach you at XavLink",
    url: "https://xavlink.app/skills",
  },

  requests: {
    type: "WebPage",
    name: "Campus Requests",
    description: "Browse and create requests for campus help and assistance",
    url: "https://xavlink.app/requests",
  },

  discover: {
    type: "WebPage",
    name: "Discover People & Opportunities",
    description: "Find new people and opportunities in your campus community",
    url: "https://xavlink.app/discover",
  },

  profile: {
    type: "Person",
    name: "Profile",
    description: "Manage your XavLink profile and connections",
    url: "https://xavlink.app/profile",
  },

  notifications: {
    type: "WebPage",
    name: "Notifications",
    description: "Stay updated with all your XavLink notifications",
    url: "https://xavlink.app/notifications",
  },
};

/**
 * Add main organization schema to document head
 */
export const addOrganizationSchema = () => {
  // Remove existing schema
  const existing = document.querySelector(
    'script[type="application/ld+json"][data-schema="organization"]',
  );
  if (existing) {
    existing.remove();
  }

  // Add new schema
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.setAttribute("data-schema", "organization");
  script.innerHTML = JSON.stringify(XAVLINK_ORGANIZATION_SCHEMA);
  document.head.appendChild(script);
};

export default useSEOData;
