import { createContext, useContext, useState, useEffect } from "react"
import type { User, Admin } from "../types"

type UserType = "admin" | "user" | null

interface AppContextType {
    user: User | Admin | null
    userType: UserType
    loading: boolean
    isAdmin: () => boolean
    handleLogin: (userData: User | Admin, type: UserType) => void
    handleLogout: () => void
}

const AppContext = createContext<AppContextType | null>(null)