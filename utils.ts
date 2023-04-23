import "https://deno.land/std@0.182.0/dotenv/load.ts";

if (!Deno.env.get("BOT_TOKEN")) {
    throw new Error("BOT_TOKEN environment variable must be set");
}

const botToken = Deno.env.get("BOT_TOKEN")!;

export async function makeAuthenticatedRequest(path: string, method: string, body: any) {
    return await fetch(`https://discord.com/api/v10${path}`, {
        method,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bot ${botToken}`,
        },
        body: JSON.stringify(body),
    });
}