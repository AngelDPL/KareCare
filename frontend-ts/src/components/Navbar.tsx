import { Link, useNavigate } from "react-router-dom"
import { useApp } from "../context/AppContext"

interface NavbarProps {
    onMenuClick: () => void
}

const Navbar = ({ onMenuClick }: NavbarProps) => {
    const { user, isAdmin, handleLogout } = useApp()
    const navigate = useNavigate()

    const onLogout = (): void => {
        handleLogout()
        navigate("/login")
    }

    return (
        <nav className="h-14 bg-[#161b27] border-b border-slate-700 flex items-center px-4 lg:px-6 gap-4 sticky top-0 z-50 shrink-0">
            
            {/* Botón hamburguesa - solo móvil */}
            <button onClick={onMenuClick} className="lg:hidden text-slate-400 hover:text-slate-200">
                <i className="ti ti-menu-2 text-xl" aria-hidden="true" />
            </button>

            <Link to="/dashboard" className="text-base font-medium text-indigo-400 no-underline tracking-tight">
                Kare<span className="text-slate-200">Care</span>
            </Link>

            <div className="ml-auto flex items-center gap-3">
                <span className="hidden sm:block text-sm text-slate-400">{user?.username}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-950 text-green-400 border border-green-800">
                    {isAdmin() ? "Admin" : "Employee"}
                </span>
                <button
                    onClick={onLogout}
                    className="text-sm text-slate-400 border border-slate-700 px-3 py-1.5 rounded-md hover:bg-slate-800 hover:text-slate-200 transition-colors"
                >
                    Sign out
                </button>
            </div>
        </nav>
    )
}

export default Navbar