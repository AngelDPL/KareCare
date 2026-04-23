import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AppProvider, useApp } from "./context/AppContext"
import Navbar from "./components/Navbar"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Clients from "./pages/Clients"
import Appointments from "./pages/Appointments"
import Services from "./pages/Services"
import Payments from "./pages/Payments"
import Management from "./pages/Management"

const PrivateRoute = ({ children }) => {
    const { user } = useApp()
    return user ? children : <Navigate to="/login" />
}

const PublicRoute = ({ children }) => {
    const { user } = useApp()
    return !user ? children : <Navigate to="/dashboard" />
}

function AppContent() {
    const { user } = useApp()

    return (
        <BrowserRouter>
            {user && <Navbar />}
            <Routes>
                <Route path="/login" element={
                    <PublicRoute><Login /></PublicRoute>
                } />
                <Route path="/dashboard" element={
                    <PrivateRoute><Dashboard /></PrivateRoute>
                } />
                <Route path="/clients" element={
                    <PrivateRoute><Clients /></PrivateRoute>
                } />
                <Route path="/appointments" element={
                    <PrivateRoute><Appointments /></PrivateRoute>
                } />
                <Route path="/services" element={
                    <PrivateRoute><Services /></PrivateRoute>
                } />
                <Route path="/payments" element={
                    <PrivateRoute><Payments /></PrivateRoute>
                } />
                <Route path="/management" element={
                    <PrivateRoute><Management /></PrivateRoute>
                } />
                <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
        </BrowserRouter>
    )
}

function App() {
    return (
        <AppProvider>
            <AppContent />
        </AppProvider>
    )
}

export default App