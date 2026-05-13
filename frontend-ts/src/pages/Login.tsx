import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useApp } from "../context/AppContext"
import { loginAdmin, loginUser } from "../services/authService"
import { useSearchParams } from "react-router-dom"
import { useEffect } from "react"


const Login = () => {
    const [username, setUsername] = useState<string>("")
    const [password, setPassword] = useState<string>("")
    const [userType, setUserType] = useState<"user" | "admin">("user")
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState<boolean>(false)
    const [searchParams] = useSearchParams()
    const { handleLogout } = useApp()

    const { handleLogin } = useApp()
    const navigate = useNavigate()

    useEffect(() => {
        if (searchParams.get("new_user") === "true") {
            handleLogout()
        }
    }, [])

    const handleSubmit = async (e: React.SyntheticEvent) => {
        e.preventDefault()
        setError(null)
        setLoading(true)
        try {
            let data
            if (userType === "admin") {
                data = await loginAdmin(username, password)
                handleLogin(data.admin, "admin")
            } else {
                data = await loginUser(username, password)
                handleLogin(data.user, "user")

                if (data.user.first_login === true) {
                    navigate("/change-password")
                } else {
                    navigate("/appointments")
                }
            }
            if (userType === "admin") {
                navigate("/dashboard")
            } else {
                if (data.user.first_login) {
                    navigate("/change-password")
                } else {
                    navigate("/appointments")
                }
            }
        } catch (err: any) {
            setError(err.error || "Login error")
        } finally {
            setLoading(false)
        }
    }

    const inputClass = "w-full bg-[#161b27] border border-slate-700 text-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-600"

    return (
        <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
            <div className="w-full max-w-4xl grid lg:grid-cols-2 rounded-2xl overflow-hidden border border-slate-700">

                {/* LEFT PANEL */}
                <div className="hidden lg:flex flex-col justify-between bg-[#1e1b4b] p-12">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                            <i className="ti ti-plus text-white text-xl" aria-hidden="true" />
                        </div>
                        <span className="text-lg font-semibold text-white">
                            Kare<span className="text-indigo-300">Care</span>
                        </span>
                    </div>

                    <div className="flex flex-col gap-6 pt-12">
                        <div>
                            <h1 className="text-3xl font-semibold text-white leading-snug">
                                Dental clinic<br />
                                <span className="text-indigo-300">management</span><br />
                                made simple.
                            </h1>
                        </div>
                        <p className="text-sm text-indigo-200/60 leading-relaxed">
                            Manage your appointments, clients, payments and budgets from a single platform designed for modern dental clinics.
                        </p>
                        <div className="flex flex-col gap-3">
                            {["Appointment scheduling", "Client management", "Budget & payments", "Real-time dashboard"].map(f => (
                                <div key={f} className="flex items-center gap-3 text-sm text-indigo-300">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                                    {f}
                                </div>
                            ))}
                        </div>
                    </div>

                    <p className="text-xs text-indigo-200/30">KareCare · Dental clinic management</p>
                </div>

                {/* RIGHT PANEL */}
                <div className="bg-[#0f1117] p-8 lg:p-12 flex flex-col justify-center gap-8">
                    <div className="lg:hidden flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                            <i className="ti ti-plus text-white text-base" aria-hidden="true" />
                        </div>
                        <span className="text-base font-semibold text-white">
                            Kare<span className="text-indigo-300">Care</span>
                        </span>
                    </div>

                    <div>
                        <h2 className="text-xl font-semibold text-slate-200">Welcome back</h2>
                        <p className="text-sm text-slate-500 mt-1">Sign in to your account</p>
                    </div>

                    <div className="flex rounded-lg overflow-hidden border border-slate-700">
                        <button
                            onClick={() => setUserType("user")}
                            className={`flex-1 py-2 text-sm font-medium transition-colors ${userType === "user" ? "bg-indigo-600 text-white" : "bg-[#161b27] text-slate-400 hover:bg-slate-800"}`}
                        >
                            Employee
                        </button>
                        <button
                            onClick={() => setUserType("admin")}
                            className={`flex-1 py-2 text-sm font-medium transition-colors ${userType === "admin" ? "bg-indigo-600 text-white" : "bg-[#161b27] text-slate-400 hover:bg-slate-800"}`}
                        >
                            Administrator
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div>
                            <label className="block text-xs text-slate-500 mb-1.5">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className={inputClass}
                                placeholder="Enter your username"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-500 mb-1.5">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={inputClass}
                                placeholder="Enter your password"
                                required
                            />
                        </div>

                        {error && (
                            <p className="text-red-400 text-sm text-center">{error}</p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm mt-2"
                        >
                            {loading ? "Signing in..." : "Sign in"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default Login