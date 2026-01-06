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
    <div className="flex gap-2 items-center flex-wrap mt-2">
      {Object.entries(reactions).map(([emoji, count]) => (
        <button
          key={emoji}
          onClick={() => handleReact(emoji)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-full text-sm border border-gray-300 dark:border-gray-600 shrink-0"
        >
          <span className="text-base leading-none">{emoji}</span>
          <span className="text-xs text-gray-600 dark:text-gray-300 font-semibold leading-none">
            {count}
          </span>
        </button>
      ))}

      <div className="relative shrink-0">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="text-xl hover:scale-110 transition p-1.5 hover:bg-gray-100 rounded-full dark:hover:bg-gray-700 leading-none"
          title="Add reaction"
        >
          😊
        </button>

        {showPicker && (
          <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl p-3 grid grid-cols-4 gap-2 z-50 min-w-[140px]">
            {EMOJI_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className="text-2xl hover:scale-125 transition p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center justify-center leading-none"
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
