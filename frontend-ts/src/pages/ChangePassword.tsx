import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { put } from "../services/api"
import { useApp } from "../context/AppContext"

const ChangePassword = () => {

    const { user } = useApp()

    const [oldPassword, setOldPassword] = useState<string>("")
    const [newPassword, setNewPassword] = useState<string>("")
    const [confirm, setConfirm] = useState<string>("")
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)

    const navigate = useNavigate()

    const handleSubmit = async (e: React.SyntheticEvent) => {
        e.preventDefault()
        setError(null)

        if (newPassword !== confirm) {
            setError("Password do not match")
            return
        }

        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters")
            return
        }

        setLoading(true)
        try {
            await put(`/users/${user?.id}/change-password`, {
                old_password: oldPassword,
                new_password: newPassword
            })
            setSuccess(true)
            setTimeout(() => navigate("/appointments"), 3000)
        } catch (err: any) {
            setError(err.error || "Error changing password")
        } finally {
            setLoading(false)
        }
    }

    const inputClass = "w-full bg-[#161b27] border border-slate-700 text-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-600"

    return (
        <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#161b27] border border-slate-700 rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                        <i className="ti ti-plus text-white text-base" aria-hidden="true" />
                    </div>
                    <span className="text-base font-semibold text-white">
                        Kare<span className="text-indigo-300">Care</span>
                    </span>
                </div>

                {success ? (
                    <div className="text-center">
                        <div className="w-16 h-16 bg-green-900/30 border border-green-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i className="ti ti-check text-green-400 text-2xl" aria-hidden="true" />
                        </div>
                        <h2 className="text-lg font-medium text-slate-200 mb-2">Password changed</h2>
                        <p className="text-sm text-slate-400">Redirecting to your dashboard...</p>
                    </div>
                ) : (
                    <>
                        <h2 className="text-xl font-semibold text-slate-200 mb-1">Change password</h2>
                        <p className="text-sm text-slate-500 mb-8">Enter your current password and choose a new one</p>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <div>
                                <label className="block text-xs text-slate-500 mb-1.5">Current password</label>
                                <input
                                    type="password"
                                    value={oldPassword}
                                    onChange={(e) => setOldPassword(e.target.value)}
                                    className={inputClass}
                                    placeholder="Enter current password"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 mb-1.5">New password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className={inputClass}
                                    placeholder="Enter new password"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 mb-1.5">Confirm new password</label>
                                <input
                                    type="password"
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                    className={inputClass}
                                    placeholder="Repeat new password"
                                    required
                                />
                            </div>

                            {error && <p className="text-red-400 text-sm">{error}</p>}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm mt-2"
                            >
                                {loading ? "Saving..." : "Change password"}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    )
}

export default ChangePassword