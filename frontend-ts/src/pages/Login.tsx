import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useApp } from "../context/AppContext"
import { loginAdmin, loginUser } from "../services/authService"

const Login = () => {

    const [username, setUsername] = useState<string>("")
    const [password, setPassword] = useState<string>("")
    const [userType, setUserType] = useState<"user" | "admin">("user")
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState<boolean>(false)

    const { handleLogin } = useApp()
    const navigate = useNavigate()


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
            }
            navigate("/dashboard")
        } catch (err: any) {
            setError(err.error || "Error al iniciar sesión")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-indigo-600">KareCare</h1>
                    <p className="text-gray-500 mt-1">Gestión de clínica dental</p>
                </div>

                <div className="flex rounded-lg overflow-hidden border border-gray-200 mb-6">
                    <button
                        onClick={() => setUserType("user")}
                        className={`flex-1 py-2 text-sm font-medium transition-colors ${userType === "user"
                            ? "bg-indigo-600 text-white"
                            : "bg-white text-gray-500 hover:bg-gray-50"
                            }`}
                    >
                        Empleado
                    </button>
                    <button
                        onClick={() => setUserType("admin")}
                        className={`flex-1 py-2 text-sm font-medium transition-colors ${userType === "admin"
                            ? "bg-indigo-600 text-white"
                            : "bg-white text-gray-500 hover:bg-gray-50"
                            }`}
                    >
                        Administrador
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Usuario
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            placeholder="Introduce tu usuario"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Contraseña
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            placeholder="Introduce tu contraseña"
                            required
                        />
                    </div>

                    {error && (
                        <p className="text-red-500 text-sm text-center">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                        {loading ? "Iniciando sesión..." : "Iniciar sesión"}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default Login