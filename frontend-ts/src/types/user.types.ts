type UserRole = "master"| "manager" | "employee"

export interface User {
    id: number
    username: string
    business_id: number
    role: UserRole
    security_question: string
    is_active: boolean
    created_at: string
    updated_at: string
}