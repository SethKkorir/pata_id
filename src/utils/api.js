const API_URL = 'http://localhost:5000/api';

const getHeaders = () => {
    const user = JSON.parse(localStorage.getItem('pataid_user'));
    const headers = {
        'Content-Type': 'application/json',
    };
    if (user && user.token) {
        headers['Authorization'] = 'Bearer ' + user.token;
    }
    return headers;
};

// Generic request handler
const request = async (endpoint, options = {}) => {
    console.log('?? API [' + (options.method || 'GET') + '] ' + endpoint, options.body ? 'with body' : '');

    const headers = getHeaders();
    console.log('?? Sending token: ' + (headers['Authorization'] ? headers['Authorization'].substring(0, 20) + '...' : 'None'));

    const config = {
        ...options,
        credentials: 'include',
        headers: {
            ...headers,
            ...options.headers,
        },
    };

    const response = await fetch(API_URL + endpoint, config);
    const data = await response.json();

    if (!response.ok || data.success === false) {
        throw new Error(data.error || data.message || 'Something went wrong');
    }

    return data;
};

export const api = {
    get: (endpoint) => request(endpoint, { method: 'GET' }),
    post: (endpoint, body) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
    put: (endpoint, body) => request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
    upload: async (endpoint, formData) => {
        const user = JSON.parse(localStorage.getItem('pataid_user'));
        const headers = {};
        if (user && user.token) {
            headers['Authorization'] = 'Bearer ' + user.token;
        }

        const response = await fetch(API_URL + endpoint, {
            method: 'POST',
            credentials: 'include',
            headers,
            body: formData,
        });
        const data = await response.json();
        if (!response.ok) {
            const errorMessage = data.errors
                ? data.errors.map(e => e.message || e.msg).join(', ')
                : (data.error || 'Upload failed');
            throw new Error(errorMessage);
        }
        return data;
    }
};
