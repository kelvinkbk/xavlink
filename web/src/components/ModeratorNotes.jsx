import React, { useState, useEffect } from "react";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import { enhancementService } from "../services/api";

export default function ModeratorNotes({ reportId }) {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadNotes = async () => {
    if (!reportId) return;

    try {
      setIsLoading(true);
      const data = await enhancementService.getModNotes(reportId);
      setNotes(data.notes || []);
    } catch (err) {
      setError("Failed to load moderator notes");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      setError("Note cannot be empty");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      const data = await enhancementService.addModNote({
        reportId,
        content: newNote,
      });
      setNotes([...notes, data.note]);
      setNewNote("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add note");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!reportId) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle
          size={20}
          className="text-yellow-600 flex-shrink-0 mt-0.5"
        />
        <p className="text-yellow-700">
          Select a report to view moderator notes
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Moderator Notes</h3>

      {isLoading ? (
        <p className="text-gray-500 text-center py-8">Loading notes...</p>
      ) : (
        <>
          {/* Notes List */}
          <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
            {notes.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No notes yet</p>
            ) : (
              notes.map((note) => (
                <div key={note.id} className="bg-gray-50 rounded p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-gray-700">{note.content}</p>
                      <p className="text-gray-500 text-xs mt-1">
                        {note.moderator?.name || "Moderator"} •{" "}
                        {new Date(note.createdAt).toLocaleDateString()} at{" "}
                        {new Date(note.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add Note */}
          <div className="border-t pt-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a moderator note..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) =>
                  e.key === "Enter" && !isSubmitting && handleAddNote()
                }
              />
              <button
                onClick={handleAddNote}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                <Plus size={18} />
                Add
              </button>
            </div>

            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </div>
        </>
      )}
    </div>
  );
}
