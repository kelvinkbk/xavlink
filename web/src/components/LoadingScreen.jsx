import React from "react";

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50 overflow-hidden">
      {/* Video Background */}
      <video
        autoPlay
        muted
        loop
        className="w-full h-full object-cover"
        src="/Loading_Animation_with_Floral_Swirls.mp4"
      >
        Your browser does not support the video tag.
      </video>

      {/* Optional: Overlay gradient for text visibility if needed */}
      <div className="absolute inset-0 bg-black bg-opacity-0"></div>
    </div>
  );
};

export default LoadingScreen;
