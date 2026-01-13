/* eslint-disable react-refresh/only-export-components */ import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import io from "socket.io-client";

const SocketContext = createContext();

const SOCKET_SERVER_URL =
  import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [socket] = useState(() => {
    // Initialize socket in lazy initializer to avoid setState in effect
    const newSocket = io(SOCKET_SERVER_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ["polling"],
    });
    return newSocket;
  });

  useEffect(() => {
    // Connection events
    const handleConnect = () => {
      console.log("✅ Socket.io connected:", socket.id);
      setIsConnected(true);

      // Notify server about user online status
      const userId = localStorage.getItem("userId");
      if (userId) {
        socket.emit("user_online", { userId });
      }
    };

    const handleDisconnect = () => {
      console.log("❌ Socket.io disconnected");
      setIsConnected(false);
    };

    const handleConnectError = (error) => {
      console.error("Socket connection error:", error);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.disconnect();
    };
  }, [socket]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
