import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { chatService } from "../services/chatService";
import { socket } from "../services/socket";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "../components/LoadingSpinner";

export default function ChatListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    // Listen for new messages
    socket.on("receive_message", (message) => {
      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat.id === message.chatId
            ? {
                ...chat,
                messages: [message],
              }
            : chat
        )
      );
    });

    return () => {
      socket.off("receive_message");
    };
  }, []);

  const loadChats = async () => {
    try {
      const data = await chatService.getUserChats();
      setChats(data);
    } catch (error) {
      console.error("Failed to load chats:", error);
    } finally {
      setLoading(false);
    }
  };

  const getChatName = (chat) => {
    if (chat.name) return chat.name;
    const otherParticipant = chat.participants.find(
      (p) => p.user.id !== user.id
    );
    return otherParticipant?.user.name || "Unknown";
  };

  const getChatAvatar = (chat) => {
    const otherParticipant = chat.participants.find(
      (p) => p.user.id !== user.id
    );
    return otherParticipant?.user.profilePic || null;
  };

  const getLastMessage = (chat) => {
    return chat.messages[0]?.text || "No messages yet";
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return "now";
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Messages</h1>
        <button
          onClick={() => navigate("/discover")}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          New Chat
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md divide-y divide-gray-200 dark:divide-gray-700">
        {chats.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No chats yet. Start a conversation!
          </div>
        ) : (
          chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => navigate(`/chat/${chat.id}`)}
              className="p-4 cursor-pointer flex items-center gap-4 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="relative">
                {getChatAvatar(chat) ? (
                  <img
                    src={getChatAvatar(chat)}
                    alt={getChatName(chat)}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                    {getChatName(chat).charAt(0).toUpperCase()}
                  </div>
                )}
                {chat.participants.length > 2 && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gray-600 dark:bg-gray-400 rounded-full flex items-center justify-center text-xs text-white">
                    {chat.participants.length}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                    {getChatName(chat)}
                  </h3>
                  {chat.messages[0] && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      {formatTime(chat.messages[0].timestamp)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                  {getLastMessage(chat)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
