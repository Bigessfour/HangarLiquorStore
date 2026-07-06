export function jsonResponse(statusCode: number, body: unknown, extraHeaders?: Record<string, string>) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}

export function errorResponse(statusCode: number, message: string) {
  return jsonResponse(statusCode, { error: message });
}

export function redirectResponse(location: string) {
  return {
    statusCode: 302,
    headers: {
      Location: location,
      'Access-Control-Allow-Origin': '*',
    },
    body: '',
  };
}