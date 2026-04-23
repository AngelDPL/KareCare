import { createContext, useContext, useState, useEffect } from "react"
import { getCurrentUser, getUserType, isAuthenticated, logout } from "../services/authService"

const AppContext = createContext()

export const AppProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [userType, setUserType] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (isAuthenticated()) {
            setUser(getCurrentUser())
            setUserType(getUserType())
        }
        setLoading(false)
    }, [])

    const handleLogin = (userData, type) => {
        setUser(userData)
        setUserType(type)
    }

    const handleLogout = () => {
        logout()
        setUser(null)
        setUserType(null)
    }

    const isAdmin = () => userType === "admin"

    return (
        <AppContext.Provider value={{
            user,
            userType,
            loading,
            isAdmin,
            handleLogin,
            handleLogout
        }}>
            {!loading && children}
        </AppContext.Provider>
    )
}

export const useApp = () => useContext(AppContext)

export default AppContext