import {
	PanelSection,
	PanelSectionRow,
	ToggleField,
} from "@decky/ui";

import {
	definePlugin,
	toaster,
	callable,
} from "@decky/api";

import { VFC, useEffect, useState } from "react";
import { FaComment } from "react-icons/fa";

// Backend methods
const beginDictation = callable<[{ push_to_dictate: boolean }], void>("begin");
const endDictation = callable<[], void>("end");

// Button constants for Steam Deck back buttons
// These are the gamepad button values for L5 and R5
const BUTTON_L5 = 15;
const BUTTON_R5 = 16;

class DeckyDictationLogic {
	pressedAt: number = Date.now();
	enabled: boolean = false;
	dictating = false;
	pushToDictate = false;

	notify = (message: string, duration: number = 1000, body: string = "") => {
		if (!body) {
			body = message;
		}
		toaster.toast({
			title: message,
			body: body,
			duration: duration,
			critical: true
		});
	}

	handleButtonInput = (_controllerIndex: number, button: number, pressed: boolean) => {
		if (!this.enabled) {
			return;
		}
		if (this.pushToDictate) {
			this.handlePushToDictate(button, pressed);
		} else {
			this.handleToggleMode(button, pressed);
		}
	}

	handlePushToDictate = (button: number, pressed: boolean) => {
		if (button === BUTTON_L5) {
			if (pressed) {
				if (!this.dictating) {
					this.dictating = true;
					beginDictation({ push_to_dictate: true });
					this.notify("Decky Dictation", 2000, "Starting speech to text input");
				}
			} else if (this.dictating) {
				this.dictating = false;
				endDictation();
				this.notify("Decky Dictation", 2000, "Ending speech to text input");
			}
		}
	}

	handleToggleMode = (button: number, pressed: boolean) => {
		if (!pressed) {
			return;
		}
		if (Date.now() - this.pressedAt < 2000) {
			return;
		}

		if (button === BUTTON_L5) {
			this.pressedAt = Date.now();
			beginDictation({ push_to_dictate: false });
			this.notify("Decky Dictation", 2000, "Starting speech to text input");
		}
		if (button === BUTTON_R5) {
			this.pressedAt = Date.now();
			endDictation();
			this.notify("Decky Dictation", 2000, "Ending speech to text input");
		}
	}
}

const DeckyDictation: VFC<{ logic: DeckyDictationLogic }> = ({ logic }) => {
	const [enabled, setEnabled] = useState<boolean>(false);
	const [pushToDictate, setPushToDictate] = useState<boolean>(false);

	useEffect(() => {
		setEnabled(logic.enabled);
		setPushToDictate(logic.pushToDictate);
	}, []);

	return (
		<div>
			<PanelSection>
				<PanelSectionRow>
					<ToggleField
						label="Enable"
						checked={enabled}
						onChange={(e) => { setEnabled(e); logic.enabled = e; }}
					/>
				</PanelSectionRow>
				<PanelSectionRow>
					<ToggleField
						label="Push To Dictate"
						checked={pushToDictate}
						disabled={enabled}
						onChange={(e) => { setPushToDictate(e); logic.pushToDictate = e; }}
					/>
				</PanelSectionRow>
			</PanelSection>
			<PanelSection title="How to use:">
				<PanelSectionRow>
					<div>
						L5 to begin speech to text input, hold if "Push To Dictate" is enabled.
						<br />
						R5 to end speech to text input if "Push To Dictate" is disabled.
					</div>
					<div>
						Currently this plugin only works in a game (first opened game if you have more opened at once; not working in home, store or steam chat ui etc).
					</div>
				</PanelSectionRow>
			</PanelSection>
		</div>
	);
};

export default definePlugin(() => {
	const logic = new DeckyDictationLogic();

	// Register for controller input using the new API
	const inputRegistration = window.SteamClient.Input.RegisterForControllerInputMessages(
		(controllerIndex: number, button: number, pressed: boolean) => {
			logic.handleButtonInput(controllerIndex, button, pressed);
		}
	) as { unregister: () => void };

	return {
		name: "Decky Dictation",
		titleView: <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><FaComment /> Decky Dictation</div>,
		content: <DeckyDictation logic={logic} />,
		icon: <FaComment />,
		onDismount() {
			inputRegistration.unregister();
		},
		alwaysRender: true
	};
});
