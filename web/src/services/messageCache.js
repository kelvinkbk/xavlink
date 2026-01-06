// IndexedDB service for caching messages
const DB_NAME = "XavLinkDB";
const DB_VERSION = 1;
const STORE_NAME = "messages";

let db = null;

// Initialize IndexedDB
export const initMessageCache = () => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("❌ IndexedDB open error:", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.log("✅ IndexedDB initialized");
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "cacheKey" });
        store.createIndex("chatId", "chatId", { unique: false });
        store.createIndex("timestamp", "timestamp", { unique: false });
        console.log("✅ IndexedDB schema created");
      }
    };
  });
};

// Get cached messages for a chat
export const getCachedMessages = (chatId) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve([]);
      return;
    }

    try {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index("chatId");
      const request = index.getAll(chatId);

      request.onerror = () => {
        console.error("❌ Failed to get cached messages:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        const cached = request.result;
        const messages = (cached[0]?.messages || []).sort(
          (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
        );
        console.log(
          `📦 Retrieved ${messages.length} cached messages for chat ${chatId}`
        );
        resolve(messages);
      };
    } catch (error) {
      console.error("❌ IndexedDB error:", error);
      resolve([]);
    }
  });
};

// Cache messages for a chat
export const cacheMessages = (chatId, messages) => {
  return new Promise((resolve, reject) => {
    if (!db || !messages.length) {
      resolve();
      return;
    }

    try {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const cacheKey = `chat_${chatId}`;

      const request = store.put({
        cacheKey,
        chatId,
        messages,
        timestamp: Date.now(),
      });

      request.onerror = () => {
        console.error("❌ Failed to cache messages:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        console.log(`💾 Cached ${messages.length} messages for chat ${chatId}`);
        resolve();
      };
    } catch (error) {
      console.error("❌ IndexedDB error:", error);
      resolve(); // Don't fail if caching fails
    }
  });
};

// Clear cache for a specific chat
export const clearChatCache = (chatId) => {
  return new Promise((resolve) => {
    if (!db) {
      resolve();
      return;
    }

    try {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const cacheKey = `chat_${chatId}`;

      const request = store.delete(cacheKey);
      request.onsuccess = () => {
        console.log(`🗑️ Cleared cache for chat ${chatId}`);
        resolve();
      };

      request.onerror = () => {
        console.error("⚠️ Failed to clear cache:", request.error);
        resolve();
      };
    } catch (error) {
      console.error("❌ IndexedDB error:", error);
      resolve();
    }
  });
};

// Clear all cached messages
export const clearAllMessageCache = () => {
  return new Promise((resolve) => {
    if (!db) {
      resolve();
      return;
    }

    try {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log("🗑️ Cleared all message caches");
        resolve();
      };

      request.onerror = () => {
        console.error("⚠️ Failed to clear all caches:", request.error);
        resolve();
      };
    } catch (error) {
      console.error("❌ IndexedDB error:", error);
      resolve();
    }
  });
};

export default {
  initMessageCache,
  getCachedMessages,
  cacheMessages,
  clearChatCache,
  clearAllMessageCache,
};
