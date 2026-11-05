"""Model Download and Verification Utility for ResQRoute AI.

Downloads the trained PyTorch collision model weights on deployment environments (e.g. Render)
where large model binary files are excluded from git.
"""

import hashlib
import os
import sys
from pathlib import Path
import urllib.request
import urllib.error

# Default expected model SHA-256 hash
DEFAULT_MODEL_SHA256 = "5b40e474adeeb6225eb4228055d90f836f92c28cce109d497c423676e7851711"


def compute_sha256(file_path: Path) -> str:
    """Compute the SHA-256 hexadecimal digest of a file."""
    sha = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            sha.update(chunk)
    return sha.hexdigest().lower()


def get_target_model_path() -> Path:
    """Determine the target file path for the model weights."""
    env_path = os.environ.get("ACCIDENT_MODEL_PATH")
    if env_path:
        return Path(env_path)

    # Default to resqroute_accident_model.pt in backend directory
    backend_dir = Path(__file__).resolve().parent.parent
    return backend_dir / "resqroute_accident_model.pt"


def download_model(
    url: str | None = None,
    dest_path: Path | None = None,
    expected_sha256: str | None = None,
    token: str | None = None,
) -> bool:
    """Download model weights with SHA-256 verification and optional Bearer auth.

    Returns True if model exists or was downloaded successfully, False otherwise.
    """
    target = dest_path or get_target_model_path()
    download_url = url or os.environ.get("MODEL_DOWNLOAD_URL", "").strip()
    sha256_val = (expected_sha256 or os.environ.get("MODEL_SHA256", DEFAULT_MODEL_SHA256)).strip().lower()
    bearer_token = token or os.environ.get("MODEL_DOWNLOAD_TOKEN", "").strip()

    # If target model already exists, verify its integrity
    if target.exists():
        if target.stat().st_size > 0:
            if sha256_val:
                print(f"[model_download] Existing model found at: {target}")
                print(f"[model_download] Verifying SHA-256 checksum...")
                actual_hash = compute_sha256(target)
                if actual_hash == sha256_val:
                    print(f"[model_download] SHA-256 checksum verified: {actual_hash}")
                    return True
                else:
                    print(f"[model_download] WARNING: Checksum mismatch for {target}!")
                    print(f"  Expected: {sha256_val}")
                    print(f"  Got:      {actual_hash}")
                    print(f"[model_download] Re-downloading from source...")
            else:
                print(f"[model_download] Existing model found at {target} ({target.stat().st_size} bytes).")
                return True

    if not download_url:
        print("[model_download] NOTICE: MODEL_DOWNLOAD_URL is not set.")
        if target.exists():
            return True
        print(f"[model_download] Model file not found at {target}. Place weights manually or set MODEL_DOWNLOAD_URL.")
        return False

    target.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = target.with_suffix(".pt.download_tmp")

    print(f"[model_download] Downloading model from: {download_url}")
    print(f"[model_download] Destination: {target}")

    headers = {"User-Agent": "ResQRoute-AI-ModelDownloader/1.0"}
    if bearer_token:
        headers["Authorization"] = f"Bearer {bearer_token}"

    req = urllib.request.Request(download_url, headers=headers)

    try:
        with urllib.request.urlopen(req) as resp, open(tmp_path, "wb") as out_file:
            total_size = int(resp.headers.get("Content-Length", 0))
            downloaded = 0
            block_size = 64 * 1024
            hasher = hashlib.sha256()

            while True:
                chunk = resp.read(block_size)
                if not chunk:
                    break
                out_file.write(chunk)
                hasher.update(chunk)
                downloaded += len(chunk)
                if total_size > 0 and sys.stdout.isatty():
                    percent = downloaded * 100 // total_size
                    print(f"\r[model_download] Progress: {downloaded}/{total_size} bytes ({percent}%)", end="")

            if sys.stdout.isatty():
                print()

        actual_sha256 = hasher.hexdigest().lower()
        if sha256_val and actual_sha256 != sha256_val:
            tmp_path.unlink(missing_ok=True)
            print(f"[model_download] ERROR: SHA-256 mismatch!")
            print(f"  Expected: {sha256_val}")
            print(f"  Got:      {actual_sha256}")
            return False

        # Atomically replace destination
        if target.exists():
            target.unlink()
        tmp_path.replace(target)
        print(f"[model_download] Successfully downloaded and verified: {target}")
        print(f"[model_download] SHA-256: {actual_sha256}")
        return True

    except Exception as e:
        tmp_path.unlink(missing_ok=True)
        print(f"[model_download] Download failed: {e}")
        return False


def main():
    success = download_model()
    if not success and not get_target_model_path().exists():
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()

