import { post } from "./api"

export const loginAdmin = async (username, password) => {
    const data = await post("/admins/login", { username, password })
    localStorage.setItem("token", data.access_token)
    localStorage.setItem("user", JSON.stringify(data.admin))
    localStorage.setItem("userType", "admin")
    return data
}

export const loginUser = async (username, password) => {
    const data = await post("/users/login", { username, password })
    localStorage.setItem("token", data.access_token)
    localStorage.setItem("user", JSON.stringify(data.user))
    localStorage.setItem("userType", "user")
    return data
}

export const logout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    localStorage.removeItem("userType")
}

export const getCurrentUser = () => {
    const user = localStorage.getItem("user")
    return user ? JSON.parse(user) : null
}

export const getUserType = () => {
    return localStorage.getItem("userType")
}

export const isAuthenticated = () => {
    return !!localStorage.getItem("token")
}

export const isAdmin = () => {
    return localStorage.getItem("userType") === "admin"
}