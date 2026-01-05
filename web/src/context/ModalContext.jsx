import { createContext, useState, useContext } from "react";

const ModalContext = createContext();

export const ModalProvider = ({ children }) => {
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [showAddSkillModal, setShowAddSkillModal] = useState(false);

  const value = {
    showCreatePostModal,
    setShowCreatePostModal,
    showAddSkillModal,
    setShowAddSkillModal,
  };

  return (
    <ModalContext.Provider value={value}>{children}</ModalContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within ModalProvider");
  }
  return context;
};
