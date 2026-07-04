import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import type { CreateLocalEventInput } from '../../shared/types/forecast';
import { createLocalEvent, deleteLocalEvent, getLocalEvents } from './lib/dynamodb';
import { getActiveStaticHolidays } from './lib/event-multiplier';
import { errorResponse, jsonResponse } from './lib/response';

function validateCreateEventInput(body: unknown): CreateLocalEventInput {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be a JSON object');
  }

  const input = body as Record<string, unknown>;
  const name = String(input.name ?? '').trim();
  const startDate = String(input.startDate ?? '');
  const endDate = String(input.endDate ?? '');
  const multiplier = Number(input.multiplier);
  const notes = input.notes ? String(input.notes) : undefined;

  if (name.length < 3) throw new Error('Event name must be at least 3 characters');
  if (!startDate || !endDate) throw new Error('Start and end dates are required');
  if (endDate < startDate) throw new Error('End date must be on or after start date');
  if (!Number.isFinite(multiplier) || multiplier < 0.5 || multiplier > 5) {
    throw new Error('Multiplier must be between 0.5 and 5');
  }

  return { name, startDate, endDate, multiplier, notes };
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const method = event.requestContext.http.method;

  if (method === 'OPTIONS') {
    return jsonResponse(200, {});
  }

  try {
    if (method === 'GET') {
      const [localEvents, staticHolidays] = await Promise.all([
        getLocalEvents(),
        Promise.resolve(
          getActiveStaticHolidays(
            new Date().toISOString().slice(0, 10),
            new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          ),
        ),
      ]);

      return jsonResponse(200, { localEvents, staticHolidays });
    }

    if (method === 'POST') {
      const parsed = validateCreateEventInput(JSON.parse(event.body ?? '{}'));
      const created = await createLocalEvent(parsed);
      return jsonResponse(201, created);
    }

    if (method === 'DELETE') {
      const eventId = event.pathParameters?.id;
      if (!eventId) return errorResponse(400, 'Event id is required');
      await deleteLocalEvent(eventId);
      return jsonResponse(204, {});
    }

    return errorResponse(405, `Method ${method} not allowed`);
  } catch (error) {
    console.error('manage-events error', error);
    const message = error instanceof Error ? error.message : 'Failed to manage events';
    const statusCode = message.includes('must') || message.includes('required') ? 400 : 500;
    return errorResponse(statusCode, message);
  }
};