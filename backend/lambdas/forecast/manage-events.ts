import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { createLocalEvent, deleteLocalEvent, getLocalEvents } from './lib/dynamodb';
import { validateCreateEventInput } from './lib/event-validators';
import { getActiveStaticHolidays } from './lib/event-multiplier';
import { errorResponse, jsonResponse } from './lib/response';
import { callerHasManagerAccess, groupsFromApiGatewayEvent } from '../../shared/auth/roles';

function getCallerGroups(event: {
  requestContext?: { authorizer?: { jwt?: { claims?: Record<string, unknown> } } };
  headers?: Record<string, string | undefined>;
}): string[] {
  return groupsFromApiGatewayEvent(event);
}

function requireManager(groups: string[]) {
  if (!callerHasManagerAccess(groups)) {
    throw new Error('Manager role required');
  }
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
      requireManager(getCallerGroups(event));
      const parsed = validateCreateEventInput(JSON.parse(event.body ?? '{}'));
      const created = await createLocalEvent(parsed);
      return jsonResponse(201, created);
    }

    if (method === 'DELETE') {
      requireManager(getCallerGroups(event));
      const eventId = event.pathParameters?.id;
      if (!eventId) return errorResponse(400, 'Event id is required');
      await deleteLocalEvent(eventId);
      return jsonResponse(204, {});
    }

    return errorResponse(405, `Method ${method} not allowed`);
  } catch (error) {
    console.error('manage-events error', error);
    const message = error instanceof Error ? error.message : 'Failed to manage events';
    if (message.includes('Manager role required')) {
      return errorResponse(403, message);
    }
    const statusCode = message.includes('must') || message.includes('required') ? 400 : 500;
    return errorResponse(statusCode, message);
  }
};
