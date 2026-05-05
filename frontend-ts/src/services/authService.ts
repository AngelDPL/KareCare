import { post } from "./api";
import type { User, Admin } from "../types"

export const loginAdmin = async (username: string, password: string): Promise<any> => {
    const data = await post("/admins/login", { username, password })
    localStorage.setItem("token", data.access_token)
    localStorage.setItem("user", JSON.stringify(data.admin))
    localStorage.setItem("userType", "admin")
    return data
}

export const loginUser = async (username: string, password: string): Promise<any> => {
    const data = await post("/users/login", { username, password })
    localStorage.setItem("token", data.access_token)
    localStorage.setItem("user", JSON.stringify(data.user))
    localStorage.setItem("userType", "user")
    return data
}

export const logout = (): void => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    localStorage.removeItem("userType")
}

export const getCurrentUser = (): User | Admin | null => {
    const user = localStorage.getItem("user")
    return user ? JSON.parse(user) : null
}

export const getUserType = (): string | null => {
    return localStorage.getItem("userType")
}

export const isAuthenticated = (): boolean => {
    return !!localStorage.getItem("token")
}

export const isAdmin = (): boolean => {
    return localStorage.getItem("userType") === "admin"
}