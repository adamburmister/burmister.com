import type { CommandContext } from "./ShellEmulator";
import { sleep } from "./ShellEmulator";

const WELCOME_ANSI_URL = "/assets/content/bbs/welcome.ans";

interface DialerStep {
	text: string;
	delayMs: number;
	inline?: boolean;
}

const DIALER_STEPS: DialerStep[] = [
	{ text: "Hayes-compatible modem detected on COM1", delayMs: 0 },
	{ text: "ATZ", delayMs: 0 },
	{ text: "OK", delayMs: 100 },
	{ text: "AT&F1 E0 V1 S0=0", delayMs: 100 },
	{ text: "OK", delayMs: 100 },
	{ text: "ATDT 03-5555-0198", delayMs: 100 },
	{ text: "DIALING", delayMs: 1000 },
	{ text: "RINGBACK", delayMs: 120 },
	{ text: "REMOTE ANSWER", delayMs: 500 },
	{ text: "CARRIER 33600", delayMs: 2000 },
	{ text: "V.34 HANDSHAKE ", delayMs: 10000, inline: true },
	{ text: "....", delayMs: 800, inline: true },
	{ text: " locked", delayMs: 2000 },
	{ text: "negotiation complete", delayMs: 420 },
	{ text: "CONNECT 33600/ARQ", delayMs: 500 },
	{ text: "Entering BURMISTER.COM BBS...", delayMs: 540 },
];

export async function dialerCommand(ctx: CommandContext): Promise<void> {
	if (ctx.args.includes("--help") || ctx.args.includes("-h")) {
		ctx.terminal.writeln("Usage: dialer");
		ctx.terminal.writeln("");
		ctx.terminal.writeln(
			"Dial the Burmister BBS and display the welcome screen.",
		);
		return;
	}

	void ctx.terminal.playDialupAudio?.().catch((error) => {
		console.warn("Could not play dial-up audio:", error);
	});

	try {
		ctx.terminal.writeln("");
		ctx.terminal.writeln("Burmister BBS Dialer v1.0");
		ctx.terminal.writeln("-------------------------");

		for (const step of DIALER_STEPS) {
			if (step.inline) {
				ctx.terminal.write(step.text);
			} else {
				ctx.terminal.writeln(step.text);
			}

			if (step.delayMs > 0) {
				await sleep(step.delayMs);
			}
		}

		ctx.terminal.stopDialupAudio?.();
		ctx.terminal.writeln("");

		const response = await fetch(WELCOME_ANSI_URL);
		if (!response.ok) {
			ctx.terminal.writeln(
				`dialer: connected, but welcome screen failed to load (${response.status})`,
			);
			return;
		}

		const welcomeAnsi = await response.text();
		ctx.terminal.write(`\x1b[0m${welcomeAnsi}\x1b[0m`);
		if (!welcomeAnsi.endsWith("\n")) {
			ctx.terminal.writeln("");
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		ctx.terminal.writeln(`dialer: connection error: ${errorMessage}`);
	} finally {
		ctx.terminal.stopDialupAudio?.();
	}
}
