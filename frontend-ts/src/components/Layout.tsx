import { useLocation, Link } from "react-router-dom"
import { useApp } from "../context/AppContext"
import Navbar from "./Navbar"
import { useState } from "react"

interface LayoutProps {
    children: React.ReactNode
}

interface NavItemProps {
    to: string
    label: string
    icon: string
    active: boolean
    onClick?: () => void
}

const NavItem = ({ to, label, icon, active, onClick }: NavItemProps) => (
    <Link
        to={to}
        onClick={onClick}
        className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${active
                ? "bg-indigo-950 text-indigo-300"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
    >
        <i className={`ti ${icon} text-base`} aria-hidden="true" />
        {label}
    </Link>
)

const Layout = ({ children }: LayoutProps) => {
    const location = useLocation()
    const { isAdmin } = useApp()
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(false)

    const isActive = (path: string): boolean => location.pathname === path
    const closeSidebar = () => setSidebarOpen(false)

    return (
        <div className="flex flex-col min-h-screen bg-[#0f1117] text-slate-200">

            <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
                
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 lg:hidden"
                    onClick={closeSidebar}
                />
            )}

            <div className="flex flex-1">

                <aside className={`
                    fixed lg:sticky top-14 z-40
                    h-[calc(100vh-56px)] w-52
                    bg-[#161b27] border-r border-slate-700
                    p-3 flex flex-col gap-1 shrink-0
                    transition-transform duration-300
                    ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
                `}>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest px-2 mb-1 mt-1">
                        Main
                    </p>
                    <NavItem to="/appointments" label="Appointments" icon="ti-calendar" active={isActive("/appointments")} onClick={closeSidebar} />
                    <NavItem to="/clients" label="Clients" icon="ti-users" active={isActive("/clients")} onClick={closeSidebar} />
                    <NavItem to="/payments" label="Payments" icon="ti-credit-card" active={isActive("/payments")} onClick={closeSidebar} />
                    <NavItem to="/budgets" label="Budgets" icon="ti-file-description" active={isActive("/budgets")} onClick={closeSidebar} />

                    {isAdmin() && (
                        <>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest px-2 mb-1 mt-3">
                                Admin
                            </p>
                            <NavItem to="/dashboard" label="Dashboard" icon="ti-layout-dashboard" active={isActive("/dashboard")} onClick={closeSidebar} />
                            <NavItem to="/services" label="Services" icon="ti-tool" active={isActive("/services")} onClick={closeSidebar} />
                            <NavItem to="/management" label="Management" icon="ti-building" active={isActive("/management")} onClick={closeSidebar} />
                        </>
                    )}
                </aside>

                <main className="flex-1 p-4 lg:p-7 overflow-y-auto min-w-0">
                    {children}
                </main>
            </div>
        </div>
    )
}

export default Layout