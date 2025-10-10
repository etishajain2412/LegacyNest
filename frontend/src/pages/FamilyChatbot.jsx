import React, { useState } from "react";

export default function FamilyChatbot({ user }) {
    const [messages, setMessages] = useState([
        { from: "bot", text: "👋 Hi! I'm your Family History Assistant. Ask me about your circles or members." },
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);

    const sendMessage = async () => {
        if (!input.trim()) return;

        const newMsg = { from: "user", text: input };
        setMessages((prev) => [...prev, newMsg]);
        setLoading(true);

        try {
            const res = await fetch("http://localhost:5000/api/chatbot", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user.id, question: input }),
            });
            const data = await res.json();

            setMessages((prev) => [
                ...prev,
                { from: "bot", text: data.response },
            ]);
        } catch {
            setMessages((prev) => [
                ...prev,
                { from: "bot", text: "⚠️ Sorry, something went wrong." },
            ]);
        }

        setInput("");
        setLoading(false);
    };

    return (
        <div className="max-w-3xl mx-auto mt-8 bg-white border-2 border-black rounded-xl shadow-lg flex flex-col">
            <div className="p-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 text-center font-serif">
                    Family History Chatbot
                </h2>
            </div>

            <div className="p-4 h-100% overflow-y-auto space-y-3">
                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"
                            }`}
                    >
                        <div
                            className={`px-4 py-2 rounded-2xl max-w-[80%] text-sm ${msg.from === "user"
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                        >
                            {msg.text}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="text-gray-400 text-sm italic">Bot is typing...</div>
                )}
            </div>

            <div className="flex border-t border-gray-200 p-3">
                <input
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                    placeholder="Ask about your family..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
                <button
                    onClick={sendMessage}
                    className="ml-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                >
                    Send
                </button>
            </div>
        </div>
    );
}
