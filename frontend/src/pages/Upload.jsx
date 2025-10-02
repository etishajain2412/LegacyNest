import React, { useState } from "react";

export default function Upload({ user }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [date, setDate] = useState("");
  const [mediaType, setMediaType] = useState("text");
  const [file, setFile] = useState(null);

  async function handleSubmit() {
    if (!title || (!content && mediaType === "text") || !date) {
      alert("Please fill all required fields");
      return;
    }

    const formData = new FormData();
    formData.append("userId", user.id);
    formData.append("title", title);
    formData.append("content", content);
    formData.append("tags", tags);
    formData.append("date", date);
    formData.append("mediaType", mediaType);
    if (file) formData.append("file", file);

    try {
      const res = await fetch("http://localhost:5000/api/stories", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        alert("Story added!");
        setTitle("");
        setContent("");
        setTags("");
        setDate("");
        setFile(null);
        setMediaType("text");
      } else {
        alert("Error adding story");
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  }

  return (
    <div className="flex justify-center mt-12">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="flex flex-col gap-4 p-6 border rounded shadow w-1/2"
      >
        <h2 className="text-4xl font-serif font-bold text-gray-800 text-center">
          Upload New Story
        </h2>

        <input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="p-2 border rounded"
          required
        />

        <select
          value={mediaType}
          onChange={(e) => setMediaType(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="text">Text</option>
          <option value="photo">Photo</option>
          <option value="video">Video</option>
          <option value="audio">Audio</option>
        </select>

        {mediaType === "text" && (
          <textarea
            placeholder="Write your story..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            className="p-2 border rounded"
            required
          />
        )}

        {["photo", "video", "audio"].includes(mediaType) && (
          <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-200 hover:bg-gray-200 transition w-full text-center">
            <svg
              className="w-10 h-10 mb-2 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16V4m0 0L3 8m4-4l4 4m6 4v6m0 0l-4-4m4 4l4-4"
              />
            </svg>
            <span className="text-gray-500">
              {file ? file.name : `Drag & drop a ${mediaType} or click to select`}
            </span>
            <input
              type="file"
              accept={
                mediaType === "photo"
                  ? "image/*"
                  : mediaType === "video"
                    ? "video/*"
                    : "audio/*"
              }
              onChange={(e) => setFile(e.target.files[0])}
              className="hidden"
              required
            />
          </label>
        )}


        <input
          placeholder="Tags (comma separated)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="p-2 border rounded"
        />

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="p-2 border rounded"
          required
        />

        <button type="submit" className="p-2 bg-black text-white rounded">
          Add Story
        </button>
      </form>
    </div>
  );
}
