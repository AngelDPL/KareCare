import { Link, useNavigate } from "react-router-dom"
import { useApp } from "../context/AppContext"

const Navbar = () => {
    const { user, isAdmin, handleLogout } = useApp()
    const navigate = useNavigate()

    const onLogout = () => {
        handleLogout()
        navigate("/login")
    }

    return (
        <nav className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">

                <Link to="/dashboard" className="text-xl font-bold text-indigo-600">
                    KareCare
                </Link>

                <div className="flex items-center gap-6">
                    <Link to="/dashboard" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors">
                        Dashboard
                    </Link>
                    <Link to="/clients" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors">
                        Clientes
                    </Link>
                    <Link to="/appointments" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors">
                        Citas
                    </Link>
                    <Link to="/services" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors">
                        Servicios
                    </Link>
                    <Link to="/payments" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors">
                        Pagos
                    </Link>
                    {isAdmin() && (
                        <Link to="/admin" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors">
                            Admin
                        </Link>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">
                        {user?.username} · {isAdmin() ? "Admin" : "Empleado"}
                    </span>
                    <button
                        onClick={onLogout}
                        className="text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        Cerrar sesión
                    </button>
                </div>

            </div>
        </nav>
    )
}

export default Navbar