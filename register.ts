import "https://deno.land/std@0.182.0/dotenv/load.ts";
import { APIApplicationCommand, ApplicationCommandOptionType, ApplicationCommandType } from "https://raw.githubusercontent.com/discordjs/discord-api-types/main/deno/v10.ts";
import { makeAuthenticatedRequest } from "./utils.ts";

if (!Deno.env.get("APPLICATION_ID")) {
    throw new Error("APPLICATION_ID environment variable must be set");
}

const applicationID = Deno.env.get("APPLICATION_ID")!;

async function createCommand(command: Omit<APIApplicationCommand, "id" | "application_id" | "version">) {
    const response = await makeAuthenticatedRequest(`/applications/${applicationID}/commands`, "POST", command);

    if (response.status >= 400) {
        console.error(await response.json());
    } else {
        console.log(`Command ${command.name} created`);
    }
}

await createCommand({
    name: "hello",
    description: "obligatory hello world command",
    type: ApplicationCommandType.ChatInput,
    default_member_permissions: "0",
});

await createCommand({
    name: "newctf",
    description: "make a new ctf channel/roles",
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            name: "channelname",
            description: "Desired channel name",
            type: ApplicationCommandOptionType.String,
            required: true,
        },
        {
            name: "rolename",
            description: "Desired role name",
            type: ApplicationCommandOptionType.String,
            required: false,
        },
    ],
    default_member_permissions: "268435472",
});

await createCommand({
    name: "archivectf",
    description: "archive a ctf",
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            name: "channelname",
            description: "Channel to archive",
            type: ApplicationCommandOptionType.Channel,
            required: true,
        },
    ],
    default_member_permissions: "268435472",
});