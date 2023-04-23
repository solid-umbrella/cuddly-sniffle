import "https://deno.land/std@0.182.0/dotenv/load.ts";
import { sign } from "https://cdn.skypack.dev/tweetnacl@v1.0.3?dts";
import { json, serve, validateRequest } from "https://deno.land/x/sift@0.6.0/mod.ts";
import { APIInteraction, InteractionType, APIChatInputApplicationCommandInteractionData, InteractionResponseType } from "https://raw.githubusercontent.com/discordjs/discord-api-types/main/deno/v10.ts";
import { APIInteractionResponse } from "https://raw.githubusercontent.com/discordjs/discord-api-types/main/deno/payloads/v10/mod.ts";

// https://deno.com/deploy/docs/tutorial-discord-slash

const publicKey = Deno.env.get("PUBLIC_KEY");
if (!publicKey) {
    throw new Error("PUBLIC_KEY environment variable must be set");
}

export function hexToUint8Array(hex: string) {
    return new Uint8Array(hex.match(/.{1,2}/g)!.map((val) => parseInt(val, 16)));
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
            } else {
                return json({ error: "Unrecognized command" }, { status: 400 });
            }
        }

        return json({ error: "Unrecognized interaction type" }, { status: 400 });
    },
})