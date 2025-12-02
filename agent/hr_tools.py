# agent/hr_tools.py
#
# Helper to look up HR recommendations from S3 CSVs using fuzzy matching.

import os
import csv
import io
from typing import List, Dict, Optional, Tuple

import boto3
import difflib

AWS_REGION = os.environ.get("AWS_REGION", "us-west-2")

# Update these if your bucket/keys are different
HR_BUCKET = os.environ.get("HR_RECO_BUCKET", "new-rndc-hr-recommendation")
CVR_KEY = os.environ.get("HR_RECO_CVR_KEY", "recommendations/cvr_lines.csv")
COMMON_KEY = os.environ.get("HR_RECO_COMMON_KEY", "recommendations/common_errors.csv")

s3 = boto3.client("s3", region_name=AWS_REGION)

_cvr_rows: List[Dict[str, str]] = []
_common_rows: List[Dict[str, str]] = []


def _load_csv(key: str) -> List[Dict[str, str]]:
    """Read a CSV from S3 into a list of dicts."""
    print(f"[hr_tools] Loading CSV s3://{HR_BUCKET}/{key}")
    resp = s3.get_object(Bucket=HR_BUCKET, Key=key)
    # utf-8-sig handles BOM if file was saved from Excel
    body = resp["Body"].read().decode("utf-8-sig", errors="ignore")
    reader = csv.DictReader(io.StringIO(body))
    rows = list(reader)
    print(f"[hr_tools] Loaded {len(rows)} rows from {key}")
    return rows


def _ensure_loaded():
    global _cvr_rows, _common_rows
    if not _cvr_rows:
        _cvr_rows = _load_csv(CVR_KEY)
    if not _common_rows:
        _common_rows = _load_csv(COMMON_KEY)


def _normalize(text: str) -> str:
    """Lowercase and keep only letters, numbers and spaces."""
    if not text:
        return ""
    out_chars = []
    for ch in text.lower():
        if ch.isalnum() or ch.isspace():
            out_chars.append(ch)
        else:
            # replace punctuation with space
            out_chars.append(" ")
    # Collapse multiple spaces
    normalized = " ".join("".join(out_chars).split())
    return normalized


def _best_match(error_message: str) -> Optional[Tuple[Dict[str, str], float]]:
    """
    Fuzzy match: find the row whose error text is most similar
    to the incoming error_message. Returns (match_row, score) or None.
    """
    _ensure_loaded()

    msg_norm = _normalize(error_message)
    if not msg_norm:
        return None

    best_row: Optional[Dict[str, str]] = None
    best_score: float = 0.0

    # Search CVR rules
    for row in _cvr_rows:
        text = row.get("ERROR_MESSAGE_TEXT") or ""
        text_norm = _normalize(text)
        if not text_norm:
            continue
        score = difflib.SequenceMatcher(None, msg_norm, text_norm).ratio()
        if score > best_score:
            best_score = score
            best_row = {
                "source": "CVR",
                "pattern": text,
                "recommendation": row.get("RECOMMENDATIONS1", ""),
            }

    # Search common errors
    for row in _common_rows:
        text = row.get("ERROR_MESSAGE") or ""
        text_norm = _normalize(text)
        if not text_norm:
            continue
        score = difflib.SequenceMatcher(None, msg_norm, text_norm).ratio()
        if score > best_score:
            best_score = score
            best_row = {
                "source": "COMMON",
                "pattern": text,
                "recommendation": row.get("RECOMMENDATIONS", ""),
            }

    if best_row is None:
        return None

    print(
        f"[hr_tools] best match source={best_row['source']} "
        f"score={best_score:.2f} pattern={best_row['pattern']!r}"
    )
    return best_row, best_score


def lookup_hr_recommendation(error_message: str) -> str:
    """
    Public helper: always returns some text.
    Called directly by strands_agent.py.
    """
    if not error_message:
        return "[HR] No error message provided."

    try:
        result = _best_match(error_message)
    except Exception as e:
        return f"[HR] Error reading HR recommendation files: {e}"

    if not result:
        return (
            "[HR] I couldn't find any similar error in the HR recommendations "
            "files for this error. Please double-check the exact error text or "
            "update the CSV."
        )

    match, score = result

    if match["source"] == "CVR":
        src_line = "Source: CVR rules from Oracle EBS."
    else:
        src_line = "Source: common employee load error recommendations."

    rec = match["recommendation"] or "(No recommendation text found in file.)"

    return (
        "[HR] "
        f"{src_line}\n\n"
        f"Matched pattern (score {score:.2f}):\n{match['pattern']}\n\n"
        f"Recommended fix:\n{rec}"
    )

