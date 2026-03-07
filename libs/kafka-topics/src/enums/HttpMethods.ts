export enum HttpMethods {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
}

export function HttpMethod(method: string): HttpMethods {
  switch (method.toUpperCase()) {
    case 'GET':
      return HttpMethods.GET;
    case 'POST':
      return HttpMethods.POST;
    case 'PUT':
      return HttpMethods.PUT;
    case 'DELETE':
      return HttpMethods.DELETE;
    case 'PATCH':
      return HttpMethods.PATCH;
    default:
      throw new Error(`Unsupported HTTP method: ${method}`);
  }
}
