import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useApp } from "./context/AppContext";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Appointments from "./pages/Appointments";
import Services from "./pages/Services";
import Payments from "./pages/Payments";
import Management from "./pages/Management";
import Budgets from "./pages/Budgets";


interface RouteProps {
    children: React.ReactNode
}

const PrivateRoute = ({ children }: RouteProps) => {
    const { user } = useApp()
    return user ? children : <Navigate to="/login" />
}

const PublicRoute = ({ children }: RouteProps) => {
    const { user, isAdmin } = useApp()
    return !user ? children : <Navigate to={isAdmin() ? "/dashboard" : "/appointments"} />
}

const AdminRoute = ({ children }: RouteProps) => {
    const { user, isAdmin } = useApp()
    return user && isAdmin() ? children : <Navigate to="/appointments" />
}

const AppContent = () => {

    const { user } = useApp()

    return (
        <BrowserRouter>
            {user && <Navbar />}
            <Routes>
                <Route path="/login" element={
                    <PublicRoute><Login /></PublicRoute>
                } />
                <Route path="/dashboard" element={
                    <AdminRoute><Dashboard /></AdminRoute>
                } />
                <Route path="/clients" element={
                    <PrivateRoute><Clients /></PrivateRoute>
                } />
                <Route path="/appointments" element={
                    <PrivateRoute><Appointments /></PrivateRoute>
                } />
                <Route path="/services" element={
                    <AdminRoute><Services /></AdminRoute>
                } />
                <Route path="/payments" element={
                    <PrivateRoute><Payments /></PrivateRoute>
                } />
                <Route path="/management" element={
                    <AdminRoute><Management /></AdminRoute>
                } />
                <Route path="/budgets" element={
                    <PrivateRoute><Budgets /></PrivateRoute>
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