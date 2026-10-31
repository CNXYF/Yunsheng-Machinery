/* 从 R2 按对象键读取媒体，禁止目录遍历并返回正确 MIME 类型。 */
export async function onRequestGet({ params, env }) {
  const key = String(params.key || "");
  if (!/^[0-9a-f-]+\.(jpg|png|webp|gif|mp4|webm|ogv)$/i.test(key)) return new Response("Not found", { status: 404 });
  const object = await env.MEDIA.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("x-content-type-options", "nosniff");
  return new Response(object.body, { headers });
}
