import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from "react-router-dom"
import { useApp } from "./context/AppContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Appointments from "./pages/Appointments";
import Services from "./pages/Services";
import Payments from "./pages/Payments";
import Management from "./pages/Management";
import Budgets from "./pages/Budgets";
import Layout from "./components/Layout";
import ChangePassword from "./pages/ChangePassword"


interface RouteProps {
    children: React.ReactNode
}

const PrivateLayout = ({ children }: RouteProps) => {
    const { user, loading } = useApp()
    if (loading) return null
    return user ? <Layout>{children}</Layout> : <Navigate to="/login" />
}

const AdminLayout = ({ children }: RouteProps) => {
    const { user, isAdmin, loading } = useApp()
    if (loading) return null
    return user && isAdmin() ? <Layout>{children}</Layout> : <Navigate to="/appointments" />
}

const PublicRoute = ({ children }: RouteProps) => {
    const { user, isAdmin, handleLogout, loading } = useApp()
    const [searchParams] = useSearchParams()
    if (loading) return null

    if (searchParams.get("new_user") === "true" && user) {
        handleLogout()
        return <>{children}</>
    }

    if (!user) return <>{children}</>

    if ((user as any).first_login) return <>{children}</>

    return <Navigate to={isAdmin() ? "/dashboard" : "/appointments"} />
}

const PrivateNoLayout = ({ children }: RouteProps) => {
    const { user, loading } = useApp()
    if (loading) return null
    return user ? <>{children}</> : <Navigate to="/login" />
}

const AppContent = () => {

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={
                    <PublicRoute><Login /></PublicRoute>
                } />
                <Route path="/dashboard" element={
                    <AdminLayout><Dashboard /></AdminLayout>
                } />
                <Route path="/clients" element={
                    <PrivateLayout><Clients /></PrivateLayout>
                } />
                <Route path="/appointments" element={
                    <PrivateLayout><Appointments /></PrivateLayout>
                } />
                <Route path="/services" element={
                    <AdminLayout><Services /></AdminLayout>
                } />
                <Route path="/payments" element={
                    <PrivateLayout><Payments /></PrivateLayout>
                } />
                <Route path="/management" element={
                    <AdminLayout><Management /></AdminLayout>
                } />
                <Route path="/budgets" element={
                    <PrivateLayout><Budgets /></PrivateLayout>
                } />
                <Route path="/change-password" element={
                    <PrivateNoLayout><ChangePassword /></PrivateNoLayout>
                } />
                <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
        </BrowserRouter>
    )
}

const App = () => {
    return (
        <AppContent />
    )
}

export default App