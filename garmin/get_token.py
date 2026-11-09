"""One-time Garmin login on your own PC. Prints a token for the GitHub secret GARMIN_TOKENS.

  pip install -r garmin/requirements.txt
  python garmin/get_token.py

You type your Garmin e-mail, password and (if enabled) the 2-step code yourself.
Nothing is stored or sent anywhere except to Garmin. The token is valid for about a year;
run this again when the GitHub Action starts failing with a login error.
"""
from getpass import getpass

from garminconnect import Garmin


def main() -> None:
    email = input("Garmin e-mail: ").strip()
    password = getpass("Garmin password (hidden): ")
    api = Garmin(email, password, prompt_mfa=lambda: input("2-step code from Garmin: ").strip())
    api.login()
    token = api.garth.dumps()
    print("\nLogin OK. Copy the whole line below into the GitHub secret GARMIN_TOKENS:\n")
    print(token)
    print("\nTreat it like a password: anyone with it can read your Garmin data.")


if __name__ == "__main__":
    main()
