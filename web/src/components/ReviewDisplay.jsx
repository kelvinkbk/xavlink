import React from "react";

export function ReviewDisplay({ review, currentUserId, onEdit, onDelete }) {
  const isOwn = review.author.id === currentUserId;

  return (
    <div className="border rounded-lg p-4 mb-3">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          <img
            src={
              review.author.profilePic ||
              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect fill='%23e5e7eb' width='40' height='40'/%3E%3Ctext x='50%25' y='50%25' font-size='20' fill='%239ca3af' dominant-baseline='middle' text-anchor='middle'%3E👤%3C/text%3E%3C/svg%3E"
            }
            alt={review.author.name}
            className="w-10 h-10 rounded-full object-cover"
            onError={(e) => {
              e.target.src =
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect fill='%23e5e7eb' width='40' height='40'/%3E%3Ctext x='50%25' y='50%25' font-size='20' fill='%239ca3af' dominant-baseline='middle' text-anchor='middle'%3E👤%3C/text%3E%3C/svg%3E";
            }}
          />
          <div>
            <p className="font-semibold text-gray-900">{review.author.name}</p>
            <p className="text-sm text-gray-500">
              {new Date(review.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Actions */}
        {isOwn && (
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(review)}
              className="text-sm px-3 py-1 text-blue-600 hover:bg-blue-50 rounded"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(review.id)}
              className="text-sm px-3 py-1 text-red-600 hover:bg-red-50 rounded"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Rating */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex text-yellow-400">
          {[...Array(5)].map((_, i) => (
            <span key={i}>{i < review.rating ? "★" : "☆"}</span>
          ))}
        </div>
        <span className="text-sm font-semibold text-gray-700">
          {review.rating}/5
        </span>
      </div>

      {/* Comment */}
      {review.comment && (
        <p className="text-gray-700 text-sm">{review.comment}</p>
      )}
    </div>
  );
}
