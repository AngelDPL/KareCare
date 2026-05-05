import type { Calendar } from "./calendar.types"

type AppointmentStatus = "pending" | "confirmed" | "cancelled" | "completed"

export interface Appointment {
    id: number
    user_id: number
    user_name: string | null 
    client_id: number
    client_name: string | null
    client_email: string | null
    service_id: number
    service_name: string | null
    date_time: string
    status: AppointmentStatus
    calendar: Calendar | null
    created_at: string
    updated_at: string
}