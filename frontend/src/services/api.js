const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000/api"

const getHeaders = () => {
    const token = localStorage.getItem("token")
    return {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` })
    }
}


export const get = async (endpoint) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
        headers: getHeaders()
    })
    if (!response.ok) throw await response.json()
    return response.json()
}

export const post = async (endpoint, body) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body)
    })
    if (!response.ok) throw await response.json()
    return response.json()
}

export const put = async (endpoint, body) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(body)
    })
    if (!response.ok) throw await response.json()
    return response.json()
}

export const del = async (endpoint) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
        method: "DELETE",
        headers: getHeaders()
    })
    if (!response.ok) throw await response.json()
    return response.json()
}