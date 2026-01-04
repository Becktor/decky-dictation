import os

# import zipfile
# Old package.json remote binary config
# "remote_binary": [
# {
#     "name": "vosk-model-small-en-us-0.15.zip",
#     "url": "https://alphacephei.com/kaldi/models/vosk-model-small-en-us-0.15.zip",
#     "sha256hash": "30f26242c4eb449f948e42cb302dd7a686cb29a3423a8367f99ff41780942498"
# }
# ],
import traceback
import subprocess

import logging

# The decky plugin module is located at decky-loader/plugin
# For easy intellisense checkout the decky-loader code one directory up
# or add the `decky-loader/plugin` path to `python.analysis.extraPaths` in `.vscode/settings.json`
import decky_plugin


logging.basicConfig(
    filename="/tmp/decky-dictation.log",
    format="Decky Dictation: %(asctime)s %(levelname)s %(message)s",
    filemode="w+",
    force=True,
)
logger = logging.getLogger()
logger.setLevel(logging.DEBUG)
std_out_file = open("/tmp/decky-dictation-std-out.log", "w")
std_err_file = open("/tmp/decky-dictation-std-err.log", "w")

plugin_path = os.environ["DECKY_PLUGIN_DIR"]
model_path = f"{plugin_path}/bin/vosk-model-small-en-us-0.15"

# Base environment variables for nerd-dictation
base_env = os.environ.copy()
base_env["PYTHONPATH"] = f"{plugin_path}/bin/vosk"
base_env["XDG_RUNTIME_DIR"] = "/run/user/1000"
base_env["XDG_SESSION_TYPE"] = "wayland"


class Plugin:
    process = None
    # Begins dictation
    async def begin(self, push_to_dictate: bool, display: str = ":1", window_id: int = 0):
        try:
            if not os.path.exists(model_path):
                logger.info("Model directory not found")
                return
            if self.process is not None:
                if self.process.poll() is None:
                    logger.info("Dictation currently running, exiting early")
                    return
            logger.info(f"Begin dictation on display {display}, window {window_id}")
            timeout = ("--timeout 4", "")[push_to_dictate]

            # Set DISPLAY per-process based on focused context
            env = base_env.copy()
            env["DISPLAY"] = display

            # Focus the target window before starting dictation
            if window_id > 0:
                try:
                    subprocess.run(
                        ["xdotool", "windowfocus", "--sync", str(window_id)],
                        env=env,
                        timeout=2
                    )
                except Exception as e:
                    logger.info(f"Could not focus window {window_id}: {e}")

            self.process = subprocess.Popen(
                f'"{plugin_path}/bin/nerd-dictation/nerd-dictation" begin --vosk-model-dir="{model_path}" --numbers-min-value 2 --numbers-no-suffix --full-sentence --numbers-as-digits --numbers-use-separator {timeout} --punctuate-from-previous-timeout 2',
                shell=True,
                stdout=std_out_file,
                stderr=std_err_file,
                env=env,
            )
        except Exception:
            await Plugin.end(self)
            logger.info(traceback.format_exc())
        return

    # Ends dictation
    async def end(self):
        try:
            logger.info("End dictation")
            if self.process is not None:
                self.process.kill()

        except Exception:
            logger.info(traceback.format_exc())
        return

    async def _main(self):
        # model_zip_path = f"{plugin_path}/bin/vosk-model-small-en-us-0.15.zip"
        # if os.path.isfile(model_zip_path) and not os.path.exists(model_path):
        #     with zipfile.ZipFile(model_zip_path, "r") as zip_ref:
        #         zip_ref.extractall(f"{plugin_path}/bin")
        #     logger.info("Model was unzipped")
        #     os.remove(model_zip_path)
        if not os.path.exists(model_path):
            logger.info("Model directory not found")
        return

    async def _unload(self):
        logger.info("Unload was called")
        await Plugin.end(self)
        return
