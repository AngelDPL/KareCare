import type { Note } from "./note.types"
import type { Payment } from "./payment.types"
import type { Appointment } from "./appointment.types"
import type { Service } from "./service.types"


export interface Client {
    id: number
    name: string
    address: string | null
    phone: string
    client_id_number: string
    client_dni: string
    email: string
    business_id: number
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface ClientFull extends Client {
    notes: Note[]
    payments: Payment[]
    appointments: Appointment[]
    services: Service[]
}