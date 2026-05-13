export type UserRole = "master"| "manager" | "employee"

export interface User {
    id: number
    username: string
    email: string
    business_id: number
    role: UserRole
    first_login: boolean
    is_active: boolean
    created_at: string
    updated_at: string
}