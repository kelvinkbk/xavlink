import React, { createContext, useContext, useState } from "react";

const FABVisibilityContext = createContext();

export const useFABVisibility = () => {
  const context = useContext(FABVisibilityContext);
  if (!context) {
    throw new Error(
      "useFABVisibility must be used within FABVisibilityProvider",
    );
  }
  return context;
};

export const FABVisibilityProvider = ({ children }) => {
  const [isVisible, setIsVisible] = useState(true);

  return (
    <FABVisibilityContext.Provider value={{ isVisible, setIsVisible }}>
      {children}
    </FABVisibilityContext.Provider>
  );
};
