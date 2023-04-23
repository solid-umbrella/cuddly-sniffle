import "https://deno.land/std@0.182.0/dotenv/load.ts";
import { APIApplicationCommand } from "https://raw.githubusercontent.com/discordjs/discord-api-types/main/deno/v10.ts";

if (!Deno.env.get("APPLICATION_ID")) {
    throw new Error("APPLICATION_ID environment variable must be set");
}

if (!Deno.env.get("BOT_TOKEN")) {
    throw new Error("BOT_TOKEN environment variable must be set");
}

const applicationID = Deno.env.get("APPLICATION_ID")!;
const botToken = Deno.env.get("BOT_TOKEN")!;

async function createCommand(command: Omit<APIApplicationCommand, "id" | "application_id" | "version">) {
    const response = await fetch(`https://discord.com/api/v10/applications/${applicationID}/commands`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bot ${botToken}`,
        },
        body: JSON.stringify(command),
    });

    if (response.status >= 400) {
        console.error(await response.json());
    } else {
        console.log(`Command ${command.name} created`);
    }
}

await createCommand({
    name: "hello",
    description: "obligatory hello world command",
    type: 1,
    default_member_permissions: "0",
});