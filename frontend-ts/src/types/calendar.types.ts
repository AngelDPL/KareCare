export interface Calendar {

    "id": number
    "start_date_time": string
    "end_date_time": string
    "appointment_id": number
    "google_event_id": number | null
    "last_sync": string | null
    "business_id": number | null
    "created_at": string
    "updated_at": string
}