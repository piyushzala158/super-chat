export async function POST(request: Request) {
  const body = await request.json();
  return Response.json({
    generatedAt: Date.now(),
    report: body
  });
}
