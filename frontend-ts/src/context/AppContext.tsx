import { createContext, useContext, useState, useEffect } from "react"
import type { User, Admin } from "../types"
import { getCurrentUser, getUserType, isAuthenticated, logout } from "../services/authService"

type UserType = "admin" | "user" | null

interface AppContextType {
    user: User | Admin | null
    userType: UserType
    loading: boolean
    isAdmin: () => boolean
    handleLogin: (userData: User | Admin, type: UserType) => void
    handleLogout: () => void
}

interface AppProviderProps {
    children: React.ReactNode
}

const AppContext = createContext<AppContextType | null>(null)

export const AppProvider = ({ children }: AppProviderProps) => {

    const [user, setUser] = useState<User | Admin | null>(null)
    const [userType, setUserType] = useState<UserType>(null)
    const [loading, setLoading] = useState<boolean>(true)


    const handleLogin = (userData: User | Admin, type: UserType): void => {
        setUser(userData)
        setUserType(type)
    }

    const handleLogout = (): void => {
        logout()
        setUser(null)
        setUserType(null)
    }

    const isAdmin = (): boolean => userType === "admin"

    useEffect(() => {
        if (isAuthenticated()) {
            setUser(getCurrentUser())
            setUserType(getUserType() as "admin" | "user" | null)
        }
        setLoading(false)
    }, [])

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

export const useApp = () => {
    const context = useContext(AppContext)
    if (!context) throw new Error("useApp must be used within AppProvider")
    return context
}

export default AppContext