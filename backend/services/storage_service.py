import logging
from typing import Optional
from database import get_db

logger = logging.getLogger(__name__)

def upload_file_to_storage(
    bucket_name: str,
    storage_path: str,
    file_bytes: bytes,
    mime_type: str
) -> Optional[str]:
    """
    Upload file bytes to a specified private Supabase Storage bucket.
    Returns the file path inside the bucket on success, or None on failure.
    """
    try:
        supabase = get_db()
        # Upload options
        options = {
            "content-type": mime_type,
            "x-upsert": "true"
        }
        # Run upload
        res = supabase.storage.from_(bucket_name).upload(
            path=storage_path,
            file=file_bytes,
            file_options=options
        )
        # res returns path e.g. "identity/aadhar.pdf" or detailed response dict
        logger.info(f"File uploaded successfully to {bucket_name}/{storage_path}")
        return storage_path
    except Exception as e:
        logger.error(f"Failed to upload file to storage bucket {bucket_name} at path {storage_path}: {e}")
        return None

def generate_download_url(
    bucket_name: str,
    storage_path: str,
    expires_in_seconds: int = 3600
) -> Optional[str]:
    """
    Generate a timed signed URL for private files.
    Default expiry is 3600 seconds (1 hour).
    """
    try:
        supabase = get_db()
        response = supabase.storage.from_(bucket_name).create_signed_url(
            path=storage_path,
            expires_in=expires_in_seconds
        )
        if isinstance(response, dict) and "signedURL" in response:
            return response["signedURL"]
        elif hasattr(response, "get"):
            return response.get("signedURL")
        # In newer versions of the SDK, response is a dict or string directly
        return response
    except Exception as e:
        logger.error(f"Failed to generate signed download URL for {bucket_name}/{storage_path}: {e}")
        return None

def delete_file_from_storage(
    bucket_name: str,
    storage_path: str
) -> bool:
    """
    Remove file from a Supabase Storage bucket.
    """
    try:
        supabase = get_db()
        supabase.storage.from_(bucket_name).remove(paths=[storage_path])
        logger.info(f"File deleted successfully from {bucket_name}/{storage_path}")
        return True
    except Exception as e:
        logger.error(f"Failed to delete file from {bucket_name}/{storage_path}: {e}")
        return False
