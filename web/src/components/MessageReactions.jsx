import { useState } from "react";

const EMOJI_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "👏"];

export default function MessageReactions({
  messageId,
  onReact,
  reactions = {},
}) {
  const [showPicker, setShowPicker] = useState(false);

  const handleReact = (emoji) => {
    onReact(messageId, emoji);
    setShowPicker(false);
  };

  return (
    <div className="flex gap-1 items-center flex-wrap mt-2">
      {Object.entries(reactions).map(([emoji, count]) => (
        <button
          key={emoji}
          onClick={() => handleReact(emoji)}
          className="flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded text-sm border border-gray-300 dark:border-gray-600"
        >
          <span className="text-base">{emoji}</span>
          <span className="text-xs text-gray-600 dark:text-gray-300 font-semibold">{count}</span>
        </button>
      ))}

      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="text-xl hover:scale-110 transition p-1 hover:bg-gray-100 rounded dark:hover:bg-gray-700"
          title="Add reaction"
        >
          😊
        </button>

        {showPicker && (
          <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg p-2 grid grid-cols-4 gap-1 z-50">
            {EMOJI_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className="text-2xl hover:scale-125 transition p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
