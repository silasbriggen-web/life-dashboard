"""One-time Garmin login on your own PC. Creates the token for the GitHub secret GARMIN_TOKENS.

  pip install -r garmin/requirements.txt
  python garmin/get_token.py          # saves the token straight into GitHub (needs the gh CLI, logged in)
  python garmin/get_token.py --print  # only prints it, to paste into GitHub by hand

You type your Garmin e-mail, password and (if enabled) the 2-step code yourself.
Nothing is stored or sent anywhere except to Garmin and, with the default, to your GitHub repo secret.
Run this again when the GitHub Action starts failing with a login error.
"""
import shutil
import subprocess
import sys
from getpass import getpass

from garminconnect import Garmin

REPO = "silasbriggen-web/life-dashboard"


def main() -> None:
    only_print = "--print" in sys.argv
    email = input("Garmin e-mail: ").strip()
    password = getpass("Garmin password (hidden, nothing appears while typing): ")
    api = Garmin(email, password, prompt_mfa=lambda: input("2-step code from Garmin: ").strip())
    api.login()
    token = api.client.dumps()
    print("\nLogin OK.")

    if not only_print and shutil.which("gh"):
        r = subprocess.run(["gh", "secret", "set", "GARMIN_TOKENS", "-R", REPO], input=token, text=True)
        if r.returncode == 0:
            print("Saved as GitHub secret GARMIN_TOKENS in " + REPO + ". You can close this window.")
            return
        print("Could not save it with gh, so here it is to paste by hand.")

    print("\nCopy the whole line below into the GitHub secret GARMIN_TOKENS:\n")
    print(token)
    print("\nTreat it like a password: anyone with it can read your Garmin data.")


if __name__ == "__main__":
    main()
