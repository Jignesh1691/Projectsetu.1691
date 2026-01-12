"use client";

import { useState } from "react";

export function InviteForm() {
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("USER");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        try {
            const res = await fetch("/api/invites", {
                method: "POST",
                body: JSON.stringify({ email, role }),
                headers: { "Content-Type": "application/json" },
            });

            const data = await res.json();
            if (res.ok) {
                setMessage("Success! Invitation sent via Resend.");
                setEmail("");
            } else {
                setMessage(`Error: ${data.error}`);
            }
        } catch (err) {
            setMessage("Failed to send invite.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">User Email</label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    required
                    placeholder="colleague@example.com"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                </select>
            </div>
            {message && <p className={`text-sm ${message.startsWith("Error") ? "text-red-500" : "text-green-600"}`}>{message}</p>}
            <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 transition disabled:opacity-50"
            >
                {loading ? "Sending..." : "Send Invitation"}
            </button>
        </form>
    );
}
