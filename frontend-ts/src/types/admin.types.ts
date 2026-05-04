type AdminRole = "Admin"

export interface Admin {
    "id": number
    "username": string
    "role": AdminRole
    "is_active": boolean
    "created_at": string
    "updated_at": string
}