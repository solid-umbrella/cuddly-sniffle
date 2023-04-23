import "https://deno.land/std@0.182.0/dotenv/load.ts";
import { sign } from "https://cdn.skypack.dev/tweetnacl@v1.0.3?dts";
import { json, serve, validateRequest } from "https://deno.land/x/sift@0.6.0/mod.ts";
import { APIInteraction, InteractionType, APIChatInputApplicationCommandInteractionData, InteractionResponseType, RESTPatchAPIGuildRolePositionsJSONBody, ChannelType, OverwriteType, APIInteractionResponseChannelMessageWithSource } from "https://raw.githubusercontent.com/discordjs/discord-api-types/main/deno/v10.ts";
import { APIInteractionResponse } from "https://raw.githubusercontent.com/discordjs/discord-api-types/main/deno/payloads/v10/mod.ts";
import { makeAuthenticatedRequest } from "./utils.ts";
import { APIApplicationCommandInteractionDataStringOption } from "https://raw.githubusercontent.com/discordjs/discord-api-types/main/deno/payloads/v10/_interactions/applicationCommands.ts";
import { RESTPostAPIGuildChannelJSONBody, RESTPostAPIGuildRoleJSONBody } from "https://raw.githubusercontent.com/discordjs/discord-api-types/main/deno/rest/v10/guild.ts";

// https://deno.com/deploy/docs/tutorial-discord-slash

const publicKey = Deno.env.get("PUBLIC_KEY");
if (!publicKey) {
    throw new Error("PUBLIC_KEY environment variable must be set");
}

const rolePositionStr = Deno.env.get("ROLE_POSITION");
if (!rolePositionStr) {
    throw new Error("ROLE_POSITION environment variable must be set");
}
const rolePosition = parseInt(rolePositionStr);
if (isNaN(rolePosition)) {
    throw new Error("ROLE_POSITION environment variable must be an integer");
}

export function hexToUint8Array(hex: string) {
    return new Uint8Array(hex.match(/.{1,2}/g)!.map((val) => parseInt(val, 16)));
}

export function generateErrorMessage(title: string, text: string): APIInteractionResponseChannelMessageWithSource {
    return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
            content: `An error occurred while ${title}`,
            embeds: [
                {
                    title: "Error",
                    description: text,
                    color: 0xff0000,
                },
            ],
        },
    };
}

serve({
    "/interaction": async request => {
        const { error } = await validateRequest(request, {
            POST: {
                headers: ["X-Signature-Ed25519", "X-Signature-Timestamp"],
            },
        });

        if (error) {
            return json({ error: error.message }, { status: error.status });
        }

        const body = await request.text();
        if (!sign.detached.verify(
            new TextEncoder().encode(request.headers.get("X-Signature-Timestamp")! + body),
            hexToUint8Array(request.headers.get("X-Signature-Ed25519")!),
            hexToUint8Array(publicKey),
        )) {
            return json({ error: "Invalid request signature" }, { status: 401 });
        }

        const interaction = JSON.parse(body) as APIInteraction;

        if (interaction.type === InteractionType.Ping) {
            return json({ type: 1 });
        }

        if (interaction.type === InteractionType.ApplicationCommand) {
            const data = interaction.data as APIChatInputApplicationCommandInteractionData;
            if (data.name === "hello") {
                const payload: APIInteractionResponse = {
                    type: InteractionResponseType.ChannelMessageWithSource,
                    data: {
                        content: "Hello, world!",
                    },
                };

                return json(payload);
            } else if (data.name === "newctf") {
                const rolename = (data.options!.find(option => option.name === "rolename") as APIApplicationCommandInteractionDataStringOption | undefined)?.value;
                const channelname = (data.options!.find(option => option.name === "channelname") as APIApplicationCommandInteractionDataStringOption | undefined)!.value;

                const rolePayload: RESTPostAPIGuildRoleJSONBody = {
                    name: rolename ?? channelname,
                    hoist: true,
                    mentionable: true,
                };
                const roleResponse = await makeAuthenticatedRequest(`/guilds/${interaction.guild_id}/roles`, "POST", rolePayload);

                if (roleResponse.status >= 400) {
                    return json(generateErrorMessage("creating role", await roleResponse.text()));
                }

                const { id } = await roleResponse.json();
                
                const positionPayload: RESTPatchAPIGuildRolePositionsJSONBody = [{ id, position: rolePosition }];
                const positionResponse = await makeAuthenticatedRequest(`/guilds/${interaction.guild_id}/roles/${id}/positions`, "PATCH", positionPayload);
                if (positionResponse.status >= 400) {
                    return json(generateErrorMessage("updating role position", await positionResponse.text()));
                }

                const channelPayload: RESTPostAPIGuildChannelJSONBody = {
                    name: channelname,
                    type: ChannelType.GuildText,
                    parent_id: Deno.env.get("CATEGORY_ID"),
                    permission_overwrites: [
                        {
                            id: interaction.guild_id!,
                            type: OverwriteType.Role,
                            allow: "0",
                            deny: "1024",
                        },
                        {
                            id,
                            type: OverwriteType.Role,
                            allow: "1024",
                            deny: "0",
                        },
                    ],
                };
                const channelResponse = await makeAuthenticatedRequest(`/guilds/${interaction.guild_id}/channels`, "POST", channelPayload);
                if (channelResponse.status >= 400) {
                    return json(generateErrorMessage("creating channel", await channelResponse.text()));
                }

                const payload: APIInteractionResponse = {
                    type: InteractionResponseType.ChannelMessageWithSource,
                    data: {
                        content: `Created role ${rolename ?? channelname} and channel ${channelname}`,
                    },
                };

                return json(payload);
            } else {
                return json({ error: "Unrecognized command" }, { status: 400 });
            }
        }

        return json({ error: "Unrecognized interaction type" }, { status: 400 });
    },
})